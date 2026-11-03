/**
 * Appearance layer validation.
 *
 * A layer is a partial set of appearance preferences. Only known keys with
 * allowed values are kept, so stored layers stay small and the web client can
 * trust what it reads. Mirrors apps/web/src/design-system/theme/appearance.ts.
 */

export type AppearanceLayer = Partial<{
  mode: 'light' | 'dark' | 'system';
  brandColor: string | null;
  canvasTone: 'soft' | 'white' | 'warm' | 'cool' | 'tinted';
  sidebarStyle: 'light' | 'dark' | 'brand';
  sidebarMode: 'auto' | 'expanded' | 'collapsed';
  latinFont: string;
  urduFont: string;
  textScale: 'sm' | 'md' | 'lg' | 'xl';
  density: 'comfortable' | 'compact';
  radius: 'sharp' | 'default' | 'round';
  pageWidth: 'normal' | 'wide' | 'full';
  reduceMotion: boolean;
  contrast: 'normal' | 'high';
  language: 'en' | 'roman_ur' | 'ur';
  heroStyle: 'modern' | 'simple' | 'soft' | 'dark' | 'aurora' | 'outline';
  heroPattern: 'dots' | 'grid' | 'lines' | 'none';
  heroSize: 'comfortable' | 'compact';
  heroStats: 'inline' | 'cards';
  // Mobile app only; the web ignores these.
  mobileTabBar: 'labels' | 'icons' | 'floating';
  /** Screen headers and the summary box on mobile: slim by default. */
  mobileHeader: 'compact' | 'standard' | 'large';
  mobileStartScreen: 'home' | 'pos';
  mobilePosGrid: 'list' | 'small' | 'medium' | 'large';
  mobileHomeWidgets: MobileHomeWidget[];
  mobileAnimations: boolean;
  mobileHaptics: boolean;
}>;

/** Home screen blocks in the mobile app, in the order they are shown. */
export const MOBILE_HOME_WIDGETS = [
  'sales-today', 'quick-actions', 'cash-register', 'low-stock', 'khata-due',
  'top-products', 'recent-sales', 'online-orders', 'ai-insights',
  // Dashboard and finance widgets (off until a user turns them on).
  'sales-trend', 'peak-hours', 'payment-mix', 'profit-loss', 'money-map', 'category-mix', 'staff-sales', 'weekday', 'top-customers', 'monthly', 'expenses-month', 'purchases', 'slow-movers', 'day-report', 'kpis',
] as const;
export type MobileHomeWidget = (typeof MOBILE_HOME_WIDGETS)[number];

/** Keys that only the mobile app reads. A save that leaves them out keeps the stored values. */
export const MOBILE_APPEARANCE_KEYS = [
  'mobileTabBar', 'mobileStartScreen', 'mobilePosGrid', 'mobileHomeWidgets', 'mobileAnimations', 'mobileHaptics', 'mobileHeader',
] as const;

const ENUMS: Record<string, readonly string[]> = {
  mode: ['light', 'dark', 'system'],
  canvasTone: ['soft', 'white', 'warm', 'cool', 'tinted'],
  sidebarStyle: ['light', 'dark', 'brand'],
  sidebarMode: ['auto', 'expanded', 'collapsed'],
  textScale: ['sm', 'md', 'lg', 'xl'],
  density: ['comfortable', 'compact'],
  radius: ['sharp', 'default', 'round'],
  pageWidth: ['normal', 'wide', 'full'],
  language: ['en', 'roman_ur', 'ur'],
  contrast: ['normal', 'high'],
  // Page header look (PageHero in the web app).
  heroStyle: ['modern', 'simple', 'soft', 'dark', 'aurora', 'outline'],
  heroPattern: ['dots', 'grid', 'lines', 'none'],
  heroSize: ['comfortable', 'compact'],
  heroStats: ['inline', 'cards'],
  mobileTabBar: ['labels', 'icons', 'floating'],
  mobileHeader: ['compact', 'standard', 'large'],
  mobileStartScreen: ['home', 'pos'],
  mobilePosGrid: ['list', 'small', 'medium', 'large'],
};

const BOOLEAN_KEYS = new Set(['reduceMotion', 'mobileAnimations', 'mobileHaptics']);

/** Built-in font ids, or "gf:<Family Name>" for any Google Font. */
const FONT_ID = /^([a-z0-9-]{2,32}|gf:[A-Za-z0-9 ]{2,40})$/;
const HEX = /^#[0-9a-f]{6}$/i;

/** Keeps valid fields only. `null` clears a field so the layer below shows through. */
export function sanitizeLayer(input: unknown): AppearanceLayer {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (ENUMS[key]) {
      if (typeof value === 'string' && ENUMS[key].includes(value)) out[key] = value;
    } else if (key === 'brandColor') {
      if (typeof value === 'string' && HEX.test(value)) out[key] = value.toLowerCase();
    } else if (key === 'latinFont' || key === 'urduFont') {
      if (typeof value === 'string' && FONT_ID.test(value)) out[key] = value;
    } else if (BOOLEAN_KEYS.has(key)) {
      if (typeof value === 'boolean') out[key] = value;
    } else if (key === 'mobileHomeWidgets') {
      if (Array.isArray(value)) {
        const known = value.filter((v): v is MobileHomeWidget => (MOBILE_HOME_WIDGETS as readonly unknown[]).includes(v));
        out[key] = [...new Set(known)];
      }
    }
  }
  return out as AppearanceLayer;
}

/**
 * Applies a save on top of the stored layer. Mobile-only keys missing from the
 * incoming layer are kept, so saving from the web (which does not know them)
 * never wipes what was chosen in the mobile app.
 */
export function mergeLayerForSave(stored: AppearanceLayer | null, incoming: unknown): AppearanceLayer {
  const next = sanitizeLayer(incoming) as Record<string, unknown>;
  const raw = incoming && typeof incoming === 'object' ? (incoming as Record<string, unknown>) : {};
  if (stored) {
    for (const key of MOBILE_APPEARANCE_KEYS) {
      if (!(key in raw) && stored[key] !== undefined) next[key] = stored[key];
    }
  }
  return next as AppearanceLayer;
}
