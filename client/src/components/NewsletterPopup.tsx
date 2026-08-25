import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail, X } from "lucide-react";
import { getNewsletterPopupState, saveNewsletterPopupState } from "@/lib/newsletterPopup";
import { trpc } from "@/lib/trpc";

export function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const subscribe = trpc.storefront.newsletter.subscribe.useMutation({
    onSuccess: (result) => {
      saveNewsletterPopupState(window.localStorage, "subscribed");
      setMessage(result.message);
      window.setTimeout(() => setIsOpen(false), 2200);
    },
    onError: (error) => setMessage(error.message || "Newsletter signup is temporarily unavailable. Please try again shortly."),
  });

  useEffect(() => {
    if (getNewsletterPopupState(window.localStorage)) return;
    const timer = window.setTimeout(() => setIsOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function closePopup() {
    if (!subscribe.isPending) {
      saveNewsletterPopupState(window.localStorage, "dismissed");
      setIsOpen(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    subscribe.mutate({ email });
  }

  if (!isOpen) return null;

  return <div className="newsletter-popup-layer" role="presentation" onMouseDown={closePopup}>
    <section className="newsletter-popup" role="dialog" aria-modal="true" aria-labelledby="newsletter-popup-title" onMouseDown={(event) => event.stopPropagation()}>
      <button ref={closeButtonRef} className="newsletter-popup__close" type="button" onClick={closePopup} aria-label="Close newsletter signup"><X size={20}/></button>
      <span className="newsletter-popup__eyebrow"><Mail size={15}/> EHODE NOTES</span>
      <h2 id="newsletter-popup-title">Join the creative list.</h2>
      <p>Get new digital releases, printable ideas, and studio notes in your inbox.</p>
      <form onSubmit={onSubmit} className="newsletter-popup__form">
        <label className="sr-only" htmlFor="newsletter-popup-email">Email address</label>
        <div><Mail size={18}/><input id="newsletter-popup-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" required disabled={subscribe.isPending}/></div>
        <button type="submit" disabled={subscribe.isPending}>{subscribe.isPending ? "Joining…" : "Subscribe"}</button>
      </form>
      <p className="newsletter-popup__fine-print">Occasional emails only. Unsubscribe at any time.</p>
      {message ? <p className="newsletter-popup__message" role="status"><CheckCircle2 size={17}/>{message}</p> : null}
    </section>
  </div>;
}
