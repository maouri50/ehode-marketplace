import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({ get: blob.get, put: blob.put }));
vi.mock("./_core/env", () => ({
  ENV: { forgeApiKey: "local-test-key", forgeApiUrl: "https://forge.example.test" },
}));

import { storagePut, storageRead } from "./storage";

describe("Vercel Blob storage adapter", () => {
  const priorStoreId = process.env.BLOB_STORE_ID;

  beforeEach(() => {
    process.env.BLOB_STORE_ID = "store_test";
    blob.get.mockReset();
    blob.put.mockReset();
  });

  afterEach(() => {
    if (priorStoreId === undefined) delete process.env.BLOB_STORE_ID;
    else process.env.BLOB_STORE_ID = priorStoreId;
  });

  it("stores private downloads in Blob with unique pathnames", async () => {
    blob.put.mockResolvedValue({
      pathname: "product-files/1/guide_abc123.pdf",
      url: "https://blob.example.test/product-files/1/guide_abc123.pdf",
    });

    const uploaded = await storagePut("product-files/1/guide.pdf", Buffer.from("file"), "application/pdf");

    expect(blob.put).toHaveBeenCalledWith(
      expect.stringMatching(/^product-files\/1\/guide_[a-f0-9]{8}\.pdf$/),
      expect.any(Buffer),
      expect.objectContaining({ access: "private", addRandomSuffix: true, contentType: "application/pdf" }),
    );
    expect(uploaded.key).toBe("product-files/1/guide_abc123.pdf");
  });

  it("reads private Blob files only through the server adapter", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("secure file"));
        controller.close();
      },
    });
    blob.get.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { contentType: "text/plain" },
    });

    const result = await storageRead("product-files/1/guide_abc123.pdf");

    expect(blob.get).toHaveBeenCalledWith("product-files/1/guide_abc123.pdf", { access: "private" });
    expect(result.bytes.toString()).toBe("secure file");
    expect(result.contentType).toBe("text/plain");
  });
});
