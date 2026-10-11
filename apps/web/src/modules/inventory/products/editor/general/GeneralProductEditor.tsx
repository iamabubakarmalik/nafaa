/** Product editor for businesses without an industry-specific one. */

import { ProductEditorPage } from '../ProductEditorPage';
import { basicStep, priceStep, stockStep } from '../coreSteps';
import { RETAIL_UNITS, VARIANT_PRESETS } from '../units';
import type { CoreOptions, EditorConfig } from '../types';

const core: CoreOptions = { units: RETAIL_UNITS, skuPrefix: 'PROD', packs: true, variants: { presets: VARIANT_PRESETS }, batches: true };

const config: EditorConfig<Record<string, never>> = {
  label: 'Dukaan',
  draftKey: 'nafaa.product-editor.general',
  paths: { list: '/products', detail: (id) => `/products/${id}`, create: '/products/new' },
  core,
  extra: { initial: {} },
  steps: [basicStep(core), priceStep(core), stockStep(core)],
};

export default function GeneralProductEditor() {
  return <ProductEditorPage config={config} />;
}
