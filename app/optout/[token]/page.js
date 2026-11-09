import SiteShell from '@/components/SiteShell.jsx';
import { db } from '@/lib/db.js';
import { getLang, makeT } from '@/lib/i18n.js';
import { optOut } from '@/app/actions/public.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Opt out of messages', robots: { index: false } };

export default async function OptOut({ params, searchParams }) {
  const { token } = await params;
  const sp = await searchParams;
  const t = makeT(await getLang());
  const exists = /^[a-f0-9]{24}$/.test(token) && db().prepare('SELECT 1 FROM leads WHERE opt_token = ?').get(token);
  return (
    <SiteShell>
      <div className="container section" style={{ paddingTop: 48, maxWidth: 600 }}>
        {!exists ? <div className="empty">{t('not_found')}</div> : sp.done ? (
          <div className="stack"><h1 style={{ fontSize: '2rem' }}>{t('optout_title')}</h1><p className="muted">{t('optout_body')}</p></div>
        ) : (
          <form action={optOut.bind(null, token)} className="stack">
            <h1 style={{ fontSize: '2rem' }}>{t('opt_out')}</h1><p className="muted">{t('optout_confirm')}</p>
            <button className="btn dark" style={{ width: 'fit-content' }}>{t('optout_btn')}</button>
          </form>
        )}
      </div>
    </SiteShell>
  );
}
