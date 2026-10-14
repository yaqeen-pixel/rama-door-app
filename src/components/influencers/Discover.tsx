"use client";

import { useMemo, useState } from "react";
import { useStore } from "../store";
import { PageHead, Portrait } from "../ui";
import CreatorSheet from "./CreatorSheet";
import { bd } from "@/lib/format";
import { maxRate, minRate } from "@/lib/pricing";
import type { Creator } from "@/lib/types";

const BUDGETS = [["All", "Any budget"], ["low", "Under BD 500"], ["mid", "BD 500 to 1,000"], ["high", "Over BD 1,000"]] as const;

export default function Discover() {
  const { creators, campaigns, offers } = useStore();
  const [q, setQ] = useState("");
  const [budget, setBudget] = useState<(typeof BUDGETS)[number][0]>("All");
  const [sort, setSort] = useState("name");
  const [open, setOpen] = useState<Creator | null>(null);

  const priced = creators.filter((c) => minRate(c) != null);
  const lowest = Math.min(...priced.map((c) => minRate(c)!));
  const highest = Math.max(...priced.map((c) => maxRate(c)!));

  const list = useMemo(() => {
    const l = creators.filter((c) => {
      const m = minRate(c);
      if (budget === "low" && !(m != null && m < 500)) return false;
      if (budget === "mid" && !(m != null && m >= 500 && m <= 1000)) return false;
      if (budget === "high" && !(m != null && m > 1000)) return false;
      if (q && !(c.name + " " + (c.nickname ?? "")).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const inf = (v: number | null) => (v == null ? Infinity : v);
    if (sort === "low") l.sort((a, b) => inf(minRate(a)) - inf(minRate(b)));
    else if (sort === "high") l.sort((a, b) => (maxRate(b) ?? -1) - (maxRate(a) ?? -1));
    else l.sort((a, b) => a.name.localeCompare(b.name));
    return l;
  }, [creators, q, budget, sort]);

  const committed = offers.filter((o) => o.status === "Accepted").reduce((t, o) => t + o.amount, 0);
  const open_ = offers.filter((o) => o.status === "Pending" || o.status === "Countered").length;

  return (
    <>
      <PageHead title="Discover creators" ar="اكتشف المؤثرين" lede="Choose a creator, build a package from their rates and send an offer."
        kpis={[[campaigns.filter((c) => c.status === "Live").length, "Live campaigns"], [open_, "Open offers"], [bd(committed), "Committed"]]} />
      <section className="band">
        <div><h2>RAMA rate card</h2><p>Every creator RAMA works with, with packages priced for videography, Snapchat, sponsored ads and two-round bookings.</p></div>
        <div className="bandfacts num">
          <div><b>{creators.length}</b><span>creators</span></div>
          <div><b>{bd(lowest)}</b><span>lowest package</span></div>
          <div><b>{bd(highest)}</b><span>highest package</span></div>
          <div><b>12</b><span>package options each</span></div>
        </div>
      </section>
      <div className="fbar">
        <label className="search">
          <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search creators by name" aria-label="Search creators" />
        </label>
        <select className="sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="name">Name, A to Z</option><option value="low">Lowest starting price</option><option value="high">Highest package price</option>
        </select>
      </div>
      <div className="cats" role="group" aria-label="Starting price">
        {BUDGETS.map(([v, l]) => <button key={v} className="cat" aria-pressed={budget === v} onClick={() => setBudget(v)}>{l}</button>)}
      </div>
      <p className="resn num">{list.length} creator{list.length === 1 ? "" : "s"}. Followers, platforms and categories will appear here once the influencer database is added.</p>
      {list.length ? (
        <div className="grid">
          {list.map((c) => (
            <button key={c.id} className="tile" onClick={() => setOpen(c)} aria-label={c.name}>
              <Portrait creator={c}>{c.nickname && <span className="nick" lang="ar">{c.nickname}</span>}</Portrait>
              <div className="nm"><b>{c.name}</b></div>
              <div className="sub2 num">
                {minRate(c) != null ? <><span>Full scope <b>{bd(c.rates![0]!)}</b></span><span>from <b>{bd(minRate(c)!)}</b></span></> : <span>Price on request</span>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty"><b>No creators match</b><span>Try another budget or clear the search.</span>
          <button className="btn line sm" onClick={() => { setQ(""); setBudget("All"); }}>Clear filters</button></div>
      )}
      {open && <CreatorSheet creator={open} onClose={() => setOpen(null)} />}
    </>
  );
}
