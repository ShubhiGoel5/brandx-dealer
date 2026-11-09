'use client';
import { useMemo, useState } from 'react';
import { emi } from '@/lib/pricing.js';
import { inr } from '@/lib/format.js';

/** Indicative EMI on a given price. Down payment as % so it scales when the buyer switches variant. */
export default function EmiCalc({ price, labels: L }) {
  const [downPct, setDownPct] = useState(20);
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState(9.5);
  const down = Math.round((price * downPct) / 100);
  const loan = price - down;
  const monthly = useMemo(() => emi(loan, rate, months), [loan, rate, months]);
  return (
    <div className="stack" style={{ '--gap': '14px' }}>
      <div className="spread"><h3>{L.emi_title}</h3></div>
      <div>
        <div className="spread small"><label htmlFor="emi-down">{L.down_payment}</label><b>{inr(down)} ({downPct}%)</b></div>
        <input id="emi-down" className="range" type="range" min="0" max="60" step="5" value={downPct} onChange={(e) => setDownPct(+e.target.value)} />
      </div>
      <div>
        <div className="spread small"><label htmlFor="emi-ten">{L.tenure}</label><b>{months} {L.months}</b></div>
        <input id="emi-ten" className="range" type="range" min="12" max="84" step="12" value={months} onChange={(e) => setMonths(+e.target.value)} />
      </div>
      <div>
        <div className="spread small"><label htmlFor="emi-rate">{L.interest}</label><b>{rate.toFixed(1)}%</b></div>
        <input id="emi-rate" className="range" type="range" min="7" max="16" step="0.25" value={rate} onChange={(e) => setRate(+e.target.value)} />
      </div>
      <div className="notice" aria-live="polite">
        <div className="emi-out">{inr(monthly)} <span className="small muted" style={{ fontWeight: 400 }}>{L.emi_per_month}</span></div>
        <div className="small muted">{L.loan_amount}: {inr(loan)}</div>
      </div>
      <p className="small muted">{L.emi_note}</p>
    </div>
  );
}
