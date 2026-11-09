'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const useIsoLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FORMATS = { int: (n) => String(Math.round(n)), inr: (n) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}` };
const ease = (t) => 1 - Math.pow(1 - t, 4); // easeOutQuart

/** Mounted once in the layout: reveals [data-reveal] elements as they scroll into view, drives [data-parallax], and the header's scrolled state. */
export function MotionRoot() {
  const path = usePathname();
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-reveal]')];
    if (reduced() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((e) => { if (!e.classList.contains('in')) io.observe(e); });
    // safety net: anything already on screen must never stay hidden if the observer is slow or throttled
    const t = setTimeout(() => els.forEach((e) => { if (e.getBoundingClientRect().top < window.innerHeight) e.classList.add('in'); }), 1500);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [path]);

  useEffect(() => {
    const header = document.querySelector('.site-header');
    const par = [...document.querySelectorAll('[data-parallax]')];
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      header?.classList.toggle('scrolled', y > 24);
      if (!reduced()) for (const el of par) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) el.style.transform = `translate3d(0, ${(-r.top * Number(el.dataset.parallax || 0.15)).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [path]);
  return null;
}

/** Counts up from 0 when scrolled into view. Server renders the final value, so there is no layout shift and no-JS still shows the number. */
export function CountUp({ to, format = 'int', duration = 1400, className = '' }) {
  const ref = useRef(null);
  const [val, setVal] = useState(to);
  useIsoLayout(() => {
    if (reduced()) return;
    setVal(0);
    const el = ref.current; let raf;
    const run = () => {
      const t0 = performance.now();
      const step = (now) => { const p = Math.min(1, (now - t0) / duration); setVal(to * ease(p)); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { setVal(to); return; }
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  return <span ref={ref} className={className}>{FORMATS[format](val)}</span>;
}

/** Smoothly tweens between values when `value` changes (e.g. the on-road price after switching variant). */
export function Tween({ value, format = 'int', duration = 650 }) {
  const [val, setVal] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced() || from.current === value) { setVal(value); from.current = value; return; }
    const a = from.current, t0 = performance.now(); let raf;
    const step = (now) => { const p = Math.min(1, (now - t0) / duration); setVal(a + (value - a) * ease(p)); if (p < 1) raf = requestAnimationFrame(step); else from.current = value; };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, duration]);
  return <>{FORMATS[format](val)}</>;
}
