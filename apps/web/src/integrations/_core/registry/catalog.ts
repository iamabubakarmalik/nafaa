import type { AvailableIntegration } from '../types/integration.types';

/**
 * Frontend fallback catalog.
 * Backend /integrations/available is source of truth — ye sirf
 * offline/loading state aur extra UI metadata (setupSteps, portalUrl) ke liye hai.
 */
export const INTEGRATION_CATALOG: Record<string, Partial<AvailableIntegration>> = {
  CUSTOM_WEBSITE: {
    icon: '🌐', color: '#10b981', popular: true,
    portalUrl: '',
    setupSteps: [
      'Connect karein — API Key + Webhook URL milega',
      'Apni website ke checkout code mein webhook URL add karein',
      'Order place hote hi POS mein aa jayega',
      'Products bhi GET API se pull kar sakte hain',
    ],
  },
  FOODPANDA: {
    icon: '🍔', color: '#e21b70', popular: true,
    portalUrl: 'https://partner.foodpanda.com/',
    setupSteps: [
      'partner.foodpanda.com pe login karein',
      'Settings → API Integration → Request Access',
      '2-3 din mein Client ID / Secret / Vendor ID milega',
      'Yahan enter karke Connect karein',
    ],
  },
  DARAZ: {
    icon: '🛒', color: '#f57224', popular: true,
    portalUrl: 'https://open.lazada.com/',
    setupSteps: [
      'open.lazada.com pe developer account banayein',
      'Create App → naam "Nafaa POS"',
      'App Key + App Secret copy karein',
      'Connect ke baad "Authorize" button dabayein',
    ],
  },
  SHOPIFY: {
    icon: '🛍️', color: '#95bf47',
    portalUrl: 'https://partners.shopify.com/',
    setupSteps: [
      'Shopify Admin → Settings → Apps → Develop apps',
      'Create app → Admin API access token generate karein',
      'Shop domain + token yahan enter karein',
    ],
  },
  TCS_COURIER: {
    icon: '📦', color: '#003a70',
    portalUrl: 'https://www.tcs.com.pk/',
    setupSteps: [
      'TCS business/merchant account banayein',
      'api@tcs.com.pk pe API access ki request karein',
      '3-5 din mein API Key + Merchant ID milega',
    ],
  },
  LEOPARDS_COURIER: {
    icon: '🚚', color: '#7c3aed',
    portalUrl: 'https://merchantnew.leopardscourier.com/',
    setupSteps: [
      'Leopards merchant portal pe login',
      'Settings → API Integration',
      'API Key + Merchant Code copy karein',
    ],
  },
  POSTEX: {
    icon: '📮', color: '#00a651',
    portalUrl: 'https://merchant.postex.pk/',
    setupSteps: ['PostEx merchant panel → Settings → API', 'Token copy karke yahan lagayein'],
  },
  JAZZCASH: {
    icon: '📱', color: '#c8102e', popular: true,
    portalUrl: 'https://sandbox.jazzcash.com.pk/',
    setupSteps: [
      'JazzCash merchant account banayein',
      'Developer portal → Merchant ID, Password, Integrity Salt',
      'Sandbox pe pehle test karein',
    ],
  },
  EASYPAISA: {
    icon: '💚', color: '#00a651', popular: true,
    portalUrl: 'https://easypaisa.com.pk/',
    setupSteps: [
      'Easypaisa merchant account banayein',
      'business@easypaisa.com.pk se Store ID + Hash Key lein',
    ],
  },
  NAYAPAY: { icon: '💳', color: '#0ea5e9', portalUrl: 'https://nayapay.com/' },
  RAAST:   { icon: '🏦', color: '#0d9488', portalUrl: 'https://www.sbp.org.pk/RAAST/' },
};

export function getIntegrationMeta(type: string) {
  return INTEGRATION_CATALOG[type] ?? { icon: '🔌', color: '#64748b' };
}

export function getIntegrationEmoji(type?: string): string {
  if (!type) return '🔌';
  return INTEGRATION_CATALOG[type]?.icon ?? '🔌';
}
