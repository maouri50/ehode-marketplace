import express, { type Express, type Request, type Response } from "express";
import { Resend } from "resend";
import { ENV } from "./_core/env";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const inboundForwardingWebhookPath = "/api/email/inbound";

type InboundWebhookDelivery = {
  emailId: string;
  recipients: string[];
};

/** Returns the private forwarding address only for server-side use. */
export function getInboundForwardingDestination() {
  return ENV.inboundForwardTo;
}

export function hasInboundForwardingDestination() {
  return emailPattern.test(getInboundForwardingDestination());
}

export function mailboxAddress(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? "";
}

export function parseInboundWebhookDelivery(event: unknown): InboundWebhookDelivery | null {
  if (!event || typeof event !== "object") return null;
  const record = event as { type?: unknown; data?: { email_id?: unknown; to?: unknown } };
  if (record.type !== "email.received" || !record.data || typeof record.data.email_id !== "string" || !record.data.email_id.trim() || !Array.isArray(record.data.to)) return null;
  const recipients = record.data.to.filter((value): value is string => typeof value === "string").map(mailboxAddress).filter(Boolean);
  return recipients.length ? { emailId: record.data.email_id.trim(), recipients } : null;
}

export function isNewsletterRecipient(recipients: string[], configuredSender: string) {
  const expected = mailboxAddress(configuredSender);
  return Boolean(expected) && recipients.includes(expected);
}

export function missingInboundForwardingConfigurationNames() {
  return [
    !ENV.resendApiKey ? "RESEND_API_KEY" : null,
    !ENV.resendFromEmail ? "RESEND_FROM_EMAIL" : null,
    !ENV.resendInboundWebhookSecret ? "RESEND_WEBHOOK_SECRET" : null,
    !hasInboundForwardingDestination() ? "INBOUND_FORWARD_TO" : null,
  ].filter((name): name is string => Boolean(name));
}

function webhookHeaders(request: Request) {
  const id = request.header("svix-id");
  const timestamp = request.header("svix-timestamp");
  const signature = request.header("svix-signature");
  return id && timestamp && signature ? { id, timestamp, signature } : null;
}

export async function handleInboundForwardingWebhook(request: Request, response: Response) {
  const missingConfiguration = missingInboundForwardingConfigurationNames();
  if (missingConfiguration.length) {
    console.error("[Inbound email forwarding] Required configuration is unavailable", missingConfiguration.join(", "));
    return response.status(503).json({ accepted: false });
  }
  const headers = webhookHeaders(request);
  const payload = Buffer.isBuffer(request.body) ? request.body.toString("utf8") : "";
  if (!headers || !payload) return response.status(400).json({ accepted: false });

  const resend = new Resend(ENV.resendApiKey);
  let event: unknown;
  try {
    event = resend.webhooks.verify({ payload, headers, webhookSecret: ENV.resendInboundWebhookSecret });
  } catch {
    return response.status(401).json({ accepted: false });
  }

  const delivery = parseInboundWebhookDelivery(event);
  if (!delivery) return response.status(204).end();
  if (!isNewsletterRecipient(delivery.recipients, ENV.resendFromEmail)) return response.status(204).end();

  try {
    const forwarded = await resend.emails.receiving.forward(
      {
        emailId: delivery.emailId,
        from: ENV.resendFromEmail,
        to: getInboundForwardingDestination(),
        passthrough: true,
      },
      { idempotencyKey: `ehode-inbound-forward-${delivery.emailId}` },
    );
    if (forwarded.error || !forwarded.data?.id) throw new Error("Provider did not confirm forwarding.");
    return response.status(202).json({ accepted: true });
  } catch (error) {
    console.error("[Inbound email forwarding] Provider forwarding failed", error instanceof Error ? error.message : "Unknown error");
    return response.status(502).json({ accepted: false });
  }
}

export function registerInboundForwardingRoutes(app: Express) {
  app.post(inboundForwardingWebhookPath, express.raw({ type: "application/json", limit: "256kb" }), (request, response) => {
    void handleInboundForwardingWebhook(request, response);
  });
}
