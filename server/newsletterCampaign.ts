import { z } from "zod";

export const newsletterCampaignSendConfirmation = z.literal("SEND");

export type CampaignRecipient = { id: number; email: string; unsubscribeToken: string | null };
export type StoredCampaignSubscriber = CampaignRecipient & { status: "active" | "unsubscribed" };

export type NewsletterCampaignStore = {
  countActiveSubscribers: () => Promise<number>;
  createDraft: (input: { subject: string; body: string; recipientCount: number }) => Promise<number>;
  claimDraft: (campaignId: number) => Promise<boolean>;
  getCampaign: (campaignId: number) => Promise<{ subject: string; body: string } | null>;
  activeSubscribers: () => Promise<CampaignRecipient[]>;
  setUnsubscribeToken: (subscriptionId: number, token: string) => Promise<void>;
  recordRecipient: (input: { campaignId: number; subscriptionId: number; email: string; status: "sent" | "failed"; resendMessageId?: string; deliveryError?: string }) => Promise<void>;
  completeCampaign: (input: { campaignId: number; recipientCount: number; status: "sent" | "partial" | "failed"; error: string | null }) => Promise<void>;
};

export type NewsletterCampaignMailer = {
  send: (input: { to: string; subject: string; html: string; text: string; idempotencyKey: string }) => Promise<{ id: string }>;
};

export function selectActiveCampaignRecipients(subscribers: StoredCampaignSubscriber[]) {
  return subscribers.filter((subscriber) => subscriber.status === "active").map(({ id, email, unsubscribeToken }) => ({ id, email, unsubscribeToken }));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function buildNewsletterCampaignEmail(input: { body: string; unsubscribeUrl: string }) {
  const paragraphs = input.body.trim().split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`).join("");
  const footer = `<hr style="border:0;border-top:1px solid #e5ded7;margin:28px 0 16px"/><p style="font-size:12px;line-height:1.5;color:#6c6259">You received this email because you chose to receive Ehode news. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#8b421f">Unsubscribe</a>.</p>`;
  return {
    html: `<main style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:28px 20px;color:#2f2a25;line-height:1.6"><p style="margin:0 0 20px;font-size:18px;font-weight:700;letter-spacing:.04em">ehode<span style="color:#d45b22">.</span></p>${paragraphs}${footer}</main>`,
    text: `${input.body.trim()}\n\nYou received this email because you chose to receive Ehode news. Unsubscribe: ${input.unsubscribeUrl}`,
  };
}

export function summarizeCampaignDelivery(result: { sent: number; failed: number }) {
  if (result.sent === 0) return "failed" as const;
  return result.failed === 0 ? "sent" as const : "partial" as const;
}

export async function createNewsletterCampaignDraft(store: Pick<NewsletterCampaignStore, "countActiveSubscribers" | "createDraft">, input: { subject: string; body: string }) {
  const recipientCount = await store.countActiveSubscribers();
  const id = await store.createDraft({ ...input, recipientCount });
  return { id, recipientCount };
}

export async function sendNewsletterCampaignNow(input: { campaignId: number; confirmation: string; canonicalOrigin: string; store: Pick<NewsletterCampaignStore, "claimDraft" | "getCampaign" | "activeSubscribers" | "setUnsubscribeToken" | "recordRecipient" | "completeCampaign">; mailer: NewsletterCampaignMailer; makeToken: () => string }) {
  if (input.confirmation !== "SEND") throw new Error("Campaign delivery requires the exact SEND confirmation.");
  const recipients = await input.store.activeSubscribers();
  if (recipients.length === 0) throw new Error("There are no active newsletter subscribers to receive this campaign.");
  if (!await input.store.claimDraft(input.campaignId)) throw new Error("This campaign is no longer an unsent draft.");
  const campaign = await input.store.getCampaign(input.campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    const token = recipient.unsubscribeToken || input.makeToken();
    if (!recipient.unsubscribeToken) await input.store.setUnsubscribeToken(recipient.id, token);
    const message = buildNewsletterCampaignEmail({ body: campaign.body, unsubscribeUrl: `${input.canonicalOrigin}/newsletter/unsubscribe/${encodeURIComponent(token)}` });
    try {
      const delivered = await input.mailer.send({ to: recipient.email, subject: campaign.subject, ...message, idempotencyKey: `ehode-newsletter-${input.campaignId}-${recipient.id}` });
      await input.store.recordRecipient({ campaignId: input.campaignId, subscriptionId: recipient.id, email: recipient.email, status: "sent", resendMessageId: delivered.id });
      sent += 1;
    } catch (error) {
      const deliveryError = error instanceof Error ? error.message.slice(0, 1000) : "Newsletter delivery failed.";
      await input.store.recordRecipient({ campaignId: input.campaignId, subscriptionId: recipient.id, email: recipient.email, status: "failed", deliveryError });
      failed += 1;
    }
  }
  const status = summarizeCampaignDelivery({ sent, failed });
  await input.store.completeCampaign({ campaignId: input.campaignId, recipientCount: recipients.length, status, error: failed ? `${failed} recipient delivery attempt(s) failed.` : null });
  return { status, sent, failed };
}
