/**
 * Industry configs for the shared products list, editor and detail. An
 * industry pack registers its config (usually from src/industries/<id>/inventory.ts)
 * with registerInventoryIndustry(); anything it leaves out falls back to the
 * general config. Industries are matched by identity id (useIndustry().id).
 */

import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { generalInventory, retailInventory } from './general';
import type { InventoryIndustryConfig } from './types';

const CONFIGS = new Map<string, InventoryIndustryConfig>([
  ['general', generalInventory],
  ['retail', retailInventory],
]);

/** Adds or replaces an industry's config. Call at module load of the industry pack. */
export function registerInventoryIndustry(config: InventoryIndustryConfig) {
  CONFIGS.set(config.id, config);
}

/** The config for an industry id, with every missing part taken from the general config. */
export function inventoryConfigFor(id: string | null | undefined): Required<Omit<InventoryIndustryConfig, 'routes'>> & Pick<InventoryIndustryConfig, 'routes'> {
  const own = (id && CONFIGS.get(id)) || generalInventory;
  return {
    id: own.id,
    label: own.label,
    list: own.list ?? generalInventory.list!,
    editor: own.editor ?? generalInventory.editor!,
    detail: own.detail ?? generalInventory.detail!,
    routes: own.routes,
  };
}

export function useInventoryConfig() {
  const { id } = useIndustry();
  return inventoryConfigFor(id);
}

/** Product routes for the current industry (shared screens unless the industry has its own). */
export function useProductRoutes() {
  const { routes } = useInventoryConfig();
  return {
    detail: routes?.detail ?? ((id: string) => `/products/${id}`),
    edit: routes?.edit ?? ((id: string) => `/products/${id}/edit`),
    create: routes?.create ?? '/products/new',
  };
}
