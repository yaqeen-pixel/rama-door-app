"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { useStore } from "./store";

export default function Sidebar() {
  const path = usePathname();
  const { offers, bookings, ioLines, orders, mode, email } = useStore();
  const openOffers = offers.filter((o) => o.status === "Pending" || o.status === "Countered").length;
  const service = path.split("/")[1];
  const sub = (href: string, label: string, count?: number) => (
    <Link href={href} aria-current={path === href ? "page" : undefined}>{label}{count ? <span className="n">{count}</span> : null}</Link>
  );
  const svc = (href: string, label: string, color: string) => (
    <Link className="svc" href={href} aria-current={service === href.slice(1) ? "page" : undefined}><span className="dot" style={{ background: color }} />{label}</Link>
  );
  return (
    <aside className="side gut">
      <Link className="wordmark" href="/" aria-label="RAMA home"><img className="logo" src="/logo.png" alt="" /></Link>
      <nav className="grp" aria-label="Services">
        <small>Services</small>
        {svc("/influencers", "Influencers", "var(--inf)")}
        {service === "influencers" && <div className="sub">{sub("/influencers", "Discover")}{sub("/influencers/campaigns", "Campaigns")}{sub("/influencers/offers", "Offers", openOffers)}</div>}
        {svc("/outdoors", "Outdoors", "var(--out)")}
        {service === "outdoors" && <div className="sub">{sub("/outdoors", "Explore map")}{sub("/outdoors/bookings", "Bookings", bookings.length)}</div>}
        {svc("/pr", "PR and media", "var(--pr)")}
        {service === "pr" && <div className="sub">{sub("/pr", "Newsstand", ioLines.length)}{sub("/pr/services", "PR services")}{sub("/pr/orders", "Orders", orders.length)}</div>}
      </nav>
      <div className="sidetheme"><ThemeToggle variant="side" /></div>
      <div className="acct">
        <div className="mono">{(email ?? "Demo brand").slice(0, 2).toUpperCase()}</div>
        <div>
          <b>{mode === "live" ? email : mode === "guest" ? "Guest" : "Demo brand"}</b>
          <small>{mode === "live" ? <a href="/auth/signout">Sign out</a> : mode === "guest" ? <a href="/login">Sign in</a> : "Sample account"}</small>
        </div>
      </div>
    </aside>
  );
}
