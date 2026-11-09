import StaffShell from '@/components/StaffShell.jsx';
import { PriceRow } from '@/components/AdminForms.jsx';
import { db } from '@/lib/db.js';
import { onRoadBreakup } from '@/lib/pricing.js';
import { inr } from '@/lib/format.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Price table', robots: { index: false } };

export default function Prices() {
  const d = db();
  const rows = d.prepare(`SELECT pr.*, c.name AS city, v.name AS variant, v.fuel, m.name AS model, m.sort FROM price_rules pr
    JOIN variants v ON v.id = pr.variant_id JOIN models m ON m.id = v.model_id JOIN cities c ON c.id = pr.city_id ORDER BY m.sort, v.sort, c.id`).all();
  const groups = [];
  for (const r of rows) {
    const key = `${r.model} ${r.variant}`;
    let g = groups.at(-1);
    if (!g || g.key !== key) groups.push(g = { key, fuel: r.fuel, rows: [] });
    g.rows.push(r);
  }
  const now = new Date();
  return (
    <StaffShell current="prices" roles={['admin']}>
      <div className="stack" style={{ '--gap': '20px' }}>
        <div><h1 style={{ fontSize: '1.9rem' }}>Price table</h1>
          <p className="muted">The only source of on-road prices on the website and in AI drafts. Rows past their “valid until” date stop showing a price to buyers automatically.</p></div>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 1020 }}>
            <thead><tr><th>City</th><th>Ex-showroom ₹</th><th>Road tax %</th><th>Insurance ₹</th><th>Reg. ₹</th><th>TCS %</th><th>Accessories ₹</th><th>Valid until</th><th /><th>On-road</th></tr></thead>
            {groups.map((g) => (
              <tbody key={g.key}>
                <tr><td colSpan={10} style={{ background: 'var(--surface)', fontWeight: 600 }}>{g.key} <span className="muted" style={{ fontWeight: 400 }}>· {g.fuel}</span></td></tr>
                {g.rows.map((r) => { const b = onRoadBreakup(r, now); return <PriceRow key={r.id} rule={r} cityName={r.city} status={b.status} total={b.status === 'valid' ? inr(b.total) : ''} />; })}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </StaffShell>
  );
}
