import { useEffect } from "react";
import { GOOGLE_ANALYTICS_MEASUREMENT_ID, googleAnalyticsScriptUrl } from "@/lib/googleAnalytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    if (document.querySelector(`script[data-ehode-ga="${GOOGLE_ANALYTICS_MEASUREMENT_ID}"]`)) return;

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ANALYTICS_MEASUREMENT_ID);

    const script = document.createElement("script");
    script.async = true;
    script.src = googleAnalyticsScriptUrl();
    script.dataset.ehodeGa = GOOGLE_ANALYTICS_MEASUREMENT_ID;
    document.head.appendChild(script);
  }, []);

  return null;
}
