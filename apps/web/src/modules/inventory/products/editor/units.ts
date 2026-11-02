/** Unit tiles offered by the shared editor. */

import { t } from '@core/i18n';
export const RETAIL_UNITS = [
  { value: 'pcs', label: t('Adad (pcs)') }, { value: 'kg', label: t('Kilo') }, { value: 'gram', label: t('Gram') },
  { value: 'liter', label: t('Litre') }, { value: 'ml', label: t('ML') }, { value: 'packet', label: t('Packet') },
  { value: 'bottle', label: t('Botal') }, { value: 'dozen', label: t('Darjan') }, { value: 'box', label: t('Dabba') },
  { value: 'carton', label: t('Carton') }, { value: 'bag', label: t('Bori') }, { value: 'meter', label: t('Meter') },
];

export const VARIANT_PRESETS = [
  { group: t('Size'), values: ['Chhota', 'Darmiyana', 'Bara', 'XL'] },
  { group: t('Rang'), values: ['Kaala', 'Safed', 'Laal', 'Neela', 'Hara'] },
  { group: t('Flavour'), values: ['Sada', 'Chocolate', 'Strawberry', 'Mango'] },
];
