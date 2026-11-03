/**
 * The user's dashboard layout, shared with the web dashboard through
 * GET/PUT /preferences/dashboard: widget order, hidden widgets, widths,
 * headline numbers and the daily sales target.
 *
 * The web and the app do not offer exactly the same widgets (industry
 * widgets, for one), so ids this device does not know are kept in place
 * whenever it saves. A widget missing from a saved order is placed after its
 * default neighbour, visible unless it is off by default.
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import type { StatusTone } from '@/design';

export type WidgetSize = 'full' | 'wide' | 'half' | 'third';
export const SIZE_ORDER: WidgetSize[] = ['third', 'half', 'wide', 'full'];

export interface DashboardLayout {
  order: string[];
  hidden: string[];
  sizes: Record<string, WidgetSize>;
  kpis: string[];
  target: number;
}

export const EMPTY_LAYOUT: DashboardLayout = { order: [], hidden: [], sizes: {}, kpis: [], target: 0 };

/** Small picture shown for a widget in the gallery. */
export type PreviewKind = 'hero' | 'numbers' | 'line' | 'bars' | 'donut' | 'list' | 'rows' | 'grid' | 'alert' | 'report' | 'ai' | 'industry';

export interface HomeWidget {
  /** Saved in layouts; same ids as the web widgets. Never rename one. */
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  preview: PreviewKind;
  size: WidgetSize;
  sizes?: WidgetSize[];
  /** Shows cost or profit; left out while cost is hidden. */
  sensitive?: boolean;
  defaultHidden?: boolean;
  Component: ComponentType;
}

export interface KpiValue {
  value: number | string;
  money?: boolean;
  /** Sale figures follow the eye; cost figures also follow cost.view. */
  kind?: 'sales' | 'cost' | 'plain';
  hint?: string;
  change?: number;
  trend?: number[];
  href?: string;
  alert?: boolean;
  loading?: boolean;
}

export interface KpiDef {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: StatusTone;
  sensitive?: boolean;
  useValue: () => KpiValue;
}

export interface ResolvedWidget {
  widget: HomeWidget;
  visible: boolean;
  size: WidgetSize;
}

export const normalize = (raw: Partial<DashboardLayout> | null | undefined): DashboardLayout => ({
  order: Array.isArray(raw?.order) ? raw.order : [],
  hidden: Array.isArray(raw?.hidden) ? raw.hidden : [],
  sizes: raw?.sizes && typeof raw.sizes === 'object' ? raw.sizes : {},
  kpis: Array.isArray(raw?.kpis) ? raw.kpis : [],
  target: Number(raw?.target) > 0 ? Math.round(Number(raw?.target)) : 0,
});

/** Every id in display order: the saved order (unknown ids too) plus widgets it lacks. */
export function fullOrder(widgets: HomeWidget[], layout: DashboardLayout): string[] {
  const out = [...new Set(layout.order)];
  const present = new Set(out);
  widgets.forEach((w, i) => {
    if (present.has(w.id)) return;
    let at = out.length;
    for (let j = i - 1; j >= 0; j--) {
      const idx = out.indexOf(widgets[j].id);
      if (idx >= 0) { at = idx + 1; break; }
    }
    out.splice(at, 0, w.id);
    present.add(w.id);
  });
  return out;
}

export function resolveWidgets(widgets: HomeWidget[], layout: DashboardLayout): ResolvedWidget[] {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const saved = new Set(layout.order);
  const hidden = new Set(layout.hidden);
  return fullOrder(widgets, layout)
    .filter((id) => byId.has(id))
    .map((id) => {
      const widget = byId.get(id)!;
      const chosen = layout.sizes[id];
      const allowed = widget.sizes ?? [widget.size];
      return {
        widget,
        visible: saved.has(id) ? !hidden.has(id) : !widget.defaultHidden,
        size: chosen && allowed.includes(chosen) ? chosen : widget.size,
      };
    });
}

/**
 * Writes a changed list of known widgets back into the layout. Ids this device
 * does not know keep their place, visibility and width.
 */
export function applyWidgets(widgets: HomeWidget[], layout: DashboardLayout, list: ResolvedWidget[]): DashboardLayout {
  const known = new Set(widgets.map((w) => w.id));
  const all = fullOrder(widgets, layout);
  const nextKnown = list.map((i) => i.widget.id);
  let k = 0;
  const order = all.map((id) => (known.has(id) ? nextKnown[k++] : id)).filter((id): id is string => !!id);
  const hidden = [
    ...layout.hidden.filter((id) => !known.has(id)),
    ...list.filter((i) => !i.visible).map((i) => i.widget.id),
  ];
  const sizes: Record<string, WidgetSize> = {};
  for (const [id, s] of Object.entries(layout.sizes)) if (!known.has(id)) sizes[id] = s;
  for (const i of list) if (i.size !== i.widget.size) sizes[i.widget.id] = i.size;
  return { ...layout, order, hidden, sizes };
}

export function resolveKpis(defs: KpiDef[], defaults: string[], layout: DashboardLayout): KpiDef[] {
  const byId = new Map(defs.map((k) => [k.id, k]));
  const chosen = layout.kpis.filter((id) => byId.has(id));
  return (chosen.length ? chosen : defaults).map((id) => byId.get(id)).filter((k): k is KpiDef => !!k);
}
