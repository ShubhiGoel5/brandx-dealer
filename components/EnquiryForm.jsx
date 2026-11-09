'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { submitEnquiry } from '@/app/actions/public.js';

/**
 * Lead capture form. `hidden` carries the car context (model_id, variant_id, used_car_id, city_id).
 * Shows the named consultant on success: the "reached a named person within 5 minutes" promise made visible.
 */
export default function EnquiryForm({ hidden = {}, labels: L, lang = 'en', withTradeIn = false, submitLabel, messageDefault = '' }) {
  const [state, action, pending] = useActionState(submitEnquiry, null);
  const [trade, setTrade] = useState(false);
  const e = state?.errors ?? {};
  const v = state?.values ?? {};

  if (state?.ok) {
    const who = state.who || L.a_consultant;
    return (
      <div className="notice ok stack" role="status" style={{ '--gap': '6px', padding: 20 }}>
        <h3>{L.thanks_title.replace('{name}', state.name)}</h3>
        <p>{(state.repeat ? L.thanks_repeat : L.thanks_body).replace('{who}', who)}</p>
        {!state.repeat && <p className="small">{L.thanks_body2}</p>}
      </div>
    );
  }

  return (
    <form action={action} className="stack" noValidate>
      {Object.entries(hidden).map(([k, val]) => val != null && <input key={k} type="hidden" name={k} value={val} />)}
      <input type="hidden" name="lang" value={lang} />
      <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="enq-name">{L.name}</label>
          <input id="enq-name" name="name" className="input" autoComplete="name" defaultValue={v.name} aria-invalid={!!e.name} aria-describedby={e.name ? 'enq-name-e' : undefined} required />
          {e.name && <span id="enq-name-e" className="err">{e.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="enq-phone">{L.phone}</label>
          <input id="enq-phone" name="phone" className="input" type="tel" inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" defaultValue={v.phone} aria-invalid={!!e.phone} required />
          {e.phone && <span className="err">{e.phone}</span>}
        </div>
        <div className="field full">
          <label htmlFor="enq-email">{L.email}</label>
          <input id="enq-email" name="email" className="input" type="email" autoComplete="email" defaultValue={v.email} aria-invalid={!!e.email} />
          {e.email && <span className="err">{e.email}</span>}
        </div>
        <div className="field full">
          <label htmlFor="enq-msg">{L.message}</label>
          <textarea id="enq-msg" name="message" className="input" maxLength={1000} defaultValue={v.message ?? messageDefault} />
        </div>
      </div>

      {withTradeIn && (
        <div className="stack" style={{ '--gap': '12px' }}>
          <label className="check"><input type="checkbox" checked={trade} onChange={(ev) => setTrade(ev.target.checked)} /> <span style={{ color: 'var(--ink)' }}>{L.tradein}</span></label>
          {trade && (
            <div className="form-grid">
              <div className="field full"><label htmlFor="t-make">{L.tradein_make}</label><input id="t-make" name="trade_make" className="input" maxLength={60} /></div>
              <div className="field"><label htmlFor="t-year">{L.tradein_year}</label><input id="t-year" name="trade_year" className="input" inputMode="numeric" /></div>
              <div className="field"><label htmlFor="t-km">{L.tradein_km}</label><input id="t-km" name="trade_km" className="input" inputMode="numeric" /></div>
            </div>
          )}
        </div>
      )}

      <div className="field">
        <label className="check">
          <input type="checkbox" name="consent" aria-invalid={!!e.consent} />
          <span>{L.consent} <Link href="/privacy" target="_blank" style={{ textDecoration: 'underline' }}>{L.privacy}</Link></span>
        </label>
        {e.consent && <span className="err">{e.consent}</span>}
      </div>
      {state?.error && <p className="notice bad" role="alert">{state.error}</p>}
      <button className="btn primary block" disabled={pending}>{pending ? L.sending : submitLabel || L.send}</button>
    </form>
  );
}
