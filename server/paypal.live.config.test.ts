import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("public PayPal checkout configuration", () => {
  it("serves the configured Live mode and a public client ID", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const config = await appRouter.createCaller(ctx).storefront.paypal.config();

    expect(config.mode).toBe("live");
    expect(config.clientId).toMatch(/\S+/);
  });
});
