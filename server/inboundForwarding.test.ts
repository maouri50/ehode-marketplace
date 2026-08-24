import { afterEach, describe, expect, it, vi } from "vitest";

const verifyWebhook = vi.fn();
const forwardReceivedEmail = vi.fn();
const constructResend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    constructor(apiKey: string) {
      constructResend(apiKey);
    }
    webhooks = { verify: verifyWebhook };
    emails = { receiving: { forward: forwardReceivedEmail } };
  },
}));

import { ENV, normalizeResendFromEmail, resolveInboundWebhookSecret } from "./_core/env";
import { getInboundForwardingDestination, handleInboundForwardingWebhook, hasInboundForwardingDestination, isNewsletterRecipient, mailboxAddress, parseInboundWebhookDelivery } from "./inboundForwarding";

function webhookRequest(payload: string) {
  return {
    body: Buffer.from(payload),
    header: (name: string) => ({ "svix-id": "evt_123", "svix-timestamp": "1700000000", "svix-signature": "v1,signature" })[name] ?? undefined,
  } as any;
}

function webhookResponse() {
  const response = { code: 0, payload: undefined as unknown, ended: false };
  return {
    response: {
      status: (code: number) => { response.code = code; return { json: (payload: unknown) => { response.payload = payload; return response; }, end: () => { response.ended = true; return response; } }; },
    } as any,
    state: response,
  };
}

const originalConfiguration = {
  resendApiKey: ENV.resendApiKey,
  resendFromEmail: ENV.resendFromEmail,
  inboundForwardTo: ENV.inboundForwardTo,
  resendInboundWebhookSecret: ENV.resendInboundWebhookSecret,
};

afterEach(() => {
  Object.assign(ENV, originalConfiguration);
  verifyWebhook.mockReset();
  forwardReceivedEmail.mockReset();
  constructResend.mockReset();
});

describe("inbound forwarding configuration", () => {
  it("reads the project webhook-secret key while retaining compatibility with the dedicated key", () => {
    expect(resolveInboundWebhookSecret({ RESEND_WEBHOOK_SECRET: "whsec_project_key" } as NodeJS.ProcessEnv)).toBe("whsec_project_key");
    expect(resolveInboundWebhookSecret({ RESEND_INBOUND_WEBHOOK_SECRET: "whsec_dedicated_key", RESEND_WEBHOOK_SECRET: "whsec_project_key" } as NodeJS.ProcessEnv)).toBe("whsec_dedicated_key");
  });

  it("accepts the configured private forwarding destination without exposing its value", () => {
    expect(hasInboundForwardingDestination()).toBe(true);
    expect(getInboundForwardingDestination().length).toBeGreaterThan(5);
  });

  it("has a verified Ehode sender address configured for provider forwarding", () => {
    expect(normalizeResendFromEmail("Ehode\\u003cdownloads@mail.ehode.com\\u003e")).toBe("Ehode<downloads@mail.ehode.com>");
    expect(ENV.resendFromEmail).toMatch(/^[^<>]+<downloads@mail\.ehode\.com>$/i);
  });

  it("uses the configured Resend API key when safely processing a non-forwarded inbound event", async () => {
    expect(ENV.resendApiKey).toMatch(/^re_/);
    Object.assign(ENV, {
      resendFromEmail: "Ehode <hello@mail.ehode.com>",
      inboundForwardTo: "owner@example.com",
      resendInboundWebhookSecret: "whsec_api_key_check",
    });
    verifyWebhook.mockReturnValue({ type: "email.received", data: { email_id: "api-key-check", to: ["other@mail.ehode.com"] } });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(constructResend).toHaveBeenCalledWith(ENV.resendApiKey);
    expect(state.code).toBe(204);
    expect(forwardReceivedEmail).not.toHaveBeenCalled();
  });

  it("uses the configured signing secret when the inbound endpoint validates a safe non-forwarded event", async () => {
    Object.assign(ENV, {
      resendApiKey: "server-key",
      resendFromEmail: "Ehode <hello@mail.ehode.com>",
      inboundForwardTo: "owner@example.com",
      resendInboundWebhookSecret: "whsec_runtime_configuration_check",
    });
    verifyWebhook.mockImplementation((options: { webhookSecret: string }) => {
      expect(options.webhookSecret).toBe("whsec_runtime_configuration_check");
      return { type: "email.received", data: { email_id: "configuration-check", to: ["other@mail.ehode.com"] } };
    });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(state.code).toBe(204);
    expect(forwardReceivedEmail).not.toHaveBeenCalled();
  });

  it("accepts only a signed inbound event with a usable provider email ID", () => {
    expect(parseInboundWebhookDelivery({ type: "email.received", data: { email_id: "inbound-123", to: ["Newsletter <hello@mail.ehode.com>"] } })).toEqual({ emailId: "inbound-123", recipients: ["hello@mail.ehode.com"] });
    expect(parseInboundWebhookDelivery({ type: "email.sent", data: { email_id: "inbound-123", to: ["hello@mail.ehode.com"] } })).toBeNull();
    expect(parseInboundWebhookDelivery({ type: "email.received", data: { email_id: "", to: ["hello@mail.ehode.com"] } })).toBeNull();
  });

  it("filters delivery to the configured newsletter mailbox rather than forwarding all aliases", () => {
    expect(mailboxAddress("Ehode <HELLO@mail.ehode.com>")).toBe("hello@mail.ehode.com");
    expect(isNewsletterRecipient(["hello@mail.ehode.com"], "Ehode <hello@mail.ehode.com>")).toBe(true);
    expect(isNewsletterRecipient(["other@mail.ehode.com"], "Ehode <hello@mail.ehode.com>")).toBe(false);
  });

  it("rejects an inbound request whose provider signature cannot be verified", async () => {
    Object.assign(ENV, { resendApiKey: "server-key", resendFromEmail: "Ehode <hello@mail.ehode.com>", inboundForwardTo: "owner@example.com", resendInboundWebhookSecret: "whsec_test" });
    verifyWebhook.mockImplementation(() => { throw new Error("invalid signature"); });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest("{}"), response);

    expect(state.code).toBe(401);
    expect(forwardReceivedEmail).not.toHaveBeenCalled();
  });

  it("forwards only the selected newsletter address once, using the provider idempotency key", async () => {
    Object.assign(ENV, { resendApiKey: "server-key", resendFromEmail: "Ehode <hello@mail.ehode.com>", inboundForwardTo: "owner@example.com", resendInboundWebhookSecret: "whsec_test" });
    verifyWebhook.mockReturnValue({ type: "email.received", data: { email_id: "inbound-123", to: ["hello@mail.ehode.com"] } });
    forwardReceivedEmail.mockResolvedValue({ data: { id: "forwarded-123" }, error: null });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(state.code).toBe(202);
    expect(forwardReceivedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ emailId: "inbound-123", passthrough: true, to: "owner@example.com" }),
      { idempotencyKey: "ehode-inbound-forward-inbound-123" },
    );
  });

  it("does not forward messages received by a different alias and never creates an automatic reply", async () => {
    Object.assign(ENV, { resendApiKey: "server-key", resendFromEmail: "Ehode <hello@mail.ehode.com>", inboundForwardTo: "owner@example.com", resendInboundWebhookSecret: "whsec_test" });
    verifyWebhook.mockReturnValue({ type: "email.received", data: { email_id: "inbound-456", to: ["other@mail.ehode.com"] } });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(state.code).toBe(204);
    expect(forwardReceivedEmail).not.toHaveBeenCalled();
  });
});
