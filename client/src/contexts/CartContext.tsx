import type { StorefrontListing } from "@/lib/storefront";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CART_KEY = "ehode:paypal-cart";
type CartItem = StorefrontListing & { quantity: number };
type CartContextValue = { items: CartItem[]; itemCount: number; isOpen: boolean; openCart: () => void; closeCart: () => void; addItem: (listing: StorefrontListing) => void; updateQuantity: (listingId: number, quantity: number) => void; removeItem: (listingId: number) => void; clearCart: () => void; };
const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]") as CartItem[]; } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { window.localStorage.setItem(CART_KEY, JSON.stringify(items)); }, [items]);
  const addItem = useCallback((listing: StorefrontListing) => { setItems((current) => { const existing = current.find((item) => item.id === listing.id); return existing ? current.map((item) => item.id === listing.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...listing, quantity: 1 }]; }); setIsOpen(true); }, []);
  const updateQuantity = useCallback((listingId: number, quantity: number) => setItems((current) => quantity < 1 ? current.filter((item) => item.id !== listingId) : current.map((item) => item.id === listingId ? { ...item, quantity } : item)), []);
  const removeItem = useCallback((listingId: number) => setItems((current) => current.filter((item) => item.id !== listingId)), []);
  const clearCart = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({ items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false), addItem, updateQuantity, removeItem, clearCart }), [items, isOpen, addItem, updateQuantity, removeItem, clearCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const context = useContext(CartContext); if (!context) throw new Error("useCart must be used within CartProvider"); return context; }
