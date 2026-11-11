/**
 * Partner portal entry for '@/design-system'.
 *
 * Same exports as apps/web/src/design-system/index.ts, minus the parts that
 * need the merchant app (AppearanceProvider and the /appearance API client).
 * Sub-paths such as '@/design-system/components' resolve to the web folder
 * directly. Mirrors apps/admin/src/design/ds-entry.ts.
 */

export * from '../../../web/src/design-system/tokens/color';
export * from '../../../web/src/design-system/tokens/presets';
export * from '../../../web/src/design-system/tokens/typography';
export * from '../../../web/src/design-system/tokens/layout';
export * from '../../../web/src/design-system/tokens/hero';
export * from '../../../web/src/design-system/industries/identities';
export * from '../../../web/src/design-system/theme/appearance';
export { applyAppearance, ensureFont, verifyFont, themeVariables, isDarkMode, BOOT_CACHE_KEY } from '../../../web/src/design-system/theme/apply';
export * from '../../../web/src/design-system/tokens/surfaces';
export { useAppearanceStore, useAppearance } from '../../../web/src/design-system/theme/store';
