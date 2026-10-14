import "server-only";
import { createClient } from "./supabase/server";
import { CREATORS, OUTDOOR_SITES, OUTLETS, PR_PACKAGES } from "./seed";
import { weekZero } from "./format";
import type { Campaign, Creator, InsertionOrder, Offer, OutdoorBooking, OutdoorSite, Outlet, PrPackage } from "./types";

/* ---------------- Catalogue (public) ---------------- */
export async function getCreators(): Promise<Creator[]> {
  const sb = createClient();
  if (!sb) return CREATORS;
  const { data, error } = await sb.from("creators").select("id,name,nickname,rates").order("name");
  if (error || !data) return CREATORS;
  return data as Creator[];
}

export async function getOutdoorSites(): Promise<OutdoorSite[]> {
  const sb = createClient();
  if (!sb) return OUTDOOR_SITES;
  const [{ data: sites, error }, { data: weeks }] = await Promise.all([
    sb.from("outdoor_sites").select("*").order("id"),
    sb.from("outdoor_site_weeks").select("site_id,week_start"),
  ]);
  if (error || !sites) return OUTDOOR_SITES;
  const w0 = weekZero().getTime();
  const weekIndex = (d: string) => Math.round((new Date(d + "T00:00").getTime() - w0) / (7 * 864e5));
  return sites.map((s) => ({
    id: s.id, name: s.name, format: s.format, area: s.area, lat: s.lat, lng: s.lng, size: s.size ?? "", faces: s.faces ?? "",
    dailyViews: s.daily_views ?? 0, weeklyPrice: s.weekly_price, lighting: s.lighting ?? "",
    bookedWeeks: (weeks ?? []).filter((x) => x.site_id === s.id).map((x) => weekIndex(x.week_start)).filter((i) => i >= 0 && i < 12),
  }));
}

export async function getOutlets(): Promise<Outlet[]> {
  const sb = createClient();
  if (!sb) return OUTLETS;
  const { data, error } = await sb.from("media_outlets").select("*");
  if (error || !data) return OUTLETS;
  return data.map((o) => ({
    id: o.id, name: o.name, nameAr: o.name_ar ?? undefined, kind: o.kind, language: o.language, about: o.about ?? "",
    columnCmRate: o.column_cm_rate == null ? undefined : Number(o.column_cm_rate), magazine: o.magazine_rates ?? undefined,
    web: o.web_rates, social: o.social_rates,
  }));
}

export async function getPrPackages(): Promise<PrPackage[]> {
  const sb = createClient();
  if (!sb) return PR_PACKAGES;
  const { data, error } = await sb.from("pr_packages").select("*").order("price");
  if (error || !data) return PR_PACKAGES;
  return data as PrPackage[];
}

/* ---------------- Signed-in brand workspace ---------------- */
export type Workspace = {
  mode: "demo" | "guest" | "live";
  email?: string;
  campaigns: Campaign[];
  offers: Offer[];
  bookings: OutdoorBooking[];
  orders: InsertionOrder[];
};

const DEMO_CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Winter Menu Launch", objective: "Awareness", platforms: ["IG", "TT"], budget: 3000, startDate: "2026-11-01", endDate: "2026-11-30", brief: "Introduce the new winter drinks menu across our three branches.", status: "Live" },
  { id: "c2", name: "Ramadan Ghabga Nights", objective: "Footfall", platforms: ["IG", "SC"], budget: 6000, startDate: "2027-02-15", endDate: "2027-03-20", brief: "Drive table bookings for ghabga evenings.", status: "Draft" },
];

export async function getWorkspace(): Promise<Workspace> {
  const sb = createClient();
  if (!sb) return { mode: "demo", campaigns: DEMO_CAMPAIGNS, offers: [], bookings: [], orders: [] };
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { mode: "guest", campaigns: [], offers: [], bookings: [], orders: [] };

  const w0 = weekZero().getTime();
  const [c, o, b, io] = await Promise.all([
    sb.from("campaigns").select("*").order("created_at", { ascending: false }),
    sb.from("offers").select("*, offer_messages(*)").order("created_at", { ascending: false }),
    sb.from("outdoor_bookings").select("*").order("created_at", { ascending: false }),
    sb.from("insertion_orders").select("*, insertion_order_lines(*)").order("created_at", { ascending: false }),
  ]);
  return {
    mode: "live",
    email: user.email,
    campaigns: (c.data ?? []).map((r) => ({ id: r.id, name: r.name, objective: r.objective ?? "", platforms: r.platforms ?? [], budget: r.budget, startDate: r.start_date ?? "", endDate: r.end_date ?? "", brief: r.brief ?? "", status: r.status })),
    offers: (o.data ?? []).map((r) => ({
      id: r.id, creatorId: r.creator_id, campaignId: r.campaign_id ?? "", rateIndex: r.rate_index, listPrice: r.list_price, amount: r.amount, status: r.status, done: r.deliverables_done ?? {},
      messages: [...(r.offer_messages ?? [])].sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at)).map((m: { from_brand: boolean; body: string; amount: number | null }) => ({ fromBrand: m.from_brand, text: m.body, amount: m.amount ?? undefined })),
    })),
    bookings: (b.data ?? []).map((r) => ({ id: r.id, siteId: r.site_id, total: r.total, status: r.status, weeks: (r.weeks as string[]).map((d) => Math.round((new Date(d + "T00:00").getTime() - w0) / (7 * 864e5))) })),
    orders: (io.data ?? []).map((r) => ({ id: r.id, number: r.number, total: r.total, status: r.status, lines: (r.insertion_order_lines ?? []).map((l: { id: string; outlet: string; description: string; run_dates: string | null; deadline: string | null; total: number }) => ({ id: l.id, outlet: l.outlet, description: l.description, when: l.run_dates ?? "", deadline: l.deadline ?? undefined, total: l.total })) })),
  };
}
