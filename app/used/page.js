import Link from 'next/link';
import SiteShell from '@/components/SiteShell.jsx';
import { UsedCard } from '@/components/UsedCard.jsx';
import { listUsed, listModels } from '@/lib/queries.js';
import { getLang, makeT } from '@/lib/i18n.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Certified used cars', description: 'Inspected used Brand X cars in Lucknow with year, owners, kilometres, inspection report and price.', alternates: { canonical: '/used' } };

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : undefined; };

export default async function UsedList({ searchParams }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);
  const f = {
    model: typeof sp.model === 'string' ? sp.model : '',
    fuel: ['Petrol', 'Diesel'].includes(sp.fuel) ? sp.fuel : '',
    maxPrice: num(sp.maxPrice), maxKm: num(sp.maxKm),
  };
  const cars = listUsed(f);
  const active = !!(f.model || f.fuel || f.maxPrice || f.maxKm);
  return (
    <SiteShell current="used">
      <div className="container section" style={{ paddingTop: 40 }}>
        <div className="stack" style={{ '--gap': '8px', marginBottom: 28 }}>
          <h1>{t('used_cars')}</h1><p className="muted">{t('used_sub')}</p>
        </div>
        <form className="filters" method="get" aria-label={t('filter')}>
          <div className="field"><label htmlFor="f-model">{t('model')}</label>
            <select id="f-model" name="model" className="input" defaultValue={f.model}><option value="">{t('any')}</option>{listModels().map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}</select></div>
          <div className="field"><label htmlFor="f-fuel">{t('fuel')}</label>
            <select id="f-fuel" name="fuel" className="input" defaultValue={f.fuel}><option value="">{t('any')}</option><option>Petrol</option><option>Diesel</option></select></div>
          <div className="field"><label htmlFor="f-price">{t('max_price')}</label>
            <select id="f-price" name="maxPrice" className="input" defaultValue={f.maxPrice ?? ''}><option value="">{t('any')}</option>{[600000, 800000, 1000000, 1200000].map((p) => <option key={p} value={p}>₹{p / 100000} lakh</option>)}</select></div>
          <div className="field"><label htmlFor="f-km">{t('max_km')}</label>
            <select id="f-km" name="maxKm" className="input" defaultValue={f.maxKm ?? ''}><option value="">{t('any')}</option>{[30000, 50000, 70000].map((p) => <option key={p} value={p}>{p.toLocaleString('en-IN')} km</option>)}</select></div>
          <div className="row"><button className="btn dark">{t('filter')}</button>{active && <Link className="btn ghost" href="/used">{t('clear')}</Link>}</div>
        </form>
        <p className="muted small" style={{ margin: '20px 0' }} aria-live="polite">{t('results', { n: cars.length })}</p>
        {cars.length === 0
          ? <div className="empty"><p>{t('no_results')}</p><p style={{ marginTop: 12 }}><Link className="btn ghost" href="/used">{t('clear')}</Link></p></div>
          : <div className="grid">{cars.map((c) => <UsedCard key={c.id} car={c} t={t} />)}</div>}
      </div>
    </SiteShell>
  );
}
