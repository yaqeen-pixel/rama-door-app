"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Thumb from "./Thumb";
import { LABELS, LAND, MAP_H, MAP_W, ROADS, project, toPoints } from "@/lib/bahrain-map";
import { bd } from "@/lib/format";
import type { OutdoorSite } from "@/lib/types";

type View = { s: number; tx: number; ty: number };

/**
 * Booking.com style map: price pins on a simplified Bahrain outline, drag to pan,
 * wheel or buttons to zoom, nearby pins merge into clusters when zoomed out.
 */
export default function BahrainMap({ sites, freeFor, selected, hovered, onSelect, onOpen }: {
  sites: OutdoorSite[];
  freeFor: (s: OutdoorSite) => number;
  selected: number | null;
  hovered: number | null;
  onSelect: (id: number | null) => void;
  onOpen: (id: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const [scale, setScale] = useState(1);

  const apply = useCallback(() => {
    const v = view.current;
    if (!v || !layer.current) return;
    layer.current.style.transform = `translate(${v.tx}px,${v.ty}px) scale(${v.s})`;
    layer.current.style.setProperty("--s", String(v.s));
    setScale(v.s);
  }, []);

  const fit = useCallback(() => {
    const el = box.current;
    if (!el || !el.clientWidth) return;
    const pts = (sites.length ? sites : [{ lng: 50.56, lat: 26.2 }]).map((s) => project(s.lng, s.lat));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = 90, w = Math.max(x1 - x0, 120), h = Math.max(y1 - y0, 120);
    const s = Math.max(0.35, Math.min(3, Math.min((el.clientWidth - pad * 2) / w, (el.clientHeight - pad * 2) / h)));
    view.current = { s, tx: el.clientWidth / 2 - (s * (x0 + x1)) / 2, ty: el.clientHeight / 2 - (s * (y0 + y1)) / 2 + 20 };
    apply();
  }, [sites, apply]);

  const zoom = useCallback((f: number, cx?: number, cy?: number) => {
    const el = box.current, v = view.current;
    if (!el || !v) return;
    cx ??= el.clientWidth / 2; cy ??= el.clientHeight / 2;
    const s2 = Math.max(0.35, Math.min(5, v.s * f)), k = s2 / v.s;
    view.current = { s: s2, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k };
    apply();
  }, [apply]);

  useEffect(() => { fit(); }, [fit]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let drag: { x: number; y: number; tx: number; ty: number } | null = null;
    const down = (e: PointerEvent) => {
      if (!view.current || (e.target as HTMLElement).closest("button,.mappop")) return;
      drag = { x: e.clientX, y: e.clientY, tx: view.current.tx, ty: view.current.ty };
      el.setPointerCapture(e.pointerId); el.classList.add("dragging");
    };
    const move = (e: PointerEvent) => {
      if (!drag || !view.current || !layer.current) return;
      view.current = { ...view.current, tx: drag.tx + e.clientX - drag.x, ty: drag.ty + e.clientY - drag.y };
      layer.current.style.transform = `translate(${view.current.tx}px,${view.current.ty}px) scale(${view.current.s})`;
    };
    const up = () => { drag = null; el.classList.remove("dragging"); };
    const wheel = (e: WheelEvent) => { if (!view.current) return; e.preventDefault(); const r = el.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("wheel", wheel); };
  }, [zoom]);

  // Cluster pins that would overlap at the current zoom.
  const dx = 86 / scale, dy = 34 / scale;
  const clusters: { x: number; y: number; items: OutdoorSite[] }[] = [];
  [...sites].sort((a, b) => a.weeklyPrice - b.weeklyPrice).forEach((a) => {
    const [x, y] = project(a.lng, a.lat);
    const c = clusters.find((c) => Math.abs(c.x - x) < dx && Math.abs(c.y - y) < dy);
    if (c) { c.items.push(a); c.x = (c.x * (c.items.length - 1) + x) / c.items.length; c.y = (c.y * (c.items.length - 1) + y) / c.items.length; }
    else clusters.push({ x, y, items: [a] });
  });
  const sel = sites.find((s) => s.id === selected);

  return (
    <div className="map" ref={box}>
      <div className="mapin" ref={layer} style={{ width: MAP_W, height: MAP_H }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} aria-hidden="true">
          {LAND.map((p, i) => <polygon key={i} points={toPoints(p)} className="land" />)}
          {ROADS.map((r, i) => <polyline key={i} points={toPoints(r)} className="road" />)}
        </svg>
        {LABELS.map(([t, lng, lat]) => { const [x, y] = project(lng, lat); return <span key={t} className="mlbl" style={{ left: x, top: y }}>{t}</span>; })}
        {clusters.map((c) => {
          const ids = c.items.map((a) => a.id);
          const cls = `${ids.includes(selected ?? -1) ? " sel" : ""}${ids.includes(hovered ?? -1) ? " hot" : ""}`;
          if (c.items.length === 1) {
            const a = c.items[0];
            return <button key={a.id} className={`pin${cls}${freeFor(a) ? "" : " gone"}`} style={{ left: c.x, top: c.y }} onClick={() => onSelect(a.id)} aria-label={`${a.name}, ${bd(a.weeklyPrice)} a week`}>{bd(a.weeklyPrice)}</button>;
          }
          return (
            <button key={ids.join("-")} className={`pin cluster${cls}`} style={{ left: c.x, top: c.y }} aria-label={`${c.items.length} sites, zoom in`}
              onClick={() => { const el = box.current!; const s2 = Math.min(5, scale * 2.2); view.current = { s: s2, tx: el.clientWidth / 2 - s2 * c.x, ty: el.clientHeight / 2 - s2 * c.y }; apply(); }}>
              <span className="cn">{c.items.length}</span>from {bd(Math.min(...c.items.map((a) => a.weeklyPrice)))}
            </button>
          );
        })}
      </div>
      <div className="mapctl">
        <button onClick={() => zoom(1.4)} aria-label="Zoom in">+</button>
        <button onClick={() => zoom(1 / 1.4)} aria-label="Zoom out">−</button>
        <button data-fit onClick={fit} aria-label="Show all results">Fit</button>
      </div>
      <div className="maplegend">Prices per week. Grey pins are booked for your dates.</div>
      {sel && (
        <div className="mappop">
          <Thumb site={sel} />
          <div><b>{sel.name}</b><span className="adloc">{sel.area}, {sel.size}</span><span className="num"><b>{bd(sel.weeklyPrice)}</b> a week</span>
            <button className="btn sm inf" onClick={() => onOpen(sel.id)}>See availability</button></div>
          <button className="x popx" onClick={() => onSelect(null)} aria-label="Close">×</button>
        </div>
      )}
    </div>
  );
}
