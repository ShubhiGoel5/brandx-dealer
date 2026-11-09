import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm.jsx';
import { getUser, HOME_FOR_ROLE } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Staff sign-in', robots: { index: false } };

export default async function Login() {
  const u = await getUser();
  if (u) redirect(HOME_FOR_ROLE[u.role] ?? '/staff/leads');
  return (
    <div className="login-wrap">
      <div className="panel stack" style={{ width: 'min(420px, 100%)', '--gap': '18px' }}>
        <div><div className="logo" style={{ marginBottom: 8 }}><i aria-hidden /> Brand X Staff</div><p className="muted small">Sales consultants, the lead desk and the used-car manager sign in here.</p></div>
        <LoginForm />
        <p className="small muted">Reviewing this project? Demo logins are in deployment.md.</p>
      </div>
    </div>
  );
}
