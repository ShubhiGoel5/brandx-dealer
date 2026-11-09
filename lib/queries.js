// Read queries for the public site and admin. All SQL is parameterised.
import { db } from './db.js';
import { onRoadBreakup } from './pricing.js';

export const DEFAULT_CITY = 1; // Lucknow

export function cities() { return db().prepare('SELECT * FROM cities ORDER BY id').all(); }
export function showrooms(kind) {
  return db().prepare(`SELECT s.*, c.name AS city FROM showrooms s JOIN cities c ON c.id = s.city_id ${kind ? 'WHERE s.kind = ?' : ''} ORDER BY s.id`).all(...(kind ? [kind] : []));
}

const parseModel = (m) => m && ({ ...m, colours: JSON.parse(m.colours) });

export function listModels({ includeUnpublished = false } = {}) {
  return db().prepare(`SELECT * FROM models ${includeUnpublished ? '' : 'WHERE published = 1'} ORDER BY sort`).all().map(parseModel);
}
export function getModelBySlug(slug) {
  return parseModel(db().prepare('SELECT * FROM models WHERE slug = ? AND published = 1').get(slug));
}
export function variantsOf(modelId) {
  return db().prepare('SELECT * FROM variants WHERE model_id = ? ORDER BY sort').all(modelId).map((v) => ({ ...v, features: JSON.parse(v.features) }));
}

/** On-road quote for every variant × city of a model, computed server-side from the admin table. */
export function quotesForModel(modelId, now = new Date()) {
  const rules = db().prepare(`SELECT pr.* FROM price_rules pr JOIN variants v ON v.id = pr.variant_id WHERE v.model_id = ?`).all(modelId);
  const out = {};
  for (const r of rules) (out[r.variant_id] ??= {})[r.city_id] = onRoadBreakup(r, now);
  return out;
}

/** "From" price per model: cheapest valid on-road price in the given city. */
export function fromPrices(cityId = DEFAULT_CITY, now = new Date()) {
  const rows = db().prepare(`SELECT pr.*, v.model_id FROM price_rules pr JOIN variants v ON v.id = pr.variant_id WHERE pr.city_id = ?`).all(cityId);
  const best = {};
  for (const r of rows) {
    const b = onRoadBreakup(r, now);
    if (b.status !== 'valid') continue;
    const cur = best[r.model_id];
    if (!cur || b.total < cur.total) best[r.model_id] = { total: b.total, ex: r.ex_showroom };
  }
  return best;
}

export function demoCarsForModel(modelId) {
  return db().prepare(`SELECT dc.id, dc.showroom_id FROM demo_cars dc JOIN variants v ON v.id = dc.variant_id WHERE v.model_id = ?`).all(modelId);
}

// ---- used cars ---------------------------------------------------------------------------
const usedBase = `SELECT u.*, m.name AS model, m.slug AS model_slug, m.body, m.photo AS model_photo, m.photo_fit AS model_photo_fit, s.name AS location FROM used_cars u
  JOIN models m ON m.id = u.model_id JOIN showrooms s ON s.id = u.location_id`;
const parseUsed = (u) => u && ({ ...u, inspection: JSON.parse(u.inspection) });

export function listUsed({ model, fuel, maxPrice, maxKm, includeSold = false } = {}) {
  const where = [includeSold ? "u.status != 'hidden'" : "u.status IN ('available','booked')"], args = [];
  if (model) { where.push('m.slug = ?'); args.push(model); }
  if (fuel) { where.push('u.fuel = ?'); args.push(fuel); }
  if (maxPrice) { where.push('u.price <= ?'); args.push(maxPrice); }
  if (maxKm) { where.push('u.km <= ?'); args.push(maxKm); }
  return db().prepare(`${usedBase} WHERE ${where.join(' AND ')} ORDER BY (u.status = 'available') DESC, u.year DESC, u.price`).all(...args).map(parseUsed);
}
export function getUsedBySlug(slug) { return parseUsed(db().prepare(`${usedBase} WHERE u.slug = ? AND u.status != 'hidden'`).get(slug)); }
export function getUsedById(id) { return parseUsed(db().prepare(`${usedBase} WHERE u.id = ?`).get(id)); }
export function allUsedForAdmin() { return db().prepare(`${usedBase} ORDER BY u.stock_id`).all().map(parseUsed); }
export function pastSales() { return db().prepare('SELECT * FROM past_sales').all(); }

export function carTitle(u) { return `${u.year} ${u.model} ${u.variant}`; }
