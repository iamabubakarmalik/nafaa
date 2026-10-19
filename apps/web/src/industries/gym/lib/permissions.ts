/**
 * What the current person may do on the gym screens. The API has no gym
 * permission, so each action follows the closest shared one: members
 * follow customers (view / edit), selling and taking fees follow the
 * counter (pos.use), plans follow products.edit, classes and PT bookings
 * follow service bookings, trainer setup follows staff.manage, commission
 * follows commission.view (paying it needs commission.manage and
 * expenses.create, as it is a drawer expense), machines follow products.
 */

import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';

export function useGymCan() {
  const viewMembers = usePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const members = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const bill = usePermission(PERMISSIONS.POS_USE);
  const discount = usePermission(PERMISSIONS.POS_DISCOUNT_OVERRIDE);
  const discounts = usePermission(PERMISSIONS.DISCOUNTS_MANAGE);
  const plans = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const plansCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const viewProducts = usePermission(PERMISSIONS.PRODUCTS_VIEW);
  const bookingsView = usePermission(PERMISSIONS.SERVICE_BOOKINGS_VIEW);
  const book = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const staff = usePermission(PERMISSIONS.STAFF_MANAGE);
  const commission = usePermission(PERMISSIONS.COMMISSION_VIEW);
  const manageCommission = usePermission(PERMISSIONS.COMMISSION_MANAGE);
  const writeExpense = usePermission(PERMISSIONS.EXPENSES_CREATE);
  return {
    viewMembers,
    members,
    bill,
    discount: discount || discounts,
    plans,
    newPlan: plansCreate,
    machines: plans,
    viewMachines: viewProducts,
    viewBookings: bookingsView || book || viewMembers,
    book,
    staff,
    commission: commission || manageCommission,
    payCommission: manageCommission && writeExpense,
    expense: writeExpense,
  };
}
