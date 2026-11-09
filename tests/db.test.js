import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.js';
import { seed } from '../lib/seed.js';
import { createLead, sendReply, setStatus, reassign, slaState, importPortalLeads, leadStats, AccessError } from '../lib/leads.js';
import { bookTestDrive, SlotTakenError, cancelBooking } from '../lib/testdrive.js';
import { analyseLead } from '../lib/ai.js';
import { suggestUsedPrice } from '../lib/usedprice.js';
import { addDays, istDate } from '../lib/slots.js';

const NOW = new Date('2026-11-09T05:00:00Z'); // 10:30 IST
function fresh() { const d = openDb(':memory:'); seed(d, NOW); d.prepare('DELETE FROM lead_events').run(); return d; }
const base = { name: 'Test Buyer', phone: '9811122233', email: null, message: '', lang: 'en', consent: 'on' };
const user = (d, email) => d.prepare('SELECT * FROM users WHERE email = ?').get(email);
const LATER = new Date(NOW.getTime() + 3600000);

test('new lead is routed to a consultant of that showroom+model and gets an acknowledgement', () => {
  const d = fresh();
  const out = createLead(d, { ...base, model_id: 3, showroom_id: 1 }, { now: LATER });
  assert.equal(out.rule, 'showroom+model');
  assert.equal(d.prepare('SELECT name FROM users WHERE id = ?').pluck().get(out.assigned_to), 'Neha Verma'); // S1 handles H? no: S & E at Gomti Nagar
  const ack = d.prepare("SELECT * FROM messages WHERE lead_id = ? AND kind = 'ack'").get(out.id);
  assert.ok(ack.body.includes('within 5 minutes'));
  const lead = d.prepare('SELECT * FROM leads WHERE id = ?').get(out.id);
  assert.equal(new Date(lead.sla_due_at) - new Date(lead.created_at), 5 * 60000);
});

test('repeat enquiry for same car within a week attaches to the open lead instead of duplicating', () => {
  const d = fresh();
  const a = createLead(d, { ...base, model_id: 2, city_id: 1 }, { now: LATER });
  const b = createLead(d, { ...base, model_id: 2, city_id: 1, message: 'any update?' }, { now: new Date(LATER.getTime() + 60000) });
  assert.equal(b.duplicate, true);
  assert.equal(b.id, a.id);
  assert.equal(d.prepare('SELECT COUNT(*) FROM leads WHERE phone = ?').pluck().get(base.phone), 1);
  const c = createLead(d, { ...base, model_id: 3, city_id: 1 }, { now: LATER }); // different car => new lead
  assert.equal(c.duplicate, false);
});

test('no matching consultant => lead desk (unassigned), never lost', () => {
  const d = fresh();
  d.prepare('DELETE FROM consultant_models').run();
  d.prepare("UPDATE users SET showroom_id = NULL WHERE role = 'consultant'").run();
  const out = createLead(d, { ...base, phone: '9811122244', model_id: 1 }, { now: LATER });
  assert.equal(out.assigned_to, null);
  assert.equal(out.rule, 'lead-desk');
});

test('consultants cannot touch other consultants’ leads; admin can', () => {
  const d = fresh();
  const out = createLead(d, { ...base, model_id: 2, showroom_id: 1 }, { now: LATER });
  const owner = d.prepare('SELECT * FROM users WHERE id = ?').get(out.assigned_to);
  const other = d.prepare("SELECT * FROM users WHERE role = 'consultant' AND id != ? LIMIT 1").get(owner.id);
  assert.throws(() => setStatus(d, out.id, 'contacted', other), AccessError);
  assert.throws(() => reassign(d, out.id, other.id, other), AccessError);
  setStatus(d, out.id, 'contacted', owner, LATER);
  reassign(d, out.id, other.id, user(d, 'admin@brandx-demo.test'), LATER);
  assert.equal(d.prepare('SELECT assigned_to FROM leads WHERE id = ?').pluck().get(out.id), other.id);
});

test('SLA: first response inside 5 minutes is "met", later is "late", none is "breached"', () => {
  const d = fresh();
  const t0 = LATER;
  const a = createLead(d, { ...base, phone: '9811100001', model_id: 2, showroom_id: 1 }, { now: t0 });
  const b = createLead(d, { ...base, phone: '9811100002', model_id: 2, showroom_id: 1 }, { now: t0 });
  const lead = (id) => d.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  const u = (id) => d.prepare('SELECT * FROM users WHERE id = ?').get(lead(id).assigned_to);
  assert.equal(slaState(lead(a.id), new Date(t0.getTime() + 2 * 60000)).state, 'due');
  assert.equal(slaState(lead(a.id), new Date(t0.getTime() + 6 * 60000)).state, 'breached');
  setStatus(d, a.id, 'contacted', u(a.id), new Date(t0.getTime() + 4 * 60000));
  setStatus(d, b.id, 'contacted', u(b.id), new Date(t0.getTime() + 9 * 60000));
  assert.equal(slaState(lead(a.id)).state, 'met');
  assert.equal(slaState(lead(b.id)).state, 'late');
});

test('replies: discount language and invented prices are refused; allowed on-road price is accepted', () => {
  const d = fresh();
  const out = createLead(d, { ...base, model_id: 1, variant_id: 3, city_id: 1, showroom_id: 1 }, { now: NOW });
  const owner = d.prepare('SELECT * FROM users WHERE id = ?').get(out.assigned_to);
  assert.throws(() => sendReply(d, out.id, 'I can offer a discount of 40,000 for you', owner, NOW), /discount/i);
  assert.throws(() => sendReply(d, out.id, 'Price is ₹9.99 lakh only', owner, NOW), /price table/i);
  const rule = d.prepare('SELECT * FROM price_rules WHERE variant_id = 3 AND city_id = 1').get();
  assert.equal(rule.ex_showroom, 1245000);
  sendReply(d, out.id, 'Hi! Happy to help. Would Saturday suit you for a test drive?', owner, NOW);
  assert.equal(d.prepare('SELECT status FROM leads WHERE id = ?').pluck().get(out.id), 'contacted');
  assert.ok(d.prepare('SELECT first_response_at FROM leads WHERE id = ?').pluck().get(out.id));
});

test('opted-out buyers get no acknowledgement and no replies', () => {
  const d = fresh();
  const first = createLead(d, { ...base, model_id: 1 }, { now: NOW });
  d.prepare('UPDATE leads SET opted_out = 1 WHERE phone = ?').run(base.phone);
  d.prepare("UPDATE leads SET status = 'lost' WHERE id = ?").run(first.id);
  const again = createLead(d, { ...base, model_id: 2 }, { now: LATER });
  assert.equal(d.prepare("SELECT COUNT(*) FROM messages WHERE lead_id = ? AND kind = 'ack'").pluck().get(again.id), 0);
  const owner = d.prepare('SELECT * FROM users WHERE id = ?').get(d.prepare('SELECT assigned_to FROM leads WHERE id = ?').pluck().get(again.id));
  assert.throws(() => sendReply(d, again.id, 'Hello, any update?', owner, LATER), /opted out/i);
});

test('test drive: a slot can be booked once; the second buyer gets a clear error; cancelling frees it', () => {
  const d = fresh();
  const slot = `${addDays(istDate(NOW), 1)}T11:00:00+05:30`;
  const a = bookTestDrive(d, { ...base, demo_car_id: 1, slot }, NOW);
  assert.ok(a.token);
  assert.equal(d.prepare('SELECT status FROM leads WHERE id = ?').pluck().get(a.leadId), 'test_drive');
  assert.throws(() => bookTestDrive(d, { ...base, phone: '9811122299', name: 'Second', demo_car_id: 1, slot }, NOW), SlotTakenError);
  // the failed booking must not leave an orphan lead behind
  assert.equal(d.prepare("SELECT COUNT(*) FROM leads WHERE phone = '9811122299'").pluck().get(), 0);
  assert.equal(cancelBooking(d, a.token, NOW), true);
  bookTestDrive(d, { ...base, phone: '9811122299', name: 'Second', demo_car_id: 1, slot }, NOW);
  assert.throws(() => bookTestDrive(d, { ...base, demo_car_id: 1, slot: `${istDate(NOW)}T11:00:00+05:30` }, NOW), /not available/);
});

test('portal CSV import: creates, dedupes and reports bad rows without aborting', () => {
  const d = fresh();
  const rows = [
    { name: 'Ok One', phone: '9822200001', model: 'Model C', city: 'Lucknow', message: 'hi' },
    { name: 'Ok One Again', phone: '98222 00001', model: 'model-c', city: 'Lucknow' },
    { name: 'Bad Phone', phone: '123', model: 'Model C' },
    { name: 'Bad Model', phone: '9822200003', model: 'Model Z' },
    { name: '', phone: '9822200004' },
  ];
  const r = importPortalLeads(d, rows, { now: NOW });
  assert.equal(r.created, 1);
  assert.equal(r.duplicates, 1);
  assert.equal(r.errors.length, 3);
  assert.deepEqual(r.errors.map((e) => e.line), [4, 5, 6]);
  assert.equal(d.prepare("SELECT consent_source FROM leads WHERE phone = '9822200001'").pluck().get(), 'portal');
});

test('AI analysis: rule-based path stores a safe draft; unknown car => low confidence + clarifying questions', async () => {
  const d = fresh();
  const vague = createLead(d, { ...base, phone: '9833300001', message: '' }, { now: NOW });
  const r = await analyseLead(d, vague.id, { now: NOW, useLlm: false });
  assert.equal(r.confidence, 'low');
  assert.ok(r.questions.length > 0);
  assert.equal(r.source, 'rules');
  assert.ok(!/discount|offer/i.test(r.draft));

  const rich = createLead(d, { ...base, phone: '9833300002', message: 'Want ZX automatic, budget 15 lakh, ready to buy this week', model_id: 1, variant_id: 3, city_id: 1 }, { now: NOW });
  const r2 = await analyseLead(d, rich.id, { now: NOW, useLlm: false });
  assert.equal(r2.intent, 'hot');
  assert.ok(r2.needs.some((n) => /Budget/.test(n)), 'budget in the message is picked up');
  assert.ok(!r2.questions.some((q) => /budget/i.test(q)), 'does not re-ask a known budget');
  assert.ok(r2.draft.startsWith('Hi Test,'));
  assert.ok(r2.draft.includes('on-road in Lucknow'));
  assert.ok(r2.draft.includes('prices may change'));
  assert.ok(d.prepare('SELECT ai FROM leads WHERE id = ?').pluck().get(rich.id).includes('"intent":"hot"'));
});

test('AI analysis: a failing LLM falls back to rules instead of throwing', async () => {
  const d = fresh();
  const prev = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'sk-invalid';
  process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:9'; // nothing listens here
  try {
    const l = createLead(d, { ...base, phone: '9833300003', model_id: 2, city_id: 1, message: 'diesel suv please' }, { now: NOW });
    const r = await analyseLead(d, l.id, { now: NOW, useLlm: true });
    assert.equal(r.source, 'rules');
    assert.ok(r.flags.some((f) => /unavailable/i.test(f)));
  } finally {
    if (prev === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = prev;
    delete process.env.ANTHROPIC_BASE_URL;
  }
});

test('used price suggestion on seeded data: UC-1182 gets a band, Model E gets "not enough data"', () => {
  const d = fresh();
  const sales = d.prepare('SELECT * FROM past_sales').all();
  const c = d.prepare("SELECT * FROM used_cars WHERE stock_id = 'UC-1182'").get();
  const r = suggestUsedPrice(c, sales);
  assert.equal(r.ok, true);
  assert.ok(r.mid > 800000 && r.mid < 900000, `mid ${r.mid}`);
  const e = d.prepare("SELECT * FROM used_cars WHERE stock_id = 'UC-1175'").get();
  assert.equal(suggestUsedPrice(e, sales).ok, false);
});

test('inbox stats: overdue / waiting / % answered in time', () => {
  const d = fresh();
  const admin = user(d, 'admin@brandx-demo.test');
  const s = leadStats(d, admin, NOW);
  assert.ok(s.overdue >= 1 && s.waiting >= 1);
  assert.ok(s.pctInTime >= 0 && s.pctInTime <= 100);
  const aarav = user(d, 'aarav@brandx-demo.test');
  assert.ok(leadStats(d, aarav, NOW).overdue <= s.overdue);
});
