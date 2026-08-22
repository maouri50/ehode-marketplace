import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

declare global { interface Window { paypal?: { Buttons: (options: Record<string, unknown>) => { render: (element: HTMLElement) => void; close?: () => void } } } }

function loadPayPalSdk(clientId: string, currency: string) {
  const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="ehode"]');
  if (existing && window.paypal) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&components=buttons&commit=true`;
    script.async = true;
    script.dataset.paypalSdk = "ehode";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayPal checkout could not be loaded."));
    if (!existing) document.head.appendChild(script);
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
  const [message, setMessage] = useState("");
  const currency = items[0]?.currencyCode ?? "USD";
  const readyItems = items.every((item) => item.assetCount > 0);

  useEffect(() => {
    if (!config?.clientId || !ref.current || !items.length || !readyItems) return;
    let cancelled = false;
    setMessage("");
    loadPayPalSdk(config.clientId, currency).then(() => {
      if (cancelled || !window.paypal || !ref.current) return;
      buttonInstance.current?.close?.();
      ref.current.innerHTML = "";
      const instance = window.paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
        createOrder: async () => { const result = await createOrder.mutateAsync({ items: items.map((item) => ({ listingId: item.id, quantity: item.quantity })) }); return result.id; },
        onApprove: async (data: { orderID: string }) => { const result = await captureOrder.mutateAsync({ paypalOrderId: data.orderID }); clearCart(); closeCart(); setLocation(`/downloads/${result.receiptToken}`); },
        onError: () => setMessage("PayPal could not complete the order. Please try again."),
      });
      buttonInstance.current = instance;
      instance.render(ref.current);
    }).catch(() => setMessage("PayPal checkout is unavailable right now."));
    return () => { cancelled = true; buttonInstance.current?.close?.(); buttonInstance.current = null; };
  }, [config?.clientId, currency, items, readyItems, createOrder, captureOrder, clearCart, closeCart, setLocation]);

  if (!items.length) return null;
  if (!readyItems) return <p className="checkout-note">Some items are still being prepared for download and cannot be purchased yet.</p>;
  if (!config?.clientId) return <p className="checkout-note">PayPal setup is not complete yet.</p>;
  return <div className="paypal-checkout"><div ref={ref} />{createOrder.isPending || captureOrder.isPending ? <p><Loader2 size={14} className="animate-spin" /> Preparing secure checkout…</p> : null}{message ? <p className="checkout-error">{message}</p> : null}</div>;
}
