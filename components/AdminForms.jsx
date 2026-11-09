'use client';
import { useActionState } from 'react';
import { importCsv, savePrice, saveUsed, saveModel } from '@/app/actions/staff.js';

export function ImportForm() {
  const [state, action, pending] = useActionState(importCsv, null);
  const r = state?.report;
  return (
    <form action={action} className="stack">
      <div className="field"><label htmlFor="file">CSV file</label><input id="file" name="file" type="file" accept=".csv,text/csv" className="input" /></div>
      <div className="field"><label htmlFor="csv">…or paste CSV text</label>
        <textarea id="csv" name="csv" className="input" rows={6} placeholder={'name,phone,email,source,model,city,message\nAsha Rao,9876543210,,cardekho,Model C,Lucknow,Want a diesel SUV'} /></div>
      {state?.error && <p className="notice bad" role="alert">{state.error}</p>}
      <button className="btn dark" style={{ width: 'fit-content' }} disabled={pending}>{pending ? 'Importing…' : 'Import and auto-assign'}</button>
      {r && (
        <div className="stack" role="status">
          <p className="notice ok"><b>{r.created}</b> new leads created and assigned · <b>{r.duplicates}</b> repeat enquiries merged · <b>{r.errors.length}</b> rows skipped</p>
          {r.errors.length > 0 && (
            <table className="data"><thead><tr><th>Line</th><th>Problem</th></tr></thead>
              <tbody>{r.errors.map((e) => <tr key={e.line}><td>{e.line}</td><td>{e.reason}</td></tr>)}</tbody></table>
          )}
        </div>
      )}
    </form>
  );
}

function Saved({ state }) {
  if (!state) return null;
  return state.ok ? <span className="badge ok" role="status">Saved</span> : <span className="err" role="alert">{state.error}</span>;
}

/** One price-table row (variant × city). Server action validates; the page re-renders the live on-road total. */
export function PriceRow({ rule, cityName, status, total }) {
  const [state, action, pending] = useActionState(savePrice, null);
  const n = (name, val, w) => <td><input name={name} className="input mini" defaultValue={val} inputMode="decimal" style={{ minWidth: w }} aria-label={name} /></td>;
  return (
    <tr>
      <td><b>{cityName}</b></td>
      <td colSpan={8} style={{ padding: 0 }}>
        <form action={action} style={{ display: 'contents' }}>
          <input type="hidden" name="id" value={rule.id} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
            {n('ex_showroom', rule.ex_showroom, 100)}{n('road_tax_pct', rule.road_tax_pct, 60)}{n('insurance', rule.insurance, 80)}{n('registration', rule.registration, 70)}
            {n('tcs_pct', rule.tcs_pct, 50)}{n('accessories', rule.accessories, 80)}
            <td><input name="valid_until" type="date" className="input mini" defaultValue={rule.valid_until} aria-label="valid_until" /></td>
            <td style={{ whiteSpace: 'nowrap' }}><button className="btn dark small" disabled={pending}>Save</button> <Saved state={state} /></td>
          </tr></tbody></table>
        </form>
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>{status === 'valid' ? <b>{total}</b> : <span className="badge warn">Expired</span>}</td>
    </tr>
  );
}

export function UsedRow({ car, role, band }) {
  const [state, action, pending] = useActionState(saveUsed, null);
  return (
    <tr>
      <td><b>{car.stock_id}</b><div className="small muted">{car.year} {car.model} {car.variant}</div></td>
      <td className="small">{car.km.toLocaleString('en-IN')} km<br />{car.fuel}</td>
      <td colSpan={5} style={{ padding: 0 }}>
        <form action={action} className="row" style={{ padding: '8px 12px', flexWrap: 'nowrap' }}>
          <input type="hidden" name="id" value={car.id} />
          <label className="small muted" style={{ minWidth: 150 }}>Price ₹
            <input name="price" className="input mini" defaultValue={car.price} inputMode="numeric" disabled={role !== 'used_manager'} title={role === 'used_manager' ? '' : 'Only the used-car manager sets prices'} />
          </label>
          <label className="small muted">Status
            <select name="status" className="input mini" defaultValue={car.status}><option value="available">Available</option><option value="booked">Reserved</option><option value="sold">Sold</option><option value="hidden">Hidden</option></select>
          </label>
          <label className="small muted" style={{ flex: 1, minWidth: 140 }}>Note<input name="notes" className="input mini" defaultValue={car.notes} maxLength={300} /></label>
          <button className="btn dark small" disabled={pending}>Save</button><Saved state={state} />
        </form>
      </td>
      <td style={{ minWidth: 190 }}>{band}</td>
    </tr>
  );
}

export function ModelForm({ model }) {
  const [state, action, pending] = useActionState(saveModel, null);
  return (
    <form action={action} className="panel stack" style={{ '--gap': '12px' }}>
      <input type="hidden" name="id" value={model.id} />
      <div className="spread"><h3>{model.name}</h3>
        <label className="check" style={{ alignItems: 'center' }}><input type="checkbox" name="published" defaultChecked={!!model.published} /> <span style={{ color: 'var(--ink)' }}>Published on website</span></label></div>
      <div className="field"><label htmlFor={`t${model.id}`}>Tagline (English)</label><input id={`t${model.id}`} name="tagline_en" className="input" defaultValue={model.tagline_en} maxLength={100} /></div>
      <div className="field"><label htmlFor={`a${model.id}`}>Description (English)</label><textarea id={`a${model.id}`} name="about_en" className="input" defaultValue={model.about_en} maxLength={600} /></div>
      <div className="row"><button className="btn dark small" disabled={pending}>Save</button><Saved state={state} /></div>
    </form>
  );
}
