"use server";

import { createClient } from "@/lib/supabase/server";
import { weekZero, addDays } from "@/lib/format";
import { VAT_RATE } from "@/lib/pricing";
import type { Campaign, IoLine, OfferMessage, OfferStatus } from "@/lib/types";

/**
 * Server actions. Each one writes to Supabase when the app is connected and the
 * brand is signed in. In demo mode they return { persisted: false } and the
 * screen keeps the change in memory only.
 */
type Result<T = undefined> = { persisted: boolean; error?: string; data?: T };

async function session() {
  const sb = createClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user ? { sb, user } : null;
}

export async function createCampaign(c: Omit<Campaign, "id">): Promise<Result<{ id: string }>> {
  const s = await session();
  if (!s) return { persisted: false };
  const { data, error } = await s.sb.from("campaigns").insert({
    name: c.name, objective: c.objective, platforms: c.platforms, budget: c.budget,
    start_date: c.startDate || null, end_date: c.endDate || null, brief: c.brief, status: c.status,
  }).select("id").single();
  return error ? { persisted: false, error: error.message } : { persisted: true, data: { id: data.id } };
}

export async function updateCampaignStatus(id: string, status: Campaign["status"]): Promise<Result> {
  const s = await session();
  if (!s) return { persisted: false };
  const { error } = await s.sb.from("campaigns").update({ status }).eq("id", id);
  return { persisted: !error, error: error?.message };
}

export async function sendOffer(input: { creatorId: number; campaignId: string; rateIndex: number; listPrice: number; amount: number; messages: OfferMessage[] }): Promise<Result<{ id: string }>> {
  const s = await session();
  if (!s) return { persisted: false };
  const { data, error } = await s.sb.from("offers").insert({
    creator_id: input.creatorId, campaign_id: input.campaignId || null, rate_index: input.rateIndex,
    list_price: input.listPrice, amount: input.amount, status: "Pending",
  }).select("id").single();
  if (error) return { persisted: false, error: error.message };
  await s.sb.from("offer_messages").insert(input.messages.map((m) => ({ offer_id: data.id, from_brand: m.fromBrand, body: m.text, amount: m.amount ?? null })));
  return { persisted: true, data: { id: data.id } };
}

export async function updateOffer(id: string, patch: { status?: OfferStatus; amount?: number; message?: OfferMessage; done?: Record<number, boolean> }): Promise<Result> {
  const s = await session();
  if (!s) return { persisted: false };
  const row: Record<string, unknown> = {};
  if (patch.status) row.status = patch.status;
  if (patch.amount != null) row.amount = patch.amount;
  if (patch.done) row.deliverables_done = patch.done;
  if (Object.keys(row).length) {
    const { error } = await s.sb.from("offers").update(row).eq("id", id);
    if (error) return { persisted: false, error: error.message };
  }
  if (patch.message) {
    await s.sb.from("offer_messages").insert({ offer_id: id, from_brand: patch.message.fromBrand, body: patch.message.text, amount: patch.message.amount ?? null });
  }
  return { persisted: true };
}

export async function requestOutdoorBooking(siteId: number, weeks: number[], total: number): Promise<Result<{ id: string }>> {
  const s = await session();
  if (!s) return { persisted: false };
  const w0 = weekZero();
  const dates = weeks.map((w) => addDays(w0, w * 7).toISOString().slice(0, 10));
  const { data, error } = await s.sb.from("outdoor_bookings").insert({ site_id: siteId, weeks: dates, total }).select("id").single();
  return error ? { persisted: false, error: error.message } : { persisted: true, data: { id: data.id } };
}

export async function sendInsertionOrder(lines: IoLine[]): Promise<Result<{ id: string; number: string }>> {
  const s = await session();
  if (!s) return { persisted: false };
  const subtotal = lines.reduce((t, l) => t + l.total, 0);
  const vat = Math.round(subtotal * VAT_RATE);
  const { data, error } = await s.sb.from("insertion_orders").insert({ subtotal, vat, total: subtotal + vat }).select("id,number").single();
  if (error) return { persisted: false, error: error.message };
  await s.sb.from("insertion_order_lines").insert(lines.map((l) => ({ order_id: data.id, outlet: l.outlet, description: l.description, run_dates: l.when, deadline: l.deadline ?? null, total: l.total })));
  return { persisted: true, data: { id: data.id, number: data.number } };
}
