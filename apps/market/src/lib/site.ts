/**
 * Site-wide constants: public URL, brand accent and the look of each gate
 * (colour from the POS industry identities, apps/web/src/design-system/
 * industries/identities.ts, so a gate looks like the industry it serves).
 */
import type { Gate } from './types';

export const SITE_URL = (process.env.MARKET_URL || 'https://market.nafaa.pk').replace(/\/+$/, '');
export const SIGNUP_URL = process.env.NAFAA_SIGNUP_URL || 'https://app.nafaa.pk/register';

/** MARKETPLACE_IDENTITY colour. */
export const BRAND_HEX = '#9333ea';

export const GATE_LOOK: Record<Gate, { color: string; industry: string }> = {
  FOOD: { color: '#ea580c', industry: 'restaurant' },
  GROCERY: { color: '#059669', industry: 'retail' },
  PHARMACY: { color: '#16a34a', industry: 'pharmacy' },
  SHOPPING: { color: '#db2777', industry: 'garments' },
  BOOKING: { color: '#a21caf', industry: 'salon' },
  WHOLESALE: { color: '#115e59', industry: 'distribution' },
};

export const GATE_SLUGS: Record<string, Gate> = {
  food: 'FOOD', grocery: 'GROCERY', pharmacy: 'PHARMACY', shopping: 'SHOPPING', booking: 'BOOKING', wholesale: 'WHOLESALE',
};

/** Cities offered in the location picker when the platform lists none. */
export const DEFAULT_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Quetta'];
