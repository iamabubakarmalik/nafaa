/**
 * Parts and materials editor for a service business, on the shared product
 * editor. Parts leave stock when a job is billed or sold at the counter.
 * Labour and visit units stay available for items billed by time; rate-list
 * services themselves are edited in the Service Catalog.
 */

import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import type { CoreOptions, EditorConfig } from '@modules/inventory/products/editor/types';

const UNITS = [
  { value: 'pcs', label: 'Adad (pcs)' }, { value: 'meter', label: 'Meter' }, { value: 'feet', label: 'Feet' },
  { value: 'liter', label: 'Litre' }, { value: 'kg', label: 'Kilo' }, { value: 'service', label: 'Service call' },
  { value: 'visit', label: 'Visit' }, { value: 'job', label: 'Job' }, { value: 'hour', label: 'Ghanta' },
  { value: 'day', label: 'Din' }, { value: 'quarter-hour', label: '15 minute' }, { value: 'installation', label: 'Installation' }, { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' }, { value: 'contract', label: 'Contract / AMC' },
];

const core: CoreOptions = { units: UNITS, skuPrefix: 'PART', packs: true, variants: false, batches: false };

const config: EditorConfig<Record<string, never>> = {
  label: 'Parts aur saman',
  draftKey: 'nafaa.product-editor.services-biz',
  paths: { list: '/products', detail: (id) => `/products/${id}`, create: '/products/new' },
  core,
  extra: { initial: {} },
  steps: [
    basicStep(core, { namePlaceholder: 'Capacitor 35 MFD, Copper pipe, Gas R22', categorySuggestions: ['AC parts', 'Electric', 'Plumbing', 'Gas'] }),
    priceStep(core),
    stockStep(core),
  ],
};

export default function ServicesBizProductEditor() {
  return <ProductEditorPage config={config} />;
}
