import Link from 'next/link';
import SiteShell from '@/components/SiteShell.jsx';
import CarImage from '@/components/CarImage.jsx';
import { UsedCard } from '@/components/UsedCard.jsx';
import { listModels, fromPrices, listUsed } from '@/lib/queries.js';
import { getLang, makeT } from '@/lib/i18n.js';
import { inrShort } from '@/lib/format.js';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const lang = await getLang();
  const t = makeT(lang);
  const models = listModels();
  const prices = fromPrices();
  const used = listUsed().filter((u) => u.status === 'available').slice(0, 3);
  const hero = models[0];
  return (
    <SiteShell>
      <section className="container hero">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">Brand X · Lucknow · Kanpur</span>
            <h1 style={{ marginTop: 14 }}>{t('hero_title')}</h1>
            <p className="lead">{t('hero_sub')}</p>
            <div className="row" style={{ marginTop: 28 }}>
              <Link className="btn primary" href="/test-drive">{t('cta_drive')}</Link>
              <Link className="btn ghost" href="/new">{t('cta_browse')}</Link>
            </div>
          </div>
          {hero && <div className="hero-art"><CarImage model={hero} alt={hero.name} priority sizes="(max-width: 900px) 100vw, 600px" /></div>}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 24 }}>
        <div className="spread" style={{ marginBottom: 28 }}><h2>{t('new_cars')}</h2><Link href="/new" className="muted">{t('see_all')} →</Link></div>
        <div className="grid">
          {models.map((m) => (
            <Link key={m.id} href={`/new/${m.slug}`} className="card">
              <div className="art"><CarImage model={m} alt={m.name} sizes="(max-width: 700px) 100vw, 320px" /></div>
              <div className="body">
                <h3>{m.name}</h3>
                <div className="price">{prices[m.id] && <><small>{t('from')} </small>{inrShort(prices[m.id].total)} <small>{t('on_road')}</small></>}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 24 }}>
        <div className="spread" style={{ marginBottom: 8 }}><h2>{t('used_cars')}</h2><Link href="/used" className="muted">{t('see_all')} →</Link></div>
        <p className="muted" style={{ marginBottom: 28 }}>{t('used_sub')}</p>
        <div className="grid">{used.map((u) => <UsedCard key={u.id} car={u} t={t} />)}</div>
      </section>

      <section className="container section" style={{ paddingTop: 24 }}>
        <h2 style={{ marginBottom: 32 }}>{t('why_title')}</h2>
        <div className="three">
          {[1, 2, 3].map((n) => (
            <div key={n} className="stack" style={{ '--gap': '8px', borderTop: '2px solid var(--ink)', paddingTop: 16 }}>
              <h3>{t(`why${n}_t`)}</h3><p className="muted">{t(`why${n}_d`)}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
