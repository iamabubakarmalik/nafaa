/**
 * One link for every CMS href (lib/links.ts rules): internal paths use
 * next/link without prefetch, external links stay in the same tab, and an
 * unresolved href renders its children as plain text.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { externalRel, linkKind } from '../lib/links';

export interface SmartLinkProps {
  href: string | null | undefined;
  className?: string;
  children: ReactNode;
  /** Analytics: TrackEvent name for the delegated click listener. */
  track?: string;
  trackLabel?: string;
  title?: string;
  'aria-label'?: string;
  prefetch?: boolean;
}

export function SmartLink({ href, className, children, track, trackLabel, title, prefetch = false, ...aria }: SmartLinkProps) {
  const kind = linkKind(href);
  const data = track ? { 'data-track': track, 'data-track-label': trackLabel } : {};
  if (kind === 'none' || !href) return <span className={className}>{children}</span>;
  if (kind === 'internal') {
    return (
      <Link href={href} prefetch={prefetch} className={className} title={title} {...data} {...aria}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} title={title} rel={kind === 'external' ? externalRel(href) : undefined} {...data} {...aria}>
      {children}
    </a>
  );
}
