import { describe, expect, it } from "vitest";
import { getQueryParam } from "./_core/oauth";

describe("OAuth callback query parsing", () => {
  it("reads callback parameters through the portable request URL without requiring Express query typing", () => {
    const request = { url: "/api/oauth/callback?code=example-code&state=secure-state" };
    expect(getQueryParam(request, "code")).toBe("example-code");
    expect(getQueryParam(request, "state")).toBe("secure-state");
    expect(getQueryParam(request, "missing")).toBeUndefined();
  });
});
