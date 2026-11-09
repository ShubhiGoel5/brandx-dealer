import { db } from '@/lib/db.js';

export const dynamic = 'force-dynamic';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

export default function sitemap() {
  const d = db();
  const models = d.prepare('SELECT slug FROM models WHERE published = 1').all();
  const used = d.prepare("SELECT slug, updated_at FROM used_cars WHERE status != 'hidden'").all();
  return [
    ...['', '/new', '/used', '/test-drive'].map((p) => ({ url: `${SITE}${p}` })),
    ...models.map((m) => ({ url: `${SITE}/new/${m.slug}` })),
    ...used.map((u) => ({ url: `${SITE}/used/${u.slug}`, lastModified: u.updated_at })),
  ];
}
