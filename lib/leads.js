// Lead service: creation with dedupe + auto-assignment + acknowledgement, status, reassignment,
// replies, SLA state and inbox queries. Every function takes the db handle so tests can use :memory:.
import crypto from 'node:crypto';
import { pickConsultant } from './assign.js';
import { checkDraft } from './guard.js';
import { normalisePhone } from './validate.js';

export const SLA_MINUTES = 5;
export const STATUSES = ['new', 'contacted', 'test_drive', 'negotiation', 'won', 'lost'];
export const OPEN = ['new', 'contacted', 'test_drive', 'negotiation'];
const REPEAT_WINDOW_DAYS = 7;

const iso = (d) => d.toISOString();

export function logEvent(d, leadId, type, detail = '', userId = null, now = new Date()) {
  d.prepare('INSERT INTO lead_events (lead_id, type, detail, user_id, created_at) VALUES (?,?,?,?,?)')
    .run(leadId, type, detail, userId, iso(now));
}

function consultantPool(d) {
  const rows = d.prepare(`SELECT u.id, u.showroom_id,
      (SELECT COUNT(*) FROM leads l WHERE l.assigned_to = u.id AND l.status IN ('new','contacted','test_drive','negotiation')) AS open_leads
    FROM users u WHERE u.role = 'consultant'`).all();
  const models = d.prepare('SELECT user_id, model_id FROM consultant_models').all();
  return rows.map((r) => ({ ...r, models: models.filter((m) => m.user_id === r.id).map((m) => m.model_id) }));
}

/**
 * Create a lead (or attach a repeat enquiry to an open one), assign it and send the acknowledgement.
 * `input` is already validated (see validate.js). Returns {id, duplicate, assigned_to, rule}.
 */
export function createLead(d, input, { source = 'web', now = new Date(), consentSource = 'web', status = 'new', initialNote = '' } = {}) {
  const phone = normalisePhone(input.phone) ?? input.phone;

  const tx = d.transaction(() => {
    // Repeat enquiry: same phone + same car interest, still open, within 7 days -> don't make a second lead.
    const since = iso(new Date(now.getTime() - REPEAT_WINDOW_DAYS * 86400000));
    const dup = d.prepare(`SELECT id, assigned_to FROM leads WHERE phone = ? AND created_at >= ?
        AND status IN ('new','contacted','test_drive','negotiation')
        AND IFNULL(model_id,0) = IFNULL(?,0) AND IFNULL(used_car_id,0) = IFNULL(?,0) ORDER BY id DESC LIMIT 1`)
      .get(phone, since, input.model_id ?? null, input.used_car_id ?? null);
    if (dup) {
      logEvent(d, dup.id, 'repeat_enquiry', `Enquired again via ${source}${input.message ? ': ' + input.message.slice(0, 200) : ''}`, null, now);
      return { id: dup.id, duplicate: true, assigned_to: dup.assigned_to, rule: 'repeat' };
    }

    // Resolve what the buyer is interested in, for routing.
    let modelId = input.model_id ?? null, showroomId = input.showroom_id ?? null, cityId = input.city_id ?? null;
    if (input.used_car_id) {
      const uc = d.prepare('SELECT model_id, location_id FROM used_cars WHERE id = ?').get(input.used_car_id);
      if (uc) { modelId = uc.model_id; showroomId ??= uc.location_id; }
    }
    if (!modelId && input.variant_id) modelId = d.prepare('SELECT model_id FROM variants WHERE id = ?').get(input.variant_id)?.model_id ?? null;
    if (!showroomId && cityId) {
      showroomId = d.prepare("SELECT id FROM showrooms WHERE city_id = ? AND kind = 'showroom' ORDER BY id LIMIT 1").get(cityId)?.id ?? null;
    }
    if (showroomId && !cityId) cityId = d.prepare('SELECT city_id FROM showrooms WHERE id = ?').get(showroomId)?.city_id ?? null;

    const { userId, rule } = pickConsultant(consultantPool(d), { showroomId, modelId });
    const trade = input.trade_make || input.trade_year || input.trade_km
      ? JSON.stringify({ make: input.trade_make || null, year: input.trade_year ?? null, km: input.trade_km ?? null }) : null;

    const res = d.prepare(`INSERT INTO leads (name, phone, email, source, showroom_id, city_id, model_id, variant_id, used_car_id, message, trade_in, lang,
        consent, consent_source, consent_at, opt_token, status, assigned_to, assign_rule, created_at, sla_due_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?)`)
      .run(input.name, phone, input.email ?? null, source, showroomId, cityId, modelId, input.variant_id ?? null, input.used_car_id ?? null,
        input.message || initialNote || '', trade, input.lang || 'en', consentSource, iso(now), crypto.randomBytes(12).toString('hex'),
        status, userId, rule, iso(now), iso(new Date(now.getTime() + SLA_MINUTES * 60000)));
    const id = Number(res.lastInsertRowid);
    logEvent(d, id, 'created', `Source: ${source}`, null, now);
    logEvent(d, id, 'assigned', userId ? `Auto-assigned (${rule})` : 'No matching consultant — sent to lead desk', null, now);

    // Acknowledgement template (mock WhatsApp/SMS). Never sent to someone who opted out.
    const opted = d.prepare('SELECT 1 FROM leads WHERE phone = ? AND opted_out = 1 LIMIT 1').get(phone);
    if (opted) d.prepare('UPDATE leads SET opted_out = 1 WHERE id = ?').run(id);
    else sendAck(d, id, now);
    return { id, duplicate: false, assigned_to: userId, rule };
  });
  return tx();
}

export function sendAck(d, leadId, now = new Date(), extra = '') {
  const l = d.prepare(`SELECT l.name, l.lang, m.name AS model, u.name AS consultant FROM leads l
      LEFT JOIN models m ON m.id = l.model_id LEFT JOIN users u ON u.id = l.assigned_to WHERE l.id = ?`).get(leadId);
  const who = l.consultant ?? 'Our team';
  const body = l.lang === 'hi'
    ? `नमस्ते ${l.name} जी, Brand X ${l.model ? l.model + ' ' : ''}में रुचि के लिए धन्यवाद। ${who} अगले ${SLA_MINUTES} मिनट में आपसे संपर्क करेंगे।${extra ? ' ' + extra : ''} बंद करने के लिए STOP लिखें।`
    : `Hi ${l.name}, thanks for your interest in Brand X${l.model ? ' ' + l.model : ''}. ${who} will contact you within ${SLA_MINUTES} minutes.${extra ? ' ' + extra : ''} Reply STOP to opt out.`;
  d.prepare("INSERT INTO messages (lead_id, channel, kind, body, created_at) VALUES (?, 'whatsapp', 'ack', ?, ?)").run(leadId, body, iso(now));
}

/** 'ok' = responded in time / still inside the window, 'due' = ticking, 'breached' = late or overdue. */
export function slaState(lead, now = new Date()) {
  const due = new Date(lead.sla_due_at).getTime();
  if (lead.first_response_at) {
    return { state: new Date(lead.first_response_at).getTime() <= due ? 'met' : 'late', responded: true };
  }
  const ms = due - now.getTime();
  return { state: ms >= 0 ? 'due' : 'breached', msLeft: ms, responded: false };
}

function markResponded(d, leadId, now) {
  d.prepare('UPDATE leads SET first_response_at = ? WHERE id = ? AND first_response_at IS NULL').run(iso(now), leadId);
}

export class AccessError extends Error {}

/** Consultants only touch their own leads; admin (lead desk) touches all. */
export function assertCanAccess(lead, user) {
  if (!lead) throw new AccessError('Lead not found');
  if (user.role === 'admin') return;
  if (user.role === 'consultant' && lead.assigned_to === user.id) return;
  throw new AccessError('You do not have access to this lead');
}

export function setStatus(d, leadId, status, user, now = new Date()) {
  if (!STATUSES.includes(status)) throw new Error('Invalid status');
  const lead = d.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  assertCanAccess(lead, user);
  if (lead.status === status) return;
  d.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, leadId);
  if (status !== 'new') markResponded(d, leadId, now); // moving past "new" means a human has acted
  logEvent(d, leadId, 'status', `${lead.status} → ${status}`, user.id, now);
}

export function reassign(d, leadId, toUserId, user, now = new Date()) {
  const lead = d.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  assertCanAccess(lead, user);
  const to = d.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'consultant'").get(toUserId);
  if (!to) throw new Error('Pick a consultant to hand over to');
  d.prepare('UPDATE leads SET assigned_to = ?, assign_rule = ? WHERE id = ?').run(to.id, 'manual', leadId);
  logEvent(d, leadId, 'reassigned', `Handed to ${to.name}`, user.id, now);
}

/** Send a (mock) WhatsApp reply. Re-checks the guardrail server-side; refuses discount language. */
export function sendReply(d, leadId, body, user, now = new Date()) {
  const lead = d.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  assertCanAccess(lead, user);
  const text = String(body ?? '').trim();
  if (text.length < 2) throw new Error('Write a message first');
  if (text.length > 1500) throw new Error('Message is too long');
  if (lead.opted_out) throw new Error('This buyer has opted out of messages. Call them instead.');
  const allowed = allowedAmountsFor(d, lead, now);
  const check = checkDraft(text, allowed);
  if (check.blocked) throw new Error('Not sent: the message mentions a discount or deal. Discounts are agreed in person.');
  if (check.text !== text) throw new Error('Not sent: the message has a price that is not in the price table.');
  d.prepare("INSERT INTO messages (lead_id, channel, kind, body, sent_by, created_at) VALUES (?, 'whatsapp', 'reply', ?, ?, ?)")
    .run(leadId, text, user.id, iso(now));
  markResponded(d, leadId, now);
  if (lead.status === 'new') d.prepare("UPDATE leads SET status = 'contacted' WHERE id = ?").run(leadId);
  logEvent(d, leadId, 'reply', 'Sent a message', user.id, now);
}

/** Rupee figures that may legitimately appear in a message about this lead (from the admin price table). */
export function allowedAmountsFor(d, lead, now = new Date()) {
  const out = [];
  const rows = lead.variant_id
    ? d.prepare('SELECT * FROM price_rules WHERE variant_id = ? AND city_id = ?').all(lead.variant_id, lead.city_id ?? 0)
    : lead.model_id
      ? d.prepare('SELECT pr.* FROM price_rules pr JOIN variants v ON v.id = pr.variant_id WHERE v.model_id = ? AND pr.city_id = ?').all(lead.model_id, lead.city_id ?? 0)
      : [];
  return allowedFromRules(rows, now, out);
}
import { onRoadBreakup } from './pricing.js';
function allowedFromRules(rows, now, out) {
  for (const r of rows) {
    const b = onRoadBreakup(r, now);
    if (b.status === 'valid') out.push(b.total, ...b.lines.map((l) => l.amount));
  }
  return out;
}

/** Inbox query. Consultants see their own leads; admin sees all (incl. unassigned). */
export function listLeads(d, user, { status = '', q = '', scope = '' } = {}) {
  const where = [], args = [];
  if (user.role === 'consultant') { where.push('l.assigned_to = ?'); args.push(user.id); }
  else if (scope === 'unassigned') where.push('l.assigned_to IS NULL');
  if (status === 'open') where.push("l.status IN ('new','contacted','test_drive','negotiation')");
  else if (STATUSES.includes(status)) { where.push('l.status = ?'); args.push(status); }
  if (q) { where.push('(l.name LIKE ? OR l.phone LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  return d.prepare(`SELECT l.*, m.name AS model_name, v.name AS variant_name, uc.stock_id, s.name AS showroom_name, u.name AS consultant_name,
      c.name AS city_name FROM leads l
    LEFT JOIN models m ON m.id = l.model_id LEFT JOIN variants v ON v.id = l.variant_id LEFT JOIN used_cars uc ON uc.id = l.used_car_id
    LEFT JOIN showrooms s ON s.id = l.showroom_id LEFT JOIN users u ON u.id = l.assigned_to LEFT JOIN cities c ON c.id = l.city_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY (l.first_response_at IS NULL) DESC, CASE WHEN l.first_response_at IS NULL THEN l.sla_due_at END ASC, l.created_at DESC LIMIT 200`).all(...args);
}

/** Headline numbers for the inbox: the client's success metric is "% of leads answered within 5 minutes". */
export function leadStats(d, user, now = new Date()) {
  const own = user.role === 'consultant' ? 'AND assigned_to = ' + Number(user.id) : '';
  const row = d.prepare(`SELECT
      SUM(CASE WHEN first_response_at IS NULL AND sla_due_at < ? THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN first_response_at IS NULL AND sla_due_at >= ? THEN 1 ELSE 0 END) AS waiting,
      SUM(CASE WHEN first_response_at IS NOT NULL THEN 1 ELSE 0 END) AS responded,
      SUM(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_due_at THEN 1 ELSE 0 END) AS in_time,
      SUM(CASE WHEN assigned_to IS NULL AND status = 'new' THEN 1 ELSE 0 END) AS unassigned
    FROM leads WHERE 1=1 ${own}`).get(iso(now), iso(now));
  const answered = row.responded + row.overdue;
  return { overdue: row.overdue ?? 0, waiting: row.waiting ?? 0, unassigned: row.unassigned ?? 0,
    pctInTime: answered ? Math.round(((row.in_time ?? 0) / answered) * 100) : null };
}

/** Portal CSV import. Returns a per-row report; bad rows never abort the batch. */
export function importPortalLeads(d, rows, { now = new Date(), source = 'portal' } = {}) {
  const models = d.prepare('SELECT id, name, slug FROM models').all();
  const cities = d.prepare('SELECT id, name FROM cities').all();
  const report = { created: 0, duplicates: 0, errors: [] };
  rows.forEach((r, i) => {
    const line = i + 2; // header is line 1
    const phone = normalisePhone(r.phone);
    if (!r.name || r.name.length < 2) return report.errors.push({ line, reason: 'Missing name' });
    if (!phone) return report.errors.push({ line, reason: `Invalid phone "${r.phone || ''}"` });
    let model = null;
    if (r.model) {
      model = models.find((m) => m.name.toLowerCase() === r.model.toLowerCase() || m.slug === r.model.toLowerCase());
      if (!model) return report.errors.push({ line, reason: `Unknown model "${r.model}"` });
    }
    const city = r.city ? cities.find((c) => c.name.toLowerCase() === r.city.toLowerCase()) : null;
    if (r.city && !city) return report.errors.push({ line, reason: `Unknown city "${r.city}"` });
    const out = createLead(d, {
      name: r.name.slice(0, 80), phone, email: r.email || null, message: (r.message || '').slice(0, 1000),
      model_id: model?.id ?? null, city_id: city?.id ?? null, lang: 'en',
    }, { source: (r.source || source).slice(0, 30), consentSource: 'portal', now });
    if (out.duplicate) report.duplicates++; else report.created++;
  });
  return report;
}
