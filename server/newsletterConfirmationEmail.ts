import { Resend } from "resend";
import { ENV } from "./_core/env";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

/** Creates the transactional confirmation sent only after a new or renewed newsletter subscription. */
export function createNewsletterSubscriptionConfirmationMessage(email: string) {
  const recipient = email.trim().toLowerCase();
  return {
    subject: "You’re subscribed to Ehode Notes",
    text: `You’re subscribed to Ehode Notes.\n\nYou’ll receive occasional digital product releases, printable ideas, and studio updates at ${recipient}.\n\nYou can unsubscribe at any time using the link in a future newsletter.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#241b17;max-width:600px;margin:auto"><p style="letter-spacing:.12em;font-size:12px;font-weight:700;color:#19736a">EHODE NOTES</p><h1 style="font-family:Georgia,serif;font-size:30px;margin:0 0 16px">You’re on the creative list.</h1><p>Thanks for subscribing to Ehode Notes.</p><p>You’ll receive occasional digital product releases, printable ideas, and studio updates at <strong>${escapeHtml(recipient)}</strong>.</p><p style="color:#5b504b;font-size:14px">You can unsubscribe at any time using the link in a future newsletter.</p></div>`,
  };
}

/** Does not reveal delivery details to public callers and never changes an already-saved subscription. */
export async function sendNewsletterSubscriptionConfirmation(email: string) {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) {
    console.error("[Newsletter confirmation] Required email configuration is unavailable");
    return { delivered: false as const };
  }

  try {
    const result = await new Resend(ENV.resendApiKey).emails.send({
      from: ENV.resendFromEmail,
      to: [email.trim().toLowerCase()],
      ...createNewsletterSubscriptionConfirmationMessage(email),
    });
    if (result.error || !result.data?.id) {
      console.error("[Newsletter confirmation] Email provider did not accept the confirmation");
      return { delivered: false as const };
    }
    return { delivered: true as const };
  } catch {
    console.error("[Newsletter confirmation] Delivery failed");
    return { delivered: false as const };
  }
}
