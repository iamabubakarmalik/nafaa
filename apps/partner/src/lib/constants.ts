/** Fixed values used across the partner portal. */

export const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.nafaa.pk';
export const SUPPORT_WHATSAPP = '923241772933';
export const SUPPORT_PHONE_TEXT = '0324 1772933';
export const SUPPORT_EMAIL = 'support@nafaa.pk';

export const referralLink = (code: string) => `${APP_URL}/register?ref=${encodeURIComponent(code)}`;

export const SHOP_CATEGORIES = [
  'Grocery', 'Pharmacy', 'Bakery', 'Restaurant', 'Garments', 'Mobile', 'Hardware', 'Cosmetics', 'General store', 'Other',
] as const;
