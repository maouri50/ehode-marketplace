import { CartDrawer } from "@/components/CartDrawer";
import { StoreHeader } from "@/components/StoreHeader";
import { trpc } from "@/lib/trpc";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

function currentResetToken() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token] = useState(currentResetToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const reset = trpc.buyer.resetPassword.useMutation({ onSuccess: () => { setNotice("Your password has been updated. You are now signed in."); setTimeout(() => setLocation("/account"), 900); } });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) { setNotice("The passwords do not match."); return; }
    setNotice("");
    try { await reset.mutateAsync({ token, password }); } catch (error) { setNotice(error instanceof Error ? error.message : "This reset link is invalid or expired."); }
  }

  return <div className="store-page buyer-page"><StoreHeader/><main className="buyer-shell"><section className="buyer-auth-card"><p className="buyer-kicker">Secure password recovery</p><h1>Choose a new password.</h1><p>This link works once and expires after one hour.</p>{!token ? <><p className="buyer-notice">This reset link is incomplete. Request a new one from the sign-in page.</p><Link className="buyer-primary buyer-primary--link" href="/account">Return to account</Link></> : <form className="buyer-form" onSubmit={submit}><label>New password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={10} maxLength={128} autoComplete="new-password" required/></label><label>Confirm new password<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" minLength={10} maxLength={128} autoComplete="new-password" required/></label>{notice ? <p className="buyer-notice">{notice}</p> : null}<button className="buyer-primary" disabled={reset.isPending}>{reset.isPending ? "Updating…" : "Set new password"}</button></form>}</section></main><CartDrawer/></div>;
}
