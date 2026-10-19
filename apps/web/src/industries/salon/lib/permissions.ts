/**
 * What the current person may do on the salon screens. The API has no
 * salon permission, so each action follows the closest shared one:
 * bookings follow service bookings, bills follow the counter (pos.use),
 * the service list and package/plan setup follow products.edit, stylist
 * setup follows staff.manage, commission follows commission.view, and
 * customer notes follow customers.edit.
 */

import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';

export function useSalonCan() {
  const book = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const bill = usePermission(PERMISSIONS.POS_USE);
  const catalog = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const staff = usePermission(PERMISSIONS.STAFF_MANAGE);
  const commission = usePermission(PERMISSIONS.COMMISSION_VIEW);
  const customers = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  return { book, bill, catalog, staff, commission, customers };
}
