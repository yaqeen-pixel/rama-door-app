"use client";

import { useEffect, type ReactNode } from "react";
import type { Creator } from "@/lib/types";

const DUO: [string, string][] = [["#FBDADB","#9E1519"],["#E3E7EE","#1B2A3F"],["#FCEBC6","#6E4B00"],["#D5EAF2","#0D3E52"],["#F2E1D5","#7A3A12"],["#E6E2D6","#3F3A2E"],["#F7D7E6","#7E1F4E"],["#D9EEDF","#1D5B36"]];

export function initials(name: string) {
  const parts = name.split(/\s+/).filter((w) => !/^(Al|Bu)$/i.test(w));
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Arch-shaped creator portrait. Uses the photo when the database has one, otherwise initials. */
export function Portrait({ creator, className = "", photo, children }: { creator: Creator; className?: string; photo?: string; children?: ReactNode }) {
  const [bg, fg] = DUO[(creator.id - 1) % DUO.length];
  return (
    <div className={`portrait ${className}`} style={{ background: bg, color: fg, ["--ring" as string]: fg + "26" }}>
      {photo ? <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="ini">{initials(creator.name)}</span>}
      {children}
    </div>
  );
}

export function Pill({ status }: { status: string }) {
  const m: Record<string, string> = { Live: "p-ok", Accepted: "p-ok", Confirmed: "p-ok", Pending: "p-wait", Requested: "p-wait", Countered: "p-info", Draft: "p-mute", Declined: "p-bad", Passed: "p-mute" };
  return <span className={`pill ${m[status] ?? "p-mute"}`}>{status}</span>;
}

/** Slide-over panel used for profiles, bookings and forms. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="shd"><span>{title}</span><button className="x" onClick={onClose} aria-label="Close" autoFocus>×</button></div>
        {children}
      </aside>
    </>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label, disabled }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string; disabled?: (v: T) => boolean }) {
  return (
    <div className="seg wrap" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} disabled={disabled?.(v)} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function PageHead({ title, ar, lede, kpis }: { title: string; ar?: string; lede: string; kpis?: [string | number, string][] }) {
  return (
    <section className="ph">
      <div>
        <h1>{title}{ar && <span className="ar" lang="ar">{ar}</span>}</h1>
        <p className="lede">{lede}</p>
      </div>
      {kpis && <div className="kpis num">{kpis.map(([v, l]) => <div className="kpi" key={l}><b>{v}</b><span>{l}</span></div>)}</div>}
    </section>
  );
}
