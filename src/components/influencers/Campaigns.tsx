"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "../store";
import { PageHead, Pill, Portrait, Sheet } from "../ui";
import OfferThread from "./OfferThread";
import { bd, fmtDate } from "@/lib/format";
import { minRate, rateLabel } from "@/lib/pricing";
import type { Campaign } from "@/lib/types";

const PLAT: Record<string, string> = { IG: "Instagram", TT: "TikTok", SC: "Snapchat", YT: "YouTube" };
const d = (s: string) => (s ? fmtDate(new Date(s + "T00:00")) : "—");

export default function Campaigns() {
  const { campaigns, offers, applications, mode } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const open = campaigns.find((c) => c.id === openId);
  return (
    <>
      <PageHead title="Campaigns" lede="Each campaign keeps its brief, budget, applicants and booked creators together." />
      <div className="toolbar"><p>Post a brief and let creators apply, or invite them from Discover.</p>
        <button className="btn inf" onClick={() => setWizard(true)} disabled={mode === "guest"}>New campaign</button></div>
      {campaigns.length ? (
        <div className="ledger">
          {campaigns.map((c) => {
            const spent = offers.filter((o) => o.campaignId === c.id && o.status === "Accepted").reduce((t, o) => t + o.amount, 0);
            const newApps = applications.filter((a) => a.campaignId === c.id && a.status === "new").length;
            return (
              <div className="lrow" key={c.id}>
                <div className="cmark">{c.name[0]}</div>
                <div>
                  <h3>{c.name}</h3>
                  <div className="meta num"><span>{c.objective}</span><span>{c.platforms.map((p) => PLAT[p]).join(", ")}</span><span>{d(c.startDate)} to {d(c.endDate)}</span></div>
                  <div className="meter"><i style={{ width: `${Math.min(100, (spent / Math.max(c.budget, 1)) * 100)}%` }} /></div>
                  <div className="meta num" style={{ marginTop: 4 }}><span>{bd(spent)} of {bd(c.budget)} committed</span></div>
                </div>
                <div className="end"><Pill status={c.status} />{newApps > 0 && <span className="pill p-info">{newApps} new applicant{newApps > 1 ? "s" : ""}</span>}
                  <button className="btn sm line" onClick={() => setOpenId(c.id)}>Open</button></div>
              </div>
            );
          })}
        </div>
      ) : <div className="empty"><b>No campaigns yet</b><span>Create your first campaign to collect applications from creators.</span></div>}
      {open && <CampaignSheet campaign={open} onClose={() => setOpenId(null)} />}
      {wizard && <Wizard onClose={() => setWizard(false)} />}
    </>
  );
}

function CampaignSheet({ campaign: c, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { applications, offers, creators, publishCampaign, simulateApplications, decideApplication, mode } = useStore();
  const [thread, setThread] = useState<string | null>(null);
  const apps = applications.filter((a) => a.campaignId === c.id);
  const hired = offers.filter((o) => o.campaignId === c.id && o.status === "Accepted");
  const cr = (id: number) => creators.find((x) => x.id === id)!;
  if (thread) return <OfferThread offerId={thread} onClose={() => setThread(null)} />;
  return (
    <Sheet title="Campaign" onClose={onClose}>
      <h2 style={{ fontSize: 34 }}>{c.name}</h2>
      <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}><Pill status={c.status} /><span className="pill p-mute">{c.objective}</span><span className="pill p-mute num">Budget {bd(c.budget)}</span></div>
      <p style={{ color: "var(--ink-2)" }}>{c.brief}</p>
      {c.status === "Draft" && <div className="blk"><button className="btn inf" onClick={() => publishCampaign(c.id)}>Publish to creators</button></div>}
      <div className="blk"><h3>Applicants</h3>
        {apps.length ? (
          <div className="ledger">{apps.map((a) => (
            <div className="lrow" key={a.id}><Portrait creator={cr(a.creatorId)} className="mini" />
              <div><h3>{cr(a.creatorId).name}</h3><div className="meta num"><span>{rateLabel(a.rateIndex)}</span><span>{bd(a.price)}</span></div>{mode !== "live" && <div className="meta" style={{ marginTop: 4 }}><span>Simulated application</span></div>}</div>
              <div className="end">{a.status === "new" ? <><button className="btn sm ok" onClick={() => decideApplication(a.id, true)}>Accept</button><button className="btn sm line" onClick={() => decideApplication(a.id, false)}>Pass</button></> : <Pill status={a.status === "hired" ? "Accepted" : "Passed"} />}</div>
            </div>))}</div>
        ) : (
          <div className="empty"><span>{c.status === "Draft" ? "Publish the campaign so creators can apply." : "No applicants yet. Invite creators from Discover, or wait for applications."}</span>
            {c.status === "Live" && mode !== "live" && <button className="btn sm line" onClick={() => simulateApplications(c.id)}>Simulate applications</button>}</div>
        )}
      </div>
      <div className="blk"><h3>Booked creators</h3>
        {hired.length ? <div className="ledger">{hired.map((o) => (
          <div className="lrow" key={o.id}><Portrait creator={cr(o.creatorId)} className="mini" />
            <div><h3>{cr(o.creatorId).name}</h3><div className="meta"><span>{rateLabel(o.rateIndex)}</span><span className="num">{bd(o.amount)}</span></div></div>
            <div className="end"><button className="btn sm line" onClick={() => setThread(o.id)}>Open thread</button></div></div>))}</div>
          : <div className="empty"><span>Nobody booked yet.</span></div>}
        <div><Link className="btn line" href="/influencers">Find creators</Link></div>
      </div>
    </Sheet>
  );
}

function Wizard({ onClose }: { onClose: () => void }) {
  const { addCampaign, creators, notify } = useStore();
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const [w, setW] = useState({ name: "", objective: "Awareness", brief: "", platforms: ["IG", "TT"], budget: 2000, startDate: today, endDate: "" });
  const steps = ["The basics", "Platforms", "Budget and dates", "Review"];
  const fit = creators.filter((c) => minRate(c) != null && minRate(c)! <= w.budget).length;
  const next = () => {
    if (step === 0 && !w.name.trim()) return notify("Add a campaign name to continue.");
    if (step === 1 && !w.platforms.length) return notify("Choose at least one platform.");
    if (step === 2 && w.endDate && w.endDate < w.startDate) return notify("The end date must come after the start date.");
    setStep(step + 1);
  };
  const finish = async (status: Campaign["status"]) => {
    await addCampaign({ ...w, name: w.name.trim(), brief: w.brief || "No brief added yet.", status });
    notify(status === "Live" ? "Campaign published" : "Draft saved");
    onClose();
  };
  return (
    <Sheet title={`New campaign, step ${step + 1} of 4`} onClose={onClose}>
      <h2 style={{ fontSize: 30, marginBottom: 16 }}>{steps[step]}</h2>
      <div className="prog">{steps.map((s, i) => <span key={s} className={i <= step ? "on" : ""} />)}</div>
      <div style={{ display: "grid", gap: 16 }}>
        {step === 0 && <>
          <div className="field"><label htmlFor="wName">Campaign name</label><input id="wName" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} placeholder="National Day weekend" /></div>
          <div className="field"><label htmlFor="wObj">Main goal</label><select id="wObj" value={w.objective} onChange={(e) => setW({ ...w, objective: e.target.value })}>{["Awareness", "Footfall", "App installs", "Sales", "UGC content"].map((o) => <option key={o}>{o}</option>)}</select></div>
          <div className="field"><label htmlFor="wBrief">Brief for creators</label><textarea id="wBrief" value={w.brief} onChange={(e) => setW({ ...w, brief: e.target.value })} placeholder="What should creators show, say or avoid?" /></div>
        </>}
        {step === 1 && <>
          <div className="field"><span className="flabel">Where should the content appear?</span>
            <div className="chipset">{Object.entries(PLAT).map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={w.platforms.includes(k)} onClick={() => setW({ ...w, platforms: w.platforms.includes(k) ? w.platforms.filter((x) => x !== k) : [...w.platforms, k] })}>{l}</button>)}</div></div>
          <p className="hint">RAMA packages cover Instagram Story, Instagram Reel and TikTok, with Snapchat in the full scope.</p>
        </>}
        {step === 2 && <>
          <div className="field"><label htmlFor="wBud">Total budget in BD</label><input id="wBud" type="number" min={50} value={w.budget} onChange={(e) => setW({ ...w, budget: +e.target.value || 0 })} /></div>
          <div className="two"><div className="field"><label htmlFor="wS">Starts</label><input id="wS" type="date" value={w.startDate} onChange={(e) => setW({ ...w, startDate: e.target.value })} /></div>
            <div className="field"><label htmlFor="wE">Ends</label><input id="wE" type="date" value={w.endDate} onChange={(e) => setW({ ...w, endDate: e.target.value })} /></div></div>
          <p className="hint num">{fit} of {creators.length} creators have a package within this budget.</p>
        </>}
        {step === 3 && <>
          <div className="review">{[["Name", w.name], ["Goal", w.objective], ["Platforms", w.platforms.map((p) => PLAT[p]).join(", ")], ["Budget", bd(w.budget)], ["Dates", `${d(w.startDate)} to ${d(w.endDate)}`]].map(([a, b]) => <div key={a}><span>{a}</span><b>{b}</b></div>)}</div>
          <p className="hint">Publishing shares your brief with RAMA creators so they can apply.</p>
        </>}
      </div>
      <div className="wfoot">
        <button className="btn line" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
        {step < 3 ? <button className="btn inf" onClick={next}>Continue</button> :
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="btn line" onClick={() => finish("Draft")}>Save draft</button><button className="btn inf" onClick={() => finish("Live")}>Publish campaign</button></div>}
      </div>
    </Sheet>
  );
}

