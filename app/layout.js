import './globals.css';
import { getLang } from '@/lib/i18n.js';
import { MotionRoot } from '@/components/Motion.jsx';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

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
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* enables scroll-reveal styles before first paint; content stays visible if scripts never run */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('rv')" }} />
        <noscript><style>{'[data-reveal]{opacity:1!important;transform:none!important}'}</style></noscript>
      </head>
      <body>
        <MotionRoot />
        <a className="skip" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
