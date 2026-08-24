import type { CookieOptions } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

type CookieRequest = {
  protocol?: string;
  headers?: Record<string, string | string[] | undefined>;
};

function isSecureRequest(req: CookieRequest) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: CookieRequest
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}

type HeaderResponse = {
  getHeader(name: string): number | string | string[] | undefined;
  setHeader(name: string, value: number | string | readonly string[]): unknown;
};

type PortableCookieOptions = Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure" | "maxAge">;

function cookieSameSiteValue(value: PortableCookieOptions["sameSite"]) {
  if (value === true || value === "strict") return "Strict";
  if (value === "lax") return "Lax";
  if (value === "none") return "None";
  return undefined;
}

function serializeCookie(name: string, value: string, options: PortableCookieOptions) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");

  const sameSite = cookieSameSiteValue(options.sameSite);
  if (sameSite) parts.push(`SameSite=${sameSite}`);

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${options.maxAge <= 0 ? 0 : Math.floor(options.maxAge / 1000)}`);
  }

  return parts.join("; ");
}

function appendSetCookie(res: HeaderResponse, serializedCookie: string) {
  const current = res.getHeader("Set-Cookie");
  const values = Array.isArray(current) ? current : typeof current === "string" ? [current] : [];
  res.setHeader("Set-Cookie", [...values, serializedCookie]);
}

/** Writes a cookie through standard Node response headers, including on Vercel serverless functions. */
export function setResponseCookie(res: HeaderResponse, name: string, value: string, options: PortableCookieOptions) {
  appendSetCookie(res, serializeCookie(name, value, options));
}

/** Clears a cookie through standard Node response headers without relying on Express-only helpers. */
export function clearResponseCookie(res: HeaderResponse, name: string, options: PortableCookieOptions) {
  appendSetCookie(res, serializeCookie(name, "", { ...options, maxAge: 0 }));
}
