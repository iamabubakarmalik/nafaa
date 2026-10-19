/**
 * Who may change garments jobs. The API has no garments permission yet,
 * so taking orders, payments and hand-overs follows the counter
 * permission (pos.use); products and collections follow products.edit.
 */

import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';

export function useGarmentsCan() {
  const manage = usePermission(PERMISSIONS.POS_USE);
  const catalog = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const customers = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  return { manage, catalog, customers };
}
