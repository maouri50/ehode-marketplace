import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { buyerAccounts, buyerPasswordResetTokens, buyerSessions, marketplaceOrders } from "../drizzle/schema";
import { getDb } from "./db";
import { clearResponseCookie, setResponseCookie } from "./_core/cookies";
import { ENV } from "./_core/env";
import { ensureBuyerFeatureSchema } from "./buyerSchema";
import { sendBuyerPasswordResetEmail } from "./buyerPasswordResetEmail";

export const BUYER_SESSION_COOKIE = "ehode_buyer_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const RESET_TTL_MS = 1000 * 60 * 60;
const RESET_RESEND_COOLDOWN_MS = 1000 * 60 * 5;

export type BuyerIdentity = {
  id: number;
  email: string;
  displayName: string;
};

type CookieRequest = { headers: { cookie?: string | string[] | undefined; "x-forwarded-proto"?: string | string[] | undefined }; protocol?: string };
type CookieResponse = {
  getHeader: (name: string) => number | string | string[] | undefined;
  setHeader: (name: string, value: string | string[]) => unknown;
};

function readCookie(cookieHeader: CookieRequest["headers"]["cookie"], name: string) {
  const header = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader;
  return header?.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

export function hashBuyerPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${derived}`;
}

export function verifyBuyerPassword(password: string, storedHash: string) {
  const [algorithm, salt, expected] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString("base64url");
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function identity(account: typeof buyerAccounts.$inferSelect): BuyerIdentity {
  return { id: account.id, email: account.email, displayName: account.displayName };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Buyer accounts are temporarily unavailable.");
  await ensureBuyerFeatureSchema(db);
  return db;
}

export async function getBuyerIdentityFromRequest(req: CookieRequest): Promise<BuyerIdentity | null> {
  const token = readCookie(req.headers.cookie, BUYER_SESSION_COOKIE);
  if (!token || token.length < 30) return null;
  const db = await getDb();
  if (!db) return null;
  await ensureBuyerFeatureSchema(db);
  const rows = await db.select({ account: buyerAccounts }).from(buyerSessions)
    .innerJoin(buyerAccounts, eq(buyerSessions.buyerAccountId, buyerAccounts.id))
    .where(and(eq(buyerSessions.tokenHash, tokenHash(token)), gt(buyerSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ? identity(rows[0].account) : null;
}

async function createBuyerSession(buyerAccountId: number) {
  const db = await requireDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(buyerSessions).values({ buyerAccountId, tokenHash: tokenHash(token), expiresAt, lastSeenAt: new Date() });
  return { token, expiresAt };
}

function secureCookie(req: CookieRequest) {
  const forwarded = req.headers["x-forwarded-proto"];
  return ENV.isProduction || req.protocol === "https" || forwarded === "https" || (Array.isArray(forwarded) && forwarded.includes("https"));
}

function didWrite(result: unknown) {
  const payload = Array.isArray(result) ? result[0] : result;
  if (!payload || typeof payload !== "object") return false;
  const record = payload as { affectedRows?: unknown; rowsAffected?: unknown; rowCount?: unknown };
  const count = record.affectedRows ?? record.rowsAffected ?? record.rowCount;
  return typeof count === "number" && count > 0;
}

export function isUsableBuyerPasswordReset(reset: { expiresAt: Date; consumedAt: Date | null }, now = new Date()) {
  return reset.consumedAt === null && reset.expiresAt.getTime() > now.getTime();
}

export function setBuyerSession(ctx: { req: CookieRequest; res: CookieResponse }, token: string) {
  setResponseCookie(ctx.res, BUYER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookie(ctx.req),
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearBuyerSession(ctx: { res: CookieResponse }) {
  clearResponseCookie(ctx.res, BUYER_SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function registerBuyerAccount(input: { email: string; displayName: string; password: string }) {
  const db = await requireDb();
  const email = input.email.trim().toLowerCase();
  const existing = await db.select({ id: buyerAccounts.id }).from(buyerAccounts).where(eq(buyerAccounts.email, email)).limit(1);
  if (existing[0]) return { ok: false as const, reason: "email_exists" as const };
  const inserted = await db.insert(buyerAccounts).values({ email, displayName: input.displayName.trim(), passwordHash: hashBuyerPassword(input.password) });
  const id = Number((inserted as any)[0]?.insertId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Could not create buyer account.");
  await db.update(marketplaceOrders).set({ buyerAccountId: id }).where(and(eq(marketplaceOrders.buyerEmail, email), isNull(marketplaceOrders.buyerAccountId)));
  return { ok: true as const, buyer: { id, email, displayName: input.displayName.trim() }, session: await createBuyerSession(id) };
}

export async function loginBuyerAccount(input: { email: string; password: string }) {
  const db = await requireDb();
  const email = input.email.trim().toLowerCase();
  const account = (await db.select().from(buyerAccounts).where(eq(buyerAccounts.email, email)).limit(1))[0];
  if (!account || !verifyBuyerPassword(input.password, account.passwordHash)) return { ok: false as const };
  await db.update(marketplaceOrders).set({ buyerAccountId: account.id }).where(and(eq(marketplaceOrders.buyerEmail, email), isNull(marketplaceOrders.buyerAccountId)));
  return { ok: true as const, buyer: identity(account), session: await createBuyerSession(account.id) };
}

/** Always returns a generic accepted result so callers cannot discover whether an account exists. */
export async function requestBuyerPasswordReset(emailInput: string) {
  const db = await requireDb();
  const email = emailInput.trim().toLowerCase();
  const account = (await db.select().from(buyerAccounts).where(eq(buyerAccounts.email, email)).limit(1))[0];
  if (!account) return { accepted: true as const };

  const recent = await db.select({ id: buyerPasswordResetTokens.id }).from(buyerPasswordResetTokens)
    .where(and(eq(buyerPasswordResetTokens.buyerAccountId, account.id), isNull(buyerPasswordResetTokens.consumedAt), gt(buyerPasswordResetTokens.createdAt, new Date(Date.now() - RESET_RESEND_COOLDOWN_MS))))
    .limit(1);
  if (recent[0]) return { accepted: true as const };

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await db.delete(buyerPasswordResetTokens).where(and(eq(buyerPasswordResetTokens.buyerAccountId, account.id), isNull(buyerPasswordResetTokens.consumedAt)));
  const inserted = await db.insert(buyerPasswordResetTokens).values({ buyerAccountId: account.id, tokenHash: tokenHash(token), expiresAt });
  const resetId = Number((inserted as any)[0]?.insertId);
  const delivered = await sendBuyerPasswordResetEmail({ email: account.email, token }).catch(() => false);
  if (!delivered && Number.isInteger(resetId)) await db.delete(buyerPasswordResetTokens).where(eq(buyerPasswordResetTokens.id, resetId));
  return { accepted: true as const };
}

export async function resetBuyerPassword(input: { token: string; password: string }) {
  const db = await requireDb();
  const hashedToken = tokenHash(input.token);
  const reset = (await db.select().from(buyerPasswordResetTokens)
    .where(and(eq(buyerPasswordResetTokens.tokenHash, hashedToken), isNull(buyerPasswordResetTokens.consumedAt), gt(buyerPasswordResetTokens.expiresAt, new Date())))
    .limit(1))[0];
  if (!reset || !isUsableBuyerPasswordReset(reset)) return { ok: false as const };

  const claimed = await db.update(buyerPasswordResetTokens).set({ consumedAt: new Date() })
    .where(and(eq(buyerPasswordResetTokens.id, reset.id), isNull(buyerPasswordResetTokens.consumedAt), gt(buyerPasswordResetTokens.expiresAt, new Date())));
  if (!didWrite(claimed)) return { ok: false as const };

  const account = (await db.select().from(buyerAccounts).where(eq(buyerAccounts.id, reset.buyerAccountId)).limit(1))[0];
  if (!account) return { ok: false as const };
  await db.update(buyerAccounts).set({ passwordHash: hashBuyerPassword(input.password) }).where(eq(buyerAccounts.id, account.id));
  await db.delete(buyerSessions).where(eq(buyerSessions.buyerAccountId, account.id));
  return { ok: true as const, buyer: identity(account), session: await createBuyerSession(account.id) };
}
