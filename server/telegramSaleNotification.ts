import type { DownloadOrigin } from "./downloadOrigin";
import { ENV } from "./_core/env";

type TelegramFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type VerifiedSaleAlert = {
  orderId: number;
  totalAmount: number;
  currencyCode: string;
  titles: string[];
  origin?: DownloadOrigin;
};

export type FreeDownloadAlert = {
  listingTitle: string;
  filename: string;
  origin?: DownloadOrigin;
};

export type PaidDownloadAlert = {
  listingTitle: string;
  filename: string;
  origin?: DownloadOrigin;
};

function compactTitles(titles: string[]) {
  const cleaned = titles.map((title) => title.trim()).filter(Boolean);
  if (cleaned.length <= 3) return cleaned.join(", ");
  return `${cleaned.slice(0, 3).join(", ")} +${cleaned.length - 3} more`;
}

function formatOrigin(origin?: DownloadOrigin) {
  if (!origin) return [];
  return [
    `Country: ${origin.countryCode ?? "Unavailable"}`,
    `IP address: ${origin.ipAddress ?? "Unavailable"}`,
  ];
}

export function formatVerifiedSaleAlert(alert: VerifiedSaleAlert) {
  return [
    "New Ehode sale",
    `Order #${alert.orderId}`,
    `Total: ${alert.totalAmount.toFixed(2)} ${alert.currencyCode}`,
    `Items: ${compactTitles(alert.titles) || "Digital resource"}`,
    ...formatOrigin(alert.origin),
  ].join("\n");
}

export function formatFreeDownloadAlert(alert: FreeDownloadAlert) {
  return [
    "Free Ehode resource downloaded",
    `Resource: ${alert.listingTitle.trim() || "Digital resource"}`,
    `File: ${alert.filename.trim() || "Download"}`,
    ...formatOrigin(alert.origin),
  ].join("\n");
}

export function formatPaidDownloadAlert(alert: PaidDownloadAlert) {
  return [
    "Purchased Ehode resource downloaded",
    `Resource: ${alert.listingTitle.trim() || "Digital resource"}`,
    `File: ${alert.filename.trim() || "Download"}`,
    ...formatOrigin(alert.origin),
  ].join("\n");
}

export async function sendTelegramOwnerNotification(
  text: string,
  dependencies: { fetch?: TelegramFetch; botToken?: string; chatId?: string } = {},
) {
  const botToken = (dependencies.botToken ?? ENV.telegramBotToken).trim();
  const chatId = (dependencies.chatId ?? ENV.telegramOwnerChatId).trim();
  const request = dependencies.fetch ?? fetch;

  if (!botToken || !chatId) {
    console.warn("[Telegram sale alert] Configuration unavailable");
    return { sent: false as const, reason: "not_configured" as const };
  }

  try {
    const response = await request(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8_000),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (!response.ok || !payload?.ok) {
      console.warn("[Telegram sale alert] Provider delivery failed");
      return { sent: false as const, reason: "provider_rejected" as const };
    }
    return { sent: true as const };
  } catch {
    console.warn("[Telegram sale alert] Provider delivery failed");
    return { sent: false as const, reason: "provider_unavailable" as const };
  }
}

export function notifyVerifiedSale(alert: VerifiedSaleAlert) {
  return sendTelegramOwnerNotification(formatVerifiedSaleAlert(alert));
}

export function notifyFreeResourceDownload(alert: FreeDownloadAlert) {
  return sendTelegramOwnerNotification(formatFreeDownloadAlert(alert));
}

export function notifyPaidResourceDownload(alert: PaidDownloadAlert) {
  return sendTelegramOwnerNotification(formatPaidDownloadAlert(alert));
}
