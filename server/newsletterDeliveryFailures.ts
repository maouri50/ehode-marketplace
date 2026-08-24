export type NewsletterFailureSummary = {
  campaignId: number;
  failedCount: number;
  reasons: Array<{ message: string; count: number }>;
};

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const urlPattern = /https?:\/\/[^\s)]+/gi;

export function sanitizeNewsletterDeliveryError(error: string | null | undefined) {
  const value = (error ?? "").replace(emailPattern, "[recipient]").replace(urlPattern, "[provider link]").replace(/\s+/g, " ").trim();
  return value ? value.slice(0, 180) : "The email provider did not provide a delivery reason.";
}

export function summarizeNewsletterDeliveryFailures(rows: Array<{ campaignId: number; deliveryError: string | null }>): NewsletterFailureSummary[] {
  const byCampaign = new Map<number, Map<string, number>>();
  for (const row of rows) {
    const reasons = byCampaign.get(row.campaignId) ?? new Map<string, number>();
    const message = sanitizeNewsletterDeliveryError(row.deliveryError);
    reasons.set(message, (reasons.get(message) ?? 0) + 1);
    byCampaign.set(row.campaignId, reasons);
  }
  return Array.from(byCampaign.entries()).map(([campaignId, reasons]) => ({
    campaignId,
    failedCount: Array.from(reasons.values()).reduce((total, count) => total + count, 0),
    reasons: Array.from(reasons.entries()).map(([message, count]) => ({ message, count })),
  }));
}
