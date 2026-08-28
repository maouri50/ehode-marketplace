import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("storefront.owner.listings", () => {
  it("does not expose admin activity without the standalone admin session", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.storefront.owner.listings()).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
    });
  });

  it("does not allow anonymous visitors to upload a product cover image", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.storefront.owner.uploadCover({
      listingId: 1,
      originalFilename: "cover.png",
      mimeType: "image/png",
      base64Data: "iVBORw0KGgoAAAANSUhEUg==",
    })).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
    });
  });

  it("does not expose buyer email data through the admin order history without an admin session", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.storefront.owner.orders()).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
    });
  });

  it("does not allow an anonymous visitor to change the storefront announcement bar", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());

    await expect(caller.storefront.owner.saveAnnouncementBar({
      backgroundColor: "#f1641e",
      textColor: "#ffffff",
      fontFamily: "sans",
      rotationSeconds: 4,
      messages: ["Private owner setting"],
    })).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
    });
  });
});
