import { trpc } from "@/lib/trpc";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const subscribe = trpc.storefront.newsletter.subscribe.useMutation({
    onSuccess: (result) => {
      setEmail("");
      setMessage(result.message);
    },
    onError: (error) => setMessage(error.message || "Newsletter signup is temporarily unavailable. Please try again shortly."),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    subscribe.mutate({ email });
  }

  return <section className="newsletter-signup" aria-labelledby="newsletter-title">
    <div className="container newsletter-signup__inner">
      <div className="newsletter-signup__copy"><span><Mail size={15}/> Notes from Ehode</span><h2 id="newsletter-title">A little creative inspiration, occasionally.</h2><p>Get new product releases, useful printable ideas, and studio updates in your inbox.</p></div>
      <div className="newsletter-signup__form-wrap"><form onSubmit={onSubmit} className="newsletter-signup__form"><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required disabled={subscribe.isPending}/><button type="submit" disabled={subscribe.isPending}>{subscribe.isPending ? "Joining…" : <>Subscribe <ArrowRight size={16}/></>}</button></form><p className="newsletter-signup__consent">By subscribing, you agree to receive occasional Ehode product and studio news. You can unsubscribe at any time.</p>{message ? <p className="newsletter-signup__message" role="status"><CheckCircle2 size={16}/>{message}</p> : null}</div>
    </div>
  </section>;
}
