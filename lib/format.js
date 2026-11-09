// Formatting helpers: Indian number grouping and IST dates.
const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const inr = (n) => (n == null ? '—' : `₹${inrFmt.format(Math.round(n))}`);

const trim = (x) => String(Math.round(x * 100) / 100);

/** 1245000 -> "₹12.45 lakh"; >= 1 crore -> "₹1.2 crore". */
export function inrShort(n) {
  if (n == null) return '—';
  if (n >= 10000000) return `₹${trim(n / 10000000)} crore`;
  if (n >= 100000) return `₹${trim(n / 100000)} lakh`;
  return inr(n);
}

export const km = (n) => `${inrFmt.format(n)} km`;

const IST = 'Asia/Kolkata';
export const fmtDateTime = (iso, locale = 'en-IN') =>
  new Date(iso).toLocaleString(locale, { timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fmtDate = (iso, locale = 'en-IN') =>
  new Date(iso).toLocaleDateString(locale, { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDay = (iso, locale = 'en-IN') =>
  new Date(iso).toLocaleDateString(locale, { timeZone: IST, weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (iso, locale = 'en-IN') =>
  new Date(iso).toLocaleTimeString(locale, { timeZone: IST, hour: 'numeric', minute: '2-digit' });

export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const statusLabel = (s) => ({ test_drive: 'Test drive' }[s] ?? s[0].toUpperCase() + s.slice(1));
