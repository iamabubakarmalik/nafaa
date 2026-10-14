/** Retail product editor: the shared steps with packs, variants and batches. */

import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { RETAIL_UNITS, VARIANT_PRESETS } from '@modules/inventory/products/editor/units';
import { Boxes } from 'lucide-react';
import type { CoreOptions, EditorConfig } from '@modules/inventory/products/editor/types';

const core: CoreOptions = { units: RETAIL_UNITS, skuPrefix: 'RTL', packs: true, variants: { presets: VARIANT_PRESETS }, batches: true };

const config: EditorConfig<Record<string, never>> = {
  label: 'Retail',
  draftKey: 'nafaa.product-editor.retail',
  paths: { list: '/products', detail: (id) => `/retail-products/${id}`, create: '/retail-products/new' },
  core,
  extra: { initial: {} },
  steps: [
    basicStep(core, { categorySuggestions: ['Grocery', 'Doodh / Dairy', 'Mashroobat', 'Snacks', 'Ghar ki safai', 'Personal care'] }),
    priceStep(core),
    stockStep(core),
  ],
  refresh: ['retail-products'],
  guide: [{ icon: Boxes, color: '#0891b2', title: 'Packing', text: 'Cheez darjan, dabba ya carton mein bhi bikti ho to Qeemat step mein Packing jorein — har packing ka apna rate aur barcode.' }],
};

export default function RetailProductEditor() {
  return <ProductEditorPage config={config} />;
}
