export const bd = (n: number) => "BD " + Math.round(n).toLocaleString("en-US");
export const compact = (n: number) => (n >= 1000 ? Math.round(n / 1000) + "K" : String(n));
export const firstName = (name: string) => name.split(" ")[0];
export const uid = (prefix: string) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const fmtDate = (d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  d.toLocaleDateString("en-GB", opts);
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
/** Monday of the current week, used as week 0 for outdoor availability. */
export function weekZero(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = (d.getDay() + 6) % 7;
  return addDays(d, 7 - day); // next Monday
}
