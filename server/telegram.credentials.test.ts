import { describe, expect, it } from "vitest";

describe("dedicated Ehode Telegram bot credentials", () => {
  it("authenticates the configured bot through Telegram's lightweight getMe endpoint", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(10_000),
    });
    const payload = (await response.json()) as { ok?: boolean; result?: { is_bot?: boolean } };

    expect(response.ok).toBe(true);
    expect(payload.ok).toBe(true);
    expect(payload.result?.is_bot).toBe(true);
  }, 15_000);
});
