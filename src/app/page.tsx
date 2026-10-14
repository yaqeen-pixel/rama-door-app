import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Portrait } from "@/components/ui";
import { getCreators } from "@/lib/data";
import { minRate } from "@/lib/pricing";

export const revalidate = 300;

export default async function Home() {
  const creators = (await getCreators()).filter((c) => minRate(c) != null).slice(0, 3);
  return (
    <div className="landing gut">
      <header className="lnav">
        <Link className="wordmark" href="/" aria-label="RAMA home"><img className="logo" src="/logo.png" alt="" /></Link>
        <div className="navr">
          <ThemeToggle />
          <Link className="btn line sm" href="/influencers">Open workspace</Link>
        </div>
      </header>

      <section className="lhero">
        <h1>Where would you like to start?</h1>
        <p className="sub">Pick one of RAMA&apos;s three services. You can switch any time.</p>
      </section>

      <section className="doors" aria-label="Services">
        <Link className="door d-inf" href="/influencers">
          <div className="art"><div className="stack">{creators.map((c) => <Portrait key={c.id} creator={c} />)}</div></div>
          <div className="inner">
            <h2>Influencers</h2><span className="ar" lang="ar">المؤثرين</span>
            <p>Choose creators, build a package and send an offer.</p>
            <span className="cta">Find creators</span>
          </div>
        </Link>
        <Link className="door d-out" href="/outdoors">
          <div className="art">
            <svg viewBox="0 0 160 120" aria-hidden="true"><rect x="24" y="16" width="112" height="56" rx="6" fill="var(--out)" /><path d="M40 36h56M40 48h40" stroke="#fff" strokeWidth="6" strokeLinecap="round" /><path d="M70 72v38M90 72v38" stroke="var(--out-deep)" strokeWidth="5" strokeLinecap="round" /></svg>
          </div>
          <div className="inner">
            <h2>Outdoors</h2><span className="ar" lang="ar">الإعلانات الخارجية</span>
            <p>See billboards and screens on the map and book free weeks.</p>
            <span className="cta">Explore the map</span>
          </div>
        </Link>
        <Link className="door d-pr" href="/pr">
          <div className="art">
            <svg viewBox="0 0 160 120" aria-hidden="true"><rect x="40" y="18" width="84" height="96" rx="8" fill="var(--pearl)" transform="rotate(-6 82 66)" opacity=".6" /><rect x="40" y="18" width="84" height="96" rx="8" fill="var(--pearl)" /><rect x="52" y="32" width="48" height="8" rx="3" fill="var(--pr)" /><path d="M52 54h60M52 66h60M52 78h40" stroke="var(--pr)" strokeWidth="4" strokeLinecap="round" opacity=".5" /></svg>
          </div>
          <div className="inner">
            <h2>PR and media</h2><span className="ar" lang="ar">العلاقات العامة</span>
            <p>Book newspaper and magazine space, or a press release.</p>
            <span className="cta">Open the newsstand</span>
          </div>
        </Link>
      </section>

      <footer className="lfoot"><span>RAMA Group, Kingdom of Bahrain</span></footer>
    </div>
  );
}
