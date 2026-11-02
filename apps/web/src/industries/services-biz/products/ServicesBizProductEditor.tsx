/**
 * Parts and materials editor for a service business, on the shared product
 * editor. Parts leave stock when a job is billed or sold at the counter.
 * Labour and visit units stay available for items billed by time; rate-list
 * services themselves are edited in the Service Catalog.
 */

import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import type { CoreOptions, EditorConfig } from '@modules/inventory/products/editor/types';
import { t } from '@core/i18n';

const UNITS = [
  { value: 'pcs', label: t('Adad (pcs)') }, { value: 'meter', label: t('Meter') }, { value: 'feet', label: t('Feet') },
  { value: 'liter', label: t('Litre') }, { value: 'kg', label: t('Kilo') }, { value: 'service', label: t('Service call') },
  { value: 'visit', label: t('Visit') }, { value: 'job', label: t('Job') }, { value: 'hour', label: t('Ghanta') },
  { value: 'day', label: t('Din') }, { value: 'quarter-hour', label: t('15 minute') }, { value: 'installation', label: t('Installation') }, { value: 'repair', label: t('Repair') },
  { value: 'inspection', label: t('Inspection') }, { value: 'contract', label: t('Contract / AMC') },
];

const core: CoreOptions = { units: UNITS, skuPrefix: 'PART', packs: true, variants: false, batches: false };

const config: EditorConfig<Record<string, never>> = {
  label: t('Parts aur saman'),
  draftKey: 'nafaa.product-editor.services-biz',
  paths: { list: '/products', detail: (id) => `/products/${id}`, create: '/products/new' },
  core,
  extra: { initial: {} },
  steps: [
    basicStep(core, { namePlaceholder: t('Capacitor 35 MFD, Copper pipe, Gas R22'), categorySuggestions: ['AC parts', 'Electric', 'Plumbing', 'Gas'] }),
    priceStep(core),
    stockStep(core),
  ],
};

export default function ServicesBizProductEditor() {
  return <ProductEditorPage config={config} />;
}
