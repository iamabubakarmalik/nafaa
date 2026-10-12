/** Every product sold in the period (by sales, up to 2,000) for the industry tabs. */

import { useQuery } from '@tanstack/react-query';
import { useShopParam } from '@core/stores/auth.store';
import { PROFIT_KEY, profitApi, type ProfitFilters } from '../../api';

export function usePeriodItems(filters: ProfitFilters) {
  const shop = useShopParam();
  return useQuery({
    queryKey: [PROFIT_KEY, 'all-items', shop, filters],
    queryFn: () => profitApi.items({ ...filters, sort: 'revenue', limit: 2000 }),
  });
}
