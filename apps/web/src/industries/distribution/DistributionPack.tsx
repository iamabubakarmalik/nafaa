import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import DistributorHome from './DistributorHome';

/**
 * Distributor / wholesale business: field order booking, routes, price
 * lists, trade schemes, load sheets, delivery settlement and recovery.
 *
 * Distribution itself is a business feature any industry can switch on, so
 * its menu ("Distribution") and pages live in the core app (nav-config and
 * modules/distribution). This pack only makes the DISTRIBUTOR business type
 * a known industry: its look, its card in sign-up and onboarding, and pack
 * units for the product form, and the distribution dashboard as home.
 * Choosing it in onboarding switches distribution on (done by the API). It
 * adds no menu of its own, so the Distribution group is never shown twice.
 */
export const DistributionPack: IndustryPack = {
  id: 'distribution',
  name: 'Distributor / Wholesale',
  shortName: 'Distributor',
  emoji: '🚚',
  priority: 85,
  description: 'Order booker app, routes, price lists, trade schemes, load sheets, delivery settlement and recovery.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return type.includes('DISTRIBUT') || type.includes('WHOLESALE');
  },

  navGroups: [],
  routes: [],

  dashboardComponent: DistributorHome,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', group: 'Count' },
      { value: 'pack', label: 'Pack', group: 'Count' },
      { value: 'dozen', label: 'Dozen (12)', group: 'Count' },
      { value: 'box', label: 'Box', group: 'Count' },
      { value: 'carton', label: 'Carton', group: 'Count' },
      { value: 'bag', label: 'Bag', group: 'Count' },
      { value: 'kg', label: 'Kilograms', group: 'Weight' },
      { value: 'liter', label: 'Liter', group: 'Volume' },
    ],
  },
};
