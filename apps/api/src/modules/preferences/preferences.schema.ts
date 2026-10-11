/**
 * Per-user UI preferences that should follow the user across devices.
 * Each preference key has its own validator; unknown keys are rejected.
 */

const ID = /^[a-z0-9-]{2,48}$/;
const ids = (value: unknown, max: number) =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && ID.test(v)))].slice(0, max) : [];

const SIZES = ['full', 'wide', 'half', 'third'] as const;
type WidgetSize = (typeof SIZES)[number];

export interface DashboardLayout {
  order: string[];
  hidden: string[];
  /** Widget id → chosen width. */
  sizes: Record<string, WidgetSize>;
  /** Headline numbers to show, in order; empty means the industry default. */
  kpis: string[];
  /** Daily sales target in rupees; 0 means none. */
  target: number;
}

const sizes = (value: unknown): Record<string, WidgetSize> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, WidgetSize> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 60)) {
    if (ID.test(k) && (SIZES as readonly unknown[]).includes(v)) out[k] = v as WidgetSize;
  }
  return out;
};

const amount = (value: unknown) => {
  const v = Number(value);
  return Number.isFinite(v) && v > 0 ? Math.min(Math.round(v), 1_000_000_000) : 0;
};

export const PREFERENCE_VALIDATORS: Record<string, (input: unknown) => unknown> = {
  /** Dashboard layout: widget order, visibility, widths, headline numbers and target. */
  dashboard: (input: unknown): DashboardLayout => {
    const v = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    return {
      order: ids(v.order, 60),
      hidden: ids(v.hidden, 60),
      sizes: sizes(v.sizes),
      kpis: ids(v.kpis, 12),
      target: amount(v.target),
    };
  },
};

export const isPreferenceKey = (key: string) => Object.prototype.hasOwnProperty.call(PREFERENCE_VALIDATORS, key);
