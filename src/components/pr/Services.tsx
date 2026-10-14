"use client";

import { useStore } from "../store";
import { PageHead } from "../ui";
import { IoPanel } from "./shared";
import { bd } from "@/lib/format";

export default function Services() {
  const { packages, addIoLine } = useStore();
  return (
    <>
      <PageHead title="PR services" ar="العلاقات العامة" lede="Earned coverage handled by the RAMA PR team." />
      <div className="prgrid">
        <div className="packs">{packages.map((p) => (
          <div className="pack" key={p.key}><h3>{p.label}</h3><p>{p.description}</p>
            <div className="pfoot num"><b>{bd(p.price)}</b><button className="btn sm inf" onClick={() => addIoLine({ outlet: "RAMA PR team", description: p.label, when: "Starts once the order is confirmed", total: p.price })}>Add to order</button></div></div>
        ))}</div>
        <IoPanel />
      </div>
    </>
  );
}
