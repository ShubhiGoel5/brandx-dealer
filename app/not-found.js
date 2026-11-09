import Link from 'next/link';
import SiteShell from '@/components/SiteShell.jsx';
import { getLang, makeT } from '@/lib/i18n.js';

export default async function NotFound() {
  const t = makeT(await getLang());
  return (
    <SiteShell>
      <div className="container section stack" style={{ textAlign: 'center', paddingTop: 80 }}>
        <span className="eyebrow">404</span><h1 style={{ fontSize: '2.4rem' }}>{t('not_found')}</h1>
        <p><Link className="btn primary" href="/">{t('go_home')}</Link></p>
      </div>
    </SiteShell>
  );
}
