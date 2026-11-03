/** Unit tiles and variant presets offered by the shared editor (labels are raw text, translated at render). */

import { msg } from '@/core/i18n';

export const RETAIL_UNITS = [
  { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'kg', label: msg('Kilo') }, { value: 'gram', label: msg('Gram') },
  { value: 'liter', label: msg('Litre') }, { value: 'ml', label: msg('ML') }, { value: 'packet', label: msg('Packet') },
  { value: 'bottle', label: msg('Botal') }, { value: 'dozen', label: msg('Darjan') }, { value: 'box', label: msg('Dabba') },
  { value: 'carton', label: msg('Carton') }, { value: 'bag', label: msg('Bori') }, { value: 'meter', label: msg('Meter') },
];

export const VARIANT_PRESETS = [
  { group: msg('Size'), values: [msg('Chhota'), msg('Darmiyana'), msg('Bara'), 'XL'] },
  { group: msg('Rang'), values: [msg('Kaala'), msg('Safed'), msg('Laal'), msg('Neela'), msg('Hara')] },
  { group: msg('Flavour'), values: [msg('Sada'), 'Chocolate', 'Strawberry', 'Mango'] },
];

/** Words industry configs use for "products"; listed so the list can translate them. */
export const PRODUCT_NOUNS: string[] = [
  msg('cheezein'), msg('cheez'), msg('item'), msg('product'), msg('maal'), msg('part'), msg('model'),
  msg('dawai'), msg('khilona'), msg('joota'), msg('zewar'), msg('kapra'),
];
