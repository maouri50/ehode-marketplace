import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { announcementFontStack, DEFAULT_ANNOUNCEMENT_BAR, nextAnnouncementIndex } from "@shared/announcementBar";
import { CircleUserRound, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
export function StoreHeader() {
  const { itemCount, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const announcementQuery = trpc.storefront.announcement.get.useQuery(undefined, { staleTime: 60_000 });
  const announcement = announcementQuery.data ?? DEFAULT_ANNOUNCEMENT_BAR;
  const messageCount = announcement.messages.length;
  const activeMessage = announcement.messages[announcementIndex] ?? announcement.messages[0] ?? DEFAULT_ANNOUNCEMENT_BAR.messages[0];
  useEffect(() => {
    setAnnouncementIndex(0);
  }, [messageCount]);
  useEffect(() => {
    if (messageCount < 2) return;
    const interval = window.setInterval(() => setAnnouncementIndex((current) => nextAnnouncementIndex(current, messageCount)), announcement.rotationSeconds * 1_000);
    return () => window.clearInterval(interval);
  }, [messageCount, announcement.rotationSeconds]);
  const closeMenu = () => setMenuOpen(false);
  return <header className="marketplace-header"><div className="marketplace-header__notice" style={{ backgroundColor: announcement.backgroundColor, color: announcement.textColor, fontFamily: announcementFontStack(announcement.fontFamily) }}><span className="marketplace-header__notice-message" key={`${announcementIndex}-${activeMessage}`} aria-live="off">{activeMessage}</span></div><div className="marketplace-header__main"><Link href="/" className="ehode-wordmark" aria-label="Ehode home"><span className="ehode-wordmark__name">Ehode<span className="ehode-wordmark__dot">.</span></span><span className="ehode-wordmark__descriptor">digital goods</span></Link><nav className="marketplace-nav" aria-label="Primary navigation"><a href="/#collection">Shop</a><a href="/#categories">Categories</a><a href="/#how-it-works">How it works</a><a href="/contact">Contact</a></nav><div className="marketplace-header__actions"><a className="header-search-link" href="/#catalog-search"><Search size={18}/><span>Search</span></a><Link href="/account" className="header-account-link"><CircleUserRound size={17}/><span>Account</span></Link><button className="bag-button" type="button" onClick={openCart} aria-label={`Open basket with ${itemCount} item${itemCount === 1 ? "" : "s"}`}><ShoppingBag size={19} strokeWidth={1.9}/><span>Basket</span>{itemCount > 0 ? <b>{itemCount}</b> : null}</button><button className="header-menu" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button></div></div>{menuOpen ? <nav className="mobile-menu-panel" aria-label="Mobile navigation"><a href="/#collection" onClick={closeMenu}>Shop all downloads</a><a href="/#categories" onClick={closeMenu}>Browse categories</a><a href="/#how-it-works" onClick={closeMenu}>How digital delivery works</a><Link href="/contact" onClick={closeMenu}>Contact Ehode</Link><Link href="/account" onClick={closeMenu}>Create account / Log in</Link></nav> : null}</header>;
}
