import Link from 'next/link';
import { notFound } from 'next/navigation';
import StaffShell from '@/components/StaffShell.jsx';
import SlaTimer from '@/components/SlaTimer.jsx';
import { LeadControls, ReplyBox } from '@/components/LeadWorkbench.jsx';
import { requireUser } from '@/lib/auth.js';
import { db } from '@/lib/db.js';
import { fmtDateTime, inr } from '@/lib/format.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lead', robots: { index: false } };

const INTENT = { hot: ['bad', 'Hot'], warm: ['warn', 'Warm'], cold: ['', 'Cold'] };
const CONF = { high: 'ok', medium: 'warn', low: 'bad' };

export default async function LeadPage({ params }) {
  const user = await requireUser(['consultant', 'admin']);
  const { id } = await params;
  const d = db();
  const lead = d.prepare(`SELECT l.*, m.name AS model_name, v.name AS variant_name, s.name AS showroom_name, c.name AS city_name, u.name AS consultant_name,
      uc.stock_id, uc.year AS uc_year, uc.variant AS uc_variant, um.name AS uc_model, uc.price AS uc_price, uc.slug AS uc_slug
    FROM leads l LEFT JOIN models m ON m.id = l.model_id LEFT JOIN variants v ON v.id = l.variant_id LEFT JOIN showrooms s ON s.id = l.showroom_id
    LEFT JOIN cities c ON c.id = l.city_id LEFT JOIN users u ON u.id = l.assigned_to LEFT JOIN used_cars uc ON uc.id = l.used_car_id
    LEFT JOIN models um ON um.id = uc.model_id WHERE l.id = ?`).get(Number(id));
  // 404 (not 403) for other people's leads: don't reveal that the id exists.
  if (!lead || (user.role === 'consultant' && lead.assigned_to !== user.id)) notFound();

  const ai = lead.ai ? JSON.parse(lead.ai) : null;
  const messages = d.prepare('SELECT msg.*, u.name AS by FROM messages msg LEFT JOIN users u ON u.id = msg.sent_by WHERE lead_id = ? ORDER BY msg.id').all(lead.id);
  const events = d.prepare('SELECT e.*, u.name AS by FROM lead_events e LEFT JOIN users u ON u.id = e.user_id WHERE lead_id = ? ORDER BY e.id DESC').all(lead.id);
  const td = d.prepare(`SELECT td.slot_start, td.status, dc.label, s.name AS showroom FROM test_drives td JOIN demo_cars dc ON dc.id = td.demo_car_id JOIN showrooms s ON s.id = dc.showroom_id WHERE td.lead_id = ? ORDER BY td.id DESC`).all(lead.id);
  const consultants = d.prepare("SELECT u.id, u.name, s.name AS showroom FROM users u LEFT JOIN showrooms s ON s.id = u.showroom_id WHERE u.role = 'consultant' ORDER BY u.name").all();
  const trade = lead.trade_in ? JSON.parse(lead.trade_in) : null;
  const now = new Date();
  const interest = lead.stock_id ? `${lead.uc_year} ${lead.uc_model} ${lead.uc_variant} (${lead.stock_id}) · ${inr(lead.uc_price)}` : [lead.model_name, lead.variant_name].filter(Boolean).join(' ') || 'Not specified';

  return (
    <StaffShell current="leads" roles={['consultant', 'admin']}>
      <div className="stack" style={{ '--gap': '24px' }}>
        <div className="spread">
          <div><Link href="/staff/leads" className="muted small">← All leads</Link>
            <h1 style={{ fontSize: '1.9rem', marginTop: 4 }}>{lead.name}</h1></div>
          <SlaTimer dueAt={lead.sla_due_at} respondedAt={lead.first_response_at} serverNow={now.toISOString()} />
        </div>

        <div className="cols">
          <div className="stack" style={{ '--gap': '20px' }}>
            <div className="panel stack" style={{ '--gap': '14px' }}>
              <dl className="specs" style={{ margin: 0 }}>
                <div><dt>Phone</dt><dd><a href={`tel:${lead.phone}`}>{lead.phone}</a></dd></div>
                <div><dt>Email</dt><dd>{lead.email ?? '—'}</dd></div>
                <div><dt>Interested in</dt><dd>{interest}</dd></div>
                <div><dt>City / showroom</dt><dd>{[lead.city_name, lead.showroom_name].filter(Boolean).join(' · ') || '—'}</dd></div>
                <div><dt>Source</dt><dd>{lead.source} · {fmtDateTime(lead.created_at)}</dd></div>
                <div><dt>Assigned to</dt><dd>{lead.consultant_name ?? 'Unassigned'}{lead.assign_rule && lead.assign_rule !== 'manual' ? <span className="small muted"> · auto ({lead.assign_rule})</span> : null}</dd></div>
                <div><dt>Consent</dt><dd className="small">{lead.consent_source} · {fmtDateTime(lead.consent_at)}{lead.opted_out ? <span className="badge bad" style={{ marginLeft: 6 }}>Opted out</span> : null}</dd></div>
                <div><dt>Language</dt><dd>{lead.lang === 'hi' ? 'Hindi' : 'English'}</dd></div>
              </dl>
              {lead.message && <div><div className="label">Their message</div><p className="notice" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{lead.message}</p></div>}
              {trade && <p className="notice">Trade-in: {[trade.make, trade.year, trade.km && `${trade.km.toLocaleString('en-IN')} km`].filter(Boolean).join(' · ')}</p>}
              {td.map((t) => <p key={t.slot_start} className={`notice ${t.status === 'cancelled' ? 'bad' : 'ok'}`}>Test drive {t.status === 'cancelled' ? '(cancelled) ' : ''}· {t.label} · {fmtDateTime(t.slot_start)} · {t.showroom}</p>)}
            </div>

            <div className="panel"><LeadControls leadId={lead.id} status={lead.status} assignedTo={lead.assigned_to} consultants={consultants} canReassign /></div>

            <div className="panel stack" style={{ '--gap': '12px' }}>
              <h3>Activity</h3>
              <ul className="timeline">
                {events.map((e) => <li key={e.id}><b>{e.type.replace(/_/g, ' ')}</b> {e.detail && `· ${e.detail}`}<div className="muted">{fmtDateTime(e.created_at)}{e.by ? ` · ${e.by}` : ''}</div></li>)}
              </ul>
            </div>
          </div>

          <div className="stack" style={{ '--gap': '20px' }}>
            <div className="ai-box stack" style={{ '--gap': '12px' }}>
              <div className="spread">
                <h3>AI summary</h3>
                {ai && <div className="row" style={{ gap: 6 }}>
                  <span className={`badge ${INTENT[ai.intent][0]}`}>{INTENT[ai.intent][1]} lead</span>
                  <span className={`badge ${CONF[ai.confidence]}`}>{ai.confidence} confidence</span>
                </div>}
              </div>
              {ai ? (
                <>
                  <p>{ai.summary}</p>
                  {ai.needs?.length > 0 && <ul className="ticks small">{ai.needs.map((n) => <li key={n}>{n}</li>)}</ul>}
                  {ai.questions?.length > 0 && <div><div className="label">Ask on the call</div><ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{ai.questions.map((q) => <li key={q}>{q}</li>)}</ul></div>}
                  {ai.flags?.map((f) => <p key={f} className="notice warn small">{f}</p>)}
                  <p className="small muted">Source: {ai.source === 'llm' ? 'Claude' : ai.source === 'rules' ? 'rule-based template' : 'Claude summary + safe template'} · AI can be wrong. You decide what to send.</p>
                </>
              ) : <p className="muted">Analysis is being prepared… refresh in a few seconds.</p>}
            </div>

            <div className="panel stack" style={{ '--gap': '14px' }}>
              <h3>Conversation</h3>
              {messages.length === 0 ? <p className="muted small">No messages yet.</p> : messages.map((m) => (
                <div key={m.id} className={`bubble ${m.kind === 'reply' ? 'out' : ''}`}>
                  {m.body}<div className="small muted" style={{ marginTop: 4 }}>{m.kind === 'ack' ? 'Auto-acknowledgement' : m.by ?? 'Staff'} · WhatsApp (mock) · {fmtDateTime(m.created_at)}</div>
                </div>
              ))}
              {ai && <ReplyBox key={ai.generated_at} leadId={lead.id} draft={ai.draft} optedOut={!!lead.opted_out} />}
            </div>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
