'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics/events';
export default function NotFound() {
  useEffect(() => {
    trackEvent('page_view', {
      page_type: '404',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      path: typeof window !== 'undefined' ? window.location.pathname : '',
    });
  }, []);

  const suggestions = [
    { href: '/', label: 'Home', desc: 'Nafaa homepage' },
    { href: '/pricing', label: 'Pricing', desc: 'Plans starting free' },
    { href: '/industries', label: 'Industries', desc: '32 business types' },
    { href: '/integrations', label: 'Integrations', desc: '30+ live integrations' },
    { href: '/blog', label: 'Blog', desc: 'Guides & insights' },
    { href: '/quiz', label: 'Take the quiz', desc: 'Find your perfect plan' },
    { href: '/roi-calculator', label: 'ROI Calculator', desc: 'See your savings' },
    { href: '/contact', label: 'Contact', desc: 'Talk to sales' },
  ];

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-2xl w-full text-center">
        <div className="font-mono text-sm text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-4">
          Error 404
        </div>
        <h1 className="font-display font-extrabold text-5xl md:text-6xl mb-4">
          Page not found
        </h1>
        <p className="text-lg text-ink-600 dark:text-ink-300 mb-10">
          This page moved or never existed. Try one of these popular destinations:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {suggestions.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl bg-ink-100 dark:bg-ink-800 hover:bg-brand-100 dark:hover:bg-brand-900/30 p-4 text-left transition"
            >
              <div className="font-bold text-sm">{s.label}</div>
              <div className="text-xs text-ink-600 dark:text-ink-400 mt-1">{s.desc}</div>
            </Link>
          ))}
        </div>
        <div className="text-sm text-ink-500">
          Still stuck? <Link href="/search" className="text-brand-600 font-bold hover:underline">Search the site</Link>
          {' · '}
          <a href="https://wa.me/923241772933" className="text-brand-600 font-bold hover:underline">WhatsApp support</a>
        </div>
      </div>
    </main>
  );
}
