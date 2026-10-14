"use client";

import { useState } from "react";
import { useStore } from "../store";
import { Pill, Portrait, Sheet } from "../ui";
import { bd, firstName } from "@/lib/format";
import { deliverables, rateLabel } from "@/lib/pricing";

export default function OfferThread({ offerId, onClose }: { offerId: string; onClose: () => void }) {
  const { offers, creators, campaigns, typing, acceptCounter, declineCounter, counterOffer, toggleDeliverable } = useStore();
  const o = offers.find((x) => x.id === offerId);
  const lastCounter = o ? [...o.messages].reverse().find((m) => !m.fromBrand && m.amount) : undefined;
  const [amt, setAmt] = useState<number>(o && lastCounter?.amount ? Math.round((o.amount + lastCounter.amount) / 2) : 0);
  if (!o) return null;
  const c = creators.find((x) => x.id === o.creatorId)!;
  const camp = campaigns.find((x) => x.id === o.campaignId);
  return (
    <Sheet title="Offer thread" onClose={onClose}>
      <div className="phead" style={{ gridTemplateColumns: "96px 1fr" }}>
        <Portrait creator={c} />
        <div><h2 style={{ fontSize: 26 }}>{c.name}</h2><p className="h">{camp?.name ?? ""}</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}><Pill status={o.status} /><b className="num">{bd(o.amount)}</b></div></div>
      </div>
      <div className="blk"><h3>{rateLabel(o.rateIndex)}, rate card price {bd(o.listPrice)}</h3>
        <div className="thread">
          {o.messages.map((m, i) => (
            <div key={i} className={`msg${m.fromBrand ? " me" : ""}`}>{m.text}{m.amount ? <span className="amt num">{bd(m.amount)}</span> : null}{m.simulated && <small className="demo">Simulated reply</small>}</div>
          ))}
          {typing[o.id] && <div className="typing">{firstName(c.name)} is typing…</div>}
        </div>
      </div>
      {o.status === "Countered" && lastCounter?.amount && (
        <div className="blk"><h3>Reply to the counter offer</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn ok" onClick={() => acceptCounter(o.id)}>Accept {bd(lastCounter.amount)}</button>
            <button className="btn bad" onClick={() => declineCounter(o.id)}>Decline</button>
          </div>
          <form className="two" style={{ alignItems: "end" }} onSubmit={(e) => { e.preventDefault(); if (amt > 0) counterOffer(o.id, amt); }}>
            <div className="field"><label htmlFor="ctr">Or send a new amount in BD</label><input id="ctr" type="number" min={1} value={amt} onChange={(e) => setAmt(+e.target.value)} /></div>
            <button className="btn" type="submit">Send counter offer</button>
          </form>
        </div>
      )}
      {o.status === "Accepted" && (
        <div className="blk"><h3>Deliverables</h3>
          {deliverables(o.rateIndex).map((it, i) => (
            <label className="pkg" key={it}><input type="checkbox" checked={!!o.done[i]} onChange={(e) => toggleDeliverable(o.id, i, e.target.checked)} />
              <div><b>{it}</b><small>Tick when it&apos;s live</small></div><span /></label>
          ))}
        </div>
      )}
    </Sheet>
  );
}
