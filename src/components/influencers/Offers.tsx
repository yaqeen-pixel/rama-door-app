"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "../store";
import { PageHead, Pill, Portrait } from "../ui";
import OfferThread from "./OfferThread";
import { bd } from "@/lib/format";
import { rateLabel } from "@/lib/pricing";

export default function Offers() {
  const { offers, creators, campaigns, typing } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHead title="Offers" lede="Every negotiation with a creator, from first offer to accepted deal." />
      {offers.length ? (
        <div className="ledger">
          {offers.map((o) => {
            const c = creators.find((x) => x.id === o.creatorId)!;
            const last = o.messages[o.messages.length - 1];
            return (
              <div className="lrow" key={o.id}>
                <Portrait creator={c} className="mini" />
                <div><h3>{c.name}</h3>
                  <div className="meta"><span>{campaigns.find((x) => x.id === o.campaignId)?.name ?? ""}</span><span>{rateLabel(o.rateIndex)}</span><span className="num">{bd(o.amount)}</span></div>
                  <div className="meta" style={{ marginTop: 4 }}><span>{typing[o.id] ? "Replying now…" : `Latest: ${last.text.length > 70 ? last.text.slice(0, 70) + "…" : last.text}`}</span></div></div>
                <div className="end"><Pill status={o.status} /><button className="btn sm line" onClick={() => setOpen(o.id)}>Open thread</button></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty"><b>No offers yet</b><span>Open a creator in Discover, build a package and send your first offer.</span><Link className="btn sm" href="/influencers">Go to Discover</Link></div>
      )}
      {open && <OfferThread offerId={open} onClose={() => setOpen(null)} />}
    </>
  );
}
