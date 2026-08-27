import { describe, expect, it } from "vitest";
import { getDownloadOrigin } from "./downloadOrigin";

function requestWith(headers: Record<string, string | undefined>) {
  return {
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };
}

describe("getDownloadOrigin", () => {
  it("uses the first trusted forwarded address and Vercel country code", () => {
    expect(getDownloadOrigin(requestWith({
      "x-forwarded-for": "203.0.113.24, 10.0.0.5",
      "x-vercel-ip-country": "ma",
    }))).toEqual({ ipAddress: "203.0.113.24", countryCode: "MA" });
  });

  it("omits missing or malformed origin data", () => {
    expect(getDownloadOrigin(requestWith({
      "x-forwarded-for": "",
      "x-vercel-ip-country": "Morocco",
    }))).toEqual({});
  });

  it("is safe when a non-Express test request only has an empty headers object", () => {
    expect(getDownloadOrigin({ headers: {} })).toEqual({});
  });

  it("removes line breaks before private alert formatting can use a header value", () => {
    expect(getDownloadOrigin(requestWith({ "x-forwarded-for": "203.0.113.24\nInjected" }))).toEqual({ ipAddress: "203.0.113.24 Injected" });
  });
});
