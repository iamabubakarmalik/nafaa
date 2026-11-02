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
import { t } from '@core/i18n';

const UNITS = [
  { value: 'pcs', label: t('Adad (pcs)') }, { value: 'bottle', label: t('Botal') }, { value: 'kg', label: t('Kilo') },
  { value: 'day-pass', label: t('Day pass') }, { value: 'visit', label: t('Ek visit') }, { value: 'month', label: t('Mahina') },
  { value: 'session', label: t('Session') }, { value: 'class', label: t('Class') }, { value: 'hour', label: t('Ghanta') },
];

const core: CoreOptions = { units: UNITS, skuPrefix: 'GYM', packs: true, variants: { presets: VARIANT_PRESETS }, batches: true };

const config: EditorConfig<Record<string, never>> = {
  label: t('Gym'),
  draftKey: 'nafaa.product-editor.gym',
  paths: { list: '/products', detail: (id) => `/products/${id}`, create: '/products/new' },
  core,
  extra: { initial: {} },
  steps: [
    basicStep(core, { namePlaceholder: t('Whey protein 2 lb, Day pass, Locker mahina'), categorySuggestions: ['Supplements', 'Drinks', 'Gear', 'Services'] }),
    priceStep(core),
    stockStep(core),
  ],
};

export default function GymProductEditor() {
  return <ProductEditorPage config={config} />;
}
