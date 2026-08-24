import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const verifyWebhook = vi.fn();
const getReceivedEmail = vi.fn();
const listReceivedAttachments = vi.fn();
const sendEmail = vi.fn();
const constructResend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    constructor(apiKey: string) {
      constructResend(apiKey);
    }
    webhooks = { verify: verifyWebhook };
    emails = { receiving: { get: getReceivedEmail, attachments: { list: listReceivedAttachments } }, send: sendEmail };
  },
}));

import { ENV, normalizeResendFromEmail, resolveInboundWebhookSecret } from "./_core/env";
import {
  createOwnerForwardingMessage,
  getInboundForwardingDestination,
  handleInboundForwardingWebhook,
  hasInboundForwardingDestination,
  isNewsletterRecipient,
  mailboxAddress,
  missingInboundForwardingConfigurationNames,
  originalReplyAddress,
  parseInboundWebhookDelivery,
  retrieveInboundAttachments,
} from "./inboundForwarding";

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
      status: (code: number) => {
        response.code = code;
        return {
          json: (payload: unknown) => {
            response.payload = payload;
            return response;
          },
          end: () => {
            response.ended = true;
            return response;
          },
        };
      },
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
  getReceivedEmail.mockReset();
  listReceivedAttachments.mockReset();
  sendEmail.mockReset();
  constructResend.mockReset();
});

describe("inbound forwarding configuration", () => {
  it("reads the project webhook-secret key while retaining compatibility with the dedicated key", () => {
    expect(resolveInboundWebhookSecret({ RESEND_WEBHOOK_SECRET: "whsec_project_key" } as NodeJS.ProcessEnv)).toBe("whsec_project_key");
    expect(resolveInboundWebhookSecret({ RESEND_INBOUND_WEBHOOK_SECRET: "whsec_dedicated_key", RESEND_WEBHOOK_SECRET: "whsec_project_key" } as NodeJS.ProcessEnv)).toBe("whsec_dedicated_key");
  });

  it("routes the public inbound path through the bundled Vercel handler", () => {
    const entry = readFileSync(new URL("../api/entry.ts", import.meta.url), "utf8");
    const vercelConfig = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

    expect(entry).toContain('import app from "./handler.mjs"');
    expect(packageJson.scripts.build).toContain("esbuild api/bundle.ts");
    expect(vercelConfig.rewrites).toContainEqual({ source: "/api/email/inbound", destination: "/api/entry" });
  });

  it("accepts the configured private forwarding destination without exposing its value", () => {
    expect(hasInboundForwardingDestination()).toBe(true);
    expect(getInboundForwardingDestination().length).toBeGreaterThan(5);
  });

  it("normalizes a display-name forwarding destination to its single mailbox address", () => {
    ENV.inboundForwardTo = "Owner <owner@example.com>";
    expect(getInboundForwardingDestination()).toBe("owner@example.com");
    expect(hasInboundForwardingDestination()).toBe(true);
  });

  it("reports only missing configuration names without exposing secret values", () => {
    Object.assign(ENV, { resendApiKey: "", resendFromEmail: "", inboundForwardTo: "", resendInboundWebhookSecret: "" });
    expect(missingInboundForwardingConfigurationNames()).toEqual(["RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_WEBHOOK_SECRET", "INBOUND_FORWARD_TO"]);
  });

  it("reveals only missing configuration names after the provider signature is verified", async () => {
    Object.assign(ENV, { resendApiKey: "", resendFromEmail: "", inboundForwardTo: "", resendInboundWebhookSecret: "whsec_present" });
    verifyWebhook.mockReturnValue({ type: "email.received", data: { email_id: "configuration-diagnostic", to: ["downloads@mail.ehode.com"] } });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(state.code).toBe(503);
    expect(state.payload).toEqual({ accepted: false, configuration: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "INBOUND_FORWARD_TO"] });
    expect(JSON.stringify(state.payload)).not.toContain("whsec_present");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("has a verified Ehode sender address configured for provider forwarding", () => {
    expect(normalizeResendFromEmail("Ehode\\u003cdownloads@mail.ehode.com\\u003e")).toBe("Ehode<downloads@mail.ehode.com>");
    expect(ENV.resendFromEmail).toMatch(/^[^<>]+<downloads@mail\.ehode\.com>$/i);
  });

  it("uses the configured Resend API key when safely processing a non-forwarded inbound event", async () => {
    expect(ENV.resendApiKey).toMatch(/^re_/);
    Object.assign(ENV, { resendFromEmail: "Ehode <hello@mail.ehode.com>", inboundForwardTo: "owner@example.com", resendInboundWebhookSecret: "whsec_api_key_check" });
    verifyWebhook.mockReturnValue({ type: "email.received", data: { email_id: "api-key-check", to: ["other@mail.ehode.com"] } });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(constructResend).toHaveBeenCalledWith(ENV.resendApiKey);
    expect(state.code).toBe(204);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("uses the configured signing secret when the inbound endpoint validates a safe non-forwarded event", async () => {
    Object.assign(ENV, { resendApiKey: "server-key", resendFromEmail: "Ehode <hello@mail.ehode.com>", inboundForwardTo: "owner@example.com", resendInboundWebhookSecret: "whsec_runtime_configuration_check" });
    verifyWebhook.mockImplementation((options: { webhookSecret: string }) => {
      expect(options.webhookSecret).toBe("whsec_runtime_configuration_check");
      return { type: "email.received", data: { email_id: "configuration-check", to: ["other@mail.ehode.com"] } };
    });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(state.code).toBe(204);
    expect(sendEmail).not.toHaveBeenCalled();
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
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("identifies the original sender and routes Reply to a valid original Reply-To address", () => {
    expect(originalReplyAddress({ from: "Customer <customer@example.com>", reply_to: ["help@example.com"] })).toBe("help@example.com");
    expect(createOwnerForwardingMessage({
      from: "Customer <customer@example.com>",
      reply_to: ["help@example.com"],
      subject: "Question\r\nBcc: nobody@example.com",
      text: "Could you help me?",
    })).toMatchObject({
      replyTo: "help@example.com",
      subject: "[Ehode] Question Bcc: nobody@example.com — from customer@example.com",
    });
  });

  it("does not create a reply-capable forward when the original sender is invalid", () => {
    expect(createOwnerForwardingMessage({ from: "not an email", subject: "Hello" })).toBeNull();
  });

  it("copies small inbound attachments only into the outbound forward request", async () => {
    listReceivedAttachments.mockResolvedValue({
      data: {
        data: [{ id: "attachment-1", filename: "question.pdf", size: 3, content_type: "application/pdf", content_disposition: "attachment", download_url: "https://provider.example/attachment" }],
      },
      error: null,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const fakeResend = { emails: { receiving: { attachments: { list: listReceivedAttachments } } } } as any;

    await expect(retrieveInboundAttachments(fakeResend, "inbound-attachment")).resolves.toMatchObject([{ filename: "question.pdf", contentType: "application/pdf" }]);
    expect(fetchSpy).toHaveBeenCalledWith("https://provider.example/attachment");
    fetchSpy.mockRestore();
  });

  it("forwards only the selected newsletter address once with visible sender context and a Reply-To header", async () => {
    Object.assign(ENV, { resendApiKey: "server-key", resendFromEmail: "Ehode <hello@mail.ehode.com>", inboundForwardTo: "owner@example.com", resendInboundWebhookSecret: "whsec_test" });
    verifyWebhook.mockReturnValue({ type: "email.received", data: { email_id: "inbound-123", to: ["hello@mail.ehode.com"] } });
    getReceivedEmail.mockResolvedValue({ data: { from: "Customer <customer@example.com>", reply_to: null, subject: "A real question", text: "Please help." }, error: null });
    listReceivedAttachments.mockResolvedValue({ data: { data: [] }, error: null });
    sendEmail.mockResolvedValue({ data: { id: "forwarded-123" }, error: null });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(state.code).toBe(202);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        replyTo: "customer@example.com",
        subject: "[Ehode] A real question — from customer@example.com",
        text: expect.stringContaining("Original sender: customer@example.com"),
      }),
      { idempotencyKey: "ehode-inbound-forward-inbound-123" },
    );
  });

  it("does not forward messages received by a different alias and never creates an automatic reply", async () => {
    Object.assign(ENV, { resendApiKey: "server-key", resendFromEmail: "Ehode <hello@mail.ehode.com>", inboundForwardTo: "owner@example.com", resendInboundWebhookSecret: "whsec_test" });
    verifyWebhook.mockReturnValue({ type: "email.received", data: { email_id: "inbound-456", to: ["other@mail.ehode.com"] } });
    const { response, state } = webhookResponse();

    await handleInboundForwardingWebhook(webhookRequest('{"type":"email.received"}'), response);

    expect(state.code).toBe(204);
    expect(getReceivedEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
