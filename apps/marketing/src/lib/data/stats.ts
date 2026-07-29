import { totalActiveShops } from './cities';
import { industries } from './industries';
import { integrations } from './integrations';

export const liveStats = {
  activeShops: totalActiveShops(),
  citiesServed: 47,
  transactionsToday: 284593,
  transactionsThisMonth: 8420139,
  totalRevenueProcessed: 41200000000, // 41.2B PKR
  uptime: 99.98,
  industriesCovered: industries.length,
  integrationsLive: integrations.filter((i) => i.status === 'live').length,
  supportLanguages: 2,
  averageResponseSeconds: 47,
};
