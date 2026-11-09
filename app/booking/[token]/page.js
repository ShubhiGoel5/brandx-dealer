import { notFound } from 'next/navigation';
import SiteShell from '@/components/SiteShell.jsx';
import CarArt from '@/components/CarArt.jsx';
import { colourHex } from '@/components/UsedCard.jsx';
import { db } from '@/lib/db.js';
import { getBooking } from '@/lib/testdrive.js';
import { getLang, makeT } from '@/lib/i18n.js';
import { fmtDay, fmtTime } from '@/lib/format.js';
import { cancelDrive } from '@/app/actions/public.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your test drive', robots: { index: false } };

export default async function Booking({ params }) {
  const { token } = await params;
  const b = /^[a-f0-9]{20}$/.test(token) ? getBooking(db(), token) : null;
  if (!b) notFound();
  const lang = await getLang();
  const t = makeT(lang);
  const loc = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const cancelled = b.status === 'cancelled';
  return (
    <SiteShell current="drive">
      <div className="container section" style={{ paddingTop: 40, maxWidth: 760 }}>
        <div className="stack" style={{ '--gap': '8px', marginBottom: 28 }}>
          <span className={`badge ${cancelled ? 'bad' : 'ok'}`} style={{ width: 'fit-content' }}>{cancelled ? t('cancelled') : '✓'}</span>
          <h1 style={{ fontSize: 'clamp(1.9rem,5vw,3rem)' }}>{cancelled ? t('cancelled') : t('booked_title')}</h1>
          {!cancelled && <p className="muted">{t('booked_sub')}</p>}
        </div>
        <div className="panel stack" style={{ '--gap': '18px' }}>
          <CarArt body={b.body} colour={colourHex(b.colour)} label={b.car_label} />
          <div className="specs">
            <div><dt>{b.model}</dt><dd>{b.variant}</dd></div>
            <div><dt>{t('when')}</dt><dd>{fmtDay(b.slot_start, loc)}, {fmtTime(b.slot_start, loc)}</dd></div>
            <div><dt>{t('showroom')}</dt><dd>{b.showroom}</dd></div>
            <div><dt>&nbsp;</dt><dd className="small" style={{ fontWeight: 400 }}>{b.address}</dd></div>
            {b.consultant && <div><dt>{t('your_consultant')}</dt><dd>{b.consultant}</dd></div>}
            <div><dt>{t('name')}</dt><dd>{b.name}</dd></div>
          </div>
          {!cancelled && <p className="notice">{t('add_cal')}</p>}
          {!cancelled && (
            <form action={cancelDrive.bind(null, token)}><button className="btn ghost small">{t('cancel_drive')}</button></form>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
