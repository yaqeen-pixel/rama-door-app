// Supabase Edge Function: sync-instagram
//
// Reads the "Influencers IG - INF Profile" Google Sheet and updates the creators table:
//   - existing accounts (matched by Instagram username) get fresh followers, following, posts, bio and name
//   - new usernames in the sheet are added as creators (not on the rate card until RAMA adds prices)
//   - profile photos are copied into the public "creator-photos" Storage bucket, because the
//     Instagram photo links in the sheet stop working after a few weeks
//
// Setup (see README, "Automatic Instagram sync"):
//   secret SHEET_CSV_URL = the sheet's "Publish to web" CSV link, or its normal link if
//                          the sheet is shared as "Anyone with the link can view"
// Runs on a schedule (pg_cron) and can be started by hand from the Supabase dashboard.

import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "creator-photos";
const PHOTOS_PER_RUN = 40; // keeps each run well inside the Edge Function time limit
const MIN_MINUTES_BETWEEN_RUNS = 10;

type Row = {
  username: string;
  displayName: string | null;
  bio: string | null;
  photo: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
  profileUrl: string;
};

/** Minimal RFC 4180 CSV parser (handles quoted fields with commas and line breaks). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Accepts a published CSV link or a normal Google Sheets link and returns a CSV download URL. */
function csvUrl(raw: string) {
  const m = raw.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/);
  if (!m || /output=csv|format=csv/.test(raw) || m[1] === "e") return raw;
  const gid = raw.match(/[#&?]gid=(\d+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

const toInt = (s: string | undefined) => {
  const d = (s ?? "").replace(/[^\d]/g, "");
  return d ? Number(d) : null;
};
const clean = (s: string | undefined) => {
  const t = (s ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  return t || null;
};

/** Instagram CDN links carry their expiry time as a hex unix timestamp in the "oe" parameter. */
function photoExpired(url: string) {
  const oe = url.match(/[?&]oe=([0-9A-Fa-f]+)/)?.[1];
  return oe ? parseInt(oe, 16) * 1000 < Date.now() : false;
}

/** New accounts start with Instagram plus any platform their bio mentions. RAMA can edit this later. */
function platformsFromBio(bio: string | null) {
  const t = bio ?? "";
  return [
    "instagram",
    ...(/tik ?tok|تيك ?توك/i.test(t) ? ["tiktok"] : []),
    ...(/snap|👻|سناب/i.test(t) ? ["snapchat"] : []),
    ...(/youtube|ytube|يوتيوب/i.test(t) ? ["youtube"] : []),
  ];
}

function readRows(csv: string): Row[] {
  const [header, ...lines] = parseCsv(csv);
  if (!header) throw new Error("The sheet is empty.");
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const idx = {
    username: col("Username"), name: col("Name"), bio: col("Biography"), photo: col("Profile picture URL"),
    followers: col("Profile followers"), following: col("Profile follows"), posts: col("Profile post count"), url: col("Profile URL"),
  };
  if (idx.username < 0) throw new Error(`No "Username" column found. Columns: ${header.join(", ")}`);
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const r of lines) {
    const username = (r[idx.username] ?? "").trim().replace(/^@/, "");
    if (!username || seen.has(username.toLowerCase())) continue;
    seen.add(username.toLowerCase());
    rows.push({
      username,
      displayName: clean(r[idx.name]),
      bio: (r[idx.bio] ?? "").trim() || null,
      photo: (r[idx.photo] ?? "").trim() || null,
      followers: toInt(r[idx.followers]),
      following: toInt(r[idx.following]),
      posts: toInt(r[idx.posts]),
      profileUrl: (r[idx.url] ?? "").trim() || `https://www.instagram.com/${username}/`,
    });
  }
  return rows;
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });

  try {
    const sheet = Deno.env.get("SHEET_CSV_URL");
    if (!sheet) return json({ ok: false, error: "SHEET_CSV_URL is not set. Add it under Edge Functions > Secrets." }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // Avoid back-to-back runs (the function URL is reachable with the public key).
    const force = new URL(req.url).searchParams.get("force") === "1";
    const { data: last } = await sb.from("creators").select("synced_at").not("synced_at", "is", null)
      .order("synced_at", { ascending: false }).limit(1).maybeSingle();
    if (!force && last?.synced_at && Date.now() - new Date(last.synced_at).getTime() < MIN_MINUTES_BETWEEN_RUNS * 60_000) {
      return json({ ok: true, skipped: `Last sync was less than ${MIN_MINUTES_BETWEEN_RUNS} minutes ago.` });
    }

    const res = await fetch(csvUrl(sheet), { redirect: "follow" });
    const text = await res.text();
    if (!res.ok || /^\s*<!doctype html|<html/i.test(text)) {
      return json({ ok: false, error: `Could not read the sheet as CSV (HTTP ${res.status}). Publish it to the web as CSV, or share it as "Anyone with the link can view".` }, 502);
    }
    const rows = readRows(text);

    const { data: existing, error: exErr } = await sb.from("creators").select("id,username,source_photo_url,photo_url");
    if (exErr) throw exErr;
    const byUser = new Map((existing ?? []).filter((c) => c.username).map((c) => [c.username!.toLowerCase(), c]));
    const now = new Date().toISOString();

    const updates = [], inserts = [];
    for (const r of rows) {
      const fields = {
        username: r.username, display_name: r.displayName, bio: r.bio, followers: r.followers,
        following: r.following, posts: r.posts, profile_url: r.profileUrl, source_photo_url: r.photo, synced_at: now,
      };
      const hit = byUser.get(r.username.toLowerCase());
      if (hit) updates.push({ id: hit.id, ...fields });
      else inserts.push({ name: r.displayName ?? `@${r.username}`, platforms: platformsFromBio(r.bio), ...fields });
    }

    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100);
      const results = await Promise.all(chunk.map(({ id, ...f }) => sb.from("creators").update(f).eq("id", id)));
      const failed = results.find((x) => x.error);
      if (failed?.error) throw failed.error;
    }
    if (inserts.length) {
      const { error } = await sb.from("creators").insert(inserts);
      if (error) throw error;
    }

    // Copy photos that are new or changed into Storage.
    const { data: all } = await sb.from("creators").select("id,username,source_photo_url,photo_url").not("source_photo_url", "is", null);
    const photoName = (u: string) => `${u.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}.jpg`;
    const todo = (all ?? []).filter((c) => {
      if (!c.username || !c.source_photo_url || photoExpired(c.source_photo_url)) return false;
      const prev = byUser.get(c.username.toLowerCase());
      return !c.photo_url || prev?.source_photo_url !== c.source_photo_url;
    }).slice(0, PHOTOS_PER_RUN);

    let photosSaved = 0;
    const photoErrors: string[] = [];
    for (const c of todo) {
      try {
        const img = await fetch(c.source_photo_url!, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!img.ok) throw new Error(`HTTP ${img.status}`);
        const bytes = new Uint8Array(await img.arrayBuffer());
        const path = photoName(c.username!);
        const { error: upErr } = await sb.storage.from(BUCKET).upload(path, bytes, {
          contentType: img.headers.get("content-type") ?? "image/jpeg", upsert: true, cacheControl: "86400",
        });
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
        await sb.from("creators").update({ photo_url: `${pub.publicUrl}?v=${Date.now()}` }).eq("id", c.id);
        photosSaved++;
      } catch (e) {
        photoErrors.push(`@${c.username}: ${(e as Error).message}`);
      }
    }

    const expiredPhotos = (all ?? []).filter((c) => !c.photo_url && c.source_photo_url && photoExpired(c.source_photo_url)).length;
    return json({
      ok: true,
      rowsInSheet: rows.length,
      updated: updates.length,
      added: inserts.length,
      photosSaved,
      photosStillToCopy: Math.max(0, (all ?? []).filter((c) => !c.photo_url).length - photosSaved - expiredPhotos),
      photosWithExpiredLinks: expiredPhotos,
      photoErrors: photoErrors.slice(0, 10),
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message ?? String(e) }, 500);
  }
});
