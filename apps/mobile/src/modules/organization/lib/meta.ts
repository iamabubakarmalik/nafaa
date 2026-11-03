/** Shared wording, icons and helpers for branches, team and counter rules. */

import { Building2, Crown, Package, ShoppingCart, UserCog, UserRound, Warehouse, type LucideIcon } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import type { AssignableRole, ShopType } from '../api/organization';

/** Queries a change to a branch refreshes. */
export const SHOP_KEYS = ['shops', 'shops-analytics', 'shops-compare'] as const;

export const SHOP_TYPES: Record<ShopType, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  SHOP: { label: msg('Shop'), hint: msg('POS, sale, customer aur galla'), icon: Building2, color: '#2563eb' },
  WAREHOUSE: { label: msg('Warehouse'), hint: msg('Bara store — sirf maal rakhna aur bhejna'), icon: Warehouse, color: '#d97706' },
  GODOWN: { label: msg('Godown'), hint: msg('Chhota store — extra maal ke liye'), icon: Package, color: '#7c3aed' },
};

export type RoleKey = 'OWNER' | AssignableRole;

export const ROLES: Record<RoleKey, { label: string; hint: string; color: string; icon: LucideIcon }> = {
  OWNER: { label: msg('Owner'), hint: msg('Sab kuch kar sakta hai — permission ki zaroorat nahi'), color: '#d97706', icon: Crown },
  MANAGER: { label: msg('Manager'), hint: msg('Apni branch chalata hai: sale, maal, expenses, reports'), color: '#7c3aed', icon: UserCog },
  CASHIER: { label: msg('Cashier'), hint: msg('Counter par sale, galla aur customer'), color: '#2563eb', icon: ShoppingCart },
  STAFF: { label: msg('Staff'), hint: msg('Maal dekhna aur madad — counter nahi'), color: '#0891b2', icon: UserRound },
};
export const ASSIGNABLE: AssignableRole[] = ['MANAGER', 'CASHIER', 'STAFF'];

export { apiErrorMessage as apiError } from '@/core/api/errors';

/** 10 characters without look-alike letters, easy to read out on the phone. */
export function makePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 8);

/** Empty or a Pakistani mobile number (03xx…, 92xx…, +92xx…). */
export const validPhone = (v: string) => !v.trim() || /^(\+?92|0)?3\d{9}$/.test(v.replace(/[\s\-()]/g, ''));
