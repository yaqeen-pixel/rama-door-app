"use client";

import { useEffect, useState } from "react";

const Sun = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></g></svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor" /></svg>
);

function currentlyDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Light / dark switch. Saves the choice in the browser; first visit follows the device setting. */
export default function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "side" }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(currentlyDark());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(currentlyDark());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const toggle = () => {
    const next = currentlyDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("rama-theme", next); } catch {}
    setDark(next === "dark");
  };
  const label = `Switch to ${dark ? "light" : "dark"} mode`;
  return (
    <button type="button" className={`themebtn${variant === "side" ? " tside" : ""}`} onClick={toggle} aria-label={label} title={label}>
      {dark ? <Sun /> : <Moon />}
      {variant === "side" && <span>{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
