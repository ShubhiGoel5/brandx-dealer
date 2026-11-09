'use client';
import { useActionState, useState, useTransition } from 'react';
import { sendLeadReply, regenerateAi, changeStatus, handOver } from '@/app/actions/staff.js';
import { mentionsDiscount } from '@/lib/guard.js';

const STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['test_drive', 'Test drive'], ['negotiation', 'Negotiation'], ['won', 'Won'], ['lost', 'Lost']];

/** Status buttons + hand-over. Server re-checks access; the UI only reports the result. */
export function LeadControls({ leadId, status, assignedTo, consultants, canReassign }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState(null);
  const run = (fn) => start(async () => { const r = await fn(); setMsg(r.ok ? null : r.error); });
  return (
    <div className="stack" style={{ '--gap': '14px' }}>
      <div>
        <div className="label" style={{ marginBottom: 8 }}>Status</div>
        <div className="tabs" role="group" aria-label="Lead status">
          {STATUSES.map(([k, label]) => (
            <button key={k} className={`chip ${status === k ? 'on' : ''}`} aria-pressed={status === k} disabled={pending} onClick={() => run(() => changeStatus(leadId, k))}>{label}</button>
          ))}
        </div>
      </div>
      {canReassign && (
        <div className="field">
          <label htmlFor="handover">Hand over to</label>
          <select id="handover" className="input" value={assignedTo ?? ''} disabled={pending}
            onChange={(e) => e.target.value && run(() => handOver(leadId, e.target.value))}>
            <option value="">{assignedTo ? 'Select consultant' : 'Unassigned — pick one'}</option>
            {consultants.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.showroom}</option>)}
          </select>
        </div>
      )}
      {msg && <p className="notice bad" role="alert">{msg}</p>}
    </div>
  );
}

/** Editable AI draft. Nothing is sent without a click; discount language disables Send before the server even sees it. */
export function ReplyBox({ leadId, draft, optedOut }) {
  const [text, setText] = useState(draft);
  const [state, action, pending] = useActionState(sendLeadReply, null);
  const [regen, startRegen] = useTransition();
  const [edited, setEdited] = useState(false);
  const discount = mentionsDiscount(text);
  const sent = state?.ok;

  return (
    <form action={action} className="stack" style={{ '--gap': '10px' }}>
      <input type="hidden" name="leadId" value={leadId} />
      <div className="spread">
        <label className="label" htmlFor="reply">First reply — edit before sending</label>
        <button type="button" className="btn ghost small" disabled={regen} onClick={() => startRegen(async () => { await regenerateAi(leadId); location.reload(); })}>{regen ? 'Regenerating…' : '↻ Regenerate'}</button>
      </div>
      <textarea id="reply" name="body" className="input" rows={8} value={text} onChange={(e) => { setText(e.target.value); setEdited(true); }} maxLength={1500} aria-describedby="reply-help" />
      <p id="reply-help" className="small muted">Never quote discounts. On-road prices come only from the admin price table. {edited ? 'Edited by you.' : 'AI draft, not yet edited.'}</p>
      {discount && <p className="notice bad" role="alert">This mentions a discount or deal. Remove it — discounts are agreed in person.</p>}
      {optedOut && <p className="notice warn">This buyer opted out of messages. Call them instead.</p>}
      {state && !state.ok && <p className="notice bad" role="alert">{state.error}</p>}
      {sent && <p className="notice ok" role="status">Sent (mock WhatsApp). Timer stopped.</p>}
      <button className="btn primary" disabled={pending || discount || optedOut || text.trim().length < 2}>{pending ? 'Sending…' : 'Send on WhatsApp'}</button>
    </form>
  );
}
