import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { COOKIE_NOTICE_DISMISSAL_KEY, COOKIE_NOTICE_TEXT, getCookieNoticeDismissed } from "@/lib/cookieNotice";

export function CookieNotice() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getCookieNoticeDismissed(window.localStorage));
  }, []);

  if (!visible || location.startsWith("/admin")) return null;

  return <aside className="cookie-notice" role="status" aria-label="Cookie notice">
    <p>{COOKIE_NOTICE_TEXT}</p>
    <button type="button" aria-label="Close cookie notice" onClick={() => {
      window.localStorage.setItem(COOKIE_NOTICE_DISMISSAL_KEY, "true");
      setVisible(false);
    }}><X size={16}/></button>
  </aside>;
}
