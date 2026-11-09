'use server';
// Public (buyer-facing) server actions: language, enquiry, test-drive booking, opt-out.
import { cookies, headers } from 'next/headers';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db.js';
import { createLead } from '@/lib/leads.js';
import { analyseLead } from '@/lib/ai.js';
import { bookTestDrive, cancelBooking, SlotTakenError } from '@/lib/testdrive.js';
import { enquirySchema, bookingSchema, fieldErrors } from '@/lib/validate.js';
import { allow } from '@/lib/ratelimit.js';

export async function setLanguage(lang) {
  (await cookies()).set('bx_lang', lang === 'hi' ? 'hi' : 'en', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

async function clientKey(prefix) {
  const h = await headers();
  return `${prefix}:${(h.get('x-forwarded-for') || 'local').split(',')[0].trim()}`;
}
const toObj = (fd) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string'));

/** Enquiry from a model or used-car page. State shape: {ok, errors, error, who, repeat, name}. */
export async function submitEnquiry(_prev, formData) {
  const raw = toObj(formData);
  if (raw.website) return { ok: true, who: '', name: raw.name ?? '' }; // honeypot: pretend success, store nothing
  if (!allow(await clientKey('enq'), 8, 10 * 60 * 1000)) return { ok: false, error: 'Too many requests. Please wait a few minutes.' };

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: raw };

  const d = db();
  const out = createLead(d, parsed.data, { source: 'web' });
  if (!out.duplicate) after(() => analyseLead(d, out.id));
  const who = out.assigned_to ? d.prepare('SELECT name FROM users WHERE id = ?').pluck().get(out.assigned_to) : null;
  return { ok: true, who, repeat: out.duplicate, name: parsed.data.name };
}

/** Test-drive booking. On success redirects to the confirmation page. */
export async function bookDrive(_prev, formData) {
  const raw = toObj(formData);
  if (raw.website) return { ok: false, error: 'Could not book. Please try again.' };
  if (!allow(await clientKey('book'), 6, 10 * 60 * 1000)) return { ok: false, error: 'Too many requests. Please wait a few minutes.' };

  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: raw };

  const d = db();
  let res;
  try {
    res = bookTestDrive(d, parsed.data);
  } catch (e) {
    if (e instanceof SlotTakenError) return { ok: false, error: e.message, values: raw, slotTaken: true };
    return { ok: false, error: e.message || 'Could not book. Please try again.', values: raw };
  }
  after(() => analyseLead(d, res.leadId));
  redirect(`/booking/${res.token}`);
}

export async function cancelDrive(token) {
  cancelBooking(db(), String(token));
  redirect(`/booking/${token}`);
}

/** DPDP opt-out: stops messages to this phone number across all leads. */
export async function optOut(token) {
  const d = db();
  const lead = d.prepare('SELECT phone FROM leads WHERE opt_token = ?').get(String(token));
  if (lead) d.prepare('UPDATE leads SET opted_out = 1 WHERE phone = ?').run(lead.phone);
  redirect(`/optout/${token}?done=1`);
}
