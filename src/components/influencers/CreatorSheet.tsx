"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../store";
import { Portrait, Seg, Sheet } from "../ui";
import { bd, firstName } from "@/lib/format";
import { RATE_SCOPES, maxRate, minRate, rateIndex, rateLabel, type PackageChoice } from "@/lib/pricing";
import type { Creator } from "@/lib/types";

export default function CreatorSheet({ creator: c, onClose }: { creator: Creator; onClose: () => void }) {
  const { campaigns, sendOffer, mode } = useStore();
  const router = useRouter();
  const [p, setP] = useState<PackageChoice>({ video: true, snapchat: true, ads: false, twoRounds: false });
  const idx = rateIndex(p);
  const list = c.rates?.[idx] ?? null;
  const [amount, setAmount] = useState<number | "">(list ?? "");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [message, setMessage] = useState(`Hi ${firstName(c.name)}, we'd love to work with you on this campaign. The brief is attached.`);
  const [busy, setBusy] = useState(false);

  const choose = (patch: Partial<PackageChoice>) => {
    const next = { ...p, ...patch };
    if (next.twoRounds) next.video = true;
    setP(next);
    setAmount(c.rates?.[rateIndex(next)] ?? "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list || !amount || amount <= 0 || busy) return;
    setBusy(true);
    await sendOffer({ creatorId: c.id, campaignId, rateIndex: idx, listPrice: list, amount, message, label: rateLabel(idx) });
    setBusy(false);
    onClose();
    router.push("/influencers/offers");
  };

  return (
    <Sheet title="Creator" onClose={onClose}>
      <div className="phead">
        <Portrait creator={c} />
        <div>
          <h2>{c.name}</h2>
          {c.nickname && <p className="h" lang="ar">{c.nickname}</p>}
          <p className="h">{minRate(c) != null ? `Packages from ${bd(minRate(c)!)} to ${bd(maxRate(c)!)}` : "Price on request"}</p>
        </div>
      </div>

      {c.rates ? (
        <>
          <div className="blk">
            <h3>Rate card</h3>
            <div className="rates" role="table" aria-label="Rate card">
              <div className="rh" role="row"><span role="columnheader" />{["With video", "No video", "2 rounds, video"].map((h) => <span role="columnheader" key={h}>{h}</span>)}</div>
              {RATE_SCOPES.map((s, si) => (
                <div className="rr" role="row" key={s.label}>
                  <span role="rowheader"><b>{s.label}</b><small>{s.detail}</small></span>
                  {[0, 1, 2].map((g) => { const i = g * 4 + si; const v = c.rates![i]; return <span role="cell" key={g} className={`num${i === idx ? " on" : ""}`} data-cell>{v ? bd(v) : "—"}</span>; })}
                </div>
              ))}
            </div>
          </div>

          <form className="blk" onSubmit={submit}>
            <h3>Build the package</h3>
            <div className="two">
              <div className="field"><span className="flabel">Videography</span><Seg label="Videography" value={p.video ? 1 : 0} options={[[1, "Included"], [0, "Not included"]]} onChange={(v) => choose({ video: v === 1 })} disabled={(v) => v === 0 && p.twoRounds} /></div>
              <div className="field"><span className="flabel">Snapchat</span><Seg label="Snapchat" value={p.snapchat ? 1 : 0} options={[[1, "Included"], [0, "Not included"]]} onChange={(v) => choose({ snapchat: v === 1 })} /></div>
              <div className="field"><span className="flabel">10 days of sponsored ads</span><Seg label="Sponsored ads" value={p.ads ? 1 : 0} options={[[1, "Yes"], [0, "No"]]} onChange={(v) => choose({ ads: v === 1 })} /></div>
              <div className="field"><span className="flabel">Rounds</span><Seg label="Rounds" value={p.twoRounds ? 1 : 0} options={[[1, "Two"], [0, "One"]]} onChange={(v) => choose({ twoRounds: v === 1 })} /></div>
            </div>
            <p className="hint">{p.twoRounds ? "Two rounds are only offered with videography." : RATE_SCOPES[idx % 4].detail + "."}</p>
            <div className="two">
              <div className="field"><label htmlFor="ofCamp">Campaign</label>
                <select id="ofCamp" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                  {campaigns.length ? campaigns.map((x) => <option key={x.id} value={x.id}>{x.name}</option>) : <option value="">No campaign yet</option>}
                </select></div>
              <div className="field"><label htmlFor="ofAmt">Your offer in BD</label><input id="ofAmt" type="number" min={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value ? +e.target.value : "")} /></div>
            </div>
            <div className="field"><label htmlFor="ofMsg">Message to {firstName(c.name)}</label><textarea id="ofMsg" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
            <div className="total">
              <div><small>{rateLabel(idx)}</small><b className="num">{list ? bd(list) : "Not offered"}</b></div>
              <button className="btn inf" type="submit" disabled={!list || !amount || busy || mode === "guest"}>{mode === "guest" ? "Sign in to send" : "Send offer"}</button>
            </div>
          </form>
        </>
      ) : (
        <div className="empty" style={{ marginTop: 24 }}><b>No prices on the rate card yet</b><span>Ask the RAMA team for a quote for {firstName(c.name)}.</span></div>
      )}
      <div className="blk"><h3>Audience and platforms</h3><div className="empty"><span>Followers, engagement and audience breakdown will appear here once the influencer database is added.</span></div></div>
    </Sheet>
  );
}
