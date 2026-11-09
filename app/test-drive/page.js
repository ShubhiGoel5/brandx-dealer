import SiteShell from '@/components/SiteShell.jsx';
import BookingFlow from '@/components/BookingFlow.jsx';
import { db } from '@/lib/db.js';
import { bookableDays } from '@/lib/slots.js';
import { getLang, makeT, pick } from '@/lib/i18n.js';
import { FORM_KEYS } from '@/lib/labels.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Book a test drive', description: 'Pick a showroom, a demo car and a time. Your test drive is confirmed instantly, no phone call needed.', alternates: { canonical: '/test-drive' } };

export default async function TestDrive({ searchParams }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = makeT(lang);
  const d = db();
  const now = new Date();
  const days = bookableDays(now);
  const cars = d.prepare(`SELECT dc.id, dc.label, dc.colour, s.name AS showroom, m.slug AS model_slug FROM demo_cars dc
      JOIN showrooms s ON s.id = dc.showroom_id JOIN variants v ON v.id = dc.variant_id JOIN models m ON m.id = v.model_id ORDER BY s.id, dc.id`).all();
  const taken = d.prepare("SELECT demo_car_id, slot_start FROM test_drives WHERE status = 'confirmed' AND slot_start >= ?").all(`${days[0]}T00:00:00+05:30`);
  const withTaken = cars.map((c) => ({ ...c, taken: taken.filter((x) => x.demo_car_id === c.id).map((x) => x.slot_start) }));
  const labels = pick(lang, [...FORM_KEYS, 'step_car', 'step_time', 'step_you', 'confirm_booking', 'no_slots', 'slot_taken', 'day_today', 'hours']);
  return (
    <SiteShell current="drive">
      <div className="container section" style={{ paddingTop: 40 }}>
        <div className="stack hx" style={{ '--gap': '8px', marginBottom: 36 }}><h1>{t('book_title')}</h1><p className="muted">{t('book_sub')}</p></div>
        <BookingFlow cars={withTaken} days={days} serverNow={now.toISOString()} preselect={typeof sp.model === 'string' ? sp.model : null} labels={labels} lang={lang} />
      </div>
    </SiteShell>
  );
}
