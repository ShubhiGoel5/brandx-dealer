// Test-drive slot generation. Showroom hours are IST; a slot is one hour.
export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 18; // last slot starts 17:00
export const MIN_LEAD_MINUTES = 120; // a slot starting in under 2 hours can't be booked
export const DAYS_AHEAD = 7;

const pad = (n) => String(n).padStart(2, '0');

/** YYYY-MM-DD for `now` in IST. */
export function istDate(now = new Date()) {
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
}
export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const slotIso = (date, hour) => `${date}T${pad(hour)}:00:00+05:30`;

/** Candidate day strings, today first. */
export function bookableDays(now = new Date()) {
  const today = istDate(now);
  return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));
}

/**
 * @param {string} date YYYY-MM-DD
 * @param {Set<string>} taken slot ISO strings already booked for this car
 */
export function slotsForDay(date, taken = new Set(), now = new Date()) {
  const cutoff = now.getTime() + MIN_LEAD_MINUTES * 60000;
  const out = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    const iso = slotIso(date, h);
    out.push({ iso, hour: h, available: new Date(iso).getTime() >= cutoff && !taken.has(iso) });
  }
  return out;
}

/** Server-side re-check that a submitted slot is a legal, future, in-window slot. */
export function isLegalSlot(iso, now = new Date()) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):00:00\+05:30$/.exec(iso);
  if (!m) return false;
  const h = Number(m[2]);
  return bookableDays(now).includes(m[1]) && h >= OPEN_HOUR && h < CLOSE_HOUR &&
    new Date(iso).getTime() >= now.getTime() + MIN_LEAD_MINUTES * 60000;
}
