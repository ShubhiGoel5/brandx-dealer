import './globals.css';
import { getLang, makeT } from '@/lib/i18n.js';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Brand X Lucknow — new & certified used cars, test drives', template: '%s · Brand X Lucknow' },
  description: 'Real on-road prices by city, certified used cars with inspection reports, and test drives you can book online. Brand X is a fictional brand used for demonstration.',
  openGraph: { type: 'website', siteName: 'Brand X Lucknow' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export default async function RootLayout({ children }) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body>
        <a className="skip" href="#main">{makeT(lang)('go_home') && 'Skip to content'}</a>
        {children}
      </body>
    </html>
  );
}
