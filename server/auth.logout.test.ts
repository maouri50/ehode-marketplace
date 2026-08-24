import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: string[] } {
  const clearedCookies: string[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      getHeader: (name: string) => name.toLowerCase() === "set-cookie" ? clearedCookies : undefined,
      setHeader: (name: string, value: string | string[]) => {
        if (name.toLowerCase() === "set-cookie") {
          clearedCookies.splice(0, clearedCookies.length, ...(Array.isArray(value) ? value : [value]));
        }
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]).toContain(`${COOKIE_NAME}=`);
    expect(clearedCookies[0]).toContain("Max-Age=0");
    expect(clearedCookies[0]).toContain("Secure");
    expect(clearedCookies[0]).toContain("SameSite=None");
    expect(clearedCookies[0]).toContain("HttpOnly");
    expect(clearedCookies[0]).toContain("Path=/");
  });
});
