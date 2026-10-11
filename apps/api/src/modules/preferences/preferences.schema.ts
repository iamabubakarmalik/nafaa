/**
 * Per-user UI preferences that should follow the user across devices.
 * Each preference key has its own validator; unknown keys are rejected.
 */

const ID = /^[a-z0-9-]{2,48}$/;
const ids = (value: unknown, max: number) =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && ID.test(v)))].slice(0, max) : [];

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

export const PREFERENCE_VALIDATORS: Record<string, (input: unknown) => unknown> = {
  /** Dashboard widget order and hidden widgets. */
  dashboard: (input: unknown): DashboardLayout => {
    const v = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    return { order: ids(v.order, 60), hidden: ids(v.hidden, 60) };
  },
};

export const isPreferenceKey = (key: string) => Object.prototype.hasOwnProperty.call(PREFERENCE_VALIDATORS, key);
