"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store";
import { Sheet } from "../ui";
import Thumb from "./Thumb";
import { weekLabel } from "./Explorer";
import { bd, compact } from "@/lib/format";

export default function SiteSheet({ siteId, initialWeeks, onClose }: { siteId: number; initialWeeks: number[]; onClose: () => void }) {
  const { sites, requestBooking, mode } = useStore();
  const router = useRouter();
  const a = sites.find((s) => s.id === siteId)!;
  const [pick, setPick] = useState(() => new Set(initialWeeks.filter((i) => !a.bookedWeeks.includes(i))));
  const toggle = (i: number) => setPick((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const screen = a.format.includes("screen") || a.format === "LED screen";
  return (
    <Sheet title={a.format} onClose={onClose}>
      <div className="adhero"><Thumb site={a} big /></div>
      <h2 style={{ fontSize: 30, marginTop: 18 }}>{a.name}</h2>
      <p className="h" style={{ color: "var(--ink-2)", marginTop: 6 }}>{a.area}, Bahrain</p>
      <div className="facts num"><div><b>{bd(a.weeklyPrice)}</b><span>per week</span></div><div><b>{compact(a.dailyViews)}</b><span>est. daily views</span></div><div><b>{a.size.split(",")[0]}</b><span>size</span></div></div>
      <div className="review">
        <div><span>Faces</span><b>{a.faces}</b></div>
        <div><span>Lighting</span><b>{a.lighting}</b></div>
        <div><span>Artwork</span><b>{screen ? "MP4 or JPG, sent 5 days before start" : "Print file, sent 10 days before start"}</b></div>
      </div>
      <div className="blk"><h3>Choose your weeks</h3>
        <div className="weeks num">{Array.from({ length: 12 }, (_, i) => {
          const booked = a.bookedWeeks.includes(i);
          return <button key={i} type="button" className={`wkb${booked ? " taken" : ""}`} aria-pressed={pick.has(i)} disabled={booked} onClick={() => toggle(i)}><b>{weekLabel(i)}</b><small>{booked ? "Booked" : "Free"}</small></button>;
        })}</div>
      </div>
      <div className="total">
        <div><small>{pick.size} week{pick.size === 1 ? "" : "s"} selected</small><b className="num">{bd(a.weeklyPrice * pick.size)}</b></div>
        <button className="btn inf" disabled={!pick.size || mode === "guest"} onClick={async () => { await requestBooking(a.id, [...pick].sort((x, y) => x - y)); onClose(); router.push("/outdoors/bookings"); }}>
          {mode === "guest" ? "Sign in to book" : "Request booking"}</button>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>RAMA confirms each request and sends the proof for approval.</p>
    </Sheet>
  );
}
