/**
 * Gym product editor on the shared product editor: what the counter sells
 * besides memberships (supplements, drinks, gear) and pay-per-use services
 * such as a day pass, a locker month or a PT session. Memberships are sold
 * from Plans, not from here.
 */

import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { VARIANT_PRESETS } from '@modules/inventory/products/editor/units';
import type { CoreOptions, EditorConfig } from '@modules/inventory/products/editor/types';

const UNITS = [
  { value: 'pcs', label: 'Adad (pcs)' }, { value: 'bottle', label: 'Botal' }, { value: 'kg', label: 'Kilo' },
  { value: 'day-pass', label: 'Day pass' }, { value: 'visit', label: 'Ek visit' }, { value: 'month', label: 'Mahina' },
  { value: 'session', label: 'Session' }, { value: 'class', label: 'Class' }, { value: 'hour', label: 'Ghanta' },
];

const core: CoreOptions = { units: UNITS, skuPrefix: 'GYM', packs: true, variants: { presets: VARIANT_PRESETS }, batches: true };

const config: EditorConfig<Record<string, never>> = {
  label: 'Gym',
  draftKey: 'nafaa.product-editor.gym',
  paths: { list: '/products', detail: (id) => `/products/${id}`, create: '/products/new' },
  core,
  extra: { initial: {} },
  steps: [
    basicStep(core, { namePlaceholder: 'Whey protein 2 lb, Day pass, Locker mahina', categorySuggestions: ['Supplements', 'Drinks', 'Gear', 'Services'] }),
    priceStep(core),
    stockStep(core),
  ],
};

export default function GymProductEditor() {
  return <ProductEditorPage config={config} />;
}
