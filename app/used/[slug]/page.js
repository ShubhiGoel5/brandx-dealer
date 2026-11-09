import { notFound } from 'next/navigation';
import SiteShell from '@/components/SiteShell.jsx';
import CarImage from '@/components/CarImage.jsx';
import EmiCalc from '@/components/EmiCalc.jsx';
import EnquiryForm from '@/components/EnquiryForm.jsx';
import { colourHex } from '@/components/UsedCard.jsx';
import { getUsedBySlug, carTitle } from '@/lib/queries.js';
import { getLang, makeT, pick, maskReg } from '@/lib/i18n.js';
import { FORM_KEYS, EMI_KEYS } from '@/lib/labels.js';
import { inr, km, fmtDate } from '@/lib/format.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const u = getUsedBySlug(slug);
  if (!u) return {};
  return {
    title: `${carTitle(u)} — certified used, ${km(u.km)}`,
    description: `${carTitle(u)}, ${u.fuel}, ${km(u.km)}, ${u.owners} owner(s). Priced at ${inr(u.price)} with a published inspection report.`,
    alternates: { canonical: `/used/${u.slug}` },
  };
}

const ownerLabel = (t, n) => (n === 1 ? t('owner_1') : n === 2 ? t('owner_2') : n === 3 ? t('owner_3') : t('owner_n', { n }));

export default async function UsedDetail({ params }) {
  const { slug } = await params;
  const car = getUsedBySlug(slug);
  if (!car) notFound();
  const lang = await getLang();
  const t = makeT(lang);
  const labels = pick(lang, [...FORM_KEYS, ...EMI_KEYS]);
  const reserved = car.status === 'booked';
  const sold = car.status === 'sold';
  const insp = car.inspection;

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Car', name: carTitle(car), brand: { '@type': 'Brand', name: 'Brand X' }, model: car.model,
    vehicleModelDate: String(car.year), fuelType: car.fuel, vehicleTransmission: car.transmission,
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: car.km, unitCode: 'KMT' }, itemCondition: 'https://schema.org/UsedCondition',
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: car.price, availability: car.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut' },
  };

  return (
    <SiteShell current="used">
      <div className="container" style={{ paddingTop: 32 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <div className="detail areas">
          <div className="d-stage stack" style={{ '--gap': '28px' }}>
            <div>
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="eyebrow">{car.stock_id}</span>
                {reserved && <span className="badge warn">{t('reserved')}</span>}
                {sold && <span className="badge bad">{t('sold')}</span>}
                {car.status === 'available' && <span className="badge ok">{t('available')}</span>}
              </div>
              <h1 style={{ fontSize: 'clamp(1.8rem,4.4vw,3rem)' }}>{carTitle(car)}</h1>
              <div className="facts" style={{ marginTop: 10 }}><span>{km(car.km)}</span><span>{car.fuel}</span><span>{car.transmission}</span><span>{ownerLabel(t, car.owners)}</span></div>
            </div>
            <div className="stage"><CarImage model={{ body: car.body, photo: car.model_photo, photo_fit: car.model_photo_fit }} colour={colourHex(car.colour)} alt={carTitle(car)} priority /></div>

          </div>
          <div className="d-specs stack" style={{ '--gap': '36px' }}>
            <section aria-labelledby="facts-h">
              <h2 id="facts-h" style={{ marginBottom: 12 }}>{t('specs')}</h2>
              <dl className="specs" style={{ margin: 0 }}>
                <div><dt>{t('year')}</dt><dd>{car.year}</dd></div>
                <div><dt>{t('km')}</dt><dd>{km(car.km)}</dd></div>
                <div><dt>{t('owners')}</dt><dd>{car.owners}</dd></div>
                <div><dt>{t('fuel')}</dt><dd>{car.fuel}</dd></div>
                <div><dt>{t('transmission')}</dt><dd>{car.transmission}</dd></div>
                <div><dt>{t('colour')}</dt><dd>{car.colour}</dd></div>
                <div><dt>{t('reg')}</dt><dd>{maskReg(car.reg_no)}</dd></div>
                <div><dt>{t('showroom')}</dt><dd>{car.location}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="insp-h">
              <div className="spread" style={{ marginBottom: 8 }}>
                <h2 id="insp-h">{t('inspection')}</h2>
                <span className="badge dark">{t('inspection_score')} {insp.score}/10</span>
              </div>
              <p className="small muted" style={{ marginBottom: 12 }}>{fmtDate(`${insp.inspectedOn}T00:00:00+05:30`, lang === 'hi' ? 'hi-IN' : 'en-IN')}</p>
              <div className="insp">
                <div><span>{t('accident_free')}</span><b>{insp.accidentFree ? '✓' : '✗'}</b></div>
                <div><span>{t('service')}</span><b>{insp.serviceHistory}</b></div>
                {insp.areas.map((a) => (
                  <div key={a.area}><span>{a.area}</span><span className={a.ok ? 'muted' : ''} style={a.ok ? undefined : { color: 'var(--warn)', fontWeight: 600 }}>{a.ok ? t('pass') : a.note}</span></div>
                ))}
              </div>
            </section>
          </div>

          <aside className="d-aside sticky stack" style={{ '--gap': '16px' }}>
            <div className="panel stack" style={{ '--gap': '16px' }}>
              <div><div className="small muted">Brand X Certified</div><div className="price-hero">{inr(car.price)}</div></div>
              {reserved && <p className="notice warn">{t('reserved_note')}</p>}
              {sold ? <p className="notice">{t('sold')}</p> : (
                <EnquiryForm labels={labels} lang={lang} hidden={{ used_car_id: car.id, city_id: 1 }}
                  submitLabel={reserved ? t('waitlist') : t('interested_used')} messageDefault="" />
              )}
            </div>
            {!sold && <div className="panel"><EmiCalc price={car.price} labels={labels} /></div>}
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
