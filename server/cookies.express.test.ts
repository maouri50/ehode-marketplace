import { describe, expect, it } from "vitest";
import { setResponseCookie } from "./_core/cookies";

describe("portable cookie response headers", () => {
  it("writes Set-Cookie through Express-style get and set methods when Node header methods are unavailable", () => {
    const headers = new Map<string, string | string[]>();
    setResponseCookie({
      get: (name) => typeof headers.get(name) === "string" ? headers.get(name) as string : undefined,
      set: (name, value) => headers.set(name, value),
    }, "ehode_buyer_session", "session-token", { httpOnly: true, path: "/", sameSite: "lax" });

    expect(headers.get("Set-Cookie")).toEqual(["ehode_buyer_session=session-token; Path=/; HttpOnly; SameSite=Lax"]);
  });
});
