import express, { type Application, type Request } from "express";
import { Resend } from "resend";
import { ENV } from "./_core/env";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxForwardedAttachments = 10;
const maxForwardedAttachmentBytes = 30 * 1024 * 1024;
export const inboundForwardingWebhookPath = "/api/email/inbound";

type InboundWebhookDelivery = {
  emailId: string;
  recipients: string[];
};

type InboundWebhookResponse = {
  status(code: number): InboundWebhookResponse;
  json(body: unknown): InboundWebhookResponse;
  end(): InboundWebhookResponse;
};

type ReceivedEmailForForwarding = {
  from?: string;
  reply_to?: string[] | null;
  subject?: string;
  html?: string | null;
  text?: string | null;
};

/** Returns the private forwarding address only for server-side use. */
export function getInboundForwardingDestination() {
  return mailboxAddress(ENV.inboundForwardTo);
}

export function hasInboundForwardingDestination() {
  return emailPattern.test(getInboundForwardingDestination());
}

export function mailboxAddress(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? "";
}

function safeHeaderText(value: string, fallback: string) {
  const cleaned = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 180);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

/** Uses a valid Reply-To header first, then falls back to the original sender. */
export function originalReplyAddress(email: ReceivedEmailForForwarding) {
  const candidates = [...(email.reply_to ?? []), email.from ?? ""];
  return candidates.map(mailboxAddress).find(candidate => emailPattern.test(candidate)) ?? "";
}

/** Creates the owner-only message shown in the private forwarding inbox. */
export function createOwnerForwardingMessage(email: ReceivedEmailForForwarding) {
  const replyTo = originalReplyAddress(email);
  const sender = mailboxAddress(email.from ?? "") || replyTo;
  if (!sender || !replyTo) return null;

  const subject = safeHeaderText(email.subject ?? "", "New message");
  const textBody = email.text?.trim() || "(No plain-text message body was supplied.)";
  const htmlBody = email.html?.trim() || `<pre style="white-space:pre-wrap">${escapeHtml(textBody)}</pre>`;
  const noticeText = `Original sender: ${sender}\nReplying to this message will send your response to that person.\n\n`;
  const noticeHtml = `<div style="font-family:Arial,sans-serif;border-left:4px solid #f76707;padding:12px 16px;margin:0 0 20px;background:#fff7ed"><strong>Original sender:</strong> ${escapeHtml(sender)}<br><span style="color:#555">Use Reply to send your response to this person.</span></div>`;

  return {
    replyTo,
    subject: `[Ehode] ${subject} — from ${sender}`,
    text: `${noticeText}${textBody}`,
    html: `${noticeHtml}${htmlBody}`,
  };
}

function safeAttachmentFilename(filename: string | undefined, index: number) {
  const cleaned = (filename ?? `attachment-${index + 1}`).replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 180);
  return cleaned || `attachment-${index + 1}`;
}

/** Retrieves bounded attachment bytes only for the outbound forward; nothing is persisted by Ehode. */
export async function retrieveInboundAttachments(resend: Resend, emailId: string) {
  const listed = await resend.emails.receiving.attachments.list({ emailId });
  if (listed.error || !listed.data) return [];

  const sourceAttachments = listed.data.data;
  if (sourceAttachments.length > maxForwardedAttachments || sourceAttachments.reduce((sum, attachment) => sum + attachment.size, 0) > maxForwardedAttachmentBytes) {
    console.warn("[Inbound email forwarding] Attachments exceed the safe forwarding limit");
    return [];
  }

  const forwardedAttachments: { filename: string; content: Buffer; contentType: string; contentId?: string }[] = [];
  for (let index = 0; index < sourceAttachments.length; index += 1) {
    const attachment = sourceAttachments[index];
    const download = await fetch(attachment.download_url);
    if (!download.ok) {
      console.warn("[Inbound email forwarding] Provider attachment download was unavailable");
      continue;
    }
    const content = Buffer.from(await download.arrayBuffer());
    if (content.byteLength > maxForwardedAttachmentBytes || forwardedAttachments.reduce((sum, item) => sum + item.content.byteLength, 0) + content.byteLength > maxForwardedAttachmentBytes) {
      console.warn("[Inbound email forwarding] Attachment bytes exceed the safe forwarding limit");
      break;
    }
    forwardedAttachments.push({
      filename: safeAttachmentFilename(attachment.filename, index),
      content,
      contentType: attachment.content_type,
      ...(attachment.content_id ? { contentId: attachment.content_id } : {}),
    });
  }
  return forwardedAttachments;
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

export async function handleInboundForwardingWebhook(request: Request, response: InboundWebhookResponse) {
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

  const missingConfiguration = missingInboundForwardingConfigurationNames();
  if (missingConfiguration.length) {
    console.error("[Inbound email forwarding] Required configuration is unavailable", missingConfiguration.join(", "));
    return response.status(503).json({ accepted: false, configuration: missingConfiguration });
  }

  const delivery = parseInboundWebhookDelivery(event);
  if (!delivery) return response.status(204).end();
  if (!isNewsletterRecipient(delivery.recipients, ENV.resendFromEmail)) return response.status(204).end();

  try {
    const received = await resend.emails.receiving.get(delivery.emailId);
    if (received.error || !received.data) {
      console.error("[Inbound email forwarding] Provider could not retrieve the received message");
      return response.status(502).json({ accepted: false });
    }

    const forwardingMessage = createOwnerForwardingMessage(received.data);
    if (!forwardingMessage) {
      console.error("[Inbound email forwarding] Received message has no valid reply address");
      return response.status(204).end();
    }

    const attachments = await retrieveInboundAttachments(resend, delivery.emailId);

    const forwarded = await resend.emails.send(
      {
        from: ENV.resendFromEmail,
        to: getInboundForwardingDestination(),
        replyTo: forwardingMessage.replyTo,
        subject: forwardingMessage.subject,
        text: forwardingMessage.text,
        html: forwardingMessage.html,
        ...(attachments.length ? { attachments } : {}),
      },
      { idempotencyKey: `ehode-inbound-forward-${delivery.emailId}` },
    );
    if (forwarded.error) {
      console.error("[Inbound email forwarding] Provider rejected forwarding", forwarded.error.name);
      return response.status(502).json({ accepted: false });
    }
    if (!forwarded.data?.id) throw new Error("Provider did not confirm forwarding.");
    return response.status(202).json({ accepted: true });
  } catch (error) {
    console.error("[Inbound email forwarding] Provider forwarding failed", error instanceof Error ? error.message : "Unknown error");
    return response.status(502).json({ accepted: false });
  }
}

export function registerInboundForwardingRoutes(app: Application) {
  app.post(inboundForwardingWebhookPath, express.raw({ type: "application/json", limit: "256kb" }), (request, response) => {
    void handleInboundForwardingWebhook(request, response);
  });
}
