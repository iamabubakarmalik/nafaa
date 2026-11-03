import { useAppConfig } from './useAppConfig';

/**
 * Whether a mobile feature switch is on, e.g. useFeatureFlag('feature.offlineSales').
 * Unknown keys and a missing config count as on, so the app never loses a
 * feature because the settings could not load.
 */
export function useFeatureFlag(key: string): boolean {
  const { config } = useAppConfig();
  return config?.flags?.[key] ?? true;
}

/** All switches at once, for menus that filter many items. */
export function useFeatureFlags(): (key: string) => boolean {
  const { config } = useAppConfig();
  return (key) => config?.flags?.[key] ?? true;
}
