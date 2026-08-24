import { useEffect, useState } from "react";
import {
  ANALYTICS_PREFERENCES_EVENT,
  type AnalyticsConsent,
  readAnalyticsConsent,
  saveAnalyticsConsent,
} from "@/lib/analyticsConsent";
import { Link } from "wouter";

const MEASUREMENT_ID = "G-QMPEGNEZH6";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadGoogleAnalytics() {
  if (document.querySelector(`script[data-ehode-ga="${MEASUREMENT_ID}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  script.dataset.ehodeGa = MEASUREMENT_ID;
  script.onload = () => {
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
    window.gtag("config", MEASUREMENT_ID);
  };
  document.head.appendChild(script);
}

function disableGoogleAnalytics() {
  window.gtag?.("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `_ga=; expires=${expires}; path=/`;
  document.cookie = `_ga_${MEASUREMENT_ID.slice(2)}=; expires=${expires}; path=/`;
}

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<AnalyticsConsent | undefined>();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = readAnalyticsConsent(localStorage);
    setConsent(saved);
    setIsOpen(!saved);
    if (saved === "granted") loadGoogleAnalytics();

    const openPreferences = () => setIsOpen(true);
    window.addEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, openPreferences);
  }, []);

  const choose = (choice: AnalyticsConsent) => {
    saveAnalyticsConsent(localStorage, choice);
    setConsent(choice);
    setIsOpen(false);
    if (choice === "granted") loadGoogleAnalytics();
    else disableGoogleAnalytics();
  };

  if (!isOpen) return null;

  return (
    <section className="analytics-consent" role="dialog" aria-label="Analytics preference">
      <div className="analytics-consent__copy">
        <p className="analytics-consent__eyebrow">Your privacy</p>
        <h2>{consent === "granted" ? "Analytics are enabled" : consent === "denied" ? "Analytics are off" : "Help us improve Ehode"}</h2>
        <p>With your permission, Ehode uses Google Analytics to understand visits and popular pages. We do not send names, email addresses, or payment details to Google Analytics.</p>
        <Link href="/privacy">Read our analytics notice</Link>
      </div>
      <div className="analytics-consent__actions">
        <button type="button" className="analytics-consent__allow" onClick={() => choose("granted")}>Allow analytics</button>
        <button type="button" className="analytics-consent__deny" onClick={() => choose("denied")}>{consent ? "Keep analytics off" : "No thanks"}</button>
      </div>
    </section>
  );
}
