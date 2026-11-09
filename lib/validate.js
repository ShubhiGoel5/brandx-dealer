import { z } from 'zod';

/** Normalise an Indian mobile number to 10 digits, or return null. */
export function normalisePhone(raw) {
  let d = String(raw ?? '').replace(/[\s\-().]/g, '');
  d = d.replace(/^(\+?91|0)/, '');
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

const phone = z.string().trim().transform((v, ctx) => {
  const p = normalisePhone(v);
  if (!p) ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit mobile number' });
  return p;
});
const optId = z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable());
const optInt = (min, max) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());
const text = (max) => z.string().trim().max(max);

export const enquirySchema = z.object({
  name: text(80).min(2, 'Please enter your name'),
  phone,
  email: z.preprocess((v) => (v === '' ? null : v), z.string().trim().email('Enter a valid email').max(120).nullable()),
  message: text(1000).optional().default(''),
  model_id: optId,
  variant_id: optId,
  used_car_id: optId,
  showroom_id: optId,
  city_id: optId,
  lang: z.enum(['en', 'hi']).default('en'),
  consent: z.preprocess((v) => v ?? '', z.literal('on', { error: 'Please accept the consent to continue' })),
  trade_make: text(60).optional().default(''),
  trade_year: optInt(1995, 2027),
  trade_km: optInt(0, 1000000),
});

export const bookingSchema = enquirySchema.extend({
  demo_car_id: z.preprocess(Number, z.number().int().positive()),
  slot: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\+05:30$/, 'Pick a time slot'),
});

/** Flatten zod issues to {field: message}. */
export function fieldErrors(err) {
  const out = {};
  for (const i of err.issues) out[i.path[0] ?? '_'] ??= i.message;
  return out;
}
