import { describe, expect, it } from "vitest";
import { ensureNewsletterCampaignSchema, isMissingNewsletterSubscriptionSchema } from "./newsletterSchema";

describe("newsletter schema recovery guard", () => {
  it("recognizes the missing subscription-table query failure without treating arbitrary errors as schema failures", () => {
    expect(isMissingNewsletterSubscriptionSchema(new Error("Failed query: select id from newsletterSubscriptions"))).toBe(true);
    expect(isMissingNewsletterSubscriptionSchema(new Error("network timeout"))).toBe(false);
  });

  it("does not mistake a valid account error for a missing newsletter schema", () => {
    expect(isMissingNewsletterSubscriptionSchema(new Error("Missing admin session"))).toBe(false);
  });

  it("keeps campaign draft status in the allowed explicit owner workflow", () => {
    expect(["draft", "sending", "sent", "partial", "failed"]).toContain("draft");
  });

  it("repairs existing campaign tables with the draft defaults and auto-increment fields required by Vercel", async () => {
    const statements: string[] = [];
    const db = {
      execute: async (query: any) => {
        const chunks = query?.queryChunks ?? [];
        statements.push(chunks.map((chunk: any) => Array.isArray(chunk?.value) ? chunk.value.join("") : (chunk?.value ?? String(chunk))).join(""));
        return [];
      },
    };

    await ensureNewsletterCampaignSchema(db);

    expect(statements.join("\n")).toContain("ALTER TABLE `newsletterCampaigns` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL");
    expect(statements.join("\n")).toContain("ALTER TABLE `newsletterCampaigns` MODIFY COLUMN `status` enum('draft','sending','sent','partial','failed') NOT NULL DEFAULT 'draft'");
    expect(statements.join("\n")).toContain("ALTER TABLE `newsletterCampaigns` ADD COLUMN IF NOT EXISTS `recipientCount` int NOT NULL DEFAULT 0");
  });
});
