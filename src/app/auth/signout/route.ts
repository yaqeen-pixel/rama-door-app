import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/site-url";

export async function GET(request: Request) {
  const sb = createClient();
  if (sb) await sb.auth.signOut();
  return NextResponse.redirect(`${publicOrigin(request)}/`);
}
