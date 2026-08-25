import { PayPalCheckout } from "@/components/PayPalCheckout";
import { useCart } from "@/contexts/CartContext";
import { BASKET_DRAWER_CLOSE_LABEL, BASKET_DRAWER_HEADING } from "@/lib/cartDrawerHeader";
import { formatMoney } from "@/lib/storefront";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity } = useCart();

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + Number(item.priceAmount) * item.quantity, 0);
  const currency = items[0]?.currencyCode ?? "USD";

  return (
    <div className="cart-layer" role="presentation" onMouseDown={closeCart}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your basket" onMouseDown={(event) => event.stopPropagation()}>
        <div className="cart-drawer__head">
          <div>
            <span className="eyebrow">Your selection</span>
            <h2 className="cart-drawer__title">{BASKET_DRAWER_HEADING}</h2>
          </div>
          <button type="button" className="icon-button cart-drawer__close" onClick={closeCart} aria-label={BASKET_DRAWER_CLOSE_LABEL}>
            <X size={19} />
          </button>
        </div>

        {!items.length ? (
          <div className="cart-empty">
            <span className="cart-empty__icon"><ShoppingBag size={24} /></span>
            <h3>Your basket is waiting.</h3>
            <p>Add a ready-to-download resource and it will stay here while you browse.</p>
            <button type="button" className="text-link" onClick={closeCart}>Continue exploring</button>
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {items.map((item) => (
                <article className="cart-line" key={item.id}>
                  <div className="cart-line__image">{item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.title} /> : <div className="image-placeholder" />}</div>
                  <div className="cart-line__body">
                    <div className="cart-line__title-row">
                      <h3>{item.title}</h3>
                      <button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.title}`}><Trash2 size={15} /></button>
                    </div>
                    <p>{item.category ?? item.productType ?? "Digital resource"}</p>
                    <div className="cart-line__meta">
                      <div className="quantity-picker">
                        <button type="button" disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity"><Minus size={13} /></button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity"><Plus size={13} /></button>
                      </div>
                      <strong>{formatMoney((Number(item.priceAmount) * item.quantity).toFixed(2), item.currencyCode)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{formatMoney(subtotal.toFixed(2), currency)}</strong></div>
              <p>Pay securely through PayPal. Download access is created only after PayPal confirms payment.</p>
              <PayPalCheckout />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
