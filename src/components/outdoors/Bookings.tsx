"use client";

import Link from "next/link";
import { useStore } from "../store";
import { PageHead, Pill } from "../ui";
import Thumb from "./Thumb";
import { weekLabel } from "./Explorer";
import { bd } from "@/lib/format";

export default function Bookings() {
  const { bookings, sites } = useStore();
  return (
    <>
      <PageHead title="Outdoor bookings" ar="الإعلانات الخارجية" lede="Your outdoor booking requests and confirmations." />
      {bookings.length ? (
        <div className="ledger">{bookings.map((b) => {
          const a = sites.find((s) => s.id === b.siteId);
          if (!a) return null;
          return (
            <div className="lrow" key={b.id}><div className="bthumb"><Thumb site={a} /></div>
              <div><h3>{a.name}</h3><div className="meta num"><span>{a.area}</span><span>{b.weeks.map(weekLabel).join(", ")}</span><span>{bd(b.total)}</span></div>
                {b.simulated && <div className="meta" style={{ marginTop: 4 }}><span>Simulated confirmation</span></div>}</div>
              <div className="end"><Pill status={b.status} /></div></div>
          );
        })}</div>
      ) : <div className="empty"><b>No booking requests yet</b><span>Pick a site on the map, choose your weeks and request a booking.</span><Link className="btn sm" href="/outdoors">Find a site</Link></div>}
    </>
  );
}
