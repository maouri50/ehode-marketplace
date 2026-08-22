import { useCart } from "@/contexts/CartContext";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export function StoreHeader() {
  const { itemCount, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <header className="marketplace-header"><div className="marketplace-header__notice">Original digital downloads · Ready when your project is</div><div className="marketplace-header__main"><Link href="/" className="ehode-wordmark" aria-label="Ehode home"><span className="ehode-wordmark__name">Ehode<span className="ehode-wordmark__dot">.</span></span><span className="ehode-wordmark__descriptor">digital goods</span></Link><nav className="marketplace-nav" aria-label="Primary navigation"><a href="/#collection">Shop</a><a href="/#categories">Categories</a><a href="/#how-it-works">How it works</a><a href="/#about">About</a></nav><div className="marketplace-header__actions"><a className="header-search-link" href="/#catalog-search"><Search size={18}/><span>Search</span></a><button className="bag-button" type="button" onClick={openCart} aria-label={`Open basket with ${itemCount} item${itemCount === 1 ? "" : "s"}`}><ShoppingBag size={19} strokeWidth={1.9}/><span>Basket</span>{itemCount > 0 ? <b>{itemCount}</b> : null}</button><button className="header-menu" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button></div></div>{menuOpen ? <nav className="mobile-menu-panel" aria-label="Mobile navigation"><a href="/#collection" onClick={closeMenu}>Shop all downloads</a><a href="/#categories" onClick={closeMenu}>Browse categories</a><a href="/#how-it-works" onClick={closeMenu}>How digital delivery works</a><a href="/#about" onClick={closeMenu}>About Ehode</a></nav> : null}</header>;
}
