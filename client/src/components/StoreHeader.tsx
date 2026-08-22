import { useCart } from "@/contexts/CartContext";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

export function StoreHeader() {
  const { itemCount, openCart } = useCart();
  return <header className="marketplace-header"><div className="marketplace-header__notice">Original digital downloads · Ready when your project is</div><div className="marketplace-header__main"><Link href="/" className="store-brand" aria-label="Ehode home">ehode<span>.</span></Link><nav className="marketplace-nav" aria-label="Primary navigation"><a href="/#collection">Shop</a><a href="/#categories">Categories</a><a href="/#how-it-works">How it works</a><a href="/#about">About</a></nav><div className="marketplace-header__actions"><a className="header-search-link" href="/#catalog-search"><Search size={18}/><span>Search</span></a><button className="bag-button" type="button" onClick={openCart} aria-label={`Open basket with ${itemCount} item${itemCount === 1 ? "" : "s"}`}><ShoppingBag size={19} strokeWidth={1.9}/><span>Basket</span>{itemCount > 0 ? <b>{itemCount}</b> : null}</button><button className="header-menu" aria-label="Open navigation menu"><Menu size={20}/></button></div></div></header>;
}
