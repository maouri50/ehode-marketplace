import { describe, expect, it } from "vitest";
import { BUYER_SESSION_COOKIE, clearBuyerSession, hashBuyerPassword, setBuyerSession, verifyBuyerPassword } from "./buyerAuth";

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
});
