import { describe, expect, it } from "vitest";

type PayPalTokenResponse = {
  access_token?: string;
  token_type?: string;
};

describe("PayPal credentials", () => {
  it("obtains an OAuth access token using the configured server credentials", async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_SECRET;
    const environment = process.env.PAYPAL_MODE ?? "sandbox";

    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();
    expect(["sandbox", "live"]).toContain(environment);

    const baseUrl = environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    expect(response.ok).toBe(true);
    const body = await response.json() as PayPalTokenResponse;
    expect(body.token_type).toBe("Bearer");
    expect(body.access_token).toBeTruthy();
  }, 20_000);
});
