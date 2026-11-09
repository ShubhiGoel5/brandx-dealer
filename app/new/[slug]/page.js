import { notFound } from 'next/navigation';
import SiteShell from '@/components/SiteShell.jsx';
import Configurator from '@/components/Configurator.jsx';
import { getModelBySlug, variantsOf, quotesForModel, cities, DEFAULT_CITY } from '@/lib/queries.js';
import { getLang, pick, makeT } from '@/lib/i18n.js';
import { FORM_KEYS, PRICE_KEYS, EMI_KEYS } from '@/lib/labels.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const m = getModelBySlug(slug);
  if (!m) return {};
  return {
    title: `${m.name} — price, variants and on-road price in Lucknow`,
    description: `${m.name}: ${m.tagline_en} See variants, specifications and the on-road price breakup for your city, then book a test drive.`,
    alternates: { canonical: `/new/${m.slug}` },
  };
}

export default async function ModelPage({ params }) {
  const { slug } = await params;
  const model = getModelBySlug(slug);
  if (!model) notFound();
  const lang = await getLang();
  const t = makeT(lang);
  const variants = variantsOf(model.id);
  const quotes = quotesForModel(model.id);
  const labels = pick(lang, [...FORM_KEYS, ...PRICE_KEYS, ...EMI_KEYS]);

  const lowest = Object.values(quotes).flatMap((byCity) => Object.values(byCity)).filter((q) => q.status === 'valid').map((q) => q.lines[0].amount);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: `Brand X ${model.name}`, description: model.about_en, category: 'Car',
    brand: { '@type': 'Brand', name: 'Brand X' },
    ...(lowest.length ? { offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...lowest), offerCount: variants.length } } : {}),
  };

  return (
    <SiteShell current="new">
      <div className="container" style={{ paddingTop: 32 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <div className="stack hx" style={{ '--gap': '8px', marginBottom: 28 }}>
          <span className="eyebrow">{t('nav_new')}</span>
          <h1>{model.name}</h1>
          <p className="lead muted" style={{ fontSize: '1.2rem' }}>{lang === 'hi' ? model.tagline_hi : model.tagline_en}</p>
          <p style={{ maxWidth: '62ch' }}>{lang === 'hi' ? model.about_hi : model.about_en}</p>
        </div>
        <Configurator model={model} variants={variants} quotes={quotes} cities={cities()} defaultCityId={DEFAULT_CITY} labels={labels} lang={lang} />
      </div>
    </SiteShell>
  );
}
