import { and, eq } from "drizzle-orm";
import { marketplaceOrders } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";

type DeliveryOrder = {
  id: number;
  receiptToken: string;
  buyerEmail: string | null;
};

export function buildReceiptUrl(receiptToken: string) {
  return `${ENV.canonicalOrigin}/downloads/${encodeURIComponent(receiptToken)}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function buildOrderReceiptEmail(input: { receiptUrl: string; titles: string[] }) {
  const titleList = input.titles.map((title) => `<li>${escapeHtml(title)}</li>`).join("");
  return {
    subject: "Your Ehode download is ready",
    text: `Thank you for your purchase from Ehode. Your protected download page is ready: ${input.receiptUrl}`,
    html: `<main style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2f2a25"><h1>Your download is ready</h1><p>Thank you for your purchase from Ehode.</p><p>Your protected download page contains the files included with this order:</p><ul>${titleList}</ul><p><a href="${input.receiptUrl}" style="display:inline-block;background:#b65320;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Open my downloads</a></p><p style="font-size:13px;color:#6b625b">This is a transactional delivery email for your completed purchase. Keep this link private.</p></main>`,
  };
}

/**
 * Sends only after a verified PayPal capture. Repeated capture requests are stopped by
 * the unique payment-order guard before this function is reached, preventing duplicate sends.
 */
export async function sendOrderDeliveryEmail(input: { order: DeliveryOrder; titles: string[] }) {
  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  try {
    db = await getDb();
    if (!db) return { status: "failed" as const, reason: "database unavailable" };
    if (typeof (db as any).update !== "function") return { status: "skipped" as const, reason: "delivery status persistence unavailable" };

    if (!input.order.buyerEmail) {
      await db.update(marketplaceOrders).set({ deliveryEmailStatus: "skipped", deliveryEmailError: "Buyer email was unavailable." }).where(eq(marketplaceOrders.id, input.order.id));
      return { status: "skipped" as const, reason: "buyer email unavailable" };
    }
    if (!ENV.resendApiKey || !ENV.resendFromEmail) {
      await db.update(marketplaceOrders).set({ deliveryEmailStatus: "skipped", deliveryEmailError: "Resend is not configured." }).where(eq(marketplaceOrders.id, input.order.id));
      return { status: "skipped" as const, reason: "Resend not configured" };
    }

    await db.update(marketplaceOrders)
      .set({ deliveryEmailStatus: "sending", deliveryEmailError: null })
      .where(and(eq(marketplaceOrders.id, input.order.id), eq(marketplaceOrders.deliveryEmailStatus, "pending")));

    const receiptUrl = buildReceiptUrl(input.order.receiptToken);
    const message = buildOrderReceiptEmail({ receiptUrl, titles: input.titles });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `ehode-order-${input.order.id}-delivery`,
      },
      body: JSON.stringify({ from: ENV.resendFromEmail, to: [input.order.buyerEmail], ...message }),
    });
    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok || !payload.id) throw new Error(payload.message || `Resend returned ${response.status}`);
    await db.update(marketplaceOrders)
      .set({ deliveryEmailStatus: "sent", deliveryEmailMessageId: payload.id, deliveryEmailSentAt: new Date(), deliveryEmailError: null })
      .where(eq(marketplaceOrders.id, input.order.id));
    return { status: "sent" as const, id: payload.id, receiptUrl };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 1000) : "Unknown delivery error";
    if (db && typeof (db as any).update === "function") {
      await db.update(marketplaceOrders).set({ deliveryEmailStatus: "failed", deliveryEmailError: reason }).where(eq(marketplaceOrders.id, input.order.id)).catch(() => undefined);
    }
    console.error("[Order delivery email] Failed", error);
    return { status: "failed" as const, reason };
  }
}
