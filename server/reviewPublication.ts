export type VerifiedReviewSubmission = {
  listingId: number;
  buyerAccountId: number;
  orderItemId: number;
  rating: number;
  body: string;
};

/** Builds the only insert shape used after the caller has confirmed an owned, paid order item. */
export function buildVerifiedReviewPublication(input: VerifiedReviewSubmission) {
  return {
    ...input,
    status: "published" as const,
  };
}
