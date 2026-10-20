/**
 * Cosmetics product editor on the shared product editor: brand, shades or
 * sizes as variants (with a colour swatch), batches with expiry, and retail
 * and wholesale price. Nothing outside the shared product is saved.
 */

import { CalendarClock, Palette } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import type { CoreOptions, EditorConfig } from '@modules/inventory/products/editor/types';
import { CATEGORY_SUGGESTIONS, SHADE_PRESETS } from '../lib/meta';

type Extra = Record<string, never>;

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Piece' }, { value: 'ml', label: 'ml' }, { value: 'g', label: 'Gram' }, { value: 'set', label: 'Set' }, { value: 'box', label: 'Box' }],
  skuPrefix: 'COS',
  packs: true,
  variants: { presets: SHADE_PRESETS },
  batches: true,
  markups: [20, 30, 40, 50],
};

const config: EditorConfig<Extra> = {
  label: 'Cosmetics',
  draftKey: 'nafaa.product-editor.cosmetics',
  paths: { list: '/products', detail: (id) => `/cosmetics-products/${id}`, create: '/cosmetics-products/new' },
  core,
  extra: { initial: {} },
  steps: [
    basicStep<Extra>(core, { namePlaceholder: 'Jaise: Maybelline Fit Me Foundation 128', categorySuggestions: CATEGORY_SUGGESTIONS }),
    priceStep<Extra>(core),
    stockStep<Extra>(core, { quick: [6, 12, 24, 48] }),
  ],
  guide: [
    { icon: Palette, color: '#db2777', title: 'Shade aur size', text: 'Stock step me shade (Nude, Red…) ya size (30 ml, 100 ml) variant banayein — har ek ka rang, rate aur stock alag.' },
    { icon: CalendarClock, color: '#e11d48', title: 'Expiry', text: '"Expiry wala maal" lagayein; batch aur expiry Purchase ke saath aate hain.' },
  ],
};

export default function CosmeticsProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
