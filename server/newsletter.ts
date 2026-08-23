export function normalizeNewsletterEmail(value: string) {
  return value.trim().toLowerCase();
}

export const NEWSLETTER_SUCCESS_MESSAGE = "You are on the list. Watch your inbox for future Ehode news.";

type SubscriptionStatus = "active" | "unsubscribed";

export type NewsletterSubscriptionStore = {
  findByEmail: (email: string) => Promise<{ id: number; status: SubscriptionStatus } | null>;
  create: (email: string) => Promise<void>;
  reactivate: (id: number) => Promise<void>;
};

export async function subscribeNewsletter(store: NewsletterSubscriptionStore, rawEmail: string) {
  const email = normalizeNewsletterEmail(rawEmail);
  const existing = await store.findByEmail(email);
  if (!existing) await store.create(email);
  if (existing?.status === "unsubscribed") await store.reactivate(existing.id);
  return { success: true, message: NEWSLETTER_SUCCESS_MESSAGE };
}
