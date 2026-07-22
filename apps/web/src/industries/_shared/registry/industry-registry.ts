import type { IndustryPlugin } from '@industries/_shared/types/section.types';
import { carpetPlugin } from '@industries/carpet';
import { mobilePlugin } from '@industries/mobile';
import { standardPlugin } from '@industries/standard';

/**
 * Industry plugin registry.
 *
 * Order matters: first matching plugin wins. Always keep `standardPlugin` last
 * because it matches everything (fallback).
 *
 * To add a new industry:
 *   1. Create folder `src/features/industries/<name>/`
 *   2. Define sections under `<name>/sections/`
 *   3. Export an `IndustryPlugin` from `<name>/index.ts`
 *   4. Import and add it ABOVE `standardPlugin` here.
 */
export const INDUSTRY_PLUGINS: IndustryPlugin[] = [
  carpetPlugin,
  mobilePlugin,
  // pharmacyPlugin,  // ← future
  // clothingPlugin,  // ← future
  // restaurantPlugin,// ← future
  standardPlugin, // fallback — keep last
];

/**
 * Resolve the active plugin based on the current product context.
 */
export function resolveIndustryPlugin(ctx: {
  businessType: string;
  unit: string;
  features?: Record<string, any>;
}): IndustryPlugin {
  for (const plugin of INDUSTRY_PLUGINS) {
    if (plugin.matches(ctx)) return plugin;
  }
  return standardPlugin;
}
