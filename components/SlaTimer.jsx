'use client';
import { useEffect, useState } from 'react';

const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** Live response timer. `dueAt`/`respondedAt` are ISO strings; ticks every second only while unanswered. */
export default function SlaTimer({ dueAt, respondedAt, serverNow }) {
  const [offset] = useState(() => Date.now() - new Date(serverNow).getTime()); // tolerate client clock skew
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  useEffect(() => {
    if (respondedAt) return;
    const id = setInterval(() => setNow(Date.now() - offset), 1000);
    return () => clearInterval(id);
  }, [respondedAt, offset]);

  const due = new Date(dueAt).getTime();
  if (respondedAt) {
    const took = new Date(respondedAt).getTime() - (due - 5 * 60000);
    const late = new Date(respondedAt).getTime() > due;
    return <span className={`timer ${late ? 'late' : 'met'}`}>{late ? 'Late · ' : 'Met · '}{mmss(took)}</span>;
  }
  const left = due - now;
  return left >= 0
    ? <span className="timer due" role="timer" aria-label="Time left to respond">⏱ {mmss(left)} left</span>
    : <span className="timer breached" role="timer">Overdue {mmss(-left)}</span>;
}
