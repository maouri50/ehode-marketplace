import { nanoid } from "nanoid";

export function normalizeNewsletterEmail(value: string) {
  return value.trim().toLowerCase();
}

export const NEWSLETTER_SUCCESS_MESSAGE = "You are on the list. Watch your inbox for future Ehode news.";

type SubscriptionStatus = "active" | "unsubscribed";

export type NewsletterSubscriptionStore = {
  findByEmail: (email: string) => Promise<{ id: number; status: SubscriptionStatus } | null>;
  create: (email: string, unsubscribeToken: string) => Promise<void>;
  reactivate: (id: number) => Promise<void>;
};

/** Persists consent while keeping the public success wording the same for all email states. */
export async function subscribeNewsletter(store: NewsletterSubscriptionStore, rawEmail: string) {
  const email = normalizeNewsletterEmail(rawEmail);
  const existing = await store.findByEmail(email);
  let confirmationRequired = false;
  if (!existing) {
    await store.create(email, nanoid(40));
    confirmationRequired = true;
  } else if (existing.status === "unsubscribed") {
    await store.reactivate(existing.id);
    confirmationRequired = true;
  }
  return { success: true, message: NEWSLETTER_SUCCESS_MESSAGE, confirmationRequired };
}
