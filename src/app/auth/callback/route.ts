import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/site-url";

/** Supabase redirects here from the sign-in email. */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const sb = createClient();
  if (code && sb) await sb.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(`${publicOrigin(request)}/influencers`);
}
