import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mail, Send, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import "./adminNewsletter.css";

export default function AdminNewsletter() {
  const utils = trpc.useUtils();
  const auth = trpc.adminAuth.status.useQuery(undefined, { refetchOnWindowFocus: false });
  const enabled = Boolean(auth.data?.authenticated);
  const campaigns = trpc.storefront.owner.newsletterCampaigns.useQuery(undefined, { enabled });
  const subscribers = trpc.storefront.owner.newsletterSubscribers.useQuery(undefined, { enabled });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const createCampaign = trpc.storefront.owner.createNewsletterCampaign.useMutation({ onSuccess: async (result) => { setSubject(""); setBody(""); setNotice(`Draft saved for ${result.recipientCount} active subscriber${result.recipientCount === 1 ? "" : "s"}. It has not been sent.`); await utils.storefront.owner.newsletterCampaigns.invalidate(); } });
  const sendCampaign = trpc.storefront.owner.sendNewsletterCampaign.useMutation({ onSuccess: async (result) => { setNotice(`Campaign finished: ${result.sent} sent, ${result.failed} failed.`); await utils.storefront.owner.newsletterCampaigns.invalidate(); } });
  const activeCount = (subscribers.data ?? []).filter((subscriber) => subscriber.status === "active").length;

  if (auth.isLoading) return <div className="admin-loading">Preparing the secure newsletter workspace…</div>;
  if (!auth.data?.authenticated) return <div className="admin-login"><div className="admin-login__card"><ShieldCheck size={24}/><h1>Newsletter workspace is private.</h1><p>Please sign in through the main admin page first.</p><a className="admin-primary" href="/admin">Open admin sign-in</a></div></div>;

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    try { await createCampaign.mutateAsync({ subject, body }); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save the campaign draft."); }
  }

  function confirmSend(campaignId: number, recipientCount: number) {
    if (!window.confirm(`This will email ${recipientCount} opted-in subscriber${recipientCount === 1 ? "" : "s"}. Continue to final confirmation?`)) return;
    if (window.prompt('Type SEND to deliver this campaign now.') !== "SEND") { setNotice("Campaign was not sent."); return; }
    setNotice("");
    sendCampaign.mutate({ campaignId, confirmation: "SEND" });
  }

  return <main className="admin-campaign-page"><header className="admin-campaign-header"><a href="/admin"><ArrowLeft size={16}/> Back to admin</a><span><Mail size={16}/> Newsletter campaigns</span></header><section className="admin-campaign-hero"><p>Private owner workspace</p><h1>Write first. Send only when you are ready.</h1><span>{activeCount} active subscriber{activeCount === 1 ? "" : "s"} will be eligible for a manual campaign send.</span></section>{notice ? <p className="admin-campaign-notice">{notice}</p> : null}<div className="admin-campaign-grid"><form className="admin-campaign-panel" onSubmit={saveDraft}><div><p className="admin-panel__eyebrow">New campaign</p><h2>Create a draft</h2><span>Saving a draft never sends an email.</span></div><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={180} required placeholder="A helpful subject line"/></label><label>Message<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={12000} required placeholder="Write your newsletter here. Paragraph breaks will be preserved." rows={12}/></label><button className="admin-primary" disabled={createCampaign.isPending || activeCount === 0}>{createCampaign.isPending ? "Saving draft…" : "Save campaign draft"}</button></form><section className="admin-campaign-panel"><div><p className="admin-panel__eyebrow">Campaign history</p><h2>Review before delivery</h2><span>Only a draft can be sent, and sending requires a separate confirmation.</span></div>{campaigns.isLoading ? <p className="admin-muted">Loading campaigns…</p> : campaigns.data?.length ? <div className="admin-campaign-list">{campaigns.data.map((campaign) => <article key={campaign.id}><div><strong>{campaign.subject}</strong><small>{campaign.recipientCount} recipient{campaign.recipientCount === 1 ? "" : "s"} · {new Date(campaign.createdAt).toLocaleString()}</small></div><span className={`admin-campaign-status admin-campaign-status--${campaign.status}`}>{campaign.status}</span><p>{campaign.body}</p>{campaign.status === "draft" ? <button type="button" className="admin-campaign-send" disabled={sendCampaign.isPending} onClick={() => confirmSend(campaign.id, campaign.recipientCount)}><Send size={15}/> Send campaign now</button> : null}{campaign.deliveryError ? <small className="admin-campaign-error">{campaign.deliveryError}</small> : null}</article>)}</div> : <p className="admin-muted">No campaign drafts yet.</p>}</section></div></main>;
}
