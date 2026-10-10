/**
 * Nafaa design system — public entry point.
 *
 * Import design values and theme utilities from here (`@/design-system`),
 * never from the individual files, so internals can move without touching
 * feature code. See README.md for how the pieces fit together.
 */

export * from './tokens/color';
export * from './tokens/presets';
export * from './tokens/typography';
export * from './tokens/layout';
export * from './industries/identities';
export * from './theme/appearance';
export { applyAppearance, themeVariables, isDarkMode, BOOT_CACHE_KEY, RTL_ENABLED } from './theme/apply';
export { useAppearanceStore, useAppearance } from './theme/store';
export { AppearanceProvider, AppearanceBridge } from './theme/AppearanceProvider';
