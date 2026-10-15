"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "../store";
import { PageHead, Portrait, Seg } from "../ui";
import { bd, compact } from "@/lib/format";
import {
  ATTACHMENT_MAX, ATTACHMENT_TYPES, BRIEF_PLATFORMS, CONTENT_TYPES, DRESS_CODE, LOCATION_TYPES, SPONSORED_ADS, VIDEO_QUALITY,
  creatorEstimate, emptyContent, languageProblem, newCreatorBrief,
  type Brief, type BriefPlatform, type ContentSelection, type CreatorBrief,
} from "@/lib/brief";

const today = () => new Date().toISOString().slice(0, 10);
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const label = (p: BriefPlatform) => BRIEF_PLATFORMS.find((x) => x.key === p)!.label;

export default function BriefForm() {
  const { creators, selected, toggleSelected, submitBrief, email: accountEmail, profile, mode } = useStore();
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);

  // Details
  const [campaignName, setCampaignName] = useState("New influencer request");
  const [budget, setBudget] = useState("");
  const [companyName, setCompanyName] = useState(profile?.companyName ?? "");
  const [email, setEmail] = useState(accountEmail ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  // Brief
  const [briefMode, setBriefMode] = useState<Brief["mode"]>("shared");
  const [languages, setLanguages] = useState<Brief["languages"]>(["english"]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // Defaults, schedule, dress code, notes
  const [defaults, setDefaults] = useState<ContentSelection>(emptyContent());
  const [deadline, setDeadline] = useState("");
  const [postingDate, setPostingDate] = useState("");
  const [postingTime, setPostingTime] = useState("");
  const [dress, setDress] = useState<string[]>(["noRestrictions"]);
  const [dressComments, setDressComments] = useState("");
  const [notes, setNotes] = useState("");
  // Per creator
  const [perCreator, setPerCreator] = useState<Record<number, CreatorBrief>>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const picked = selected.map((id) => creators.find((c) => c.id === id)).filter(Boolean) as typeof creators;
  const cb = (id: number): CreatorBrief => perCreator[id] ?? newCreatorBrief(creators.find((c) => c.id === id)!, defaults);
  const patch = (id: number, p: Partial<CreatorBrief>) => setPerCreator((m) => ({ ...m, [id]: { ...cb(id), ...p } }));

  const applyToAll = (platform: BriefPlatform) => {
    setPerCreator((m) => {
      const next = { ...m };
      selected.forEach((id) => {
        const cur = next[id] ?? newCreatorBrief(creators.find((c) => c.id === id)!, defaults);
        if (cur.platforms.includes(platform)) next[id] = { ...cur, content: { ...cur.content, [platform]: [...defaults[platform]] } };
      });
      return next;
    });
  };

  const setDressOption = (key: string) => {
    if (key === "noRestrictions") return setDress(["noRestrictions"]);
    const next = toggle(dress.filter((d) => d !== "noRestrictions"), key);
    setDress(next.length ? next : ["noRestrictions"]);
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return creators.filter((c) => !selected.includes(c.id) && [c.name, c.username, c.displayName].join(" ").toLowerCase().includes(q)).slice(0, 6);
  }, [search, creators, selected]);

  const estimates = picked.map((c) => ({ c, est: creatorEstimate(c, cb(c.id)) }));
  const estimateTotal = estimates.reduce((t, e) => t + (e.est ?? 0), 0);
  const quoteCount = estimates.filter((e) => e.est == null).length;
  const platformsUsed = Array.from(new Set(picked.flatMap((c) => cb(c.id).platforms)));
  const planned = picked.filter((c) => { const b = cb(c.id); return b.platforms.length > 0 && b.platforms.every((p) => b.content[p].length > 0); }).length;

  const fail = (msg: string) => { setError(msg); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); return false; };

  /** Same checks as RAMA's original form. Drafts only need a name. */
  function validate(draft: boolean) {
    setError("");
    if (!campaignName.trim()) return fail("Add a campaign name.");
    if (draft) return true;
    if (!budget.trim()) return fail("Add your budget in BD.");
    if (!companyName.trim()) return fail("Add your company name.");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return fail("Add a valid email address.");
    if (!phone.trim()) return fail("Add a phone number.");
    if (!deadline) return fail("Choose the submission deadline.");
    if (!postingDate) return fail("Choose the posting date.");
    if (!postingTime) return fail("Choose the posting time.");
    if (postingDate < deadline) return fail("The posting date must be on or after the submission deadline.");
    if (!picked.length) return fail("Select at least one creator.");
    if (!languages.length) return fail("Choose at least one brief language, Arabic or English.");
    if (briefMode === "shared") {
      if (!text.trim() && !file) return fail("Write the campaign brief, or attach a brief file.");
      if (!file) { const p = languageProblem(text, languages); if (p) return fail(p); }
    } else {
      const missing = picked.find((c) => !cb(c.id).specificBrief.trim());
      if (missing) return fail(`Write a brief for ${missing.name}.`);
      const wrong = picked.find((c) => languageProblem(cb(c.id).specificBrief, languages));
      if (wrong) return fail(`The brief for ${wrong.name} must match the languages you chose.`);
    }
    const noPlatform = picked.find((c) => !cb(c.id).platforms.length);
    if (noPlatform) return fail(`Choose at least one platform for ${noPlatform.name}.`);
    if (file) {
      if (!ATTACHMENT_TYPES.some((x) => file.name.toLowerCase().endsWith(x))) return fail("The attachment must be a PDF, Word or PowerPoint file.");
      if (file.size > ATTACHMENT_MAX) return fail("The attachment must be 10 MB or smaller.");
    }
    return true;
  }

  async function send(draft: boolean) {
    if (busy || !validate(draft)) return;
    setBusy(true);
    const saved = await submitBrief({
      campaignName: campaignName.trim(), budget, companyName: companyName.trim(), email: email.trim(), phone: phone.trim(),
      mode: briefMode, languages, text: briefMode === "shared" ? text : "", attachmentName: file?.name,
      defaultContent: defaults, submissionDeadline: deadline, postingDate, postingTime,
      dressCode: dress, dressCodeComments: dressComments, notes,
      creators: picked.map((c) => ({ ...cb(c.id), specificBrief: briefMode === "perCreator" ? cb(c.id).specificBrief : "" })),
      estimate: estimateTotal || null, status: draft ? "Draft" : "Submitted",
    }, file);
    setBusy(false);
    if (saved && !draft) router.push(`/influencers/briefs#${saved.id}`);
  }

  const langNote = languages.length === 2
    ? "The brief must include both Arabic and English. Write both, or attach a file that has both."
    : languages[0] === "arabic" ? "The brief must be in Arabic. Write it in Arabic, or attach the Arabic brief file."
    : languages[0] === "english" ? "The brief must be in English. Write it in English, or attach the English brief file."
    : "Choose at least one language.";
  const guest = mode === "guest";

  return (
    <>
      <div ref={topRef} />
      <PageHead title="Submit a brief" ar="طلب حملة" lede="Tell the RAMA team what you need from the creators you picked. We reply with confirmed prices and availability." />
      {error && <div className="formerr" role="alert">{error}</div>}

      <div className="bgrid">
        <form className="bform" onSubmit={(e) => { e.preventDefault(); send(false); }} noValidate>
          {/* 1. Details */}
          <section className="bsec">
            <h2><i>1</i>Your details</h2>
            <div className="two">
              <div className="field"><label htmlFor="bName">Campaign name</label><input id="bName" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} /></div>
              <div className="field"><label htmlFor="bBudget">Budget in BD</label><input id="bBudget" type="number" min={0} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={estimateTotal ? String(estimateTotal) : "1500"} /></div>
              <div className="field"><label htmlFor="bCompany">Company name</label><input id="bCompany" value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" /></div>
              <div className="field"><label htmlFor="bEmail">Email</label><input id="bEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              <div className="field"><label htmlFor="bPhone">Phone</label><input id="bPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+973" /></div>
            </div>
          </section>

          {/* 2. Brief */}
          <section className="bsec">
            <h2><i>2</i>The brief</h2>
            <div className="field"><span className="flabel">Brief type</span>
              <Seg label="Brief type" value={briefMode} options={[["shared", "One brief for all creators"], ["perCreator", "A brief for each creator"]]} onChange={setBriefMode} />
            </div>
            <div className="field"><span className="flabel">Brief language</span>
              <div className="chipset">
                {(["arabic", "english"] as const).map((l) => (
                  <button key={l} type="button" className="chip" aria-pressed={languages.includes(l)} onClick={() => setLanguages(toggle(languages, l))}>{l === "arabic" ? "Arabic" : "English"}</button>
                ))}
              </div>
              <p className="note">{briefMode === "perCreator" ? langNote.replace("The brief", "Each creator's brief") : langNote}</p>
            </div>
            {briefMode === "shared" ? (
              <div className="field"><label htmlFor="bText">Campaign brief</label>
                <textarea id="bText" dir="auto" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Campaign goal, target audience, tone and key message" style={{ minHeight: 140 }} />
                <span className="count num">{text.length}/1000</span>
              </div>
            ) : (
              <p className="hint">Write each creator&apos;s brief in their card in step 5.</p>
            )}
            <div className="field"><label htmlFor="bFile">Attach a brief file (optional)</label>
              <input id="bFile" type="file" accept={ATTACHMENT_TYPES.join(",")} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <span className="hint">PDF, Word or PowerPoint, up to 10 MB.{file ? ` Selected: ${file.name}` : ""}</span>
            </div>
          </section>

          {/* 3. Default content */}
          <section className="bsec">
            <h2><i>3</i>Content for every creator</h2>
            <p className="hint">Pick what you want on each platform. New creators start with these, and you can change any creator in step 5.</p>
            <div className="ctgrid">
              {BRIEF_PLATFORMS.map((p) => (
                <div className="ctbox" key={p.key}>
                  <div className="cthd"><b>{p.label}</b><button type="button" className="lnk" disabled={!picked.length} onClick={() => applyToAll(p.key)}>Apply to all creators</button></div>
                  <div className="chipset">
                    {CONTENT_TYPES[p.key].map((t) => (
                      <button key={t.key} type="button" className="chip" aria-pressed={defaults[p.key].includes(t.key)} onClick={() => setDefaults({ ...defaults, [p.key]: toggle(defaults[p.key], t.key) })}>{t.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Schedule and dress code */}
          <section className="bsec">
            <h2><i>4</i>Schedule and dress code</h2>
            <div className="three">
              <div className="field"><label htmlFor="bDeadline">Content submission deadline</label><input id="bDeadline" type="date" min={today()} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              <div className="field"><label htmlFor="bPostDate">Posting date</label><input id="bPostDate" type="date" min={deadline || today()} value={postingDate} onChange={(e) => setPostingDate(e.target.value)} /></div>
              <div className="field"><label htmlFor="bPostTime">Posting time</label><input id="bPostTime" type="time" value={postingTime} onChange={(e) => setPostingTime(e.target.value)} /></div>
            </div>
            <div className="field"><span className="flabel">Dress code</span>
              <div className="chipset">{DRESS_CODE.map((d) => <button key={d.key} type="button" className="chip" aria-pressed={dress.includes(d.key)} onClick={() => setDressOption(d.key)}>{d.label}</button>)}</div>
            </div>
            <div className="field"><label htmlFor="bDress">Dress code details (optional)</label>
              <textarea id="bDress" dir="auto" maxLength={300} value={dressComments} onChange={(e) => setDressComments(e.target.value)} placeholder="For example: white, casual style, no visible logos" />
              <span className="count num">{dressComments.length}/300</span>
            </div>
          </section>

          {/* 5. Creators */}
          <section className="bsec">
            <h2><i>5</i>Creators <span className="num" style={{ color: "var(--ink-3)", fontWeight: 600 }}>({picked.length})</span></h2>
            <div className="addcr">
              <label className="search">
                <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Add another creator by name or @handle" aria-label="Add a creator" />
              </label>
              {results.length > 0 && (
                <ul className="addlist">{results.map((c) => (
                  <li key={c.id}><button type="button" onClick={() => { toggleSelected(c.id); setSearch(""); }}>
                    <Portrait creator={c} className="mini" /><span><b dir="auto">{c.name}</b><small>@{c.username}{c.followers != null ? ` · ${compact(c.followers)} followers` : ""}</small></span><em>Add</em>
                  </button></li>
                ))}</ul>
              )}
            </div>
            {!picked.length && <div className="empty"><b>No creators selected yet</b><span>Pick creators on Discover, or search for them above.</span><Link className="btn sm line" href="/influencers">Go to Discover</Link></div>}
            {picked.map((c) => {
              const b = cb(c.id);
              const est = creatorEstimate(c, b);
              const count = b.platforms.reduce((t, p) => t + b.content[p].length, 0);
              return (
                <article className="crcard" key={c.id}>
                  <header>
                    <Portrait creator={c} className="mini" />
                    <div className="crname"><b dir="auto">{c.name}</b><small>@{c.username}{c.followers != null ? ` · ${compact(c.followers)}` : ""} · {count} content item{count === 1 ? "" : "s"}</small></div>
                    <span className="crest num">{est != null ? bd(est) : "Quote on request"}</span>
                    <button type="button" className="lnk" onClick={() => toggleSelected(c.id)}>Remove</button>
                  </header>
                  <div className="field"><span className="flabel">Platforms</span>
                    <div className="chipset">{BRIEF_PLATFORMS.map((p) => <button key={p.key} type="button" className="chip" aria-pressed={b.platforms.includes(p.key)} onClick={() => patch(c.id, { platforms: toggle(b.platforms, p.key) })}>{p.label}</button>)}</div>
                  </div>
                  {b.platforms.map((p) => (
                    <div className="field" key={p}><span className="flabel">{label(p)} content</span>
                      <div className="chipset">{CONTENT_TYPES[p].map((t) => <button key={t.key} type="button" className="chip" aria-pressed={b.content[p].includes(t.key)} onClick={() => patch(c.id, { content: { ...b.content, [p]: toggle(b.content[p], t.key) } })}>{t.label}</button>)}</div>
                    </div>
                  ))}
                  {briefMode === "perCreator" && (
                    <div className="field"><label htmlFor={`sb${c.id}`}>Brief for {c.name}</label>
                      <textarea id={`sb${c.id}`} dir="auto" maxLength={1000} value={b.specificBrief} onChange={(e) => patch(c.id, { specificBrief: e.target.value })} placeholder="A brief written for this creator" />
                      <span className="count num">{b.specificBrief.length}/1000</span>
                    </div>
                  )}
                  <div className="prefs">
                    <div className="field"><span className="flabel">Video quality</span><Seg label="Video quality" value={b.videoQuality} options={VIDEO_QUALITY.map((o) => [o.key, o.label] as [typeof o.key, string])} onChange={(v) => patch(c.id, { videoQuality: v })} /></div>
                    <div className="field"><span className="flabel">Filming location</span><Seg label="Filming location" value={b.locationType} options={LOCATION_TYPES.map((o) => [o.key, o.label] as [typeof o.key, string])} onChange={(v) => patch(c.id, { locationType: v })} /></div>
                    <div className="field"><span className="flabel">Sponsored ads</span><Seg label="Sponsored ads" value={b.sponsoredAds} options={SPONSORED_ADS.map((o) => [o.key, o.label] as [typeof o.key, string])} onChange={(v) => patch(c.id, { sponsoredAds: v })} /></div>
                  </div>
                  <details className="crsched">
                    <summary>Different dates for this creator (optional)</summary>
                    <div className="three">
                      <div className="field"><label htmlFor={`d${c.id}`}>Submission deadline</label><input id={`d${c.id}`} type="date" min={today()} value={b.submissionDeadline} onChange={(e) => patch(c.id, { submissionDeadline: e.target.value })} /></div>
                      <div className="field"><label htmlFor={`p${c.id}`}>Posting date</label><input id={`p${c.id}`} type="date" min={today()} value={b.postingDate} onChange={(e) => patch(c.id, { postingDate: e.target.value })} /></div>
                      <div className="field"><label htmlFor={`t${c.id}`}>Posting time</label><input id={`t${c.id}`} type="time" value={b.postingTime} onChange={(e) => patch(c.id, { postingTime: e.target.value })} /></div>
                    </div>
                  </details>
                </article>
              );
            })}
          </section>

          {/* 6. Notes */}
          <section className="bsec">
            <h2><i>6</i>Anything else</h2>
            <div className="field"><label htmlFor="bNotes">Additional notes (optional)</label>
              <textarea id="bNotes" dir="auto" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="References, links or anything the team should know" />
              <span className="count num">{notes.length}/500</span>
            </div>
          </section>
        </form>

        <aside className="bsum" aria-label="Brief summary">
          <h3>Summary</h3>
          <div className="review">
            <div><span>Creators</span><b className="num">{picked.length}</b></div>
            <div><span>Platforms</span><b>{platformsUsed.length ? platformsUsed.map(label).join(", ") : "None"}</b></div>
            <div><span>Content planned</span><b className="num">{planned}/{picked.length}</b></div>
            <div><span>Posting</span><b className="num">{postingDate ? `${postingDate}${postingTime ? `, ${postingTime}` : ""}` : "Not set"}</b></div>
            <div><span>Your budget</span><b className="num">{budget ? bd(Number(budget)) : "Not set"}</b></div>
          </div>
          <div className="estbox">
            <small>Rate card estimate</small>
            <b className="num">{bd(estimateTotal)}</b>
            <span>{quoteCount ? `Plus ${quoteCount} creator${quoteCount > 1 ? "s" : ""} on quote. ` : ""}Based on each creator&apos;s RAMA package for the platforms, video quality and ads you chose. RAMA confirms the final price.</span>
            {budget && estimateTotal > Number(budget) && <em>The estimate is above your budget.</em>}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <button type="button" className="btn inf" disabled={busy || guest || !picked.length} onClick={() => send(false)}>{guest ? "Sign in to send" : busy ? "Sending…" : "Send brief"}</button>
            <button type="button" className="btn line" disabled={busy || guest} onClick={() => send(true)}>Save draft</button>
          </div>
          {guest && <p className="hint"><Link href="/login">Sign in</Link> to send briefs. Your selection stays here.</p>}
        </aside>
      </div>
    </>
  );
}
