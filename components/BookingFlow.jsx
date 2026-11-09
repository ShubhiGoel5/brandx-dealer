'use client';
import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { bookDrive } from '@/app/actions/public.js';
import { slotsForDay } from '@/lib/slots.js';
import { fmtDay, fmtTime } from '@/lib/format.js';

/** Three-step test-drive booking: car -> day & time -> details. Availability is computed from taken slots passed by the server. */
export default function BookingFlow({ cars, days, serverNow, preselect, labels: L, lang }) {
  const now = useMemo(() => new Date(serverNow), [serverNow]);
  const loc = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const first = cars.find((c) => c.model_slug === preselect) ?? cars[0];
  const [carId, setCarId] = useState(first?.id);
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState('');
  const [state, action, pending] = useActionState(bookDrive, null);
  const car = cars.find((c) => c.id === carId);
  const taken = useMemo(() => new Set(car?.taken ?? []), [car]);
  const slots = useMemo(() => slotsForDay(day, taken, now), [day, taken, now]);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};

  const bySite = cars.reduce((m, c) => ((m[c.showroom] ??= []).push(c), m), {});
  const freeCount = (d) => slotsForDay(d, taken, now).filter((s) => s.available).length;

  // If the server says the slot was just taken, clear the selection so the buyer picks another.
  const slotGone = state?.slotTaken && slot && slot === v.slot;

  return (
    <form action={action} className="steps" noValidate>
      <input type="hidden" name="demo_car_id" value={carId ?? ''} />
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="lang" value={lang} />
      <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <section aria-labelledby="s1">
        <div className="step-h"><b>1</b><h2 id="s1">{L.step_car}</h2></div>
        <div className="stack" style={{ '--gap': '22px' }}>
          {Object.entries(bySite).map(([site, list]) => (
            <div key={site} className="stack" style={{ '--gap': '8px' }}>
              <div className="eyebrow">{site}</div>
              <div role="radiogroup" aria-label={site} className="stack" style={{ '--gap': '8px' }}>
                {list.map((c) => (
                  <button type="button" role="radio" key={c.id} className="car-opt" aria-checked={c.id === carId}
                    onClick={() => { setCarId(c.id); setSlot(''); }}>
                    <span><b>{c.label}</b><br /><span className="small muted">{c.colour}</span></span>
                    <span className="badge">{freeCount(day)} {lang === 'hi' ? 'स्लॉट' : 'slots'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="s2">
        <div className="step-h"><b>2</b><h2 id="s2">{L.step_time}</h2></div>
        <div className="days" role="group" aria-label="Day">
          {days.map((d, i) => {
            const label = fmtDay(`${d}T12:00:00+05:30`, loc).split(' ');
            return (
              <button type="button" key={d} className="day" aria-pressed={d === day} onClick={() => { setDay(d); setSlot(''); }}>
                <span className="small">{i === 0 ? L.day_today : label[0].replace(',', '')}</span><b>{new Date(`${d}T12:00:00+05:30`).toLocaleDateString(loc, { timeZone: 'Asia/Kolkata', day: 'numeric' })}</b>
                <span className="small" style={{ opacity: .7 }}>{new Date(`${d}T12:00:00+05:30`).toLocaleDateString(loc, { timeZone: 'Asia/Kolkata', month: 'short' })}</span>
              </button>
            );
          })}
        </div>
        <div className="slots" role="radiogroup" aria-label="Time" style={{ marginTop: 16 }}>
          {slots.map((s) => (
            <button type="button" role="radio" key={s.iso} className="chip" aria-checked={slot === s.iso} disabled={!s.available} onClick={() => setSlot(s.iso)}
              title={s.available ? '' : L.slot_taken}>{fmtTime(s.iso, loc)}</button>
          ))}
        </div>
        {slots.every((s) => !s.available) && <p className="muted" style={{ marginTop: 12 }}>{L.no_slots}</p>}
        {e.slot && <p className="err" style={{ marginTop: 8 }}>{e.slot}</p>}
        <p className="small muted" style={{ marginTop: 10 }}>{L.hours}</p>
      </section>

      <section aria-labelledby="s3" className="stack">
        <div className="step-h"><b>3</b><h2 id="s3">{L.step_you}</h2></div>
        <div className="form-grid" style={{ maxWidth: 640 }}>
          <div className="field"><label htmlFor="b-name">{L.name}</label>
            <input id="b-name" name="name" className="input" autoComplete="name" defaultValue={v.name} aria-invalid={!!e.name} required />{e.name && <span className="err">{e.name}</span>}</div>
          <div className="field"><label htmlFor="b-phone">{L.phone}</label>
            <input id="b-phone" name="phone" className="input" type="tel" inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" defaultValue={v.phone} aria-invalid={!!e.phone} required />{e.phone && <span className="err">{e.phone}</span>}</div>
          <div className="field full"><label htmlFor="b-email">{L.email}</label>
            <input id="b-email" name="email" type="email" className="input" autoComplete="email" defaultValue={v.email} aria-invalid={!!e.email} />{e.email && <span className="err">{e.email}</span>}</div>
          <div className="field full">
            <label className="check"><input type="checkbox" name="consent" aria-invalid={!!e.consent} /><span>{L.consent} <Link href="/privacy" target="_blank" style={{ textDecoration: 'underline' }}>{L.privacy}</Link></span></label>
            {e.consent && <span className="err">{e.consent}</span>}
          </div>
        </div>
        {state?.error && <p className="notice bad" role="alert" style={{ maxWidth: 640 }}>{state.error}</p>}
        {slotGone && <p className="notice warn" style={{ maxWidth: 640 }}>↑ {L.step_time}</p>}
      </section>

      <div className="summary-bar">
        <div className="spread">
          <div className="small" aria-live="polite">
            {car && slot ? <><b>{car.label}</b> · {fmtDay(slot, loc)}, {fmtTime(slot, loc)} · {car.showroom}</> : <span className="muted">{L.step_time}</span>}
          </div>
          <button className="btn primary" disabled={pending || !slot}>{pending ? L.sending : L.confirm_booking}</button>
        </div>
      </div>
    </form>
  );
}
