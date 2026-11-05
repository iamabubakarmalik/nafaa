'use client';

/**
 * Slim conversion bar at the bottom of the screen on phones, on the money
 * pages only (pricing, product, industry, solution, service and city pages):
 * "Start free trial" and WhatsApp, the two ways a shop owner starts.
 *
 * - Below the `sm` breakpoint only. From `sm` up the header shows its own
 *   "Get started" button, so the bar would repeat it.
 * - Rendered in the server HTML (usePathname works during SSR), fixed to the
 *   bottom, and the page gets matching bottom padding from CSS, so nothing
 *   shifts when it appears. No animation, so reduced motion needs no case.
 * - While it shows, the floating WhatsApp button steps aside on phones (it
 *   would cover the bar and repeat its WhatsApp link).
 * - English shell only: the Urdu layout does not mount it, as there are no
 *   Urdu strings for it yet.
 * Clicks are recorded by the Analytics island (sign-up links get their
 * attribution there; data-track-area "mobile_bar" marks the location).
 */
import { usePathname } from 'next/navigation';
import { buttonClasses } from '@/components/ui/Button';
import styles from './mobile-cta-bar.module.css';

/** First path segments of the pages that show the bar. */
const MONEY_ROOTS = new Set(['pricing', 'product', 'industries', 'solutions', 'services', 'pos-software']);

export function showsMobileCtaBar(pathname: string): boolean {
  return MONEY_ROOTS.has(pathname.split('/').filter(Boolean)[0] ?? '');
}

export interface MobileCtaBarProps {
  signupUrl?: string;
  whatsappHref?: string | null;
  labels: { region: string; trial: string; whatsapp: string; whatsappAria: string };
}

export function MobileCtaBar({ signupUrl, whatsappHref, labels }: MobileCtaBarProps) {
  const pathname = usePathname();
  if (!signupUrl || !showsMobileCtaBar(pathname)) return null;
  return (
    <div role="region" aria-label={labels.region} data-mobile-cta="" data-track-area="mobile_bar" className={styles.bar}>
      <a href={signupUrl} data-track-label="Mobile bar: Start free trial" className={buttonClasses({ variant: 'primary', size: 'md', className: 'min-w-0 flex-1' })}>
        {labels.trial}
      </a>
      {whatsappHref ? (
        <a
          href={whatsappHref}
          rel="noopener"
          data-track="whatsapp_click"
          data-track-label="Mobile bar: WhatsApp"
          aria-label={labels.whatsappAria}
          className={buttonClasses({ variant: 'secondary', size: 'md', className: 'shrink-0 gap-2' })}
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={styles.waIcon}>
            <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.5 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.1.82.83-3-.2-.31a8.2 8.2 0 1 1 6.97 3.82Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.43-.06-.12-.56-1.34-.76-1.83-.2-.48-.4-.42-.56-.42h-.48a.92.92 0 0 0-.66.31 2.8 2.8 0 0 0-.87 2.07 4.85 4.85 0 0 0 1.02 2.58 11.1 11.1 0 0 0 4.25 3.75c1.58.68 2.2.74 2.99.62.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
          </svg>
          {labels.whatsapp}
        </a>
      ) : null}
    </div>
  );
}
