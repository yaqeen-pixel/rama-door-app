"use client";

import { useState } from "react";
import { useStore } from "../store";
import { Seg, Sheet } from "../ui";
import { Masthead } from "./shared";
import { addDays, bd, fmtDate } from "@/lib/format";
import { ADVERTORIAL_WRITING, COLOUR_MULTIPLIER, DAILY_SIZES, FRONT_PAGE_MULTIPLIER, MAG_SIZES, PAGE_COLUMNS, PAGE_HEIGHT_CM, POSITIONS } from "@/lib/pricing";
import type { Outlet } from "@/lib/types";

type Prod = "print" | "adv" | "online";
const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const DAYS = Array.from({ length: 14 }, (_, i) => addDays(today(), i + 3));
const ISSUES = [0, 1, 2].map((i) => { const t = today(); const d = new Date(t.getFullYear(), t.getMonth() + 1 + i, 1); const dl = new Date(t.getFullYear(), t.getMonth() + i, 15);
  return { d, dl, label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) }; });
const day = (d: Date) => fmtDate(d, { weekday: "short", day: "numeric", month: "short" });

function PageDiagram({ daily, size, cols, cm }: { daily: boolean; size: string; cols: number; cm: number }) {
  if (daily) {
    const sx = 180 / PAGE_COLUMNS, sy = 260 / PAGE_HEIGHT_CM, x = 10 + (PAGE_COLUMNS - cols) * sx, y = 10 + (PAGE_HEIGHT_CM - cm) * sy;
    return (
      <svg viewBox="0 0 200 280" className="pdiag" role="img" aria-label={`${cols} columns by ${cm} cm on an ${PAGE_COLUMNS} column page`}>
        <rect x="10" y="10" width="180" height="260" className="pg" />
        {Array.from({ length: PAGE_COLUMNS - 1 }, (_, i) => <line key={i} x1={10 + (i + 1) * sx} y1="14" x2={10 + (i + 1) * sx} y2="266" className="col" />)}
        {size === "strip" && <rect x="16" y="16" width="168" height="22" className="mh" />}
        <rect x={x} y={y} width={cols * sx} height={cm * sy} className="ad" />
        <text x={x + (cols * sx) / 2} y={y + (cm * sy) / 2 + 4} textAnchor="middle" className="adt" style={{ fill: "#fff", fontSize: cols < 4 ? 9 : 11 }}>{cols} col × {cm} cm</text>
      </svg>
    );
  }
  const ad: Record<string, JSX.Element> = {
    full: <rect x="104" y="14" width="88" height="122" className="ad" />, half: <rect x="104" y="76" width="88" height="60" className="ad" />,
    dps: <rect x="8" y="14" width="184" height="122" className="ad" />, ifc: <rect x="104" y="14" width="88" height="122" className="ad" />, obc: <rect x="104" y="14" width="88" height="122" className="ad" />,
  };
  return (
    <svg viewBox="0 0 200 150" className="pdiag" role="img" aria-label={MAG_SIZES.find((s) => s.key === size)?.label}>
      <rect x="8" y="14" width="88" height="122" className="pg" /><rect x="104" y="14" width="88" height="122" className="pg" />{ad[size]}
      <line x1="100" y1="12" x2="100" y2="138" className="col" />
      {size === "ifc" && <text x="52" y="80" textAnchor="middle" className="adt" style={{ fill: "var(--ink-3)" }}>Front cover</text>}
      {size === "obc" && <text x="52" y="80" textAnchor="middle" className="adt" style={{ fill: "var(--ink-3)" }}>Last page</text>}
    </svg>
  );
}

export default function OutletSheet({ outlet: o, onClose }: { outlet: Outlet; onClose: () => void }) {
  const { addIoLine } = useStore();
  const daily = o.kind === "daily";
  const [prod, setProd] = useState<Prod>("print");
  const [size, setSize] = useState(daily ? "quarter" : "full");
  const [cols, setCols] = useState(3);
  const [cm, setCm] = useState(15);
  const [pos, setPos] = useState("rop");
  const [colour, setColour] = useState(1);
  const [adv, setAdv] = useState("full");
  const [web, setWeb] = useState("banner");
  const [qty, setQty] = useState(1);
  const [days, setDays] = useState<Set<number>>(new Set([0]));
  const [issues, setIssues] = useState<Set<number>>(new Set([0]));
  const flip = (s: Set<number>, i: number) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; };

  // Work out the price of the current selection.
  let each = 0, n = 0, desc = "", when = "", deadline: string | undefined, math = "";
  let diag = { size, cols, cm };
  if (prod !== "online") {
    if (daily) {
      const s = DAILY_SIZES.find((x) => x.key === (prod === "adv" ? adv : size))!;
      const c = s.key === "custom" ? cols : s.cols, h = s.key === "custom" ? cm : s.cm;
      const front = "front" in s && s.front;
      const p = front ? { label: "Front page", multiplier: FRONT_PAGE_MULTIPLIER } : POSITIONS.find((x) => x.key === pos)!;
      const m = prod === "adv" ? ADVERTORIAL_WRITING : p.multiplier * (colour ? COLOUR_MULTIPLIER : 1);
      each = Math.round((o.columnCmRate ?? 0) * c * h * m);
      n = days.size;
      desc = prod === "adv" ? `Advertorial, ${s.label.toLowerCase()}, written by RAMA` : `${s.label} (${c} col × ${h} cm), ${p.label.toLowerCase()}, ${colour ? "full colour" : "black and white"}`;
      const sorted = [...days].sort((a, b) => a - b);
      when = sorted.map((i) => day(DAYS[i])).join(", ");
      deadline = n ? `Artwork due ${day(addDays(DAYS[sorted[0]], -2))}` : undefined;
      math = `${bd(o.columnCmRate ?? 0)} × ${c} col × ${h} cm${prod === "adv" ? " + writing" : `${p.multiplier !== 1 ? ` × ${p.multiplier} position` : ""}${colour ? ` × ${COLOUR_MULTIPLIER} colour` : ""}`}`;
      diag = { size: s.key, cols: c, cm: h };
    } else {
      const key = (prod === "adv" ? (adv === "full" ? "dps" : "full") : size) as keyof NonNullable<Outlet["magazine"]>;
      each = Math.round(o.magazine![key] * (prod === "adv" ? 1.1 : 1));
      n = issues.size;
      desc = prod === "adv" ? `Advertorial, ${adv === "full" ? "two pages" : "one page"}, written by RAMA` : MAG_SIZES.find((s) => s.key === size)!.label;
      const sorted = [...issues].sort();
      when = sorted.map((i) => ISSUES[i].label + " issue").join(", ");
      deadline = n ? `Artwork due ${fmtDate(ISSUES[sorted[0]].dl)}` : undefined;
      diag = { size: key, cols: 8, cm: 52 };
    }
  } else {
    const isWeb = web === "banner" || web === "mpu";
    each = web === "banner" ? o.web[0] : web === "mpu" ? o.web[1] : web === "post" ? o.social[0] : o.social[1];
    n = qty;
    desc = { banner: "Website leaderboard banner", mpu: "Website box banner (MPU)", post: "Instagram post", story: "Instagram story" }[web]!;
    when = isWeb ? `${qty} week${qty > 1 ? "s" : ""}` : `${qty} ${web === "post" ? (qty > 1 ? "posts" : "post") : qty > 1 ? "stories" : "story"}`;
    deadline = "Material due 3 working days before going live";
  }
  const total = each * n;

  return (
    <Sheet title={daily ? "Daily newspaper" : "Monthly magazine"} onClose={onClose}>
      <Masthead o={o} big />
      <p className="h" style={{ color: "var(--ink-2)", marginTop: 12 }}>{o.about} {daily ? `Print rate ${bd(o.columnCmRate ?? 0)} per column centimetre on an ${PAGE_COLUMNS} column, ${PAGE_HEIGHT_CM} cm page.` : "Prices are per issue, in full colour."}</p>
      <div className="blk"><div className="seg prodseg" role="tablist">
        {([["print", "Print ad"], ["adv", "Advertorial"], ["online", "Online and social"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={prod === v} onClick={() => setProd(v)}>{l}</button>)}
      </div></div>
      <div className="bk">
        {prod !== "online" && <div className="diagwrap"><PageDiagram daily={daily} {...diag} /></div>}
        <div className="bkf">
          {prod === "print" && (daily ? <>
            <div className="field"><span className="flabel">Ad size</span><Seg label="Ad size" value={size} options={DAILY_SIZES.map((s) => [s.key, s.label] as [string, string])} onChange={setSize} /></div>
            {size === "custom" && <div className="two">
              <div className="field"><label htmlFor="cc">Columns (1 to {PAGE_COLUMNS})</label><input id="cc" type="number" min={1} max={PAGE_COLUMNS} value={cols} onChange={(e) => setCols(Math.max(1, Math.min(PAGE_COLUMNS, +e.target.value || 1)))} /></div>
              <div className="field"><label htmlFor="ch">Height in cm (5 to {PAGE_HEIGHT_CM})</label><input id="ch" type="number" min={5} max={PAGE_HEIGHT_CM} value={cm} onChange={(e) => setCm(Math.max(5, Math.min(PAGE_HEIGHT_CM, +e.target.value || 5)))} /></div>
            </div>}
            {size !== "strip" ? <div className="field"><span className="flabel">Page</span><Seg label="Page" value={pos} options={POSITIONS.map((p) => [p.key, p.label + (p.multiplier > 1 ? ` +${Math.round((p.multiplier - 1) * 100)}%` : "")] as [string, string])} onChange={setPos} /></div>
              : <p className="hint">Front page strips run across the bottom of page 1 at double the column-cm rate.</p>}
            <div className="field"><span className="flabel">Colour</span><Seg label="Colour" value={colour} options={[[1, "Full colour"], [0, "Black and white"]]} onChange={setColour} /></div>
          </> : <div className="field"><span className="flabel">Placement</span><Seg label="Placement" value={size} options={MAG_SIZES.map((s) => [s.key, s.label] as [string, string])} onChange={setSize} /></div>)}
          {prod === "adv" && <>
            <div className="field"><span className="flabel">Length</span><Seg label="Length" value={adv} options={daily ? [["full", "Full page"], ["half", "Half page"]] : [["full", "Two pages"], ["half", "One page"]]} onChange={setAdv} /></div>
            <p className="hint">RAMA writes the advertorial with you in {o.language} and the outlet marks it as sponsored content.</p>
          </>}
          {prod === "online" && <>
            <div className="field"><span className="flabel">Placement</span><Seg label="Placement" value={web} options={[["banner", "Website leaderboard"], ["mpu", "Website box (MPU)"], ["post", "Instagram post"], ["story", "Instagram story"]]} onChange={setWeb} /></div>
            <div className="field"><label htmlFor="wq">{web === "banner" || web === "mpu" ? "Weeks" : "How many"}</label><input id="wq" type="number" min={1} max={12} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(12, +e.target.value || 1)))} /></div>
          </>}
          {prod !== "online" && (daily ? (
            <div className="field"><span className="flabel">Publication dates</span><div className="days num">
              {DAYS.map((d, i) => <button key={i} type="button" className="dayb" aria-pressed={days.has(i)} onClick={() => setDays(flip(days, i))}><small>{fmtDate(d, { weekday: "short" })}</small><b>{d.getDate()}</b><small>{fmtDate(d, { month: "short" })}</small></button>)}
            </div></div>
          ) : (
            <div className="field"><span className="flabel">Issues</span><div className="issues">
              {ISSUES.map((s, i) => <button key={i} type="button" className="issb" aria-pressed={issues.has(i)} onClick={() => setIssues(flip(issues, i))}><b>{s.label}</b><small>Artwork due {fmtDate(s.dl, { day: "numeric", month: "short" })}</small></button>)}
            </div></div>
          ))}
        </div>
      </div>
      <div className="total">
        <div><small>{desc}{n > 1 ? `, ${n} × ${bd(each)}` : ""}</small><b className="num">{bd(total)}</b>{math && <small className="num">{math}</small>}</div>
        <button className="btn inf" disabled={!n} onClick={() => { addIoLine({ outlet: o.name, description: desc, when, deadline, total }); onClose(); }}>Add to order</button>
      </div>
      <p className="hint" style={{ marginTop: 10 }}>Rates come from each outlet&apos;s rate card. Final prices are confirmed by RAMA.</p>
    </Sheet>
  );
}
