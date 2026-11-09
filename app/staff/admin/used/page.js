import StaffShell from '@/components/StaffShell.jsx';
import { UsedRow } from '@/components/AdminForms.jsx';
import { requireUser } from '@/lib/auth.js';
import { allUsedForAdmin, pastSales } from '@/lib/queries.js';
import { suggestUsedPrice } from '@/lib/usedprice.js';
import { inr } from '@/lib/format.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Used stock', robots: { index: false } };

export default async function UsedAdmin() {
  const user = await requireUser(['admin', 'used_manager']);
  const cars = allUsedForAdmin();
  const manager = user.role === 'used_manager';
  const sales = manager ? pastSales() : []; // the suggestion is computed and shown ONLY for the used-car manager
  return (
    <StaffShell current="used" roles={['admin', 'used_manager']}>
      <div className="stack" style={{ '--gap': '20px' }}>
        <div><h1 style={{ fontSize: '1.9rem' }}>Used stock</h1>
          <p className="muted">{manager ? 'You set every final price. The suggested band comes from past sales of the same model, year and kilometres. It is a hint, never applied automatically.' : 'You can change status and notes. Prices are set by the used-car manager.'}</p></div>
        <div className="scroll-x">
          <table className="data" style={{ minWidth: 980 }}>
            <thead><tr><th>Car</th><th>Usage</th><th colSpan={5}>Price · status · note</th><th>{manager ? 'Suggested band (past sales)' : ''}</th></tr></thead>
            <tbody>
              {cars.map((c) => {
                let band = null;
                if (manager) {
                  const s = suggestUsedPrice(c, sales);
                  band = s.ok
                    ? <div className="small"><b>{inr(s.low)} – {inr(s.high)}</b><div className="muted">mid {inr(s.mid)} · {s.n} sales · {s.confidence} confidence</div>
                      {c.price < s.low || c.price > s.high ? <span className="badge warn">Listed price outside band</span> : <span className="badge ok">Within band</span>}</div>
                    : <div className="small muted">No suggestion — {s.reason}</div>;
                }
                return <UsedRow key={c.id} car={c} role={user.role} band={band} />;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </StaffShell>
  );
}
