"use client";

import { useMemo, useState } from "react";
import { useStore } from "../store";
import { PageHead } from "../ui";
import BahrainMap from "./BahrainMap";
import SiteSheet from "./SiteSheet";
import Thumb from "./Thumb";
import { addDays, bd, compact, fmtDate, weekZero } from "@/lib/format";
import type { OutdoorSite } from "@/lib/types";

const FORMATS = ["Billboard", "LED screen", "Unipole", "Mall screen", "Bridge banner", "Airport screen", "Bus shelters"];
export const weekLabel = (i: number) => fmtDate(addDays(weekZero(), i * 7), { day: "numeric", month: "short" });

export default function Explorer() {
  const { sites, bookings } = useStore();
  const [area, setArea] = useState("All");
  const [start, setStart] = useState(0);
  const [weeks, setWeeks] = useState(2);
  const [format, setFormat] = useState("All");
  const [maxPrice, setMaxPrice] = useState(3000);
  const [sort, setSort] = useState("rec");
  const [mode, setMode] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const areas = useMemo(() => [...new Set(sites.map((s) => s.area))].sort(), [sites]);
  const chosen = useMemo(() => Array.from({ length: weeks }, (_, i) => start + i).filter((i) => i < 12), [start, weeks]);
  const freeFor = (s: OutdoorSite) => chosen.filter((i) => !s.bookedWeeks.includes(i)).length;
  const list = useMemo(() => {
    const l = sites.filter((s) => (area === "All" || s.area === area) && (format === "All" || s.format === format) && s.weeklyPrice <= maxPrice);
    const free = (s: OutdoorSite) => chosen.filter((i) => !s.bookedWeeks.includes(i)).length;
    if (sort === "low") l.sort((a, b) => a.weeklyPrice - b.weeklyPrice);
    else if (sort === "imp") l.sort((a, b) => b.dailyViews - a.dailyViews);
    else l.sort((a, b) => free(b) - free(a) || b.dailyViews / b.weeklyPrice - a.dailyViews / a.weeklyPrice);
    return l;
  }, [sites, area, format, maxPrice, sort, chosen]);

  return (
    <>
      <PageHead title="Outdoors" ar="الإعلانات الخارجية" lede="Find billboards and screens on the map, check free weeks and request a booking."
        kpis={[[sites.length, "Sites"], [bookings.length, "Booking requests"]]} />
      <form className="osearch" onSubmit={(e) => e.preventDefault()}>
        <div className="of"><label htmlFor="oArea">Where</label><select id="oArea" value={area} onChange={(e) => setArea(e.target.value)}><option value="All">All of Bahrain</option>{areas.map((a) => <option key={a}>{a}</option>)}</select></div>
        <div className="of"><label htmlFor="oStart">From the week of</label><select id="oStart" value={start} onChange={(e) => setStart(+e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{weekLabel(i)} {addDays(weekZero(), i * 7).getFullYear()}</option>)}</select></div>
        <div className="of"><label htmlFor="oWeeks">For</label><select id="oWeeks" value={weeks} onChange={(e) => setWeeks(+e.target.value)}>{[1, 2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n} week{n > 1 ? "s" : ""}</option>)}</select></div>
        <div className="of"><label htmlFor="oFmt">Format</label><select id="oFmt" value={format} onChange={(e) => setFormat(e.target.value)}><option value="All">Any format</option>{FORMATS.map((f) => <option key={f}>{f}</option>)}</select></div>
      </form>
      <div className="otools">
        <div className="cats" role="group" aria-label="Maximum price per week">
          {([[3000, "Any price"], [700, "Up to BD 700"], [1200, "Up to BD 1,200"], [2000, "Up to BD 2,000"]] as const).map(([v, l]) => <button key={v} className="cat" aria-pressed={maxPrice === v} onClick={() => setMaxPrice(v)}>{l}</button>)}
        </div>
        <select className="sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by"><option value="rec">Best availability</option><option value="low">Lowest price</option><option value="imp">Most daily views</option></select>
        <div className="seg modes" role="group" aria-label="View">{(["list", "map"] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === "list" ? "List" : "Map"}</button>)}</div>
      </div>
      <div className="ox" data-mode={mode}>
        <div className="olist">
          <p className="resn num">{list.length} site{list.length === 1 ? "" : "s"} found, {weekLabel(start)} for {weeks} week{weeks > 1 ? "s" : ""}</p>
          {list.length ? list.map((a) => {
            const free = freeFor(a), full = free === chosen.length, left = 12 - a.bookedWeeks.length;
            return (
              <button key={a.id} className={`adcard${selected === a.id ? " sel" : ""}`} onClick={() => setOpen(a.id)} onMouseEnter={() => setHovered(a.id)} onMouseLeave={() => setHovered(null)}>
                <Thumb site={a} />
                <div className="adbody">
                  <div><b className="adname">{a.name}</b><span className="adloc">{a.area}, {a.format}</span></div>
                  <div className="adspecs num"><span>{a.size}</span><span>{compact(a.dailyViews)} views a day</span></div>
                  <div className="adfoot">
                    <span className={`avail ${full ? "ok" : free ? "part" : "no"}`}>{full ? "Free for your dates" : free ? `${free} of ${chosen.length} weeks free` : "Booked for your dates"}</span>
                    <span className="adprice num"><small>{chosen.length} week{chosen.length > 1 ? "s" : ""}</small><b>{bd(a.weeklyPrice * Math.max(free, 1))}</b><small>{bd(a.weeklyPrice)} a week</small></span>
                  </div>
                  {left <= 3 && left > 0 && <span className="scarce">Only {left} weeks left this quarter</span>}
                </div>
              </button>
            );
          }) : <div className="empty"><b>No sites match</b><span>Try another area, format or price.</span></div>}
        </div>
        <BahrainMap key={mode} sites={list} freeFor={freeFor} selected={selected} hovered={hovered} onSelect={setSelected} onOpen={setOpen} />
      </div>
      {open != null && <SiteSheet siteId={open} initialWeeks={chosen} onClose={() => setOpen(null)} />}
    </>
  );
}
