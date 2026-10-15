"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "../store";
import { PageHead, Pill, Portrait, Sheet } from "../ui";
import { bd, fmtDate } from "@/lib/format";
import { BRIEF_PLATFORMS, CONTENT_TYPES, DRESS_CODE, LOCATION_TYPES, SPONSORED_ADS, VIDEO_QUALITY, type Brief } from "@/lib/brief";

const d = (s: string) => (s ? fmtDate(new Date(s + "T00:00")) : "Not set");
const lbl = <T extends { key: string; label: string }>(list: readonly T[], k: string) => list.find((x) => x.key === k)?.label ?? k;

export default function Briefs() {
  const { briefs, creators } = useStore();
  const [open, setOpen] = useState<Brief | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  useEffect(() => { const h = window.location.hash.slice(1); if (h) setFresh(h); }, []);
  const name = (id: number) => creators.find((c) => c.id === id);

  return (
    <>
      <PageHead title="Briefs" ar="طلبات الحملات" lede="Briefs you sent to RAMA for the creators you picked, and their status." />
      {fresh && briefs.some((b) => b.id === fresh) && (
        <div className="okbox" role="status"><b>Brief sent.</b> The RAMA team will review it and reply with confirmed prices and availability.</div>
      )}
      <div className="toolbar"><p>Pick creators on Discover, then press Submit brief.</p><Link className="btn inf" href="/influencers">Find creators</Link></div>
      {briefs.length ? (
        <div className="ledger">
          {briefs.map((b) => (
            <div className={`lrow${b.id === fresh ? " flash" : ""}`} key={b.id}>
              <div className="tray-avs">{b.creators.slice(0, 3).map((c) => { const cr = name(c.creatorId); return cr ? <Portrait key={c.creatorId} creator={cr} className="mini" /> : null; })}</div>
              <div><h3>{b.campaignName}</h3>
                <div className="meta num"><span>{b.creators.length} creator{b.creators.length === 1 ? "" : "s"}</span><span>Posting {d(b.postingDate)}</span>{b.budget && <span>Budget {bd(Number(b.budget))}</span>}{b.estimate ? <span>Estimate {bd(b.estimate)}</span> : null}</div>
              </div>
              <div className="end"><Pill status={b.status} /><button className="btn sm line" onClick={() => setOpen(b)}>View</button></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty"><b>No briefs yet</b><span>Select creators on Discover and press Submit brief.</span><Link className="btn sm" href="/influencers">Go to Discover</Link></div>
      )}

      {open && (
        <Sheet title="Brief" onClose={() => setOpen(null)}>
          <h2 style={{ fontSize: 30 }}>{open.campaignName}</h2>
          <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}><Pill status={open.status} />{open.budget && <span className="pill p-mute num">Budget {bd(Number(open.budget))}</span>}{open.estimate ? <span className="pill p-mute num">Estimate {bd(open.estimate)}</span> : null}</div>
          <div className="review">
            <div><span>Company</span><b>{open.companyName}</b></div>
            <div><span>Contact</span><b>{open.email}, {open.phone}</b></div>
            <div><span>Submission deadline</span><b>{d(open.submissionDeadline)}</b></div>
            <div><span>Posting</span><b>{d(open.postingDate)}{open.postingTime ? `, ${open.postingTime}` : ""}</b></div>
            <div><span>Languages</span><b>{open.languages.map((l) => (l === "arabic" ? "Arabic" : "English")).join(", ")}</b></div>
            <div><span>Dress code</span><b>{open.dressCode.map((k) => lbl(DRESS_CODE, k)).join(", ")}</b></div>
            {open.attachmentName && <div><span>Attachment</span><b>{open.attachmentName}</b></div>}
          </div>
          {open.text && <div className="blk"><h3>Campaign brief</h3><p className="bio" dir="auto">{open.text}</p></div>}
          {open.dressCodeComments && <div className="blk"><h3>Dress code details</h3><p className="bio" dir="auto">{open.dressCodeComments}</p></div>}
          <div className="blk"><h3>Creators</h3>
            {open.creators.map((c) => {
              const cr = name(c.creatorId);
              return (
                <div className="crcard" key={c.creatorId}>
                  <header>{cr && <Portrait creator={cr} className="mini" />}<div className="crname"><b dir="auto">{cr?.name ?? "Creator"}</b><small>{cr?.username ? `@${cr.username}` : ""}</small></div></header>
                  {c.platforms.map((p) => <p key={p} className="hint"><b>{BRIEF_PLATFORMS.find((x) => x.key === p)?.label}:</b> {c.content[p].map((k) => CONTENT_TYPES[p].find((t) => t.key === k)?.label ?? k).join(", ") || "No content chosen"}</p>)}
                  <p className="hint">{lbl(VIDEO_QUALITY, c.videoQuality)} · {lbl(LOCATION_TYPES, c.locationType)} · {lbl(SPONSORED_ADS, c.sponsoredAds)}</p>
                  {c.specificBrief && <p className="bio" dir="auto">{c.specificBrief}</p>}
                  {(c.postingDate || c.submissionDeadline) && <p className="hint">Own dates: deadline {d(c.submissionDeadline)}, posting {d(c.postingDate)} {c.postingTime}</p>}
                </div>
              );
            })}
          </div>
          {open.notes && <div className="blk"><h3>Additional notes</h3><p className="bio" dir="auto">{open.notes}</p></div>}
        </Sheet>
      )}
    </>
  );
}
