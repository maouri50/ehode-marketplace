import { useEffect } from "react";
import { GOOGLE_ANALYTICS_MEASUREMENT_ID, googleAnalyticsScriptUrl } from "@/lib/googleAnalytics";
import { getCookieAnalyticsChoice } from "@/lib/cookieNotice";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    const loadGoogleAnalytics = () => {
      if (getCookieAnalyticsChoice(window.localStorage) !== "accepted") return;
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
    };

    loadGoogleAnalytics();
    window.addEventListener("ehode:analytics-choice", loadGoogleAnalytics);
    return () => window.removeEventListener("ehode:analytics-choice", loadGoogleAnalytics);
  }, []);

  return null;
}
