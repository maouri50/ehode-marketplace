import { Link } from "wouter";

const shopLinks = [
  ["Browse all downloads", "/#collection"],
  ["Printable Templates", "/#collection"],
  ["SVG Design Bundles", "/#collection"],
  ["Design Assets", "/#collection"],
  ["Printables", "/#collection"],
  ["Creative Resources", "/#collection"],
  ["Free digital downloads", "/#collection"],
] as const;

const helpLinks = [
  ["About Ehode", "/#about"],
  ["Contact", "/contact"],
  ["Digital delivery", "/#how-it-works"],
  ["FAQ", "/faq"],
] as const;

const policyLinks = [
  ["Privacy policy", "/privacy"],
  ["Refund policy", "/refunds"],
  ["Terms of use", "/terms"],
] as const;

export function StoreFooter() {
  return <footer className="store-footer marketplace-footer">
    <div className="container store-footer__grid">
      <div className="store-footer__brand">
        <Link href="/" className="store-brand">ehode<span>.</span></Link>
        <p>Digital downloads for makers, planners, and creative projects.</p>
      </div>
      <nav aria-label="Shop information" className="store-footer__section">
        <h2>Shop info</h2>
        {shopLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
      </nav>
      <nav aria-label="About and help" className="store-footer__section">
        <h2>About &amp; help</h2>
        {helpLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
      </nav>
      <nav aria-label="Important links" className="store-footer__section">
        <h2>Important links</h2>
        {policyLinks.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
      </nav>
    </div>
    <div className="container store-footer__legal"><small>© {new Date().getFullYear()} Ehode. Independent digital goods.</small></div>
  </footer>;
}
