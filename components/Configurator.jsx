'use client';
import { useState } from 'react';
import Link from 'next/link';
import CarImage from './CarImage.jsx';
import EmiCalc from './EmiCalc.jsx';
import EnquiryForm from './EnquiryForm.jsx';
import { inr } from '@/lib/format.js';

/** Model page body: colour, variant and city selection drive the picture, the on-road breakup and the EMI. */
export default function Configurator({ model, variants, quotes, cities, defaultCityId, labels: L, lang }) {
  const [variantId, setVariantId] = useState(variants[Math.min(1, variants.length - 1)].id);
  const [cityId, setCityId] = useState(defaultCityId);
  const [colour, setColour] = useState(model.colours[0]);
  const [showForm, setShowForm] = useState(false);
  const variant = variants.find((v) => v.id === variantId);
  const q = quotes[variantId]?.[cityId] ?? { status: 'missing' };
  const city = cities.find((c) => c.id === cityId);

  return (
    <div className="detail areas">
      <div className="d-stage">
        <div className="stage">
          <CarImage model={model} colour={colour.hex} alt={`${model.name} in ${colour.name}`} priority />
          {model.photo ? (
            <div className="swatch-note small muted" aria-label={L.colour}>
              {model.colours.map((c) => <span key={c.name} className="row" style={{ gap: 6 }}><i className="dot" style={{ background: c.hex }} />{c.name}</span>)}
            </div>
          ) : (
          <div className="spread" style={{ marginTop: 12 }}>
            <div className="swatches" role="group" aria-label={L.colour}>
              {model.colours.map((c) => (
                <button key={c.name} className="swatch" style={{ background: c.hex }} aria-label={c.name} aria-pressed={c.name === colour.name} onClick={() => setColour(c)} />
              ))}
            </div>
            <span className="small muted" aria-live="polite">{colour.name}</span>
          </div>
          )}
        </div>

      </div>

      <div className="d-specs">
        <section aria-labelledby="specs-h">
          <h2 id="specs-h" style={{ marginBottom: 12 }}>{L.specs}</h2>
          <dl className="specs" style={{ margin: 0 }}>
            <div><dt>{L.engine}</dt><dd>{variant.engine}</dd></div>
            <div><dt>{L.power}</dt><dd>{variant.power}</dd></div>
            <div><dt>{L.transmission}</dt><dd>{variant.transmission}</dd></div>
            <div><dt>{L.fuel}</dt><dd>{variant.fuel}</dd></div>
            <div><dt>{L.mileage}</dt><dd>{variant.mileage}</dd></div>
            <div><dt>{L.seats}</dt><dd>{model.seats}</dd></div>
          </dl>
          <h3 style={{ margin: '28px 0 12px' }}>{L.features}</h3>
          <ul className="ticks">{variant.features.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      </div>

      <aside className="d-aside sticky stack" style={{ '--gap': '16px' }} aria-label={L.price_breakup}>
        <div className="panel stack" style={{ '--gap': '18px' }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="cfg-variant">{L.variant}</label>
              <select id="cfg-variant" className="input" value={variantId} onChange={(e) => setVariantId(+e.target.value)}>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.fuel}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cfg-city">{L.city}</label>
              <select id="cfg-city" className="input" value={cityId} onChange={(e) => setCityId(+e.target.value)}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {q.status === 'valid' ? (
            <>
              <div>
                <div className="small muted">{L.total_on_road} · {city.name}</div>
                <div className="price-hero" aria-live="polite">{inr(q.total)}</div>
              </div>
              <table className="breakup">
                <tbody>
                  {q.lines.map((l) => (
                    <tr key={l.key}><td>{L[l.key]}{l.note && <span className="note">{l.note}</span>}</td><td>{inr(l.amount)}</td></tr>
                  ))}
                  <tr className="total"><td>{L.total_on_road}</td><td>{inr(q.total)}</td></tr>
                </tbody>
              </table>
              <p className="small muted">{L.valid_until} {new Date(`${q.validUntil}T00:00:00+05:30`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. {L.price_disclaimer}</p>
            </>
          ) : (
            <div className="notice warn">
              <b>{q.status === 'expired' ? L.price_expired : L.price_missing}</b>
              <div className="small">{L.price_expired_d}</div>
            </div>
          )}

          <div className="stack" style={{ '--gap': '10px' }}>
            <Link className="btn primary block" href={`/test-drive?model=${model.slug}`}>{L.cta_drive}</Link>
            <button className="btn ghost block" aria-expanded={showForm} onClick={() => setShowForm(!showForm)}>{L.cta_call}</button>
          </div>
          {showForm && (
            <div id="enquire">
              <EnquiryForm labels={L} lang={lang} withTradeIn hidden={{ model_id: model.id, variant_id: variantId, city_id: cityId }}
                messageDefault="" />
            </div>
          )}
        </div>
        {q.status === 'valid' && <div className="panel"><EmiCalc price={q.total} labels={L} /></div>}
      </aside>
    </div>
  );
}
