/**
 * Page breadcrumbs from the entry's `breadcrumbs` (visible trail). Templates
 * render this under the header; the matching BreadcrumbList node comes from
 * buildEntryGraph, built from the same list.
 */
import type { Breadcrumb } from '@/lib/cms/contract/cms-contract';
import { breadcrumbItems } from '@/lib/seo/breadcrumbs';
import { Breadcrumbs as Trail } from '@/components/ui/Breadcrumbs';

function relative(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function PageBreadcrumbs({ crumbs, className, label }: { crumbs: readonly Breadcrumb[]; className?: string; label?: string }) {
  if (crumbs.length < 2) return null;
  // Site-relative links (with the locale prefix from `url`) so next/link prefetches.
  const items = breadcrumbItems(crumbs).map((item) => ({ ...item, href: item.href ? relative(item.href) : undefined }));
  // Urdu trails (links under /ur) get an Urdu name unless the caller passes one.
  const urdu = items.some((item) => item.href === '/ur' || item.href?.startsWith('/ur/'));
  return <Trail items={items} className={className} label={label ?? (urdu ? 'آپ یہاں ہیں' : undefined)} />;
}
