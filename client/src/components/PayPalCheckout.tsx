import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

declare global { interface Window { paypal?: { Buttons: (options: Record<string, unknown>) => { render: (element: HTMLElement) => void; close?: () => void } } } }

function loadPayPalSdk(clientId: string, currency: string) {
  const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="ehode"]');
  if (existing?.dataset.clientId === clientId && window.paypal) return Promise.resolve();
  if (existing) {
    existing.remove();
    window.paypal = undefined;
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons&commit=true`;
    script.async = true;
    script.dataset.paypalSdk = "ehode";
    script.dataset.clientId = clientId;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayPal checkout could not be loaded."));
    document.head.appendChild(script);
  });
}

export function PayPalCheckout() {
  const { items, clearCart, closeCart } = useCart();
  const { data: config } = trpc.storefront.paypal.config.useQuery();
  const createOrder = trpc.storefront.paypal.createOrder.useMutation();
  const captureOrder = trpc.storefront.paypal.captureOrder.useMutation();
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const buttonInstance = useRef<{ render: (element: HTMLElement) => void; close?: () => void } | null>(null);
  const pendingOrderId = useRef<Promise<string> | null>(null);
  const latestActions = useRef({
    createOrder: createOrder.mutateAsync,
    captureOrder: captureOrder.mutateAsync,
    clearCart,
    closeCart,
    setLocation,
    buyerEmail: "",
  });
  const [message, setMessage] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const currency = items[0]?.currencyCode ?? "USD";
  const readyItems = items.every((item) => item.assetCount > 0);
  const checkoutItems = useMemo(() => items.map((item) => ({ listingId: item.id, quantity: item.quantity })), [items]);
  const checkoutSignature = checkoutItems.map((item) => `${item.listingId}:${item.quantity}`).join(",");
  const normalizedEmail = buyerEmail.trim().toLowerCase();
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  useEffect(() => {
    latestActions.current = {
      createOrder: createOrder.mutateAsync,
      captureOrder: captureOrder.mutateAsync,
      clearCart,
      closeCart,
      setLocation,
      buyerEmail: normalizedEmail,
    };
  }, [createOrder.mutateAsync, captureOrder.mutateAsync, clearCart, closeCart, setLocation, normalizedEmail]);

  useEffect(() => {
    if (!config?.clientId || !ref.current || !items.length || !readyItems || !hasValidEmail) return;
    let cancelled = false;
    setMessage("");
    loadPayPalSdk(config.clientId, currency).then(() => {
      if (cancelled || !window.paypal || !ref.current) return;
      buttonInstance.current?.close?.();
      ref.current.innerHTML = "";
      const instance = window.paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
        createOrder: () => {
          if (!pendingOrderId.current) {
            pendingOrderId.current = latestActions.current.createOrder({ items: checkoutItems, buyerEmail: latestActions.current.buyerEmail })
              .then((result) => result.id)
              .finally(() => { pendingOrderId.current = null; });
          }
          return pendingOrderId.current;
        },
        onApprove: async (data: { orderID: string }) => {
          const result = await latestActions.current.captureOrder({ paypalOrderId: data.orderID, buyerEmail: latestActions.current.buyerEmail });
          latestActions.current.clearCart();
          latestActions.current.closeCart();
          latestActions.current.setLocation(`/downloads/${result.receiptToken}`);
        },
        onError: () => setMessage("PayPal could not complete the order. Please try again."),
      });
      buttonInstance.current = instance;
      instance.render(ref.current);
    }).catch(() => setMessage("PayPal checkout is unavailable right now."));
    return () => { cancelled = true; buttonInstance.current?.close?.(); buttonInstance.current = null; };
  }, [config?.clientId, currency, checkoutSignature, readyItems, hasValidEmail]);

  if (!items.length) return null;
  if (!readyItems) return <p className="checkout-note">Some items are still being prepared for download and cannot be purchased yet.</p>;
  if (!config?.clientId) return <p className="checkout-note">PayPal setup is not complete yet.</p>;
  return <div className="paypal-checkout"><div className="checkout-email"><label htmlFor="buyer-email">Receipt email <span>Required</span></label><input id="buyer-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} required/><small>For your purchase record and download access only.</small>{buyerEmail && !hasValidEmail ? <em>Enter a valid email to continue.</em> : null}</div>{hasValidEmail ? <div ref={ref} /> : null}{createOrder.isPending || captureOrder.isPending ? <p><Loader2 size={14} className="animate-spin" /> Preparing secure checkout…</p> : null}{message ? <p className="checkout-error">{message}</p> : null}</div>;
}
