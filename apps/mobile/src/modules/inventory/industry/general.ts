/**
 * Config for businesses without an industry and for Retail / Grocery (the
 * shared screens with packs, variants and batches). Other industries start
 * from these and add their own parts.
 */

import { Boxes, Sparkles } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { basicStep, priceStep, stockStep } from '../screens/editor/coreSteps';
import type { CoreOptions, InventoryIndustryConfig } from './types';
import { RETAIL_UNITS, VARIANT_PRESETS } from './presets';

export const GENERAL_CORE: CoreOptions = { units: RETAIL_UNITS, skuPrefix: 'PROD', packs: true, variants: { presets: VARIANT_PRESETS }, batches: true };

export const generalInventory: InventoryIndustryConfig = {
  id: 'general',
  label: msg('Dukaan'),
  list: { filters: ['tags'] },
  editor: { core: GENERAL_CORE, extra: { initial: {} }, steps: [basicStep(GENERAL_CORE), priceStep(GENERAL_CORE), stockStep(GENERAL_CORE)] },
  detail: {},
};

const RETAIL_CORE: CoreOptions = { ...GENERAL_CORE, skuPrefix: 'RTL' };

export const retailInventory: InventoryIndustryConfig = {
  id: 'retail',
  label: msg('Retail'),
  list: {
    filters: ['tags'],
    actions: [{ icon: Sparkles, label: msg('Quick Setup'), href: '/products/quick-setup', permission: 'products.create' }],
    guide: [
      { icon: Sparkles, title: msg('Quick Setup'), text: msg('2000+ aam cheezein (atta, cheeni, sabun…) tayyar hain — chunein aur rate daal dein.') },
      { icon: Boxes, title: msg('Packing'), text: msg('Cheez darjan, dabba ya carton mein bhi bikti ho to Qeemat step mein Packing jorein — har packing ka apna rate aur barcode.') },
    ],
  },
  editor: { core: RETAIL_CORE, extra: { initial: {} }, steps: [basicStep(RETAIL_CORE, { namePlaceholder: msg('Jaise: Tapal Danedar 95g') }), priceStep(RETAIL_CORE), stockStep(RETAIL_CORE)] },
  detail: {},
};
