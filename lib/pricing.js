// On-road price breakup. Pure function: every number comes from an admin price-table row.
// Money is whole rupees (integers); percentages are rounded once, per line, so the
// lines always add up exactly to the total shown to the buyer.

const int = (n) => Math.max(0, Math.round(Number(n) || 0));
const pct = (base, p) => Math.round((base * (Number(p) || 0)) / 100);

/**
 * @param {object} rule  row from price_rules
 * @param {Date} [now]
 * @returns {{status:'valid'|'expired'|'missing', lines?:Array, total?:number, validUntil?:string}}
 *   An expired or missing rule never yields a number: the UI shows "ask for today's price".
 */
export function onRoadBreakup(rule, now = new Date()) {
  if (!rule) return { status: 'missing' };
  const validUntil = rule.valid_until;
  // valid through the end of the stated day (IST)
  const expiry = new Date(`${validUntil}T23:59:59+05:30`);
  if (Number.isNaN(expiry.getTime()) || expiry < now) return { status: 'expired', validUntil };

  const ex = int(rule.ex_showroom);
  const roadTax = pct(ex, rule.road_tax_pct);
  const tcs = pct(ex, rule.tcs_pct);
  const lines = [
    { key: 'exShowroom', amount: ex },
    { key: 'roadTax', amount: roadTax, note: `${rule.road_tax_pct}%` },
    { key: 'insurance', amount: int(rule.insurance) },
    { key: 'registration', amount: int(rule.registration) },
  ];
  if (tcs > 0) lines.push({ key: 'tcs', amount: tcs, note: `${rule.tcs_pct}%` });
  if (int(rule.accessories) > 0) lines.push({ key: 'accessories', amount: int(rule.accessories) });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { status: 'valid', lines, total, validUntil };
}

/** Reducing-balance EMI. rate is annual %, tenure in months. */
export function emi(principal, annualRatePct, months) {
  const P = Number(principal), n = Math.round(Number(months));
  if (!(P > 0) || !(n > 0)) return 0;
  const r = Number(annualRatePct) / 12 / 100;
  if (!(r > 0)) return Math.round(P / n);
  const f = Math.pow(1 + r, n);
  return Math.round((P * r * f) / (f - 1));
}
