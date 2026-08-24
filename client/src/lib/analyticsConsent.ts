export const ANALYTICS_CONSENT_STORAGE_KEY = "ehode.analytics-consent";
export const ANALYTICS_PREFERENCES_EVENT = "ehode:analytics-preferences";

export type AnalyticsConsent = "granted" | "denied";

export type ConsentStorage = Pick<Storage, "getItem" | "setItem">;

export function parseAnalyticsConsent(value: string | null): AnalyticsConsent | undefined {
  return value === "granted" || value === "denied" ? value : undefined;
}

export function readAnalyticsConsent(storage: Pick<Storage, "getItem">): AnalyticsConsent | undefined {
  return parseAnalyticsConsent(storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
}

export function saveAnalyticsConsent(storage: Pick<Storage, "setItem">, consent: AnalyticsConsent) {
  storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
}
