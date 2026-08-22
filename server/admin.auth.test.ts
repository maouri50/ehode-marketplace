import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): { ctx: TrpcContext; cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> } {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }), clearCookie: () => undefined } as TrpcContext["res"],
    },
    cookies,
  };
}

describe("adminAuth.login", () => {
  it("accepts the configured secure admin password and creates an httpOnly session", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "";
    expect(password.length).toBeGreaterThanOrEqual(12);
    const { ctx, cookies } = createContext();
    const result = await appRouter.createCaller(ctx).adminAuth.login({ password });
    expect(result).toEqual({ success: true });
    expect(cookies[0]).toMatchObject({ name: "ehode_admin_session", options: { httpOnly: true, sameSite: "lax" } });
  });

  it("recognizes the issued admin session on a subsequent request", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "";
    const { ctx, cookies } = createContext();
    await appRouter.createCaller(ctx).adminAuth.login({ password });
    const sessionCookie = cookies[0];
    const followUpContext: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: { cookie: `${sessionCookie?.name}=${sessionCookie?.value}` } } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    await expect(appRouter.createCaller(followUpContext).adminAuth.status()).resolves.toMatchObject({ configured: true, authenticated: true });
  });
});
