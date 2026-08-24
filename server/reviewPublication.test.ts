import { describe, expect, it } from "vitest";
import { buildVerifiedReviewPublication } from "./reviewPublication";

describe("verified purchaser review publication", () => {
  it("publishes the review only after the router supplies a verified owned order item", () => {
    const review = buildVerifiedReviewPublication({ listingId: 19, buyerAccountId: 7, orderItemId: 41, rating: 5, body: "A genuine review from an eligible purchase." });

    expect(review).toEqual({ listingId: 19, buyerAccountId: 7, orderItemId: 41, rating: 5, body: "A genuine review from an eligible purchase.", status: "published" });
  });
});
