/**
 * Breadcrumbs: one source (the entry's `breadcrumbs`, Home first, the page
 * last) for both the visible trail and the BreadcrumbList node, so the two
 * always match.
 */
import type { BreadcrumbItem } from '@/components/ui/Breadcrumbs';
import type { Breadcrumb } from '@/lib/cms/contract/cms-contract';

/** Items for the visible trail. The last item (this page) has no link. */
export function breadcrumbItems(crumbs: readonly Breadcrumb[]): BreadcrumbItem[] {
  return crumbs.map((crumb, i) => ({
    label: crumb.name,
    href: i === crumbs.length - 1 ? undefined : crumb.url,
  }));
}

/** BreadcrumbList JSON-LD node. `pageUrl` ties it to the WebPage node. */
export function breadcrumbListNode(crumbs: readonly Breadcrumb[], pageUrl: string): Record<string, unknown> | null {
  if (crumbs.length < 2) return null;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
