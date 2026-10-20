/** What an industry can add to the shared products page. */

import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { FilterOption } from '@/design-system/components';
import type { CatalogFilters, CatalogItem, CatalogPage, CatalogSort } from './api';

export interface ProductExtras {
  /** Small badges over the picture (top right). */
  badges?: ReactNode;
  /** Chips under the name. */
  chips?: ReactNode;
  /** One muted line under the name, e.g. "Samsung · SM-A15". */
  line?: ReactNode;
  /** Replaces the stock ribbon under the picture when set. */
  ribbon?: { text: string; tone: 'red' | 'amber' | 'violet' } | null;
  /** Extra icon actions on the card and table row. */
  actions?: ReactNode;
}

export type IndustryFilter = 'tags' | 'kind' | 'condition' | 'etype' | 'serial';

export interface GuideStep { icon: LucideIcon; color: string; title: string; text: string }

export interface ProductsPageConfig {
  /** Business type shown in the header, e.g. "Bakery". */
  label: string;
  /** What one product is called here, e.g. "maal", "item". */
  noun?: string;
  paths: {
    detail: (id: string) => string;
    edit: (id: string) => string;
    create: string;
    bulkImport?: string;
  };
  /** Buttons added to the header (links to ingredients, serials, quick setup…). */
  HeroExtra?: ComponentType;
  /** Industry filters to show, in order. */
  filters?: IndustryFilter[];
  /** Labels for industry filter values; unknown values show as-is. */
  facetLabels?: Partial<Record<'condition' | 'etype' | 'kind', Record<string, string>>>;
  /** Extra sort options. */
  sorts?: Array<FilterOption<CatalogSort>>;
  /** Per-product additions for the card and the table row. */
  extras?: (item: CatalogItem, ctx: { costHidden: boolean; money: (n: number) => string }) => ProductExtras;
  /** Extra table columns, placed before Status. */
  columns?: Array<{ id: string; label: string; align?: 'right'; cell: (item: CatalogItem) => ReactNode }>;
  /** Industry warnings above the list. */
  Banners?: ComponentType<{ data: CatalogPage; setFilter: <K extends keyof CatalogFilters>(k: K, v: CatalogFilters[K]) => void }>;
  /** An extra tab next to Products and Analytics (bakery raw materials). */
  extraTab?: { id: string; label: string; icon: LucideIcon; Component: ComponentType };
  /** Called when a scanned code matches no product; return true if handled. */
  onScanMiss?: (code: string, navigate: (to: string) => void) => Promise<boolean>;
  /** Quick quantities in the stock dialog for this product. */
  stockChips?: (item: CatalogItem) => number[];
  /** Reason the stock dialog is closed for this product (stock comes from elsewhere, e.g. carpet rolls); null when open. */
  stockLocked?: (item: CatalogItem) => string | null;
  /** Steps added to the guide. */
  guide?: GuideStep[];
}
