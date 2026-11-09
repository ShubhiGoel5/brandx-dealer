import Link from 'next/link';
import StaffShell from '@/components/StaffShell.jsx';
import SlaTimer from '@/components/SlaTimer.jsx';
import { requireUser } from '@/lib/auth.js';
import { db } from '@/lib/db.js';
import { listLeads, leadStats } from '@/lib/leads.js';
import { fmtDateTime, statusLabel } from '@/lib/format.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lead inbox', robots: { index: false } };

const TABS = [['open', 'Open'], ['new', 'New'], ['contacted', 'Contacted'], ['test_drive', 'Test drive'], ['negotiation', 'Negotiation'], ['won', 'Won'], ['lost', 'Lost'], ['', 'All']];
const STATUS_BADGE = { new: 'dark', contacted: '', test_drive: 'ok', negotiation: 'warn', won: 'ok', lost: 'bad' };

export default async function Inbox({ searchParams }) {
  const user = await requireUser(['consultant', 'admin']);
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : 'open';
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 40) : '';
  const scope = sp.scope === 'unassigned' ? 'unassigned' : '';
  const d = db();
  const now = new Date();
  const leads = listLeads(d, user, { status, q, scope });
  const stats = leadStats(d, user, now);
  const href = (over) => { const p = new URLSearchParams({ ...(status !== 'open' && { status }), ...(q && { q }), ...(scope && { scope }), ...over }); return `/staff/leads?${p}`; };

  return (
    <StaffShell current="leads" roles={['consultant', 'admin']}>
      <div className="stack" style={{ '--gap': '24px' }}>
        <div className="spread"><h1 style={{ fontSize: '1.9rem' }}>{user.role === 'admin' ? 'All leads' : 'My leads'}</h1>
          {user.role === 'admin' && <Link className="btn dark small" href="/staff/import">Import portal CSV</Link>}</div>

        <div className="tiles">
          <div className={`tile ${stats.overdue ? 'alert' : ''}`}><b>{stats.overdue}</b><span>Overdue — respond now</span></div>
          <div className="tile"><b>{stats.waiting}</b><span>Waiting inside 5-minute window</span></div>
          <div className="tile"><b>{stats.pctInTime == null ? '—' : `${stats.pctInTime}%`}</b><span>Answered within 5 min (target 90%)</span></div>
          {user.role === 'admin' && <div className={`tile ${stats.unassigned ? 'alert' : ''}`}><b>{stats.unassigned}</b><span>Unassigned (lead desk)</span></div>}
        </div>

        <div className="spread">
          <div className="tabs" role="tablist" aria-label="Status">
            {TABS.map(([k, label]) => <Link key={k} href={href({ status: k || 'all' })} className={`chip ${(status === k || (k === '' && status === 'all')) ? 'on' : ''}`}>{label}</Link>)}
            {user.role === 'admin' && <Link href={href({ scope: scope ? '' : 'unassigned' })} className={`chip ${scope ? 'on' : ''}`}>Unassigned</Link>}
          </div>
          <form method="get" className="row">
            {status !== 'open' && <input type="hidden" name="status" value={status} />}
            <input className="input" name="q" defaultValue={q} placeholder="Search name or phone" aria-label="Search" style={{ width: 220, minHeight: 40 }} />
          </form>
        </div>

        {leads.length === 0 ? (
          <div className="empty"><p><b>No leads here.</b></p><p className="small">{q ? 'Try a different search.' : 'New enquiries will appear the moment they arrive.'}</p></div>
        ) : (
          <div className="stack" style={{ '--gap': '10px' }}>
            {leads.map((l) => {
              const overdue = !l.first_response_at && new Date(l.sla_due_at) < now;
              const interest = l.stock_id ? `Used · ${l.stock_id}` : [l.model_name, l.variant_name].filter(Boolean).join(' ') || 'No car selected';
              return (
                <Link key={l.id} href={`/staff/leads/${l.id}`} className={`lead-row ${overdue ? 'overdue' : ''}`}>
                  <div><b>{l.name}</b><div className="small muted">{l.phone}{l.opted_out ? ' · opted out' : ''}</div></div>
                  <div><div>{interest}</div><div className="small muted">{l.source} · {fmtDateTime(l.created_at)}</div></div>
                  <div className="small">{l.consultant_name ?? <span className="badge bad">Unassigned</span>}<div className="muted">{l.showroom_name ?? l.city_name ?? ''}</div></div>
                  <div><span className={`badge ${STATUS_BADGE[l.status]}`}>{statusLabel(l.status)}</span></div>
                  <div className="timer-cell"><SlaTimer dueAt={l.sla_due_at} respondedAt={l.first_response_at} serverNow={now.toISOString()} /></div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </StaffShell>
  );
}
