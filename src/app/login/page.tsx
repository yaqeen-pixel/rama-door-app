"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = createClient();
    if (!sb) return;
    setState("sending");
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setError(error.message); setState("error"); } else setState("sent");
  };
  return (
    <div className="gut">
      <div className="auth">
        <Link className="wordmark" href="/" aria-label="RAMA home"><img className="logo" src="/logo.png" alt="" style={{ width: 40 }} /></Link>
        <h1>Sign in</h1>
        {!isSupabaseConfigured ? (
          <p className="hint">Sign-in is turned off because Supabase is not connected yet. The app is running in demo mode. Add your Supabase keys as described in the README.</p>
        ) : state === "sent" ? (
          <p>We sent a sign-in link to <b>{email}</b>. Open it on this device to continue.</p>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <div className="field"><label htmlFor="email">Work email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></div>
            <button className="btn inf" disabled={state === "sending"}>{state === "sending" ? "Sending link…" : "Email me a sign-in link"}</button>
            {state === "error" && <p className="hint" style={{ color: "var(--bad)" }}>Could not send the link: {error}</p>}
          </form>
        )}
        <Link className="hint" href="/">Back to the homepage</Link>
      </div>
    </div>
  );
}
