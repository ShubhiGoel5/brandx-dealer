import Link from 'next/link';
import Image from 'next/image';
import SiteShell from '@/components/SiteShell.jsx';
import CarImage from '@/components/CarImage.jsx';
import { CountUp } from '@/components/Motion.jsx';
import { UsedCard } from '@/components/UsedCard.jsx';
import { listModels, fromPrices, listUsed, quotesForModel, variantsOf, DEFAULT_CITY } from '@/lib/queries.js';
import { getLang, makeT } from '@/lib/i18n.js';
import { inr, inrShort } from '@/lib/format.js';

export const dynamic = 'force-dynamic';

const rev = (i = 0) => ({ 'data-reveal': '', style: { '--d': `${i * 90}ms` } });

export default async function Home() {
  const lang = await getLang();
  const t = makeT(lang);
  const models = listModels();
  const prices = fromPrices();
  const used = listUsed().filter((u) => u.status === 'available').slice(0, 3);
  const hero = models[0];
  const banner = models.find((m) => m.photo && m.slug === 'model-e') ?? models[0];

  // Live example for the "no surprises" section: Model C VX in the default city, straight from the admin price table.
  const showModel = models.find((m) => m.slug === 'model-c');
  const showQuote = showModel ? Object.values(quotesForModel(showModel.id)).map((byCity) => byCity[DEFAULT_CITY]).find((q) => q?.status === 'valid') : null;
  const showVariant = showModel ? Object.entries(quotesForModel(showModel.id)).find(([, byCity]) => byCity[DEFAULT_CITY]?.status === 'valid') : null;

  return (
    <SiteShell hero>
      {/* ---- hero: full-bleed photo, slow zoom, staggered entrance ---- */}
      <section className="hero-x">
        {hero?.photo && <Image className="hero-x-img" src={hero.photo} alt="" fill priority sizes="100vw" />}
        <div className="hero-x-shade" aria-hidden />
        <div className="container hero-x-inner">
          <span className="eyebrow light hx" style={{ '--d': '100ms' }}>Brand X · Lucknow · Kanpur · Varanasi</span>
          <h1 className="hx" style={{ '--d': '220ms' }}>{t('hero_title')}</h1>
          <p className="lead hx" style={{ '--d': '380ms' }}>{t('hero_sub')}</p>
          <div className="row hx" style={{ '--d': '520ms', marginTop: 32 }}>
            <Link className="btn primary lg" href="/test-drive">{t('cta_drive')}<span aria-hidden className="arr">→</span></Link>
            <Link className="btn glass lg" href="/new">{t('cta_browse')}</Link>
          </div>
        </div>
        <a className="scroll-cue hx" style={{ '--d': '900ms' }} href="#range" aria-label={t('scroll')}><span>{t('scroll')}</span><i aria-hidden /></a>
      </section>

      {/* ---- proof strip ---- */}
      <section className="strip">
        <div className="container strip-in">
          {[['5', 5, t('stat1')], ['8', 8, t('stat2')], ['3', 3, t('stat3')]].map(([k, n, label], i) => (
            <div key={k} {...rev(i)}><b><CountUp to={n} /></b><span>{label}</span></div>
          ))}
        </div>
      </section>

      {/* ---- the range ---- */}
      <section id="range" className="container section">
        <div className="head" {...rev()}><span className="eyebrow">{t('featured')}</span><h2>{t('new_cars')}</h2><Link href="/new" className="more">{t('see_all')} →</Link></div>
        <div className="showcase">
          {models.map((m, i) => (
            <Link key={m.id} href={`/new/${m.slug}`} className="tile" {...rev(i % 2)}>
              <div className="tile-img"><CarImage model={m} alt={m.name} ratio="16 / 10" sizes="(max-width: 800px) 100vw, 600px" /></div>
              <div className="tile-body">
                <div><h3>{m.name}</h3><p className="muted">{lang === 'hi' ? m.tagline_hi : m.tagline_en}</p></div>
                <div className="tile-price">{prices[m.id] && <><small>{t('from')}</small><b>{inrShort(prices[m.id].total)}</b><small>{t('on_road')}</small></>}<span className="arr-circle" aria-hidden>→</span></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- no surprises: live breakup card ---- */}
      {showQuote && showVariant && (
        <section className="band">
          <div className="container band-in">
            <div className="stack" style={{ '--gap': '18px' }} {...rev()}>
              <span className="eyebrow">{t('onroad_kicker')}</span>
              <h2>{t('onroad_title')}</h2>
              <p className="muted" style={{ maxWidth: '46ch' }}>{t('onroad_desc')}</p>
              <p><Link className="btn dark" href={`/new/${showModel.slug}`}>{t('onroad_cta')}<span aria-hidden className="arr">→</span></Link></p>
            </div>
            <div className="quote" {...rev(1)}>
              <div className="quote-h"><b>{showModel.name} {variantsOf(showModel.id).find((v) => v.id === Number(showVariant[0]))?.name}</b><span className="muted small">{t('on_road')} · Lucknow</span></div>
              {showQuote.lines.map((l, i) => (
                <div key={l.key} className="quote-row" data-reveal style={{ '--d': `${260 + i * 110}ms` }}><span>{t(l.key)}{l.note && <i>{l.note}</i>}</span><b>{inr(l.amount)}</b></div>
              ))}
              <div className="quote-total" data-reveal style={{ '--d': `${300 + showQuote.lines.length * 110}ms` }}><span>{t('total_on_road')}</span><b><CountUp to={showQuote.total} format="inr" duration={1600} /></b></div>
              <p className="small muted" style={{ marginTop: 12 }}>{t('price_disclaimer')}</p>
            </div>
          </div>
        </section>
      )}

      {/* ---- certified used ---- */}
      <section className="container section">
        <div className="head" {...rev()}><span className="eyebrow">{t('ready_used')}</span><h2>{t('used_cars')}</h2><Link href="/used" className="more">{t('see_all')} →</Link></div>
        <p className="muted" style={{ margin: '-8px 0 32px', maxWidth: '56ch' }} {...rev()}>{t('used_sub')}</p>
        <div className="grid">{used.map((u, i) => <div key={u.id} {...rev(i)}><UsedCard car={u} t={t} /></div>)}</div>
      </section>

      {/* ---- closing banner ---- */}
      <section className="banner">
        {banner?.photo && <Image className="banner-img" src={banner.photo} alt="" fill sizes="100vw" data-parallax="0.12" />}
        <div className="banner-shade" aria-hidden />
        <div className="container banner-in" {...rev()}>
          <h2>{t('banner_title')}</h2>
          <p>{t('banner_sub')}</p>
          <p><Link className="btn primary lg" href="/test-drive">{t('cta_drive')}<span aria-hidden className="arr">→</span></Link></p>
        </div>
      </section>
    </SiteShell>
  );
}
