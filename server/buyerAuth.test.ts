import { describe, expect, it } from "vitest";
import { BUYER_SESSION_COOKIE, clearBuyerSession, hashBuyerPassword, isUsableBuyerPasswordReset, setBuyerSession, verifyBuyerPassword } from "./buyerAuth";

function createResponse() {
  const headers = new Map<string, string | string[]>();
  return {
    headers,
    res: {
      getHeader: (name: string) => headers.get(name),
      setHeader: (name: string, value: string | string[]) => headers.set(name, value),
    },
  };
}

describe("buyer account security", () => {
  it("hashes passwords with a unique scrypt salt and verifies only the matching password", () => {
    const first = hashBuyerPassword("a long buyer password");
    const second = hashBuyerPassword("a long buyer password");
    expect(first).not.toBe(second);
    expect(verifyBuyerPassword("a long buyer password", first)).toBe(true);
    expect(verifyBuyerPassword("wrong password", first)).toBe(false);
    expect(verifyBuyerPassword("a long buyer password", "invalid")).toBe(false);
  });

  it("creates an httpOnly buyer session cookie and clears it without touching admin cookies", () => {
    const { headers, res } = createResponse();
    const ctx = { req: { protocol: "https", headers: {} }, res };
    setBuyerSession(ctx, "a".repeat(43));
    const setCookie = headers.get("Set-Cookie");
    const cookieText = Array.isArray(setCookie) ? setCookie.join("\n") : setCookie ?? "";
    expect(cookieText).toContain(`${BUYER_SESSION_COOKIE}=`);
    expect(cookieText).toContain("HttpOnly");
    expect(cookieText).toContain("Secure");
    expect(cookieText).toContain("SameSite=Lax");
    clearBuyerSession({ res });
    const cleared = headers.get("Set-Cookie");
    const clearedText = Array.isArray(cleared) ? cleared.join("\n") : cleared ?? "";
    expect(clearedText).toContain(`${BUYER_SESSION_COOKIE}=`);
    expect(clearedText).toContain("Max-Age=0");
  });

  it("accepts only an unconsumed reset token whose expiry is still in the future", () => {
    const now = new Date("2026-08-24T20:00:00.000Z");
    expect(isUsableBuyerPasswordReset({ expiresAt: new Date("2026-08-24T20:01:00.000Z"), consumedAt: null }, now)).toBe(true);
    expect(isUsableBuyerPasswordReset({ expiresAt: new Date("2026-08-24T19:59:00.000Z"), consumedAt: null }, now)).toBe(false);
    expect(isUsableBuyerPasswordReset({ expiresAt: new Date("2026-08-24T20:01:00.000Z"), consumedAt: now }, now)).toBe(false);
  });
});
