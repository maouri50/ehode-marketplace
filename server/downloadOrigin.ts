export type DownloadOrigin = {
  ipAddress?: string;
  countryCode?: string;
};

function cleanSingleLine(value: string | undefined, maxLength: number) {
  const cleaned = value?.replace(/[\r\n]/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function readHeader(request: unknown, name: string) {
  if (!request || typeof request !== "object") return undefined;
  const candidate = request as { get?: unknown; headers?: unknown };

  if (typeof candidate.get === "function") {
    const value = (candidate.get as (headerName: string) => unknown)(name);
    return typeof value === "string" ? value : undefined;
  }

  if (!candidate.headers || typeof candidate.headers !== "object") return undefined;
  const value = (candidate.headers as Record<string, unknown>)[name.toLowerCase()];
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

/**
 * Vercel provides the client public address and an approximate country for a
 * request. Treat both as optional because they are unavailable in local and
 * non-Vercel environments.
 */
export function getDownloadOrigin(request: unknown): DownloadOrigin {
  const forwardedFor = cleanSingleLine(readHeader(request, "x-forwarded-for"), 128);
  const ipAddress = forwardedFor?.split(",")[0]?.trim();
  const country = cleanSingleLine(readHeader(request, "x-vercel-ip-country"), 32)?.toUpperCase();

  return {
    ...(ipAddress ? { ipAddress } : {}),
    ...(country && /^[A-Z]{2}$/.test(country) ? { countryCode: country } : {}),
  };
}
