"use client";

import { useMemo, useState } from "react";
import { useStore } from "../store";
import { PageHead, Portrait } from "../ui";
import CreatorSheet from "./CreatorSheet";
import { bd, compact } from "@/lib/format";
import { maxRate, minRate } from "@/lib/pricing";
import type { Creator } from "@/lib/types";

const SHOW = [["rate", "On RAMA rate card"], ["all", "All creators"]] as const;
const SIZES = [
  ["any", "Any audience"], ["micro", "Under 50K"], ["mid", "50K to 200K"], ["macro", "200K to 1M"], ["mega", "Over 1M"],
] as const;
const BUDGETS = [["any", "Any budget"], ["low", "Under BD 500"], ["mid", "BD 500 to 1,000"], ["high", "Over BD 1,000"]] as const;

const inSize = (f: number | null | undefined, s: string) => {
  if (s === "any") return true;
  if (f == null) return false;
  if (s === "micro") return f < 50_000;
  if (s === "mid") return f >= 50_000 && f < 200_000;
  if (s === "macro") return f >= 200_000 && f < 1_000_000;
  return f >= 1_000_000;
};

export default function Discover() {
  const { creators, campaigns, offers } = useStore();
  const [q, setQ] = useState("");
  const [show, setShow] = useState<(typeof SHOW)[number][0]>("rate");
  const [size, setSize] = useState<(typeof SIZES)[number][0]>("any");
  const [budget, setBudget] = useState<(typeof BUDGETS)[number][0]>("any");
  const [sort, setSort] = useState("followers");
  const [open, setOpen] = useState<Creator | null>(null);

  const priced = creators.filter((c) => minRate(c) != null);
  const lowest = priced.length ? Math.min(...priced.map((c) => minRate(c)!)) : 0;
  const totalReach = creators.reduce((t, c) => t + (c.followers ?? 0), 0);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    const l = creators.filter((c) => {
      const m = minRate(c);
      if (show === "rate" && m == null) return false;
      if (!inSize(c.followers, size)) return false;
      if (budget === "low" && !(m != null && m < 500)) return false;
      if (budget === "mid" && !(m != null && m >= 500 && m <= 1000)) return false;
      if (budget === "high" && !(m != null && m > 1000)) return false;
      if (needle && ![c.name, c.nickname, c.username, c.displayName, c.bio].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });
    const inf = (v: number | null) => (v == null ? Infinity : v);
    if (sort === "low") l.sort((a, b) => inf(minRate(a)) - inf(minRate(b)));
    else if (sort === "high") l.sort((a, b) => (maxRate(b) ?? -1) - (maxRate(a) ?? -1));
    else if (sort === "name") l.sort((a, b) => a.name.localeCompare(b.name));
    else l.sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
    return l;
  }, [creators, q, show, size, budget, sort]);

  const committed = offers.filter((o) => o.status === "Accepted").reduce((t, o) => t + o.amount, 0);
  const openOffers = offers.filter((o) => o.status === "Pending" || o.status === "Countered").length;
  const filtersOn = q || size !== "any" || budget !== "any";

  return (
    <>
      <PageHead title="Discover creators" ar="اكتشف المؤثرين" lede="Choose a creator, build a package from their rates and send an offer."
        kpis={[[campaigns.filter((c) => c.status === "Live").length, "Live campaigns"], [openOffers, "Open offers"], [bd(committed), "Committed"]]} />
      <section className="band">
        <div><h2>RAMA creator network</h2><p>Instagram accounts RAMA works with across Bahrain and the Gulf, with RAMA rate card prices for the creators who have them.</p></div>
        <div className="bandfacts num">
          <div><b>{creators.length}</b><span>accounts</span></div>
          <div><b>{priced.length}</b><span>on the rate card</span></div>
          <div><b>{compact(totalReach)}</b><span>combined followers</span></div>
          <div><b>{bd(lowest)}</b><span>lowest package</span></div>
        </div>
      </section>
      <div className="fbar">
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, @handle or bio" aria-label="Search creators" />
        </label>
        <select className="sel" value={size} onChange={(e) => setSize(e.target.value as typeof size)} aria-label="Audience size">
          {SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="followers">Most followers</option><option value="low">Lowest starting price</option><option value="high">Highest package price</option><option value="name">Name, A to Z</option>
        </select>
      </div>
      <div className="cats" role="group" aria-label="Which creators">
        {SHOW.map(([v, l]) => <button key={v} className="cat" aria-pressed={show === v} onClick={() => setShow(v)}>{l}</button>)}
        <span className="catsep" aria-hidden="true" />
        {BUDGETS.map(([v, l]) => <button key={v} className="cat" aria-pressed={budget === v} onClick={() => { setBudget(v); if (v !== "any") setShow("rate"); }}>{l}</button>)}
      </div>
      <p className="resn num">{list.length} {list.length === 1 ? "creator" : "creators"}{show === "rate" ? " with RAMA prices" : ""}</p>
      {list.length ? (
        <div className="grid">
          {list.map((c) => {
            const m = minRate(c);
            return (
              <button key={c.id} className="tile" onClick={() => setOpen(c)} aria-label={c.name}>
                <Portrait creator={c}>{m != null && <span className="ratebadge">Rate card</span>}</Portrait>
                <div className="nm"><b dir="auto">{c.name}</b>{c.followers != null && <span className="f num">{compact(c.followers)}</span>}</div>
                <div className="sub2 num">
                  <span className="handle">{c.username ? `@${c.username}` : "No Instagram linked"}</span>
                  {m != null ? <span>from <b>{bd(m)}</b></span> : <span>Quote on request</span>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty"><b>No creators match</b><span>Try another audience size or budget, or clear the search.</span>
          {filtersOn && <button className="btn line sm" onClick={() => { setQ(""); setSize("any"); setBudget("any"); }}>Clear filters</button>}
          {show === "rate" && <button className="btn line sm" onClick={() => setShow("all")}>Show all creators</button>}
        </div>
      )}
      {open && <CreatorSheet creator={open} onClose={() => setOpen(null)} />}
    </>
  );
}
