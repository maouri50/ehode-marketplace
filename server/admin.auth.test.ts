import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): { ctx: TrpcContext; cookies: string[] } {
  const cookies: string[] = [];
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        getHeader: (name: string) => name.toLowerCase() === "set-cookie" ? cookies : undefined,
        setHeader: (name: string, value: string | string[]) => {
          if (name.toLowerCase() === "set-cookie") {
            cookies.splice(0, cookies.length, ...(Array.isArray(value) ? value : [value]));
          }
        },
      } as TrpcContext["res"],
    },
    cookies,
  };
}

function sessionCookieValue(cookie: string | undefined) {
  return cookie?.match(/ehode_admin_session=([^;]+)/)?.[1];
}

describe("adminAuth.login", () => {
  it("accepts the configured secure admin password and creates an httpOnly session", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "";
    expect(password.length).toBeGreaterThanOrEqual(12);
    const { ctx, cookies } = createContext();
    const result = await appRouter.createCaller(ctx).adminAuth.login({ password });
    expect(result).toEqual({ success: true });
    expect(cookies[0]).toContain("ehode_admin_session=");
    expect(cookies[0]).toContain("HttpOnly");
    expect(cookies[0]).toContain("SameSite=Lax");
  });

  it("recognizes the issued admin session on a subsequent request", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "";
    const { ctx, cookies } = createContext();
    await appRouter.createCaller(ctx).adminAuth.login({ password });
    const sessionCookie = sessionCookieValue(cookies[0]);
    const followUpContext: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: { cookie: `ehode_admin_session=${sessionCookie}` } } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    await expect(appRouter.createCaller(followUpContext).adminAuth.status()).resolves.toMatchObject({ configured: true, authenticated: true });
  });

  it("allows campaign-workspace data only after standalone admin authentication", async () => {
    const password = process.env.ADMIN_PASSWORD ?? "";
    const { ctx, cookies } = createContext();
    await appRouter.createCaller(ctx).adminAuth.login({ password });
    const sessionCookie = sessionCookieValue(cookies[0]);
    const followUpContext: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: { cookie: `ehode_admin_session=${sessionCookie}` } } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    await expect(appRouter.createCaller(followUpContext).storefront.owner.newsletterCampaigns()).resolves.toEqual(expect.any(Array));
    await expect(appRouter.createCaller(createContext().ctx).storefront.owner.newsletterCampaigns()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
