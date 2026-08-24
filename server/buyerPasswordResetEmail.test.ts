import { describe, expect, it } from "vitest";
import { buildBuyerPasswordResetEmail, buildBuyerResetUrl } from "./buyerPasswordResetEmail";

describe("buyer password reset email", () => {
  it("uses the public reset route and tells the buyer the token is one-time and expiring", () => {
    const url = buildBuyerResetUrl("opaque-reset-token");
    const email = buildBuyerPasswordResetEmail(url);

    expect(url).toContain("/reset-password?token=opaque-reset-token");
    expect(email.subject).toBe("Reset your Ehode password");
    expect(email.text).toContain("expires in one hour");
    expect(email.text).toContain("only be used once");
    expect(email.html).toContain("Reset my password");
  });
});
