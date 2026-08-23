import { CheckCircle2, MailX } from "lucide-react";
import { useEffect } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import "./adminNewsletter.css";

export default function NewsletterUnsubscribe() {
  const [, params] = useRoute("/newsletter/unsubscribe/:token");
  const unsubscribe = trpc.storefront.newsletter.unsubscribe.useMutation();
  useEffect(() => { if (params?.token) unsubscribe.mutate({ token: params.token }); }, [params?.token]);
  return <main className="newsletter-unsubscribe"><div>{unsubscribe.isPending ? <><MailX size={26}/><h1>Updating your preferences…</h1><p>Please wait a moment.</p></> : <><CheckCircle2 size={26}/><h1>You have been unsubscribed.</h1><p>You will not receive future Ehode newsletter campaigns at this address.</p></>}</div></main>;
}
