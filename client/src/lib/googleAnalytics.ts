export const GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-QMPEGNEZH6";

export function googleAnalyticsScriptUrl(measurementId = GOOGLE_ANALYTICS_MEASUREMENT_ID) {
  return `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
}
