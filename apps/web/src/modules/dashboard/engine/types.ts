/**
 * Dashboard engine contracts.
 *
 * One engine renders every industry's dashboard. An industry supplies a
 * `DashboardConfig`: its widgets in default order, the headline numbers it
 * offers, the header action and an optional guide. Users choose which
 * widgets and numbers to show, their order and width, and a daily target;
 * that layout is saved per user (see useDashboardLayout).
 */

import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Tone } from './parts';

/** Column span on wide screens: 12, 8, 6 or 4 of 12 columns. */
export type WidgetSize = 'full' | 'wide' | 'half' | 'third';

export interface WidgetDef {
  /** Stable id, saved in user layouts. Lowercase letters, digits and dashes. */
  id: string;
  /** Name shown in the Customize dialog. */
  title: string;
  description: string;
  size: WidgetSize;
  /** Widths the user may pick; defaults to just `size`. */
  sizes?: WidgetSize[];
  /** Shows cost or profit; hidden while cost is locked or not permitted. */
  sensitive?: boolean;
  /** Off by default; the user can turn it on. */
  defaultHidden?: boolean;
  Component: ComponentType;
}

/** What a headline number shows right now. */
export interface KpiValue {
  value: ReactNode;
  hint?: ReactNode;
  /** Percent change, shown as a green or red badge. */
  change?: number;
  /** Recent values for the sparkline, oldest first. */
  trend?: number[];
  to?: string;
  alert?: boolean;
  loading?: boolean;
}

export interface KpiDef {
  id: string;
  label: string;
  icon: LucideIcon;
  tone?: Tone;
  sensitive?: boolean;
  /** Hook returning the current value; called once per rendered card. */
  useValue: () => KpiValue;
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
  /** Headline numbers the user can pick from. */
  kpis: KpiDef[];
  /** Ids from `kpis` shown until the user picks their own. */
  defaultKpis: string[];
  /** Main header button, usually the POS. */
  primaryAction: { to: string; label: string; icon: LucideIcon };
  guide?: GuideItem[];
}

export interface DashboardLayout {
  order: string[];
  hidden: string[];
  sizes: Record<string, WidgetSize>;
  kpis: string[];
  target: number;
}
