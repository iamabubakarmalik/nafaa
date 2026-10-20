/**
 * One menu link: internal paths use next/link, external URLs open in the
 * same tab with rel="noopener". Shows the status badge for beta and
 * coming-soon features. Menus hold dozens of links, so prefetching is off by
 * default (it would fetch every page's payload on each load on mobile data);
 * top-level header links opt back in.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { STATUS_LABEL, isExternalHref, type NavItem } from './nav';

export function StatusBadge({ status }: { status: NavItem['status'] }) {
  const label = status ? STATUS_LABEL[status] : null;
  if (!label) return null;
  return (
    <Badge tone={status === 'coming' ? 'warning' : 'info'} className="ml-1.5 !px-1.5 !py-0 text-[0.6875rem]">
      {label}
    </Badge>
  );
}

export function NavLink({
  item,
  className,
  children,
  onNavigate,
  prefetch = false,
}: {
  item: NavItem;
  className?: string;
  children?: ReactNode;
  onNavigate?: () => void;
  prefetch?: boolean;
}) {
  const content = children ?? item.label;
  if (isExternalHref(item)) {
    return (
      <a href={item.href} rel="noopener" className={className} onClick={onNavigate}>
        {content}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onNavigate} prefetch={prefetch ? undefined : false}>
      {content}
    </Link>
  );
}
