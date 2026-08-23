import { useCart } from "@/contexts/CartContext";
import { Grid2X2, Home, Search, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "wouter";

export function MobileBottomNav() {
  const { itemCount, openCart } = useCart();
  const [location] = useLocation();
  const isShop = location === "/" || location.startsWith("/products/");

  return <nav className="mobile-bottom-nav" aria-label="Mobile marketplace navigation">
    <Link href="/" className={location === "/" ? "is-active" : ""}><Home size={19}/><span>Home</span></Link>
    <a href="/#categories" className={isShop ? "is-active" : ""}><Grid2X2 size={18}/><span>Browse</span></a>
    <a href="/#catalog-search"><Search size={19}/><span>Search</span></a>
    <button type="button" onClick={openCart} aria-label={`Open basket with ${itemCount} item${itemCount === 1 ? "" : "s"}`}><span className="mobile-bottom-nav__basket"><ShoppingBag size={19}/>{itemCount > 0 ? <b>{itemCount}</b> : null}</span><span>Basket</span></button>
  </nav>;
}
