"use client";

import { useRouter } from "next/navigation";
import { useStore } from "../store";
import { bd } from "@/lib/format";
import { VAT_RATE } from "@/lib/pricing";
import type { Outlet } from "@/lib/types";

export function Masthead({ o, big }: { o: Outlet; big?: boolean }) {
  return (
    <div className={`mast${big ? " big" : ""}`}>
      <span className="mrule" /><b>{o.name}</b>{o.nameAr && <span className="mar" lang="ar">{o.nameAr}</span>}<span className="mrule" />
      <span className="mmeta">{o.kind === "daily" ? "Daily" : "Monthly"} <i /> {o.language}</span>
    </div>
  );
}

/** The running insertion order shown beside the newsstand and PR services. */
export function IoPanel() {
  const { ioLines, removeIoLine, sendIo, mode } = useStore();
  const router = useRouter();
  const sub = ioLines.reduce((t, l) => t + l.total, 0), vat = Math.round(sub * VAT_RATE);
  return (
    <aside className="io" aria-label="Insertion order">
      <div className="iohd"><h3>Insertion order</h3><span className="num">{ioLines.length} line{ioLines.length === 1 ? "" : "s"}</span></div>
      {ioLines.length ? (
        <>
          <ol className="iolines">{ioLines.map((l) => (
            <li key={l.id}><div><b>{l.outlet}</b><span>{l.description}</span><small className="num">{l.when}</small>{l.deadline && <small className="dl">{l.deadline}</small>}</div>
              <div className="iop num"><b>{bd(l.total)}</b><button className="lnk" onClick={() => removeIoLine(l.id)}>Remove</button></div></li>
          ))}</ol>
          <div className="iotot num"><div><span>Subtotal</span><span>{bd(sub)}</span></div><div><span>VAT 10%</span><span>{bd(vat)}</span></div><div className="g"><span>Total</span><b>{bd(sub + vat)}</b></div></div>
          <button className="btn inf" style={{ width: "100%" }} disabled={mode === "guest"} onClick={async () => { await sendIo(); router.push("/pr/orders"); }}>
            {mode === "guest" ? "Sign in to send" : "Send insertion order"}</button>
        </>
      ) : <p className="hint">Pick an outlet, choose the ad size, page and dates, and each booking is added here as a line.</p>}
    </aside>
  );
}
