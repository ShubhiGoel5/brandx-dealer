import StaffShell from '@/components/StaffShell.jsx';
import { ImportForm } from '@/components/AdminForms.jsx';

export const metadata = { title: 'Import portal leads', robots: { index: false } };

export default function ImportPage() {
  return (
    <StaffShell current="import" roles={['admin']}>
      <div className="stack" style={{ '--gap': '20px', maxWidth: 760 }}>
        <h1 style={{ fontSize: '1.9rem' }}>Import portal leads</h1>
        <p className="muted">Upload the CSV exported from a car portal (CarDekho, CarWale…). Each row is validated, de-duplicated against open leads (same phone and car, last 7 days), then auto-assigned by showroom and model. Bad rows are listed, never silently dropped.</p>
        <p className="small"><a href="/sample-portal-leads.csv" download style={{ textDecoration: 'underline' }}>Download a sample file</a> · columns: name, phone, email, source, model, city, message</p>
        <div className="panel"><ImportForm /></div>
      </div>
    </StaffShell>
  );
}
