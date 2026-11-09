// Test-drive booking. The unique partial index on (demo_car_id, slot_start) is the source of truth:
// two buyers racing for one slot cannot both win, whatever the app code does.
import crypto from 'node:crypto';
import { createLead, sendAck, logEvent } from './leads.js';
import { isLegalSlot, slotsForDay } from './slots.js';
import { fmtDay, fmtTime } from './format.js';

export class SlotTakenError extends Error {}

export function takenSlots(d, demoCarId, fromIso) {
  return new Set(d.prepare("SELECT slot_start FROM test_drives WHERE demo_car_id = ? AND status = 'confirmed' AND slot_start >= ?")
    .pluck().all(demoCarId, fromIso));
}

/** Availability for one demo car on one day. */
export function availability(d, demoCarId, date, now = new Date()) {
  return slotsForDay(date, takenSlots(d, demoCarId, `${date}T00:00:00+05:30`), now);
}

/** @returns {{token:string, leadId:number}} */
export function bookTestDrive(d, input, now = new Date()) {
  if (!isLegalSlot(input.slot, now)) throw new Error('That time is not available. Please pick another slot.');
  const car = d.prepare(`SELECT dc.*, v.model_id, v.name AS variant, m.name AS model, s.name AS showroom, s.city_id
      FROM demo_cars dc JOIN variants v ON v.id = dc.variant_id JOIN models m ON m.id = v.model_id
      JOIN showrooms s ON s.id = dc.showroom_id WHERE dc.id = ?`).get(input.demo_car_id);
  if (!car) throw new Error('Demo car not found');

  const tx = d.transaction(() => {
    const token = crypto.randomBytes(10).toString('hex');
    const lead = createLead(d, {
      ...input, model_id: car.model_id, variant_id: car.variant_id, showroom_id: car.showroom_id, city_id: car.city_id,
      message: input.message || `Test drive booked: ${car.model} ${car.variant}`,
    }, { source: 'test-drive', now });
    try {
      d.prepare('INSERT INTO test_drives (token, lead_id, demo_car_id, slot_start, created_at) VALUES (?,?,?,?,?)')
        .run(token, lead.id, car.id, input.slot, now.toISOString());
    } catch (e) {
      if (String(e.code).startsWith('SQLITE_CONSTRAINT')) throw new SlotTakenError('Sorry, someone just booked that slot. Please pick another.');
      throw e;
    }
    d.prepare("UPDATE leads SET status = CASE WHEN status = 'new' THEN 'test_drive' ELSE status END WHERE id = ?").run(lead.id);
    logEvent(d, lead.id, 'test_drive', `Booked ${car.model} ${car.variant} at ${car.showroom}, ${fmtDay(input.slot)} ${fmtTime(input.slot)}`, null, now);
    if (!lead.duplicate) sendAck(d, lead.id, now, `Test drive confirmed: ${fmtDay(input.slot)}, ${fmtTime(input.slot)} at ${car.showroom}.`);
    return { token, leadId: lead.id };
  });
  return tx();
}

export function getBooking(d, token) {
  return d.prepare(`SELECT td.*, l.name, l.phone, dc.label AS car_label, dc.colour, v.name AS variant, m.name AS model, m.slug, m.body,
      s.name AS showroom, s.address, s.phone AS showroom_phone, u.name AS consultant
    FROM test_drives td JOIN leads l ON l.id = td.lead_id JOIN demo_cars dc ON dc.id = td.demo_car_id
    JOIN variants v ON v.id = dc.variant_id JOIN models m ON m.id = v.model_id JOIN showrooms s ON s.id = dc.showroom_id
    LEFT JOIN users u ON u.id = l.assigned_to WHERE td.token = ?`).get(token);
}

export function cancelBooking(d, token, now = new Date()) {
  const b = d.prepare("SELECT * FROM test_drives WHERE token = ? AND status = 'confirmed'").get(token);
  if (!b) return false;
  d.prepare("UPDATE test_drives SET status = 'cancelled' WHERE id = ?").run(b.id);
  logEvent(d, b.lead_id, 'test_drive_cancelled', 'Buyer cancelled the test drive', null, now);
  return true;
}
