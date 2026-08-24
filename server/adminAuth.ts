import crypto from "node:crypto";
import type { TrpcContext } from "./_core/context";
import { clearResponseCookie, setResponseCookie } from "./_core/cookies";
import { ENV } from "./_core/env";

export const ADMIN_SESSION_COOKIE = "ehode_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signingSecret() {
  return ENV.cookieSecret || ENV.adminPassword;
}

function signature(expiry: string) {
  return crypto.createHmac("sha256", signingSecret()).update(`ehode-admin:${expiry}`).digest("base64url");
}

function readCookie(cookieHeader: string | undefined, name: string) {
  return cookieHeader?.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function isAdminPasswordConfigured() {
  return ENV.adminPassword.length >= 12;
}

export function verifyAdminPassword(password: string) {
  return isAdminPasswordConfigured() && timingSafeEqual(password, ENV.adminPassword);
}

export function createAdminSessionToken(now = Date.now()) {
  const expiry = String(now + SESSION_TTL_MS);
  return `${expiry}.${signature(expiry)}`;
}

export function hasAdminSession(req: TrpcContext["req"]) {
  const token = readCookie(req.headers.cookie, ADMIN_SESSION_COOKIE);
  if (!token) return false;
  const [expiry, tokenSignature] = token.split(".");
  if (!expiry || !tokenSignature || Number(expiry) <= Date.now()) return false;
  return timingSafeEqual(tokenSignature, signature(expiry));
}

export function setAdminSession(ctx: Pick<TrpcContext, "req" | "res">) {
  const secure = ENV.isProduction || ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
  setResponseCookie(ctx.res, ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearAdminSession(ctx: Pick<TrpcContext, "res">) {
  clearResponseCookie(ctx.res, ADMIN_SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}
