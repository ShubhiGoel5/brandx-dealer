import SiteShell from '@/components/SiteShell.jsx';

export const metadata = { title: 'Privacy notice', description: 'How Brand X Lucknow handles your personal data under the DPDP Act 2023.' };

export default function Privacy() {
  return (
    <SiteShell>
      <div className="container section stack" style={{ paddingTop: 48, maxWidth: 720, '--gap': '18px' }}>
        <h1 style={{ fontSize: '2.4rem' }}>Privacy notice</h1>
        <p className="muted">Demonstration notice. A production notice must be reviewed by the dealer’s legal counsel.</p>
        <h3>What we collect</h3>
        <p>Name, mobile number, optional email, the car you asked about, and anything you write in the message box. If you book a test drive, we also keep the time and showroom.</p>
        <h3>Why</h3>
        <p>Only to respond to your enquiry or booking, and to send confirmations about it. We do not sell your data or use it for unrelated marketing.</p>
        <h3>Your choices (DPDP Act 2023)</h3>
        <p>You consent with a tick-box before we store anything. Every message we send includes a way to opt out; opting out stops all messages to your number. You can ask us to correct or delete your data by contacting the showroom.</p>
        <h3>Who sees it</h3>
        <p>The consultant assigned to your enquiry and the dealership’s lead desk. Staff access is by individual sign-in and limited to the leads assigned to them.</p>
        <h3>Retention</h3>
        <p>Enquiries are kept for as long as needed to follow up, then deleted. (Assumption: 12 months; the client must confirm.)</p>
      </div>
    </SiteShell>
  );
}
