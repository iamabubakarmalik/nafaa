/**
 * A CMS CTA as a button-styled link. An href the API could not resolve (a
 * CTA keyword with no target in settings, an unpublished `entry:` link)
 * renders nothing (API-CONTRACT 11, "CTA keywords").
 *
 * Clicks are recorded by the Analytics island's delegated listener through
 * data-track (event `cta_click`, label `trackAs` or the button text).
 */
import { buttonClasses, type ButtonSize } from '@/components/ui/Button';
import type { Cta } from '@/lib/cms/contract/cms-contract';
import { linkKind } from '../lib/links';
import { SmartLink } from './SmartLink';
import styles from '../blocks.module.css';

export function CtaButton({
  cta,
  size = 'md',
  fallbackVariant = 'primary',
  onInk = false,
  area,
  className,
}: {
  cta: Cta | null | undefined;
  size?: ButtonSize;
  fallbackVariant?: 'primary' | 'secondary' | 'ghost';
  /** Inside an always-dark panel: primary becomes the white button. */
  onInk?: boolean;
  /** data-track-area for analytics location. */
  area?: string;
  className?: string;
}) {
  if (!cta || linkKind(cta.href) === 'none') return null;
  const variant = cta.variant ?? fallbackVariant;
  const resolved = onInk && variant === 'primary' ? 'on-ink' : variant;
  const arrow = variant === 'primary';
  return (
    <span data-track-area={area} className="contents">
      <SmartLink
        href={cta.href}
        track="cta_click"
        trackLabel={cta.trackAs ?? cta.label}
        className={buttonClasses({ variant: resolved, size, className })}
      >
        <span>{cta.label}</span>
        {arrow ? (
          <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`-mr-1 shrink-0 ${styles.arrow}`}>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        ) : null}
      </SmartLink>
    </span>
  );
}
