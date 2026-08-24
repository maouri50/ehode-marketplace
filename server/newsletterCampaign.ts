import { z } from "zod";

export const newsletterCampaignSendConfirmation = z.literal("SEND");
export const newsletterCampaignTemplateValues = ["manual", "latest", "seasonal", "selected"] as const;
export type NewsletterCampaignTemplate = typeof newsletterCampaignTemplateValues[number];

export type NewsletterCampaignProduct = {
  listingId: number | null;
  handle: string;
  title: string;
  priceAmount: string;
  currencyCode: string;
  coverImageUrl: string | null;
  sortOrder: number;
};

export type NewsletterCampaignDraft = {
  subject: string;
  body: string;
  recipientCount: number;
  templateType: NewsletterCampaignTemplate;
  seasonLabel: string | null;
  products: NewsletterCampaignProduct[];
};

export type CampaignRecipient = { id: number; email: string; unsubscribeToken: string | null };
export type StoredCampaignSubscriber = CampaignRecipient & { status: "active" | "unsubscribed" };

export type NewsletterCampaignStore = {
  countActiveSubscribers: () => Promise<number>;
  createDraft: (input: NewsletterCampaignDraft) => Promise<number>;
  claimDraft: (campaignId: number) => Promise<boolean>;
  getCampaign: (campaignId: number) => Promise<Pick<NewsletterCampaignDraft, "subject" | "body" | "templateType" | "seasonLabel" | "products"> | null>;
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

function absoluteUrl(origin: string, value: string) {
  try { return new URL(value, origin).toString(); } catch { return origin; }
}

export function buildNewsletterCampaignEmail(input: { body: string; unsubscribeUrl: string; products?: NewsletterCampaignProduct[]; canonicalOrigin?: string; templateType?: NewsletterCampaignTemplate; seasonLabel?: string | null }) {
  const paragraphs = input.body.trim().split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`).join("");
  const products = input.products ?? [];
  const origin = input.canonicalOrigin ?? "https://www.ehode.com";
  const productHeading = input.templateType === "seasonal" && input.seasonLabel ? `${escapeHtml(input.seasonLabel)} picks for you` : input.templateType === "latest" ? "Our latest picks for you" : "Selected resources for you";
  const productCards = products.length ? `<section style="margin:30px 0"><h2 style="margin:0 0 16px;font:600 21px Georgia,serif;color:#2f2924">${productHeading}</h2>${products.map((product) => {
    const link = absoluteUrl(origin, `/products/${encodeURIComponent(product.handle)}`);
    const cover = product.coverImageUrl ? `<a href="${escapeHtml(link)}" style="display:block;text-decoration:none"><img src="${escapeHtml(absoluteUrl(origin, product.coverImageUrl))}" alt="${escapeHtml(product.title)}" width="156" style="display:block;width:156px;max-width:100%;height:auto;border:0;border-radius:10px;background:#f2ece5"/></a>` : "";
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;border:1px solid #eadfd5;border-radius:10px;background:#fffdf9"><tr><td style="padding:14px;vertical-align:top;width:168px">${cover}</td><td style="padding:16px 16px 16px 0;vertical-align:top"><p style="margin:0 0 7px;font-size:16px;font-weight:700;line-height:1.35;color:#2f2924">${escapeHtml(product.title)}</p><p style="margin:0 0 14px;font-size:14px;color:#6c6259">${escapeHtml(product.currencyCode)} ${escapeHtml(product.priceAmount)}</p><a href="${escapeHtml(link)}" style="display:inline-block;color:#8b421f;font-size:14px;font-weight:700;text-decoration:none">View resource →</a></td></tr></table>`;
  }).join("")}<p style="margin:18px 0 0"><a href="${escapeHtml(absoluteUrl(origin, "/#collection"))}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#d85e26;color:#fff;text-decoration:none;font-size:14px;font-weight:700">Explore all resources →</a></p></section>` : "";
  const footer = `<hr style="border:0;border-top:1px solid #e5ded7;margin:28px 0 16px"/><p style="font-size:12px;line-height:1.5;color:#6c6259">You received this email because you chose to receive Ehode news. <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#8b421f">Unsubscribe</a>.</p>`;
  const plainProducts = products.length ? `\n\n${productHeading}\n${products.map((product) => `- ${product.title} — ${product.currencyCode} ${product.priceAmount}: ${absoluteUrl(origin, `/products/${encodeURIComponent(product.handle)}`)}`).join("\n")}\nExplore all resources: ${absoluteUrl(origin, "/#collection")}` : "";
  return {
    html: `<main style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:28px 20px;color:#2f2a25;line-height:1.6"><p style="margin:0 0 20px;font-size:18px;font-weight:700;letter-spacing:.04em">ehode<span style="color:#d45b22">.</span></p>${paragraphs}${productCards}${footer}</main>`,
    text: `${input.body.trim()}${plainProducts}\n\nYou received this email because you chose to receive Ehode news. Unsubscribe: ${input.unsubscribeUrl}`,
  };
}

export function summarizeCampaignDelivery(result: { sent: number; failed: number }) {
  if (result.sent === 0) return "failed" as const;
  return result.failed === 0 ? "sent" as const : "partial" as const;
}

export async function createNewsletterCampaignDraft(store: Pick<NewsletterCampaignStore, "countActiveSubscribers" | "createDraft">, input: Omit<NewsletterCampaignDraft, "recipientCount">) {
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
    const message = buildNewsletterCampaignEmail({ body: campaign.body, products: campaign.products, canonicalOrigin: input.canonicalOrigin, templateType: campaign.templateType, seasonLabel: campaign.seasonLabel, unsubscribeUrl: `${input.canonicalOrigin}/newsletter/unsubscribe/${encodeURIComponent(token)}` });
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
