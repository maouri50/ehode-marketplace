import { useCart } from "@/contexts/CartContext";
import { ShoppingBag } from "lucide-react";
import { Link } from "wouter";

export function StoreHeader() {
  const { itemCount, openCart } = useCart();

  return (
    <header className="store-header">
      <div className="store-header__inner">
        <Link href="/" className="store-brand" aria-label="Ehode home">
          ehode<span>.</span>
        </Link>
        <nav className="store-nav" aria-label="Primary navigation">
          <a href="/#collection">Shop</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/#about">Our studio</a>
        </nav>
        <button className="bag-button" type="button" onClick={openCart} aria-label={`Open basket with ${itemCount} item${itemCount === 1 ? "" : "s"}`}>
          <ShoppingBag size={19} strokeWidth={1.75} />
          <span>Basket</span>
          {itemCount > 0 ? <b>{itemCount}</b> : null}
        </button>
      </div>
    </header>
  );
}
