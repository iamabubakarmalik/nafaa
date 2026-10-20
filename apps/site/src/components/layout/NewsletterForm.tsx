'use client';

/**
 * Footer newsletter sign-up (island). Posts to the existing public endpoint
 * POST /public/marketing/newsletter/subscribe (SubscribeNewsletterDto), which
 * the marketing admin already manages. The API rejects unknown fields, so the
 * payload carries DTO fields only. A hidden honeypot stops simple bots.
 */
import { useId, useState, type FormEvent } from 'react';
import { track, utmParams } from '@/lib/analytics/track';
import { PUBLIC_API_URL } from '@/lib/cms/env';
import { cx } from '@/components/ui/cx';

type State = 'idle' | 'sending' | 'done' | 'error';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function NewsletterForm({ className }: { className?: string }) {
  const id = useId();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('company')) return;
    const email = String(form.get('email') ?? '').trim();
    if (!EMAIL.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setState('sending');
    try {
      const utm = utmParams();
      const res = await fetch(`${PUBLIC_API_URL}/public/marketing/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'site-footer',
          sourceUrl: window.location.href,
          sourcePage: window.location.pathname,
          ...(utm.utmSource ? { utmSource: utm.utmSource } : {}),
          ...(utm.utmMedium ? { utmMedium: utm.utmMedium } : {}),
          ...(utm.utmCampaign ? { utmCampaign: utm.utmCampaign } : {}),
          language: document.documentElement.lang || 'en',
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState('done');
    } catch {
      setState('error');
      setError('That did not go through. Please try again in a moment.');
    }
  }

  if (state === 'done') {
    return (
      <p role="status" className={cx('rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-small font-medium text-fg-strong', className)}>
        Shukriya! You are on the list. We write rarely and only when it is useful.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={className} aria-describedby={error ? `${id}-err` : undefined}>
      <label htmlFor={`${id}-email`} className="sr-only">
        Email address
      </label>
      <div className="flex gap-2 rounded-xl border border-line-strong bg-surface p-1.5 shadow-e1 focus-within:border-brand-500 ink:shadow-none">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@business.com"
          onInput={() => {
            if (!started) {
              setStarted(true);
              track('form_start', { form: 'newsletter' });
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-2.5 text-small text-fg-strong placeholder:text-fg-subtle focus:outline-none"
        />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="inline-flex h-9 shrink-0 items-center rounded-lg bg-brand-700 px-4 text-small font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Subscribe'}
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-xs text-rose-600 ink:text-rose-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
