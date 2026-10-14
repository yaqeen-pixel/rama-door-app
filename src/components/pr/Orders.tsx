"use client";

import Link from "next/link";
import { useStore } from "../store";
import { PageHead, Pill } from "../ui";
import { bd } from "@/lib/format";

export default function Orders() {
  const { orders } = useStore();
  return (
    <>
      <PageHead title="Insertion orders" ar="العلاقات العامة" lede="Orders you have sent to RAMA and their status." />
      {orders.length ? (
        <div className="ledger">{orders.map((o) => (
          <div className="lrow" key={o.id}>
            <div className="cmark" style={{ background: "var(--pr-tint)", color: "var(--pr-deep)" }}>IO</div>
            <div><h3>Insertion order {o.number}</h3>
              <div className="meta num"><span>{o.lines.length} line{o.lines.length > 1 ? "s" : ""}</span><span>{[...new Set(o.lines.map((l) => l.outlet))].join(", ")}</span><span>{bd(o.total)} incl. VAT</span></div>
              {o.simulated && <div className="meta" style={{ marginTop: 4 }}><span>Simulated confirmation</span></div>}</div>
            <div className="end"><Pill status={o.status} /></div>
          </div>
        ))}</div>
      ) : <div className="empty"><b>No insertion orders sent yet</b><span>Add ads or PR services to your order, then send it to RAMA.</span><Link className="btn sm" href="/pr">Open the newsstand</Link></div>}
    </>
  );
}
