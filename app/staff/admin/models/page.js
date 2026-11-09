import StaffShell from '@/components/StaffShell.jsx';
import { ModelForm } from '@/components/AdminForms.jsx';
import { listModels } from '@/lib/queries.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Models', robots: { index: false } };

export default function Models() {
  return (
    <StaffShell current="models" roles={['admin']}>
      <div className="stack" style={{ '--gap': '20px', maxWidth: 760 }}>
        <div><h1 style={{ fontSize: '1.9rem' }}>Models</h1><p className="muted">Unpublish a model to remove it from the site and sitemap. Hindi text and variants are managed in the seed data for now.</p></div>
        {listModels({ includeUnpublished: true }).map((m) => <ModelForm key={m.id} model={m} />)}
      </div>
    </StaffShell>
  );
}
