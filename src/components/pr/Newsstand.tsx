"use client";

import { useState } from "react";
import { useStore } from "../store";
import { PageHead } from "../ui";
import OutletSheet from "./OutletSheet";
import { IoPanel, Masthead } from "./shared";
import { bd } from "@/lib/format";
import { outletFrom } from "@/lib/pricing";
import type { Outlet } from "@/lib/types";

const KINDS = [["all", "All outlets"], ["ar", "Arabic dailies"], ["en", "English dailies"], ["mag", "Magazines"]] as const;

export default function Newsstand() {
  const { outlets, orders } = useStore();
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("all");
  const [open, setOpen] = useState<Outlet | null>(null);
  const list = outlets.filter((o) => kind === "all" || (kind === "ar" && o.kind === "daily" && o.language === "Arabic") || (kind === "en" && o.kind === "daily" && o.language === "English") || (kind === "mag" && o.kind === "monthly"));
  return (
    <>
      <PageHead title="PR and media" ar="العلاقات العامة" lede="Book print ads, advertorials and online placements in Bahrain newspapers and magazines." kpis={[[outlets.length, "Outlets"], [orders.length, "Orders sent"]]} />
      <div className="prgrid">
        <div>
          <div className="cats" role="group" aria-label="Outlet type">{KINDS.map(([v, l]) => <button key={v} className="cat" aria-pressed={kind === v} onClick={() => setKind(v)}>{l}</button>)}</div>
          <div className="stand">{list.map((o) => (
            <button key={o.id} className="paper" onClick={() => setOpen(o)}>
              <Masthead o={o} />
              <span className="pabout">{o.about}</span>
              <span className="pfoot num"><span>{o.kind === "daily" ? `${bd(o.columnCmRate ?? 0)} per column cm` : `Full page ${bd(o.magazine!.full)}`}</span><b>from {bd(outletFrom(o))}</b></span>
            </button>
          ))}</div>
        </div>
        <IoPanel />
      </div>
      {open && <OutletSheet outlet={open} onClose={() => setOpen(null)} />}
    </>
  );
}
