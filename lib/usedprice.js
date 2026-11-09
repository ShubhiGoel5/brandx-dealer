// Used-car price-band suggestion from past sales of the same model.
// Shown ONLY to the used-car manager, who sets every final price. Never auto-applied.
//
// Method: take past sales of the SAME VARIANT (same model and fuel) within ±1 year and ±20,000 km, adjust each
// sale to this car's year and kilometres, then report the middle of the adjusted prices.
// Fewer than MIN_COMPARABLES comparables => no band (we say so instead of guessing).

export const MIN_COMPARABLES = 3;
export const KM_WINDOW = 20000;
export const YEAR_WINDOW = 1;
export const RUPEES_PER_KM = 4;        // assumption: value lost per extra km driven
export const PCT_PER_YEAR = 0.06;      // assumption: value lost per extra year of age

const roundTo = (n, step) => Math.round(n / step) * step;

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * @param {{model_id:number, variant:string, fuel:string, year:number, km:number}} car
 * @param {Array<{model_id:number, variant:string, fuel:string, year:number, km:number, sold_price:number}>} sales
 * @returns {{ok:true, low:number, mid:number, high:number, n:number, confidence:'medium'|'low'}
 *         | {ok:false, n:number, reason:string}}
 */
export function suggestUsedPrice(car, sales) {
  // Same variant only: mixing variants (e.g. VX with ZX automatic) produced bands too wide to be useful.
  const comps = sales.filter((s) =>
    s.model_id === car.model_id && s.variant === car.variant && s.fuel === car.fuel &&
    Math.abs(s.year - car.year) <= YEAR_WINDOW && Math.abs(s.km - car.km) <= KM_WINDOW);

  if (comps.length < MIN_COMPARABLES) {
    return { ok: false, n: comps.length, reason: `Only ${comps.length} comparable past sale(s) of this variant; need ${MIN_COMPARABLES}. Price manually.` };
  }
  const adjusted = comps.map((s) => {
    const kmAdj = (s.km - car.km) * RUPEES_PER_KM;                 // sale had more km => car is worth more
    const yearAdj = (car.year - s.year) * PCT_PER_YEAR * s.sold_price; // newer car => worth more
    return s.sold_price + kmAdj + yearAdj;
  }).sort((a, b) => a - b);

  const mid = quantile(adjusted, 0.5);
  const low = quantile(adjusted, 0.25);
  const high = quantile(adjusted, 0.75);
  return {
    ok: true, n: comps.length,
    low: roundTo(low, 5000), mid: roundTo(mid, 5000), high: roundTo(high, 5000),
    confidence: comps.length >= 6 ? 'medium' : 'low',
  };
}
