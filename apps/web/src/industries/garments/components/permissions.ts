/**
 * Who may change garments jobs. The API has no garments permission yet,
 * so taking orders, payments and hand-overs follows the counter
 * permission (pos.use); products and collections follow products.edit.
 * An exchange is a return plus a new bill, so it needs returns.create and
 * pos.use (the API checks both).
 */

import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';

export function useGarmentsCan() {
  const manage = usePermission(PERMISSIONS.POS_USE);
  const catalog = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const customers = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const returns = usePermission(PERMISSIONS.RETURNS_CREATE);
  return { manage, catalog, customers, exchange: manage && returns };
}
