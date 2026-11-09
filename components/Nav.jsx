'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLanguage } from '@/app/actions/public.js';

export default function Nav({ links, current, langLabel, nextLang, menuLabel }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button className="menu-btn" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>{menuLabel}</button>
      <nav id="site-nav" className={`nav ${open ? 'open' : ''}`} aria-label="Main">
        {links.map((l) => (
          <Link key={l.key} href={l.href} onClick={() => setOpen(false)} aria-current={current === l.key ? 'page' : undefined}>{l.label}</Link>
        ))}
        <button className="lang" lang={nextLang} onClick={() => start(async () => { await setLanguage(nextLang); router.refresh(); })}>{langLabel}</button>
      </nav>
    </>
  );
}
