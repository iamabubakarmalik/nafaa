/**
 * Dashboard engine contracts.
 *
 * One engine renders every industry's dashboard. An industry supplies a
 * `DashboardConfig`: its widgets in default order, the header action and an
 * optional guide. Users can hide and reorder widgets; that layout is saved
 * per user (see useDashboardLayout).
 */

import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Column span on wide screens: 12, 8, 6 or 4 of 12 columns. */
export type WidgetSize = 'full' | 'wide' | 'half' | 'third';

export interface WidgetDef {
  /** Stable id, saved in user layouts. Lowercase letters, digits and dashes. */
  id: string;
  /** Name shown in the Customize dialog. */
  title: string;
  description: string;
  size: WidgetSize;
  /** Shows cost or profit; hidden while cost is locked or not permitted. */
  sensitive?: boolean;
  /** Off by default; the user can turn it on. */
  defaultHidden?: boolean;
  Component: ComponentType;
}

export interface GuideItem {
  icon: LucideIcon;
  title: string;
  text: ReactNode;
}

export interface DashboardConfig {
  /** Shown in the header eyebrow, e.g. "Bakery". */
  label: string;
  widgets: WidgetDef[];
  /** Main header button, usually the POS. */
  primaryAction: { to: string; label: string; icon: LucideIcon };
  guide?: GuideItem[];
}

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}
