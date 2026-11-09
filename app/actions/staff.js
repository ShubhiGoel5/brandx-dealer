'use server';
// Staff server actions. Every action re-checks the signed-in user and role: UI hiding is never the only control.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { headers } from 'next/headers';
import { db } from '@/lib/db.js';
import { createSession, destroySession, requireUser, HOME_FOR_ROLE } from '@/lib/auth.js';
import { setStatus, reassign, sendReply, importPortalLeads, AccessError } from '@/lib/leads.js';
import { analyseLead } from '@/lib/ai.js';
import { parseCsv } from '@/lib/csv.js';
import { allow } from '@/lib/ratelimit.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // equalises timing for unknown emails

export async function login(_prev, formData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 120);
  const password = String(formData.get('password') ?? '').slice(0, 200);
  const ip = ((await headers()).get('x-forwarded-for') || 'local').split(',')[0].trim();
  if (!allow(`login:${ip}`, 10, 5 * 60 * 1000) || !allow(`login:${email}`, 6, 5 * 60 * 1000)) {
    return { error: 'Too many attempts. Try again in a few minutes.' };
  }
  const u = db().prepare('SELECT * FROM users WHERE email = ?').get(email);
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok) return { error: 'Email or password is incorrect.', email };
  await createSession(u);
  redirect(HOME_FOR_ROLE[u.role] ?? '/staff/leads');
}

export async function logout() {
  await destroySession();
  redirect('/staff/login');
}

/** Wrap lead actions so access errors become a message instead of a crash. */
async function guarded(fn) {
  try { await fn(); return { ok: true }; }
  catch (e) {
    if (e instanceof AccessError || e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: 'Something went wrong' };
  }
}

export async function changeStatus(leadId, status) {
  const user = await requireUser(['consultant', 'admin']);
  const res = await guarded(() => setStatus(db(), Number(leadId), String(status), user));
  revalidatePath('/staff/leads'); revalidatePath(`/staff/leads/${leadId}`);
  return res;
}

export async function handOver(leadId, toUserId) {
  const user = await requireUser(['consultant', 'admin']);
  const res = await guarded(() => reassign(db(), Number(leadId), Number(toUserId), user));
  revalidatePath('/staff/leads'); revalidatePath(`/staff/leads/${leadId}`);
  return res;
}

export async function sendLeadReply(_prev, formData) {
  const user = await requireUser(['consultant', 'admin']);
  const leadId = Number(formData.get('leadId'));
  const res = await guarded(() => sendReply(db(), leadId, String(formData.get('body') ?? ''), user));
  revalidatePath('/staff/leads'); revalidatePath(`/staff/leads/${leadId}`);
  return res.ok ? { ok: true, sent: Date.now() } : res;
}

export async function regenerateAi(leadId) {
  const user = await requireUser(['consultant', 'admin']);
  const d = db();
  const lead = d.prepare('SELECT * FROM leads WHERE id = ?').get(Number(leadId));
  if (!lead || (user.role === 'consultant' && lead.assigned_to !== user.id)) return { ok: false, error: 'No access' };
  await analyseLead(d, lead.id);
  revalidatePath(`/staff/leads/${leadId}`);
  return { ok: true };
}

const MAX_CSV = 200_000; // ~200 KB
export async function importCsv(_prev, formData) {
  await requireUser(['admin']);
  let text = String(formData.get('csv') ?? '');
  const file = formData.get('file');
  if (file && typeof file === 'object' && file.size) {
    if (file.size > MAX_CSV) return { error: 'File is too large (max 200 KB).' };
    text = await file.text();
  }
  if (!text.trim()) return { error: 'Paste CSV text or choose a file.' };
  if (text.length > MAX_CSV) return { error: 'Too much data (max 200 KB).' };
  const rows = parseCsv(text);
  if (!rows.length) return { error: 'No rows found. The first line must be a header: name, phone, email, source, model, city, message.' };
  if (rows.length > 500) return { error: 'Max 500 rows per import.' };
  const report = importPortalLeads(db(), rows);
  revalidatePath('/staff/leads');
  return { report };
}

// ---- admin CMS ------------------------------------------------------------------------------
const priceSchema = z.object({
  id: z.coerce.number().int().positive(),
  ex_showroom: z.coerce.number().int().min(100000).max(100000000),
  road_tax_pct: z.coerce.number().min(0).max(30),
  insurance: z.coerce.number().int().min(0).max(5000000),
  registration: z.coerce.number().int().min(0).max(500000),
  tcs_pct: z.coerce.number().min(0).max(10),
  accessories: z.coerce.number().int().min(0).max(5000000),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function savePrice(_prev, formData) {
  const user = await requireUser(['admin']);
  const p = priceSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, error: 'Check the numbers: ' + p.error.issues.map((i) => i.path[0]).join(', ') };
  const v = p.data;
  if (Number.isNaN(new Date(`${v.valid_until}T00:00:00Z`).getTime())) return { ok: false, error: 'Invalid date' };
  db().prepare(`UPDATE price_rules SET ex_showroom=?, road_tax_pct=?, insurance=?, registration=?, tcs_pct=?, accessories=?, valid_until=?, updated_at=?, updated_by=? WHERE id=?`)
    .run(v.ex_showroom, v.road_tax_pct, v.insurance, v.registration, v.tcs_pct, v.accessories, v.valid_until, new Date().toISOString(), user.id, v.id);
  revalidatePath('/', 'layout');
  return { ok: true, at: Date.now() };
}

const usedSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(['available', 'booked', 'sold', 'hidden']),
  price: z.coerce.number().int().min(50000).max(50000000).optional(),
  notes: z.string().max(300).optional().default(''),
});
export async function saveUsed(_prev, formData) {
  const user = await requireUser(['admin', 'used_manager']);
  const p = usedSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, error: 'Check the values' };
  const { id, status, notes } = p.data;
  const d = db();
  d.prepare('UPDATE used_cars SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(status, notes, new Date().toISOString(), id);
  // Only the used-car manager sets prices.
  if (user.role === 'used_manager' && p.data.price) d.prepare('UPDATE used_cars SET price = ? WHERE id = ?').run(p.data.price, id);
  revalidatePath('/', 'layout');
  return { ok: true, at: Date.now() };
}

const modelSchema = z.object({
  id: z.coerce.number().int().positive(),
  tagline_en: z.string().trim().min(2).max(100),
  about_en: z.string().trim().min(10).max(600),
  published: z.string().optional(),
});
export async function saveModel(_prev, formData) {
  await requireUser(['admin']);
  const p = modelSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { ok: false, error: 'Tagline and description are required' };
  db().prepare('UPDATE models SET tagline_en = ?, about_en = ?, published = ? WHERE id = ?')
    .run(p.data.tagline_en, p.data.about_en, p.data.published === 'on' ? 1 : 0, p.data.id);
  revalidatePath('/', 'layout');
  return { ok: true, at: Date.now() };
}
