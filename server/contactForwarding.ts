import { Resend } from "resend";
import { ENV } from "./_core/env";
import { getInboundForwardingDestination, hasInboundForwardingDestination } from "./inboundForwarding";

export type ContactForwardingInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

function safeHeaderText(value: string, fallback: string) {
  const cleaned = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 180);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

/** Builds the owner-only email; the forwarding destination is never returned to public callers. */
export function createContactForwardingMessage(input: ContactForwardingInput) {
  const name = safeHeaderText(input.name, "Website visitor");
  const email = input.email.trim().toLowerCase();
  const subject = safeHeaderText(input.subject, "New contact message");
  const message = input.message.trim();

  return {
    replyTo: email,
    subject: `[Ehode Contact] ${subject} — from ${name}`,
    text: `New Ehode Contact message\n\nFrom: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nReplying to this email will send your response to ${email}.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#241b17"><h2 style="margin:0 0 16px">New Ehode Contact message</h2><p><strong>From:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Subject:</strong> ${escapeHtml(subject)}</p><div style="white-space:pre-wrap;border-left:4px solid #f76707;padding:12px 16px;background:#fff7ed">${escapeHtml(message)}</div><p style="color:#5b504b">Replying to this email will send your response to ${escapeHtml(email)}.</p></div>`,
  };
}

/** Sends a private owner notification only after the Contact form is accepted and saved. */
export async function forwardContactMessage(input: ContactForwardingInput) {
  if (!ENV.resendApiKey || !ENV.resendFromEmail || !hasInboundForwardingDestination()) {
    console.error("[Contact forwarding] Required private email forwarding configuration is unavailable");
    return { delivered: false as const };
  }

  try {
    const result = await new Resend(ENV.resendApiKey).emails.send({
      from: ENV.resendFromEmail,
      to: getInboundForwardingDestination(),
      ...createContactForwardingMessage(input),
    });
    if (result.error || !result.data?.id) {
      console.error("[Contact forwarding] Email provider did not accept the owner notification");
      return { delivered: false as const };
    }
    return { delivered: true as const };
  } catch {
    console.error("[Contact forwarding] Owner notification delivery failed");
    return { delivered: false as const };
  }
}
