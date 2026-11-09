// Staff sign-in: bcrypt password check -> signed JWT in an httpOnly cookie. Roles: consultant | used_manager | admin.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db.js';

const COOKIE = 'bx_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set');
    return new TextEncoder().encode('dev-only-secret-not-for-production-use-0000');
  }
  return new TextEncoder().encode(s);
}

export async function createSession(user) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(String(user.id)).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE,
  });
}
export async function destroySession() { (await cookies()).delete(COOKIE); }

/** Current staff user (fresh from the DB so role changes apply immediately), or null. */
export async function getUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = db().prepare('SELECT id, name, email, role, showroom_id FROM users WHERE id = ?').get(Number(payload.sub));
    return u ?? null;
  } catch { return null; }
}

export const HOME_FOR_ROLE = { consultant: '/staff/leads', admin: '/staff/leads', used_manager: '/staff/admin/used' };

/** Page/action guard: signed-out users go to sign-in; a wrong role is sent to that role's own home (every home allows its role, so no loop). */
export async function requireUser(roles) {
  const u = await getUser();
  if (!u) redirect('/staff/login');
  if (roles && !roles.includes(u.role)) redirect(HOME_FOR_ROLE[u.role] ?? '/staff/login');
  return u;
}
