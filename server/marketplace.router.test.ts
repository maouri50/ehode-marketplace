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
});
