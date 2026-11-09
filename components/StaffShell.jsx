import Link from 'next/link';
import { requireUser } from '@/lib/auth.js';
import { logout } from '@/app/actions/staff.js';

const ROLE_LABEL = { consultant: 'Sales consultant', used_manager: 'Used-car manager', admin: 'Lead desk / admin' };

/** Staff frame. Menu items depend on role; each page and action still enforces the role itself. */
export default async function StaffShell({ children, current, roles }) {
  const user = await requireUser(roles);
  const items = [];
  if (user.role !== 'used_manager') items.push(['leads', '/staff/leads', 'Leads']);
  if (user.role === 'admin') items.push(['import', '/staff/import', 'Import CSV'], ['prices', '/staff/admin/prices', 'Prices'], ['models', '/staff/admin/models', 'Models']);
  if (user.role !== 'consultant') items.push(['used', '/staff/admin/used', 'Used stock']);
  return (
    <>
      <div className="staff-bar">
        <div className="container inner">
          <Link href="/" style={{ color: '#fff', fontWeight: 700 }}>Brand X <span style={{ opacity: .6, fontWeight: 400 }}>Staff</span></Link>
          <nav className="row" style={{ gap: 18 }} aria-label="Staff">
            {items.map(([key, href, label]) => <Link key={key} href={href} aria-current={current === key ? 'page' : undefined}>{label}</Link>)}
          </nav>
          <span className="grow" />
          <span className="who" title={ROLE_LABEL[user.role]}>{user.name}</span>
          <form action={logout}><button>Sign out</button></form>
        </div>
      </div>
      <main className="staff-main"><div className="container">{children}</div></main>
    </>
  );
}
