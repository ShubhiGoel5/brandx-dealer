'use client';
import { useActionState } from 'react';
import { login } from '@/app/actions/staff.js';

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="stack">
      <div className="field"><label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" defaultValue={state?.email} required /></div>
      <div className="field"><label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required /></div>
      {state?.error && <p className="notice bad" role="alert">{state.error}</p>}
      <button className="btn dark block" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
