'use client';

/**
 * Consent banner entry points. The banner itself (ConsentBannerPanel) is a
 * separate chunk that loads only when third-party analytics is configured,
 * so sites without GTM or Clarity ship none of it.
 */
import dynamic from 'next/dynamic';
import { CONSENT_OPEN_EVENT } from '@/lib/analytics/consent';
import type { ConsentBannerProps } from './ConsentBannerPanel';

const Panel = dynamic(() => import('./ConsentBannerPanel'), { ssr: false });

export function ConsentBanner(props: ConsentBannerProps) {
  return props.enabled ? <Panel {...props} /> : null;
}

/** Footer link that reopens the banner. Rendered only when third-party analytics is configured. */
export function CookieSettingsButton({ className, label = 'Cookie settings' }: { className?: string; label?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>
      {label}
    </button>
  );
}
