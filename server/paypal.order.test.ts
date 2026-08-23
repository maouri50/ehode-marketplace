import { describe, expect, it } from "vitest";
import { createPayPalOrder } from "./paypal";

const isSandbox = (process.env.PAYPAL_MODE ?? "sandbox") === "sandbox";

describe.skipIf(!isSandbox)("PayPal Sandbox order creation", () => {
  it("creates an unapproved Sandbox order for a digital product", async () => {
    const order = await createPayPalOrder({
      referenceId: "5:1",
      description: "Ehode Sandbox checkout verification",
      amount: "2.00",
      currencyCode: "USD",
    });

    expect(order.id).toBeTruthy();
    expect(["CREATED", "PAYER_ACTION_REQUIRED"]).toContain(order.status);
  }, 20_000);
});
