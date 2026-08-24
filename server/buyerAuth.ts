import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { buyerAccounts, buyerSessions, marketplaceOrders } from "../drizzle/schema";
import { getDb } from "./db";
import { clearResponseCookie, setResponseCookie } from "./_core/cookies";
import { ENV } from "./_core/env";

export const BUYER_SESSION_COOKIE = "ehode_buyer_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type BuyerIdentity = {
  id: number;
  email: string;
  displayName: string;
};

type CookieRequest = { headers: { cookie?: string | string[] | undefined }; protocol?: string };
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
  return db;
}

export async function getBuyerIdentityFromRequest(req: CookieRequest): Promise<BuyerIdentity | null> {
  const token = readCookie(req.headers.cookie, BUYER_SESSION_COOKIE);
  if (!token || token.length < 30) return null;
  const db = await getDb();
  if (!db) return null;
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
  return ENV.isProduction || req.protocol === "https" || req.headers["x-forwarded-proto" as keyof CookieRequest["headers"]] === "https";
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
