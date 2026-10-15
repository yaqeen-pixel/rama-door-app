"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "../store";
import { PageHead, Portrait, Sheet } from "../ui";
import CreatorSheet from "./CreatorSheet";
import { bd, compact } from "@/lib/format";
import { maxRate, minRate } from "@/lib/pricing";
import type { Creator } from "@/lib/types";

/* ---------------- filter definitions ---------------- */
const TIERS = [
  { key: "nano", label: "Nano", range: "under 10K", min: 0, max: 10_000 },
  { key: "micro", label: "Micro", range: "10K to 50K", min: 10_000, max: 50_000 },
  { key: "mid", label: "Mid", range: "50K to 200K", min: 50_000, max: 200_000 },
  { key: "macro", label: "Macro", range: "200K to 1M", min: 200_000, max: 1_000_000 },
  { key: "mega", label: "Mega", range: "over 1M", min: 1_000_000, max: Infinity },
] as const;
const PLATFORMS = [
  { key: "instagram", label: "Instagram", short: "IG" },
  { key: "tiktok", label: "TikTok", short: "TT" },
  { key: "snapchat", label: "Snapchat", short: "SC" },
  { key: "youtube", label: "YouTube", short: "YT" },
] as const;
const TYPES = [
  { key: "creator", label: "Creators", hint: "People and personal brands" },
  { key: "page", label: "Pages", hint: "News, media and community accounts" },
] as const;
const PACKAGES = [
  { key: "any", label: "Any package", idx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { key: "video", label: "With videography", idx: [0, 1, 2, 3] },
  { key: "novideo", label: "Without videography", idx: [4, 5, 6, 7] },
  { key: "two", label: "Package of 2, with videography", idx: [8, 9, 10, 11] },
] as const;

type Filters = {
  rateOnly: boolean;
  tiers: string[];
  platforms: string[];
  types: string[];
  pkg: (typeof PACKAGES)[number]["key"];
  priceMin: number | "";
  priceMax: number | "";
  q: string;
};
const EMPTY: Filters = { rateOnly: false, tiers: [], platforms: [], types: [], pkg: "any", priceMin: "", priceMax: "", q: "" };

/** Cheapest price for the chosen package type, or null if the creator has none. */
function packagePrice(c: Creator, pkg: Filters["pkg"]) {
  const idx = PACKAGES.find((p) => p.key === pkg)!.idx;
  const prices = idx.map((i) => c.rates?.[i]).filter((v): v is number => v != null);
  return prices.length ? Math.min(...prices) : null;
}

type Group = "rate" | "tiers" | "platforms" | "types" | "price" | "q";
function matches(c: Creator, f: Filters, skip?: Group) {
  if (skip !== "rate" && f.rateOnly && minRate(c) == null) return false;
  if (skip !== "tiers" && f.tiers.length) {
    const n = c.followers;
    if (n == null || !TIERS.some((t) => f.tiers.includes(t.key) && n >= t.min && n < t.max)) return false;
  }
  if (skip !== "platforms" && f.platforms.length && !f.platforms.every((p) => (c.platforms ?? ["instagram"]).includes(p))) return false;
  if (skip !== "types" && f.types.length && !f.types.includes(c.accountType ?? "creator")) return false;
  if (skip !== "price" && (f.priceMin !== "" || f.priceMax !== "" || f.pkg !== "any")) {
    const p = packagePrice(c, f.pkg);
    if (p == null) return false;
    if (f.priceMin !== "" && p < f.priceMin) return false;
    if (f.priceMax !== "" && p > f.priceMax) return false;
  }
  if (skip !== "q" && f.q.trim()) {
    const needle = f.q.trim().toLowerCase().replace(/^@/, "");
    if (![c.name, c.nickname, c.username, c.displayName, c.bio].join(" ").toLowerCase().includes(needle)) return false;
  }
  return true;
}

const toggle = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

/* ---------------- filter panel ---------------- */
function FilterPanel({ creators, f, set }: { creators: Creator[]; f: Filters; set: (f: Filters) => void }) {
  const count = (g: Group, test: (c: Creator) => boolean) => creators.filter((c) => matches(c, f, g) && test(c)).length;
  const priced = creators.filter((c) => minRate(c) != null);
  const lo = priced.length ? Math.min(...priced.map((c) => minRate(c)!)) : 0;
  const hi = priced.length ? Math.max(...priced.map((c) => maxRate(c)!)) : 0;
  const num = (v: string) => (v === "" ? "" : Math.max(0, Number(v)));

  return (
    <div className="fpanel">
      <section className="fgroup">
        <label className="fcheck big">
          <input type="checkbox" checked={f.rateOnly} onChange={(e) => set({ ...f, rateOnly: e.target.checked })} />
          <span><b>On RAMA rate card</b><small>Only creators with RAMA prices</small></span>
          <em className="num">{count("rate", (c) => minRate(c) != null)}</em>
        </label>
      </section>

      <section className="fgroup">
        <h4>Followers</h4>
        {TIERS.map((t) => (
          <label className="fcheck" key={t.key}>
            <input type="checkbox" checked={f.tiers.includes(t.key)} onChange={() => set({ ...f, tiers: toggle(f.tiers, t.key) })} />
            <span><b>{t.label}</b><small>{t.range}</small></span>
            <em className="num">{count("tiers", (c) => c.followers != null && c.followers >= t.min && c.followers < t.max)}</em>
          </label>
        ))}
      </section>

      <section className="fgroup">
        <h4>Price</h4>
        <div className="field">
          <label htmlFor="fPkg" className="sr">Package type</label>
          <select id="fPkg" value={f.pkg} onChange={(e) => set({ ...f, pkg: e.target.value as Filters["pkg"] })}>
            {PACKAGES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div className="frange">
          <div className="field"><label htmlFor="fMin">From BD</label><input id="fMin" type="number" min={0} inputMode="numeric" placeholder={String(lo)} value={f.priceMin} onChange={(e) => set({ ...f, priceMin: num(e.target.value) })} /></div>
          <div className="field"><label htmlFor="fMax">To BD</label><input id="fMax" type="number" min={0} inputMode="numeric" placeholder={String(hi)} value={f.priceMax} onChange={(e) => set({ ...f, priceMax: num(e.target.value) })} /></div>
        </div>
        <div className="fquick">
          {[[0, 500, "Under 500"], [500, 1000, "500 to 1,000"], [1000, "", "Over 1,000"]].map(([a, b, l]) => (
            <button key={String(l)} type="button" className="chip" aria-pressed={f.priceMin === (a || "") && f.priceMax === b}
              onClick={() => set({ ...f, priceMin: (a as number) || "", priceMax: b as number | "" })}>BD {l}</button>
          ))}
        </div>
        <p className="hint">Uses each creator&apos;s lowest price for the chosen package type.</p>
      </section>

      <section className="fgroup">
        <h4>Platforms</h4>
        {PLATFORMS.map((p) => (
          <label className="fcheck" key={p.key}>
            <input type="checkbox" checked={f.platforms.includes(p.key)} onChange={() => set({ ...f, platforms: toggle(f.platforms, p.key) })} />
            <span><b>{p.label}</b></span>
            <em className="num">{count("platforms", (c) => (c.platforms ?? ["instagram"]).includes(p.key))}</em>
          </label>
        ))}
        <p className="hint">Accounts must be on every platform you tick.</p>
      </section>

      <section className="fgroup">
        <h4>Account type</h4>
        {TYPES.map((t) => (
          <label className="fcheck" key={t.key}>
            <input type="checkbox" checked={f.types.includes(t.key)} onChange={() => set({ ...f, types: toggle(f.types, t.key) })} />
            <span><b>{t.label}</b><small>{t.hint}</small></span>
            <em className="num">{count("types", (c) => (c.accountType ?? "creator") === t.key)}</em>
          </label>
        ))}
      </section>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function Discover() {
  const { creators, campaigns, offers, selected, toggleSelected, setSelected } = useStore();
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState("followers");
  const [open, setOpen] = useState<Creator | null>(null);
  const [panel, setPanel] = useState(false);

  const list = useMemo(() => {
    const l = creators.filter((c) => matches(c, f));
    const price = (c: Creator) => packagePrice(c, f.pkg) ?? Infinity;
    if (sort === "low") l.sort((a, b) => price(a) - price(b));
    else if (sort === "high") l.sort((a, b) => (packagePrice(b, f.pkg) ?? -1) - (packagePrice(a, f.pkg) ?? -1));
    else if (sort === "followers_asc") l.sort((a, b) => (a.followers ?? Infinity) - (b.followers ?? Infinity));
    else if (sort === "name") l.sort((a, b) => a.name.localeCompare(b.name));
    else l.sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
    return l;
  }, [creators, f, sort]);

  // Active filters as removable chips.
  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (f.rateOnly) chips.push({ label: "On rate card", clear: { rateOnly: false } });
  f.tiers.forEach((k) => { const t = TIERS.find((x) => x.key === k)!; chips.push({ label: `${t.label} (${t.range})`, clear: { tiers: f.tiers.filter((x) => x !== k) } }); });
  f.platforms.forEach((k) => chips.push({ label: PLATFORMS.find((x) => x.key === k)!.label, clear: { platforms: f.platforms.filter((x) => x !== k) } }));
  f.types.forEach((k) => chips.push({ label: TYPES.find((x) => x.key === k)!.label, clear: { types: f.types.filter((x) => x !== k) } }));
  if (f.pkg !== "any") chips.push({ label: PACKAGES.find((p) => p.key === f.pkg)!.label, clear: { pkg: "any" } });
  if (f.priceMin !== "" || f.priceMax !== "") {
    const label = f.priceMin !== "" && f.priceMax !== "" ? `BD ${f.priceMin} to ${f.priceMax}` : f.priceMin !== "" ? `From BD ${f.priceMin}` : `Up to BD ${f.priceMax}`;
    chips.push({ label, clear: { priceMin: "", priceMax: "" } });
  }

  const committed = offers.filter((o) => o.status === "Accepted").reduce((t, o) => t + o.amount, 0);
  const openOffers = offers.filter((o) => o.status === "Pending" || o.status === "Countered").length;
  const priced = creators.filter((c) => minRate(c) != null);
  const totalReach = creators.reduce((t, c) => t + (c.followers ?? 0), 0);
  const panelEl = <FilterPanel creators={creators} f={f} set={setF} />;

  return (
    <>
      <PageHead title="Discover creators" ar="اكتشف المؤثرين" lede="Find creators by followers, price and platform, build a package and send an offer."
        kpis={[[campaigns.filter((c) => c.status === "Live").length, "Live campaigns"], [openOffers, "Open offers"], [bd(committed), "Committed"]]} />
      <section className="band">
        <div><h2>RAMA creator network</h2><p>Instagram accounts RAMA works with across Bahrain and the Gulf, with RAMA rate card prices for the creators who have them.</p></div>
        <div className="bandfacts num">
          <div><b>{creators.length}</b><span>accounts</span></div>
          <div><b>{priced.length}</b><span>on the rate card</span></div>
          <div><b>{compact(totalReach)}</b><span>combined followers</span></div>
          <div><b>{bd(priced.length ? Math.min(...priced.map((c) => minRate(c)!)) : 0)}</b><span>lowest package</span></div>
        </div>
      </section>

      <div className="dlayout">
        <aside className="dside" aria-label="Filters">
          <div className="dside-hd"><h3>Filters</h3>{chips.length > 0 && <button className="lnk" onClick={() => setF({ ...EMPTY, q: f.q })}>Clear all</button>}</div>
          {panelEl}
        </aside>

        <div className="dmain">
          <div className="fbar">
            <label className="search">
              <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search name, @handle or bio" aria-label="Search creators" />
            </label>
            <button className="btn line ffbtn" onClick={() => setPanel(true)}>Filters{chips.length ? ` (${chips.length})` : ""}</button>
            <select className="sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              <option value="followers">Followers: high to low</option>
              <option value="followers_asc">Followers: low to high</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="name">Name, A to Z</option>
            </select>
          </div>

          {chips.length > 0 && (
            <div className="achips" aria-label="Active filters">
              {chips.map((c) => (
                <button key={c.label} className="achip" onClick={() => setF({ ...f, ...c.clear })} aria-label={`Remove filter ${c.label}`}>{c.label}<span aria-hidden="true">×</span></button>
              ))}
              <button className="lnk" onClick={() => setF({ ...EMPTY, q: f.q })}>Clear all</button>
            </div>
          )}

          <p className="resn num">{list.length} of {creators.length} accounts</p>
          {list.length ? (
            <div className="grid">
              {list.map((c) => {
                const p = f.pkg !== "any" ? packagePrice(c, f.pkg) : minRate(c);
                const on = selected.includes(c.id);
                return (
                  <div key={c.id} className={`tilewrap${on ? " picked" : ""}`}>
                  <button className="pick" onClick={() => toggleSelected(c.id)} aria-pressed={on} aria-label={on ? `Remove ${c.name} from the brief` : `Add ${c.name} to a brief`}>
                    {on ? "✓ Selected" : "+ Select"}
                  </button>
                  <button className="tile" onClick={() => setOpen(c)} aria-label={c.name}>
                    <Portrait creator={c}>
                      {minRate(c) != null && <span className="ratebadge">Rate card</span>}
                      <div className="plats">{(c.platforms ?? ["instagram"]).map((k) => <span key={k}>{PLATFORMS.find((x) => x.key === k)?.short ?? k}</span>)}</div>
                    </Portrait>
                    <div className="nm"><b dir="auto">{c.name}</b>{c.followers != null && <span className="f num">{compact(c.followers)}</span>}</div>
                    <div className="sub2 num">
                      <span className="handle">{c.username ? `@${c.username}` : "No Instagram linked"}</span>
                      {p != null ? <span>from <b>{bd(p)}</b></span> : <span>Quote on request</span>}
                    </div>
                  </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty"><b>No accounts match these filters</b><span>Remove a filter or widen the price range.</span>
              <button className="btn line sm" onClick={() => setF(EMPTY)}>Clear all filters</button>
            </div>
          )}
        </div>
      </div>

      {panel && (
        <Sheet title="Filters" onClose={() => setPanel(false)}>
          {panelEl}
          <div className="wfoot">
            <button className="btn line" onClick={() => setF({ ...EMPTY, q: f.q })}>Clear all</button>
            <button className="btn inf" onClick={() => setPanel(false)}>Show {list.length} accounts</button>
          </div>
        </Sheet>
      )}
      {selected.length > 0 && (
        <div className="tray" role="region" aria-label="Selected creators">
          <div className="tray-in">
            <div className="tray-avs">
              {selected.slice(0, 5).map((id) => { const c = creators.find((x) => x.id === id); return c ? <Portrait key={id} creator={c} className="mini" /> : null; })}
              {selected.length > 5 && <span className="tray-more num">+{selected.length - 5}</span>}
            </div>
            <div className="tray-txt"><b className="num">{selected.length} creator{selected.length > 1 ? "s" : ""} selected</b><span>Send them one brief with your dates, content and budget.</span></div>
            <button className="lnk" onClick={() => setSelected([])}>Clear</button>
            <Link className="btn inf" href="/influencers/brief">Submit brief</Link>
          </div>
        </div>
      )}
      {open && <CreatorSheet creator={open} onClose={() => setOpen(null)} />}
    </>
  );
}
