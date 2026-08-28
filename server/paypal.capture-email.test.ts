import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetDb = vi.hoisted(() => vi.fn());
const mockedCapturePayPalOrder = vi.hoisted(() => vi.fn());
const mockedSendOrderDeliveryEmail = vi.hoisted(() => vi.fn());
const mockedNotifyVerifiedSale = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ getDb: mockedGetDb }));
vi.mock("./paypal", () => ({
  capturePayPalOrder: mockedCapturePayPalOrder,
  createPayPalOrder: vi.fn(),
}));
vi.mock("./orderDeliveryEmail", () => ({ sendOrderDeliveryEmail: mockedSendOrderDeliveryEmail }));
vi.mock("./telegramSaleNotification", () => ({ notifyVerifiedSale: mockedNotifyVerifiedSale }));

import { storefrontRouter } from "./routers/storefront";

function queryResult<T>(value: T) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: async () => value,
    then: (resolve: (result: T) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(value).then(resolve, reject),
  };
  return chain;
}

function setCaptureDatabase() {
  const inserts: unknown[] = [];
  const selectionResults = [
    [{ id: 1, title: "Paid resource", priceAmount: "10.00", currencyCode: "USD" }],
    [],
    [{ id: 7, listingId: 1, originalFilename: "resource.pdf", mimeType: "application/pdf", storageKey: "product-files/1/resource.pdf" }],
  ];
  let insertId = 100;
  mockedGetDb.mockResolvedValue({
    select: vi.fn(() => queryResult(selectionResults.shift() ?? [])),
    insert: vi.fn(() => ({
      values: vi.fn(async (values: unknown) => {
        inserts.push(values);
        return [{ insertId: insertId++ }];
      }),
    })),
  });
  return inserts;
}

describe("PayPal capture buyer email persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSendOrderDeliveryEmail.mockResolvedValue({ sent: false });
    mockedNotifyVerifiedSale.mockResolvedValue({ sent: false, reason: "test" });
    mockedCapturePayPalOrder.mockResolvedValue({
      purchase_units: [{
        reference_id: "1:1",
        payments: { captures: [{ amount: { value: "10.00", currency_code: "USD" } }] },
      }],
      payer: { email_address: "Payer@Example.com" },
    });
  });

  function caller() {
    return storefrontRouter.createCaller({ user: null, req: { protocol: "https", headers: {} }, res: {} } as any);
  }

  it("stores the verified PayPal payer email when checkout email is omitted", async () => {
    const inserts = setCaptureDatabase();

    await (caller().paypal.captureOrder as any)({ paypalOrderId: "ORDER-FALLBACK-1" });

    expect(inserts[0]).toMatchObject({ buyerEmail: "payer@example.com" });
  });

  it("keeps a supplied buyer email ahead of the verified PayPal payer email", async () => {
    const inserts = setCaptureDatabase();

    await caller().paypal.captureOrder({ paypalOrderId: "ORDER-EMAIL-1", buyerEmail: "buyer@example.com" });

    expect(inserts[0]).toMatchObject({ buyerEmail: "buyer@example.com" });
  });
});
