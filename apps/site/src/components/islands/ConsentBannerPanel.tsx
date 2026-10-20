'use client';

/**
 * Consent banner for third-party analytics. It renders only when GTM or
 * Clarity is configured (settings `analytics`) and the visitor has not chosen
 * yet. The choice is stored per browser and announced to the Analytics island.
 * Nothing is server-rendered, so it never shifts the first paint. Loaded
 * on demand by ConsentBanner (only when consent is needed at all).
 */
import { useEffect, useState } from 'react';
import { CONSENT_OPEN_EVENT, readConsent, writeConsent, type ConsentChoice } from '@/lib/analytics/consent';

export interface ConsentBannerProps {
  enabled: boolean;
  /** Site path of the privacy policy, when it exists in the footer menus. */
  privacyHref?: string;
}

export default function ConsentBannerPanel({ enabled, privacyHref }: ConsentBannerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (readConsent() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, [enabled]);

  if (!enabled || !open) return null;

  const choose = (choice: ConsentChoice) => {
    writeConsent(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border border-line bg-surface p-4 text-small text-fg shadow-e3 sm:inset-x-6 sm:bottom-6"
    >
      <p className="text-fg-muted">
        We use analytics cookies to understand which pages help and to improve the site. You can say no and the site
        works the same.{' '}
        {privacyHref ? (
          <a href={privacyHref} className="text-link underline underline-offset-2">
            Privacy policy
          </a>
        ) : null}
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => choose('denied')}
          className="h-9 rounded-md border border-line-strong bg-surface px-3.5 font-medium text-fg-strong hover:bg-surface-2"
        >
          No thanks
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          className="h-9 rounded-md bg-brand-700 px-3.5 font-medium text-white hover:bg-brand-800"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
