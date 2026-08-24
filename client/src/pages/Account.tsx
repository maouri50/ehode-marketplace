import { CartDrawer } from "@/components/CartDrawer";
import { StoreHeader } from "@/components/StoreHeader";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/storefront";
import { CheckCircle2, Download, Heart, LogOut, Star } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

type AuthMode = "login" | "register";

export default function Account() {
  const utils = trpc.useUtils();
  const me = trpc.buyer.me.useQuery(undefined, { refetchOnWindowFocus: false });
  const [mode, setMode] = useState<AuthMode>("login");
  const [notice, setNotice] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, { rating: number; body: string }>>({});
  const signedIn = Boolean(me.data);
  const orders = trpc.buyer.orders.useQuery(undefined, { enabled: signedIn });
  const wishlist = trpc.buyer.wishlist.list.useQuery(undefined, { enabled: signedIn });
  const eligibleReviews = trpc.storefront.reviews.eligible.useQuery(undefined, { enabled: signedIn });
  const register = trpc.buyer.register.useMutation({ onSuccess: async () => { setNotice("Your buyer account is ready. Previous purchases using this email are now available here."); setPassword(""); await me.refetch(); await utils.buyer.orders.invalidate(); } });
  const login = trpc.buyer.login.useMutation({ onSuccess: async () => { setNotice("Welcome back."); setPassword(""); await me.refetch(); await utils.buyer.orders.invalidate(); } });
  const logout = trpc.buyer.logout.useMutation({ onSuccess: async () => { await utils.buyer.me.invalidate(); setNotice("You have been signed out."); } });
  const removeWishlist = trpc.buyer.wishlist.remove.useMutation({ onSuccess: () => utils.buyer.wishlist.list.invalidate() });
  const submitReview = trpc.storefront.reviews.submit.useMutation({ onSuccess: async (_, variables) => { setNotice("Thank you. Your genuine review is waiting for owner approval."); setReviewDrafts((drafts) => { const copy = { ...drafts }; delete copy[variables.orderItemId]; return copy; }); await eligibleReviews.refetch(); } });

  async function submitAuth(event: FormEvent) {
    event.preventDefault(); setNotice("");
    try { if (mode === "register") await register.mutateAsync({ displayName, email, password }); else await login.mutateAsync({ email, password }); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Please check your details and try again."); }
  }

  if (me.isLoading) return <div className="store-page buyer-page"><StoreHeader/><main className="buyer-shell buyer-shell--loading">Preparing your account…</main></div>;

  if (!me.data) return <GuestAccount mode={mode} setMode={setMode} displayName={displayName} setDisplayName={setDisplayName} email={email} setEmail={setEmail} password={password} setPassword={setPassword} notice={notice} submitAuth={submitAuth} pending={register.isPending || login.isPending}/>;

  return <div className="store-page buyer-page"><StoreHeader/><main className="buyer-shell">
    <header className="buyer-dashboard-head"><div><p className="buyer-kicker">Buyer account</p><h1>Hello, {me.data.displayName}.</h1><p>Your saved resources, purchases, and genuine review invitations live here.</p></div><button className="buyer-quiet-button" type="button" onClick={() => logout.mutate()}><LogOut size={16}/> Log out</button></header>
    {notice ? <p className="buyer-notice buyer-notice--success">{notice}</p> : null}
    <section className="buyer-dashboard-grid"><section className="buyer-panel buyer-panel--wide"><div className="buyer-panel__heading"><div><p>Purchased resources</p><h2>Your downloads</h2></div><Download size={20}/></div>{orders.isLoading ? <p className="buyer-muted">Loading your secure purchase history…</p> : orders.data?.length ? <div className="buyer-orders">{orders.data.map((order) => <article key={order.id}><header><div><strong>Order #{order.id}</strong><span>{order.purchasedAt ? new Date(order.purchasedAt).toLocaleDateString() : "Completed purchase"}</span></div><b>{formatMoney(order.totalAmount, order.currencyCode)}</b></header>{order.items.map((item) => <div className="buyer-order-item" key={item.id}><strong>{item.title}</strong><div>{item.downloads.map((download) => <a href={`/api/download/paid/${encodeURIComponent(download.token)}`} key={download.token}><Download size={14}/> {download.filename}</a>)}</div></div>)}</article>)}</div> : <EmptyState icon={<Download size={22}/>} title="No linked purchases yet." text="Use the same email address at checkout and future purchases will appear here." link="Browse resources"/>}</section>
      <section className="buyer-panel"><div className="buyer-panel__heading"><div><p>Saved for later</p><h2>Wishlist</h2></div><Heart size={20}/></div>{wishlist.data?.length ? <div className="buyer-wishlist">{wishlist.data.map((item) => <article key={item.listingId}><Link href={`/products/${item.handle}`}>{item.coverImageUrl ? <img src={item.coverImageUrl.startsWith("product-covers/") ? `/api/cover/${item.listingId}` : item.coverImageUrl} alt=""/> : <span/>}</Link><div><Link href={`/products/${item.handle}`}>{item.title}</Link><small>{formatMoney(item.priceAmount, item.currencyCode)}</small></div><button type="button" aria-label={`Remove ${item.title} from wishlist`} onClick={() => removeWishlist.mutate({ listingId: item.listingId })}>×</button></article>)}</div> : <EmptyState icon={<Heart size={20}/>} title="Your wishlist is empty." text="Save resources from any product page."/>}</section></section>
    <section className="buyer-panel buyer-reviews"><div className="buyer-panel__heading"><div><p>Verified purchase reviews</p><h2>Share real feedback</h2></div><Star size={20}/></div><p className="buyer-muted">Only purchases linked to your account are listed. Submitted reviews remain private until the owner approves them.</p>{eligibleReviews.data?.length ? <div className="buyer-review-list">{eligibleReviews.data.map((item) => { const draft = reviewDrafts[item.orderItemId] ?? { rating: 5, body: "" }; return <article key={item.orderItemId}><div><strong>{item.title}</strong><span>Verified purchase</span></div><div className="buyer-review-stars" aria-label="Choose a rating">{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} className={rating <= draft.rating ? "is-selected" : ""} onClick={() => setReviewDrafts((current) => ({ ...current, [item.orderItemId]: { ...draft, rating } }))}><Star size={18} fill="currentColor"/></button>)}</div><textarea value={draft.body} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.orderItemId]: { ...draft, body: event.target.value } }))} minLength={10} maxLength={2000} placeholder="What did you genuinely think of this resource?"/><button className="buyer-primary buyer-primary--small" type="button" disabled={draft.body.trim().length < 10 || submitReview.isPending} onClick={() => submitReview.mutate({ orderItemId: item.orderItemId, rating: draft.rating, body: draft.body })}>{submitReview.isPending ? "Submitting…" : "Submit genuine review"}</button></article>; })}</div> : <EmptyState icon={<CheckCircle2 size={20}/>} title="No review invitations right now." text="Review invitations appear after a purchased item is linked to your account."/>}</section>
  </main><CartDrawer/></div>;
}

function GuestAccount(props: { mode: AuthMode; setMode: (value: AuthMode) => void; displayName: string; setDisplayName: (value: string) => void; email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; notice: string; submitAuth: (event: FormEvent) => void; pending: boolean }) {
  return <div className="store-page buyer-page"><StoreHeader/><main className="buyer-shell"><section className="buyer-auth-card"><p className="buyer-kicker">Ehode buyer account</p><h1>{props.mode === "login" ? "Welcome back." : "Keep your downloads close."}</h1><p>{props.mode === "login" ? "Sign in to find your purchases, wishlist, and review invitations." : "Create an account with the same email used at checkout to link your eligible purchases."}</p><div className="buyer-auth-switch"><button className={props.mode === "login" ? "is-active" : ""} type="button" onClick={() => props.setMode("login")}>Log in</button><button className={props.mode === "register" ? "is-active" : ""} type="button" onClick={() => props.setMode("register")}>Create account</button></div><form className="buyer-form" onSubmit={props.submitAuth}>{props.mode === "register" ? <label>Name<input value={props.displayName} onChange={(event) => props.setDisplayName(event.target.value)} minLength={2} maxLength={120} autoComplete="name" required/></label> : null}<label>Email<input value={props.email} onChange={(event) => props.setEmail(event.target.value)} type="email" autoComplete="email" required/></label><label>Password<input value={props.password} onChange={(event) => props.setPassword(event.target.value)} type="password" minLength={10} autoComplete={props.mode === "login" ? "current-password" : "new-password"} required/></label>{props.notice ? <p className="buyer-notice">{props.notice}</p> : null}<button className="buyer-primary" disabled={props.pending}>{props.pending ? "Please wait…" : props.mode === "login" ? "Log in" : "Create secure account"}</button></form><p className="buyer-auth-footer">Need to ask something first? <Link href="/contact">Contact Ehode</Link></p></section></main><CartDrawer/></div>;
}

function EmptyState({ icon, title, text, link }: { icon: React.ReactNode; title: string; text: string; link?: string }) {
  return <div className="buyer-empty buyer-empty--compact">{icon}<strong>{title}</strong><span>{text}</span>{link ? <Link href="/#collection">{link}</Link> : null}</div>;
}
