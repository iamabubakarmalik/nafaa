/**
 * Bottom tabs (side rail on tablets), adapted to role and industry.
 *
 * Home and More are always there. Between them: POS, Sales and Products for
 * those who may use them; staff without some of these get Customers instead,
 * so the bar always has useful shortcuts.
 */

import type { LucideIcon } from 'lucide-react-native';
import { ChefHat, Home, LayoutGrid, Package, Receipt, ShoppingCart, Users, Utensils, UtensilsCrossed } from 'lucide-react-native';
import { useMemo } from 'react';
import { msg } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { hasPermission, PERMISSIONS as P, type PermissionKey } from '@/core/permissions';
import { useModuleFlags } from '../appControl';
import { useIndustry } from '../hooks/useIndustry';
import { middleTabsFor, roleProfileOf, type RoleProfile } from './roleProfiles';

/** Route names inside app/(tabs). */
export type TabName = 'index' | 'pos' | 'sales' | 'products' | 'customers' | 'tables' | 'kitchen' | 'more';

export interface TabDef {
  name: TabName;
  label: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  module?: string;
}

const ALL: Record<TabName, TabDef> = {
  index: { name: 'index', label: msg('Home'), icon: Home },
  pos: { name: 'pos', label: msg('POS'), icon: ShoppingCart, permission: P.POS_USE, module: 'pos' },
  sales: { name: 'sales', label: msg('Sales'), icon: Receipt, permission: P.SALES_VIEW, module: 'sales' },
  products: { name: 'products', label: msg('Products'), icon: Package, permission: P.PRODUCTS_VIEW, module: 'products' },
  customers: { name: 'customers', label: msg('Customers'), icon: Users, permission: P.CUSTOMERS_VIEW, module: 'customers' },
  // Restaurant floor and kitchen screen; shown by industry (middleTabsFor) and role profile (roleProfiles.ts).
  tables: { name: 'tables', label: msg('Tables'), icon: Utensils, permission: P.RESTAURANT_ORDERS_VIEW, module: 'industry' },
  kitchen: { name: 'kitchen', label: msg('Kitchen'), icon: ChefHat, permission: P.RESTAURANT_KITCHEN_VIEW, module: 'industry' },
  more: { name: 'more', label: msg('More'), icon: LayoutGrid },
};

export const TAB_NAMES = Object.keys(ALL) as TabName[];

export function useTabs(): TabDef[] {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.user?.permissions);
  const moduleOn = useModuleFlags();
  const { id: industry } = useIndustry();
  return useMemo(() => {
    const ok = (tab: TabDef) => (!tab.permission || hasPermission(role, permissions, tab.permission)) && (!tab.module || moduleOn(tab.module));
    const profile = roleProfileOf({ role, permissions, industry });
    if (profile.tabs) {
      const fixed = profile.tabs.map((n) => ALL[n]).filter((tab) => tab.name === 'more' || ok(tab));
      if (fixed.length > 1) return fixed;
    }
    const middle = middleTabsFor(industry).map((n) => ({ ...ALL[n] })).filter(ok).slice(0, 3);
    const pos = middle.find((m) => m.name === 'pos');
    // Restaurants call the counter "Orders".
    if (pos && (industry === 'restaurant' || industry === 'hotel')) Object.assign(pos, { icon: UtensilsCrossed });
    return [ALL.index, ...middle, ALL.more];
  }, [role, permissions, moduleOn, industry]);
}

/** The signed-in person's role profile (start screen and tab set). */
export function useRoleProfile(): RoleProfile {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.user?.permissions);
  const { id: industry } = useIndustry();
  return useMemo(() => roleProfileOf({ role, permissions, industry }), [role, permissions, industry]);
}
