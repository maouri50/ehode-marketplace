import { ArrowLeft, BarChart3, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { ANALYTICS_PREFERENCES_EVENT } from "@/lib/analyticsConsent";

export default function Privacy() {
  return (
    <main className="privacy-page">
      <div className="container privacy-page__inner">
        <Link href="/" className="privacy-page__back"><ArrowLeft size={16} /> Back to Ehode</Link>
        <span className="eyebrow">Privacy & analytics</span>
        <h1>Visitor analytics, with your choice.</h1>
        <p className="privacy-page__lead">Ehode uses Google Analytics only when you choose to allow analytics. This helps us understand which public pages and products are useful, without adding your name, email address, or payment information to analytics reports.</p>
        <section className="privacy-page__grid">
          <article><BarChart3 size={22} /><h2>What we measure</h2><p>Aggregated visits, page views, broad device and location information, and how visitors reach public pages.</p></article>
          <article><ShieldCheck size={22} /><h2>Your control</h2><p>You can allow or decline analytics, then change your choice at any time. Declining prevents Google Analytics from loading on future visits.</p></article>
        </section>
        <button type="button" className="privacy-page__preferences" onClick={() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT))}>Change analytics preference</button>
        <p className="privacy-page__note">Google Analytics processes permitted analytics data under Google’s services. Read <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google’s Privacy Policy</a> for more information.</p>
      </div>
    </main>
  );
}
