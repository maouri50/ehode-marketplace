import { describe, expect, it } from "vitest";
import { ensureBuyerFeatureSchema } from "./buyerSchema";

describe("buyer feature Production schema recovery", () => {
  it("creates only additive buyer account, session, wishlist, contact, and review structures", async () => {
    const statements: string[] = [];
    await ensureBuyerFeatureSchema({ execute: async (statement: { queryChunks?: Array<{ value?: unknown[] }> }) => {
      statements.push(String(statement.queryChunks?.[0]?.value?.[0] ?? statement));
    } });

    const emitted = statements.join("\n");
    expect(emitted).toContain("CREATE TABLE IF NOT EXISTS `buyerAccounts`");
    expect(emitted).toContain("CREATE TABLE IF NOT EXISTS `buyerSessions`");
    expect(emitted).toContain("CREATE TABLE IF NOT EXISTS `buyerPasswordResetTokens`");
    expect(emitted).toContain("CREATE TABLE IF NOT EXISTS `buyerWishlistItems`");
    expect(emitted).toContain("CREATE TABLE IF NOT EXISTS `contactMessages`");
    expect(emitted).toContain("ALTER TABLE `marketplaceOrders` ADD COLUMN IF NOT EXISTS `buyerAccountId`");
    expect(emitted).not.toMatch(/DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO/i);
  });
});
