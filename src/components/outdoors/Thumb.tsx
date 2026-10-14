import type { OutdoorSite } from "@/lib/types";

const HUE: Record<string, string> = { Billboard: "#F4B323", "LED screen": "#D9282E", Unipole: "#1F6E8C", "Mall screen": "#7E1F4E", "Bridge banner": "#1D5B36", "Airport screen": "#1B2A3F", "Bus shelters": "#6E4B00" };

/** Illustrated placeholder until each site has a real photo. */
export default function Thumb({ site: a, big }: { site: OutdoorSite; big?: boolean }) {
  const hue = HUE[a.format];
  const Panel = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
    <><rect x={x} y={y} width={w} height={h} rx="2" fill={hue} /><rect x={x + 6} y={y + h * 0.3} width={w * 0.5} height="5" rx="2" fill="#fff" opacity=".9" /><rect x={x + 6} y={y + h * 0.55} width={w * 0.35} height="4" rx="2" fill="#fff" opacity=".6" /></>
  );
  const indoor = a.format === "Mall screen" || a.format === "Airport screen";
  return (
    <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" className={`thumb${big ? " big" : ""}`} aria-hidden="true">
      {!indoor && <><rect width="160" height="110" fill="#CFE0EA" /><rect y="78" width="160" height="32" fill="#B9C3C9" /><circle cx={30 + ((a.id * 7) % 90)} cy="22" r="9" fill="#FCEBC6" /></>}
      {a.format === "Billboard" && <><Panel x={30} y={22} w={100} h={44} /><path d="M64 66v22M96 66v22" stroke="#33404E" strokeWidth="4" /></>}
      {a.format === "LED screen" && <><rect x="26" y="18" width="108" height="52" rx="3" fill="#101B2B" /><Panel x={30} y={22} w={100} h={44} /><rect x="74" y="70" width="12" height="18" fill="#33404E" /></>}
      {a.format === "Unipole" && <><Panel x={42} y={14} w={76} h={38} /><rect x="76" y="52" width="8" height="36" fill="#33404E" /></>}
      {a.format === "Mall screen" && <><rect width="160" height="110" fill="#E9E4D6" /><rect y="84" width="160" height="26" fill="#CDBFA6" /><Panel x={44} y={20} w={72} h={48} /><rect x="74" y="68" width="12" height="16" fill="#8A7B60" /></>}
      {a.format === "Bridge banner" && <><path d="M0 46h160v10H0z" fill="#5B6773" /><path d="M20 56v32M140 56v32" stroke="#5B6773" strokeWidth="6" /><Panel x={28} y={30} w={104} h={16} /></>}
      {a.format === "Airport screen" && <><rect width="160" height="110" fill="#DDE3EA" /><path d="M0 18h160" stroke="#A9B3C1" strokeWidth="6" /><Panel x={14} y={30} w={40} h={28} /><Panel x={60} y={30} w={40} h={28} /><Panel x={106} y={30} w={40} h={28} /></>}
      {a.format === "Bus shelters" && <><path d="M36 30h88v6H36z" fill="#33404E" /><path d="M40 36v52M120 36v52" stroke="#33404E" strokeWidth="4" /><Panel x={84} y={40} w={30} h={44} /></>}
    </svg>
  );
}
