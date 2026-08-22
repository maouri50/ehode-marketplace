const configuredCanonicalOrigin = process.env.CANONICAL_ORIGIN?.trim();
const configuredSiteName = process.env.SITE_NAME?.trim();

function normalizeCanonicalOrigin(value?: string) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && url.hostname ? url.origin : "https://ehode.com";
  } catch {
    return "https://ehode.com";
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalSecret: process.env.PAYPAL_SECRET ?? "",
  paypalMode: process.env.PAYPAL_MODE ?? "sandbox",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  canonicalOrigin: normalizeCanonicalOrigin(configuredCanonicalOrigin),
  siteName: configuredSiteName || "Ehode",
};
