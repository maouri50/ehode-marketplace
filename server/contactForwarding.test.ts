import { describe, expect, it } from "vitest";
import { createContactForwardingMessage } from "./contactForwarding";

describe("Contact form owner forwarding", () => {
  it("preserves a safe Reply-To route while keeping the personal destination out of the generated message", () => {
    const email = createContactForwardingMessage({
      name: "Taylor\nVisitor",
      email: "TAYLOR@example.com",
      subject: "Question\r\nabout a printable",
      message: "Hello <Ehode>, can you help?",
    });

    expect(email.replyTo).toBe("taylor@example.com");
    expect(email.subject).toBe("[Ehode Contact] Question about a printable — from Taylor Visitor");
    expect(email.html).toContain("Hello &lt;Ehode&gt;, can you help?");
    expect(email.text).toContain("Replying to this email will send your response to taylor@example.com.");
  });
});
