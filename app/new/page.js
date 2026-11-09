import Link from 'next/link';
import SiteShell from '@/components/SiteShell.jsx';
import CarImage from '@/components/CarImage.jsx';
import { listModels, fromPrices } from '@/lib/queries.js';
import { getLang, makeT } from '@/lib/i18n.js';
import { inrShort } from '@/lib/format.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New cars', description: 'Every Brand X model with on-road prices for Lucknow, Kanpur and Varanasi.', alternates: { canonical: '/new' } };

export default async function NewCars() {
  const lang = await getLang();
  const t = makeT(lang);
  const models = listModels();
  const prices = fromPrices();
  return (
    <SiteShell current="new">
      <div className="container section" style={{ paddingTop: 40 }}>
        <div className="stack" style={{ '--gap': '8px', marginBottom: 36 }}>
          <h1>{t('new_cars')}</h1>
          <p className="muted">{t('from')} · {t('from_price_note')}</p>
        </div>
        {models.length === 0 ? <div className="empty">{t('no_results')}</div> : (
          <div className="grid">
            {models.map((m) => (
              <Link key={m.id} href={`/new/${m.slug}`} className="card">
                <div className="art"><CarImage model={m} alt={m.name} sizes="(max-width: 700px) 100vw, 320px" /></div>
                <div className="body">
                  <h3>{m.name}</h3>
                  <p className="muted small">{lang === 'hi' ? m.tagline_hi : m.tagline_en}</p>
                  <div className="price">{prices[m.id] ? <><small>{t('from')} </small>{inrShort(prices[m.id].total)} <small>{t('on_road')}</small></> : <small>{t('price_missing')}</small>}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
