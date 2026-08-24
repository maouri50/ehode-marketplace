import { ENV } from "./_core/env";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function buildBuyerResetUrl(token: string) {
  return `${ENV.canonicalOrigin}/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildBuyerPasswordResetEmail(resetUrl: string) {
  const safeUrl = escapeHtml(resetUrl);
  return {
    subject: "Reset your Ehode password",
    text: `Use this secure link to reset your Ehode password: ${resetUrl}\n\nThis link expires in one hour and can only be used once. If you did not request a password reset, you can ignore this email.`,
    html: `<main style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#2f2a25"><h1>Reset your password</h1><p>Use the secure button below to choose a new Ehode password.</p><p><a href="${safeUrl}" style="display:inline-block;background:#b65320;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Reset my password</a></p><p style="font-size:13px;color:#6b625b">This link expires in one hour and can only be used once. If you did not request it, you can safely ignore this email.</p></main>`,
  };
}

export async function sendBuyerPasswordResetEmail(input: { email: string; token: string }) {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ENV.resendFromEmail, to: [input.email], ...buildBuyerPasswordResetEmail(buildBuyerResetUrl(input.token)) }),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string };
  return response.ok && Boolean(payload.id);
}
