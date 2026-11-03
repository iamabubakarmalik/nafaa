/**
 * Cosmetics through the shared products list, editor and detail (web
 * CosmeticsProductsPage, CosmeticsProductWizardPage): brand under every name,
 * shades or sizes as variants, batches with expiry, retail and wholesale
 * price. Nothing outside the shared product is saved.
 */

import { CalendarClock, Palette, TestTube2 } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { SHADE_PRESETS, daysFrom, expiryText } from './meta';

type Extra = Record<string, never>;

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Piece') }, { value: 'ml', label: 'ml' }, { value: 'g', label: msg('Gram') }, { value: 'set', label: msg('Set') }, { value: 'box', label: msg('Box') }],
  skuPrefix: 'COS',
  packs: true,
  variants: { presets: SHADE_PRESETS },
  batches: true,
  markups: [20, 30, 40, 50],
};

const editor: EditorConfig<Extra> = {
  core,
  extra: { initial: {} },
  steps: [
    basicStep<Extra>(core, { namePlaceholder: msg('Jaise: Maybelline Fit Me Foundation 128') }),
    priceStep<Extra>(core),
    stockStep<Extra>(core, { quick: [6, 12, 24, 48] }),
  ],
};

registerInventoryIndustry({
  id: 'cosmetics',
  label: msg('Cosmetics'),
  list: {
    noun: 'product',
    filters: ['tags'],
    extras: (item) => {
      const d = daysFrom(item.expiry);
      return {
        line: item.brand?.name,
        ribbon: d != null && d < 0 ? { text: t('Expire ho gaya'), tone: 'danger' } : d != null && d <= 30 ? { text: expiryText(d), tone: 'warning' } : null,
        chips: [
          ...(item.counts.variants > 0 ? [t('{{variants}} shades', { variants: item.counts.variants })] : []),
          ...(item.expiringQty > 0 ? [t('{{expiringQty}} jaldi expire', { expiringQty: item.expiringQty })] : []),
        ],
      };
    },
    actions: [
      { icon: CalendarClock, label: msg('Expiry'), href: '/cosmetics/expiry' },
      { icon: TestTube2, label: msg('Testers'), href: '/cosmetics/testers' },
    ],
    stockChips: () => [1, 6, 12, 24],
    guide: [
      { icon: Palette, title: msg('Shade'), text: msg('Ek lipstick ke kai shade hon to har shade variant banayein — rang ka nishan aur stock alag.') },
      { icon: CalendarClock, title: msg('Expiry'), text: msg('Purchase par batch aur expiry likhein. Counter pehle purani expiry bechta hai; 30 din wale card par peela nishan aata hai.') },
      { icon: TestTube2, title: msg('Tester'), text: msg('Tester kholne par Testers screen se likhein — stock se nikalta hai aur nuksan report me aata hai.') },
    ],
  },
  editor,
  detail: { stockChips: [1, 6, 12, 24] },
});
