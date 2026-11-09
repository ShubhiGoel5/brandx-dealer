import Link from 'next/link';
import { getLang, makeT } from '@/lib/i18n.js';
import Nav from './Nav.jsx';

/** Public page frame: header, <main>, footer. */
export default async function SiteShell({ children, current, hero = false }) {
  const lang = await getLang();
  const t = makeT(lang);
  const links = [
    { href: '/new', label: t('nav_new'), key: 'new' },
    { href: '/used', label: t('nav_used'), key: 'used' },
    { href: '/test-drive', label: t('nav_drive'), key: 'drive' },
  ];
  return (
    <>
      <header className={`site-header ${hero ? 'over' : ''}`}>
        <div className="container inner">
          <Link href="/" className="logo" aria-label={t('brand')}><i aria-hidden /> Brand X <span className="muted" style={{ fontWeight: 400 }}>Lucknow</span></Link>
          <Nav links={links} current={current} langLabel={t('language')} nextLang={lang === 'hi' ? 'en' : 'hi'} menuLabel="Menu" />
        </div>
      </header>
      <main id="main" className="page">{children}</main>
      <footer className="footer">
        <div className="container spread">
          <div className="stack" style={{ '--gap': '6px' }}>
            <b className="foot-brand">Brand X Lucknow</b>
            <p className="small">{t('footer_note')}</p>
          </div>
          <div className="row small">
            <Link href="/privacy">{t('privacy')}</Link>
            <Link href="/staff/login">{t('staff_login')}</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
