import { useState } from "react";
import { useLocation } from "wouter";
import { COOKIE_ANALYTICS_CHOICE_KEY, COOKIE_NOTICE_TEXT, CookieAnalyticsChoice, getCookieAnalyticsChoice } from "@/lib/cookieNotice";

export function CookieNotice() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(() => (
    typeof window !== "undefined" && !getCookieAnalyticsChoice(window.localStorage)
  ));

  if (!visible || location.startsWith("/admin")) return null;

  const choose = (choice: CookieAnalyticsChoice) => {
    window.localStorage.setItem(COOKIE_ANALYTICS_CHOICE_KEY, choice);
    window.dispatchEvent(new CustomEvent("ehode:analytics-choice", { detail: choice }));
    setVisible(false);
  };

  return <aside className="cookie-notice" role="dialog" aria-label="Cookie notice">
    <p>{COOKIE_NOTICE_TEXT}</p>
    <div className="cookie-notice__actions">
      <button type="button" className="cookie-notice__accept" onClick={() => choose("accepted")}>Accept</button>
      <button type="button" className="cookie-notice__decline" onClick={() => choose("declined")}>Decline</button>
    </div>
  </aside>;
}
