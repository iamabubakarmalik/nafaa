/**
 * Role profiles: which tabs a person sees and where the app opens for them.
 *
 * Nafaa has four stored roles (OWNER, MANAGER, CASHIER, STAFF); the jobs on
 * the floor — waiter, kitchen, counter — come from the permissions the owner
 * ticks on the Team page (same keys as the web). So a profile is read from
 * the permissions, never from a name:
 *
 *   owner    OWNER                                         Home, default tabs
 *   kitchen  restaurant.kitchen.view, no pos.use and no     Kitchen screen (KDS) only
 *            restaurant.orders.manage
 *   waiter   restaurant.orders.view, no pos.use             Tables, (Kitchen), More
 *   cashier  CASHIER role, or pos.use without               POS first, default tabs
 *            dashboard.view
 *   manager  MANAGER and everyone else                      Home, default tabs
 *
 * Industries can change the middle tabs (restaurants get Tables next to the
 * counter). Add a profile by adding a row to PROFILES; the first match wins.
 * Screens still check each permission themselves — this only decides what
 * is offered first.
 */

import { hasPermission, PERMISSIONS as P, type PermissionKey } from '@/core/permissions';
import type { TabName } from './tabs';

export type RoleProfileId = 'owner' | 'kitchen' | 'waiter' | 'cashier' | 'manager';

export interface RoleProfile {
  id: RoleProfileId;
  /** Tab opened once per launch; undefined keeps Home (or Appearance → Start screen). */
  start?: TabName;
  /** Fixed tab set; undefined uses the default role-aware tabs. */
  tabs?: TabName[];
}

interface Who { role?: string | null; permissions?: string[] | null; industry: string | null }

const RESTAURANT_LIKE = new Set(['restaurant', 'hotel']);

const PROFILES: Array<{ id: RoleProfileId; match: (w: Who, can: (p: PermissionKey) => boolean) => boolean; profile: (w: Who, can: (p: PermissionKey) => boolean) => RoleProfile }> = [
  { id: 'owner', match: (w) => w.role === 'OWNER' || w.role === 'SUPER_ADMIN', profile: () => ({ id: 'owner' }) },
  {
    id: 'kitchen',
    match: (w, can) => RESTAURANT_LIKE.has(w.industry ?? '') && can(P.RESTAURANT_KITCHEN_VIEW) && !can(P.POS_USE) && !can(P.RESTAURANT_ORDERS_MANAGE),
    profile: () => ({ id: 'kitchen', start: 'kitchen', tabs: ['kitchen', 'more'] }),
  },
  {
    id: 'waiter',
    match: (w, can) => RESTAURANT_LIKE.has(w.industry ?? '') && can(P.RESTAURANT_ORDERS_VIEW) && !can(P.POS_USE),
    profile: (_w, can) => ({ id: 'waiter', start: 'tables', tabs: ['tables', ...(can(P.RESTAURANT_KITCHEN_VIEW) ? ['kitchen' as const] : []), ...(can(P.CUSTOMERS_VIEW) ? ['customers' as const] : []), 'more'] }),
  },
  {
    id: 'cashier',
    match: (w, can) => w.role === 'CASHIER' || (can(P.POS_USE) && !can(P.DASHBOARD_VIEW)),
    profile: () => ({ id: 'cashier', start: 'pos' }),
  },
];

export function roleProfileOf(w: Who): RoleProfile {
  const can = (p: PermissionKey) => hasPermission(w.role ?? undefined, w.permissions ?? undefined, p);
  const hit = PROFILES.find((x) => x.match(w, can));
  return hit ? hit.profile(w, can) : { id: 'manager' };
}

/** Middle-tab candidates per industry, in order (the bar shows up to three). */
export function middleTabsFor(industry: string | null): TabName[] {
  if (RESTAURANT_LIKE.has(industry ?? '')) return ['pos', 'tables', 'sales', 'customers'];
  return ['pos', 'sales', 'products', 'customers'];
}
