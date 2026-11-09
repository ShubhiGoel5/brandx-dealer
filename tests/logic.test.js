import test from 'node:test';
import assert from 'node:assert/strict';
import { onRoadBreakup, emi } from '../lib/pricing.js';
import { pickConsultant } from '../lib/assign.js';
import { suggestUsedPrice } from '../lib/usedprice.js';
import { checkDraft } from '../lib/guard.js';
import { parseCsv } from '../lib/csv.js';
import { normalisePhone, enquirySchema } from '../lib/validate.js';
import { slotsForDay, isLegalSlot, istDate } from '../lib/slots.js';

const rule = { ex_showroom: 1245000, road_tax_pct: 10, insurance: 52000, registration: 6500, tcs_pct: 1, accessories: 18000, valid_until: '2026-12-31' };
const NOW = new Date('2026-11-09T05:00:00Z');

test('on-road breakup: lines add up exactly to the total', () => {
  const r = onRoadBreakup(rule, NOW);
  assert.equal(r.status, 'valid');
  const byKey = Object.fromEntries(r.lines.map((l) => [l.key, l.amount]));
  assert.equal(byKey.roadTax, 124500);
  assert.equal(byKey.tcs, 12450);
  assert.equal(r.total, 1245000 + 124500 + 52000 + 6500 + 12450 + 18000);
  assert.equal(r.total, r.lines.reduce((s, l) => s + l.amount, 0));
});

test('on-road breakup: omits zero TCS and accessories lines', () => {
  const r = onRoadBreakup({ ...rule, tcs_pct: 0, accessories: 0 }, NOW);
  assert.deepEqual(r.lines.map((l) => l.key), ['exShowroom', 'roadTax', 'insurance', 'registration']);
});

test('on-road breakup: expired or missing price never yields a number', () => {
  assert.equal(onRoadBreakup({ ...rule, valid_until: '2026-11-08' }, NOW).status, 'expired');
  assert.equal(onRoadBreakup({ ...rule, valid_until: '2026-11-08' }, NOW).total, undefined);
  assert.equal(onRoadBreakup(null, NOW).status, 'missing');
  assert.equal(onRoadBreakup({ ...rule, valid_until: 'garbage' }, NOW).status, 'expired');
});

test('on-road breakup: valid through the whole last day (IST)', () => {
  const lateOnLastDay = new Date('2026-12-31T17:00:00Z'); // 22:30 IST on the 31st
  assert.equal(onRoadBreakup(rule, lateOnLastDay).status, 'valid');
  assert.equal(onRoadBreakup(rule, new Date('2026-12-31T19:00:00Z')).status, 'expired'); // 00:30 IST on Jan 1
});

test('EMI: known value and edge cases', () => {
  assert.equal(emi(1000000, 9, 60), 20758);
  assert.equal(emi(1200000, 0, 60), 20000);
  assert.equal(emi(0, 9, 60), 0);
  assert.equal(emi(1000000, 9, 0), 0);
});

const team = [
  { id: 1, showroom_id: 10, models: [1, 2], open_leads: 5 },
  { id: 2, showroom_id: 10, models: [1], open_leads: 2 },
  { id: 3, showroom_id: 11, models: [3], open_leads: 0 },
];
test('assignment: showroom + model, least-loaded first', () => {
  assert.deepEqual(pickConsultant(team, { showroomId: 10, modelId: 1 }), { userId: 2, rule: 'showroom+model' });
});
test('assignment: widens to showroom, then model, then lead desk', () => {
  assert.equal(pickConsultant(team, { showroomId: 10, modelId: 3 }).rule, 'showroom');
  assert.deepEqual(pickConsultant(team, { showroomId: 12, modelId: 3 }), { userId: 3, rule: 'model' });
  assert.deepEqual(pickConsultant(team, { showroomId: 12, modelId: 9 }), { userId: null, rule: 'lead-desk' });
  assert.deepEqual(pickConsultant([], { showroomId: 10, modelId: 1 }), { userId: null, rule: 'lead-desk' });
});

const sale = (km, price, year = 2022, variant = 'VX') => ({ model_id: 1, variant, fuel: 'Diesel', year, km, sold_price: price });
test('used price: median band from comparables, adjusted for km', () => {
  const sales = [sale(40000, 850000), sale(45000, 840000), sale(38000, 860000), sale(42000, 845000)];
  const r = suggestUsedPrice({ model_id: 1, variant: 'VX', fuel: 'Diesel', year: 2022, km: 41200 }, sales);
  assert.equal(r.ok, true);
  assert.ok(r.low <= r.mid && r.mid <= r.high);
  assert.ok(r.mid > 830000 && r.mid < 870000);
  assert.equal(r.confidence, 'low'); // only 4 comparables
});
test('used price: refuses to guess with too few comparables or different fuel', () => {
  const car = { model_id: 1, variant: 'VX', fuel: 'Diesel', year: 2022, km: 41200 };
  assert.equal(suggestUsedPrice(car, [sale(40000, 850000), sale(45000, 840000)]).ok, false);
  assert.equal(suggestUsedPrice(car, [sale(40000, 850000, 2022), sale(42000, 850000, 2022), sale(43000, 850000, 2022)].map((s) => ({ ...s, fuel: 'Petrol' }))).ok, false);
  assert.equal(suggestUsedPrice(car, [sale(90000, 700000), sale(95000, 690000), sale(99000, 680000)]).ok, false); // km too far
});

test('guard: blocks discount language and strips unknown rupee amounts', () => {
  const allowed = [1245000, 1431450];
  const ok = checkDraft('The Model H ZX is ₹14.31 lakh on-road in Lucknow (valid till 31 Dec).', [1431450]);
  assert.equal(ok.blocked, false);
  assert.deepEqual(ok.flags, []);

  const bad = checkDraft('I can give you a discount of ₹50,000 and free insurance!', allowed);
  assert.equal(bad.blocked, true);
  assert.ok(bad.text.includes('[price: ask me]'));
  assert.ok(bad.flags.length >= 2);

  assert.equal(checkDraft('आपको विशेष छूट मिलेगी', allowed).blocked, true);
  assert.equal(checkDraft('Hello! Would Saturday 11am suit you for a test drive?', allowed).blocked, false);
});

test('csv: quotes, commas, CRLF, BOM, blank lines', () => {
  const rows = parseCsv('﻿Name,Phone,Message\r\n"Rao, A",98765 43210,"Wants ""automatic"""\r\n\r\nSita,9876543211,\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Rao, A');
  assert.equal(rows[0].message, 'Wants "automatic"');
  assert.equal(rows[1].message, '');
});

test('phone: normalises Indian mobiles and rejects junk', () => {
  assert.equal(normalisePhone('+91 98765-43210'), '9876543210');
  assert.equal(normalisePhone('09876543210'), '9876543210');
  assert.equal(normalisePhone('12345'), null);
  assert.equal(normalisePhone('5876543210'), null);
});

test('enquiry schema: consent required, inputs coerced', () => {
  const base = { name: 'Asha', phone: '9876543210', email: '', message: 'hi', consent: 'on' };
  const ok = enquirySchema.safeParse({ ...base, model_id: '3' });
  assert.equal(ok.success, true);
  assert.equal(ok.data.model_id, 3);
  assert.equal(ok.data.email, null);
  assert.equal(enquirySchema.safeParse({ ...base, consent: undefined }).success, false);
  assert.equal(enquirySchema.safeParse({ ...base, phone: '123' }).success, false);
});

test('slots: respects 2h lead time, taken slots, and rejects illegal slots', () => {
  const now = new Date('2026-11-09T05:00:00Z'); // 10:30 IST
  const today = istDate(now);
  assert.equal(today, '2026-11-09');
  const slots = slotsForDay(today, new Set(['2026-11-09T15:00:00+05:30']), now);
  assert.equal(slots.find((s) => s.hour === 11).available, false); // < 2h away
  assert.equal(slots.find((s) => s.hour === 13).available, true);
  assert.equal(slots.find((s) => s.hour === 15).available, false); // taken
  assert.equal(isLegalSlot('2026-11-09T13:00:00+05:30', now), true);
  assert.equal(isLegalSlot('2026-11-09T20:00:00+05:30', now), false); // after closing
  assert.equal(isLegalSlot('2026-11-30T12:00:00+05:30', now), false); // beyond window
  assert.equal(isLegalSlot('2026-11-10T12:30:00+05:30', now), false); // not on the hour
});

test('enquiry schema: missing consent gives a human-readable message', () => {
  const r = enquirySchema.safeParse({ name: 'Asha', phone: '9876543210', email: '' });
  assert.equal(r.success, false);
  assert.equal(r.error.issues.find((i) => i.path[0] === 'consent').message, 'Please accept the consent to continue');
});
