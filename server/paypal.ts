import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

const paypalBaseUrl = () => ENV.paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

type PayPalOrder = {
  id: string;
  status: string;
  payer?: { email_address?: string };
  purchase_units?: Array<{
    reference_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: Array<{ amount?: { currency_code?: string; value?: string } }> };
  }>;
};

export async function getPayPalAccessToken() {
  if (!ENV.paypalClientId || !ENV.paypalSecret) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PayPal is not configured yet." });
  }

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${ENV.paypalClientId}:${ENV.paypalSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PayPal authorization failed." });
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PayPal did not return an access token." });
  return body.access_token;
}

export async function createPayPalOrder(input: { referenceId: string; description: string; amount: string; currencyCode: string }) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: input.referenceId,
        description: input.description.slice(0, 127),
        amount: { currency_code: input.currencyCode, value: input.amount },
      }],
      application_context: { brand_name: "Ehode", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" },
    }),
  });
  const order = await response.json() as PayPalOrder;
  if (!response.ok || !order.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create the PayPal order." });
  return order;
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const order = await response.json() as PayPalOrder;
  if (!response.ok || order.status !== "COMPLETED") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "PayPal did not confirm the payment." });
  }
  return order;
}
