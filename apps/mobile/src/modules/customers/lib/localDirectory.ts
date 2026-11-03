/**
 * The customer directory built from the phone's own copy of the customers,
 * for when the server cannot be reached. Balances, khata age, credit limits
 * and the khata tabs work; visit counts and activity filters need the server.
 */

import { agingBucket, AGING_BUCKETS, balanceState, daysSince, directoryTest, isOverLimit, type AgingBucket } from '@nafaa/core/customers';
import type { CustomerRow } from '@/core/offline';
import type { DirectoryActivity, DirectoryCustomer, DirectoryFilters, DirectoryPage, DirectoryType } from '../api/customers';

const TYPES: DirectoryType[] = ['all', 'vip', 'khata', 'advance', 'overLimit', 'clear'];
const ACTIVITY: DirectoryActivity[] = ['all', 'new', 'active30', 'inactive30', 'inactive60', 'inactive90', 'never'];

export function rowToDirectory(c: CustomerRow): DirectoryCustomer {
  const balance = c.balance ?? 0;
  const dueDays = balanceState(balance) === 'owes' ? daysSince(c.oldestDueAt) : null;
  return {
    id: c.id, name: c.name, phone: c.phone, email: c.email, cnic: c.cnic, city: c.city, area: c.area, gender: null, dateOfBirth: null, avatarUrl: null,
    creditLimit: c.creditLimit ?? 0, loyaltyPoints: c.loyaltyPoints, isActive: c.isActive, isVip: c.isVip, createdAt: '',
    balance, totalBalance: balance, overLimit: isOverLimit({ balance, creditLimit: c.creditLimit }),
    visits: 0, spent: c.totalSpent, average: 0, lastSaleAt: null, firstSaleAt: null, daysSinceVisit: null,
    oldestDueAt: balanceState(balance) === 'owes' ? c.oldestDueAt : null, dueDays, period: null, pending: c.pendingCreate,
  };
}

const SORTERS: Partial<Record<DirectoryFilters['sort'], (a: DirectoryCustomer, b: DirectoryCustomer) => number>> = {
  name: (a, b) => a.name.localeCompare(b.name), nameDesc: (a, b) => b.name.localeCompare(a.name),
  spent: (a, b) => b.spent - a.spent, balance: (a, b) => b.balance - a.balance,
  aging: (a, b) => (b.dueDays ?? -1) - (a.dueDays ?? -1),
};

export function buildLocalDirectory(rows: CustomerRow[], f: DirectoryFilters, page: number, limit: number): DirectoryPage {
  const all = rows.map(rowToDirectory);
  const base = all.filter((r) => (f.status === 'all' || (f.status === 'inactive' ? !r.isActive : r.isActive))
    && (!f.city || (r.city ?? '').toLowerCase() === f.city.toLowerCase()));
  const bucketOf = (r: DirectoryCustomer) => agingBucket(r.dueDays);
  const filtered = base.filter((r) => directoryTest[f.type](r) && (!f.aging || bucketOf(r) === f.aging));
  const sorter = SORTERS[f.sort];
  if (sorter) filtered.sort(sorter);

  const live = base.filter((r) => r.isActive);
  const owing = live.filter(directoryTest.khata);
  const aging = Object.fromEntries(AGING_BUCKETS.map((b) => {
    const list = owing.filter((r) => bucketOf(r) === b.id);
    return [b.id, { count: list.length, amount: list.reduce((s, r) => s + r.balance, 0) }];
  })) as Record<AgingBucket, { count: number; amount: number }>;
  const cities = new Map<string, number>();
  for (const r of base) if (r.city?.trim()) cities.set(r.city.trim(), (cities.get(r.city.trim()) ?? 0) + 1);
  const advance = live.filter(directoryTest.advance);
  return {
    page, limit, count: filtered.length, hasMore: page * limit < filtered.length, offline: true,
    items: filtered.slice((page - 1) * limit, page * limit),
    tabs: Object.fromEntries(TYPES.map((t) => [t, base.filter(directoryTest[t]).length])) as Record<DirectoryType, number>,
    activity: Object.fromEntries(ACTIVITY.map((a) => [a, a === 'all' ? base.length : 0])) as Record<DirectoryActivity, number>,
    cities: [...cities.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    period: null,
    stats: {
      total: live.length, inactive: all.length - live.length, vip: live.filter((r) => r.isVip).length, newThisMonth: 0,
      buyers: live.filter((r) => r.spent > 0).length, spent: live.reduce((s, r) => s + r.spent, 0),
      receivable: owing.reduce((s, r) => s + r.balance, 0), owingCount: owing.length,
      advance: advance.reduce((s, r) => s - r.balance, 0), advanceCount: advance.length, overLimit: live.filter(directoryTest.overLimit).length,
      aging, inactive30: 0, inactive90: 0, never: 0, birthdays: [],
      topSpenders: [...live].sort((a, b) => b.spent - a.spent).filter((r) => r.spent > 0).slice(0, 5),
    },
  };
}
