import type { Creator, Outlet } from "./types";

/* ---------------- Influencer rate card ---------------- */
export const RATE_GROUPS = ["With videography", "Without videography", "Package of 2, with videography"] as const;
export const RATE_SCOPES = [
  { label: "Full scope", detail: "IG Story, IG Reel, TikTok, Snapchat" },
  { label: "Scope", detail: "IG Story, IG Reel, TikTok" },
  { label: "Full scope with ads", detail: "Full scope plus 10 days of sponsored ads" },
  { label: "Scope with ads", detail: "Scope plus 10 days of sponsored ads" },
] as const;

export type PackageChoice = { video: boolean; snapchat: boolean; ads: boolean; twoRounds: boolean };

/** Maps the four package switches onto the 0-11 rate card index. Two rounds are only sold with videography. */
export function rateIndex(p: PackageChoice) {
  const group = p.twoRounds ? 2 : p.video ? 0 : 1;
  const scope = (p.snapchat ? 0 : 1) + (p.ads ? 2 : 0);
  return group * 4 + scope;
}
export const rateLabel = (i: number) => `${RATE_SCOPES[i % 4].label}, ${RATE_GROUPS[Math.floor(i / 4)].toLowerCase()}`;
export const priced = (c: Creator) => (c.rates ?? []).filter((v): v is number => v != null);
export const minRate = (c: Creator) => (priced(c).length ? Math.min(...priced(c)) : null);
export const maxRate = (c: Creator) => (priced(c).length ? Math.max(...priced(c)) : null);

/** What the creator has to deliver for a given rate card index. */
export function deliverables(i: number) {
  const scope = i % 4, group = Math.floor(i / 4);
  const items = ["Instagram Story", "Instagram Reel", "TikTok video"];
  if (scope === 0 || scope === 2) items.push("Snapchat");
  if (scope >= 2) items.push("10 days of sponsored ads");
  if (group !== 1) items.unshift("Videography shoot");
  if (group !== 2) return items;
  return [...items.map((x) => x + ", round 1"), ...items.filter((x) => !x.includes("sponsored")).map((x) => x + ", round 2")];
}

/* ---------------- Print media ---------------- */
export const PAGE_COLUMNS = 8;
export const PAGE_HEIGHT_CM = 52;
export const DAILY_SIZES = [
  { key: "full", label: "Full page", cols: 8, cm: 52 },
  { key: "half", label: "Half page", cols: 8, cm: 26 },
  { key: "quarter", label: "Quarter page", cols: 4, cm: 26 },
  { key: "strip", label: "Front page strip", cols: 8, cm: 8, front: true },
  { key: "custom", label: "Custom size", cols: 3, cm: 15 },
] as const;
export const POSITIONS = [
  { key: "rop", label: "Any page", multiplier: 1 },
  { key: "p3", label: "Page 3", multiplier: 1.25 },
  { key: "back", label: "Back page", multiplier: 1.5 },
] as const;
export const FRONT_PAGE_MULTIPLIER = 2;
export const COLOUR_MULTIPLIER = 1.3;
export const ADVERTORIAL_WRITING = 1.15;
export const MAG_SIZES = [
  { key: "full", label: "Full page" },
  { key: "half", label: "Half page" },
  { key: "dps", label: "Double-page spread" },
  { key: "ifc", label: "Inside front cover" },
  { key: "obc", label: "Outside back cover" },
] as const;
export const VAT_RATE = 0.1;

/** Price of one insertion of a daily-newspaper display ad. */
export function dailyAdPrice(o: Outlet, cols: number, cm: number, positionMultiplier: number, colour: boolean) {
  return Math.round((o.columnCmRate ?? 0) * cols * cm * positionMultiplier * (colour ? COLOUR_MULTIPLIER : 1));
}
export const outletFrom = (o: Outlet) => (o.kind === "daily" ? (o.columnCmRate ?? 0) * 8 * 8 : o.magazine!.half);
