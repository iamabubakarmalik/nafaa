/**
 * The customer directory built from data saved on this device, for when the
 * server is unreachable. Uses the cached customers and khata entries, so
 * balances and credit age still work; visit counts are not stored offline.
 */

import { db } from '@core/lib/offline/db';
import { LEDGER_CACHE_KEY } from '@core/lib/offline/offlineKhata';
import { businessDayKey, cachedDayStartHour } from '@core/lib/business-day';
import type { DirectoryActivity, DirectoryCustomer, DirectoryFilters, DirectoryPage, DirectoryType } from './api';

const DAY = 86_400_000;
const EPS = 0.009;
type Entry = { amount: number; type: string; createdAt: string };

/** Oldest still-unpaid credit, settling payments against the oldest debts first. */
export function oldestUnpaid(entries: Array<{ amount: number; createdAt: string }>): string | null {
  const debts: Array<{ left: number; at: string }> = [];
  let credit = 0;
  for (const e of [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (e.amount > 0) {
      let left = e.amount;
      const use = Math.min(left, credit);
      left -= use; credit -= use;
      if (left > EPS) debts.push({ left, at: e.createdAt });
    } else {
      let pay = -e.amount;
      while (pay > EPS && debts.length) {
        const use = Math.min(pay, debts[0].left);
        debts[0].left -= use; pay -= use;
        if (debts[0].left <= EPS) debts.shift();
      }
      credit += pay;
    }
  }
  return debts[0]?.at ?? null;
}

const digits = (v?: string | null) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d.startsWith('92') && d.length >= 12 ? `0${d.slice(2)}` : d;
};

export async function localDirectory(f: DirectoryFilters, page: number, limit: number): Promise<DirectoryPage> {
  const [customers, cache] = await Promise.all([db.customers.toArray(), db.meta.get(LEDGER_CACHE_KEY)]);
  const ledgers = (cache?.value ?? {}) as Record<string, { ledgers: Entry[] }>;
  const now = Date.now();
  const start = cachedDayStartHour();
  const month = businessDayKey(new Date(), start).slice(0, 7);
  const inRange = (iso: string) => !f.from || !f.to || (businessDayKey(new Date(iso), start) >= f.from && businessDayKey(new Date(iso), start) <= f.to);

  const rows: DirectoryCustomer[] = customers.filter((c) => !c._localDeleted).map((c) => {
    const entries = ledgers[c.id]?.ledgers ?? [];
    const balance = Number(c.balance ?? 0);
    const due = balance > EPS ? oldestUnpaid(entries) : null;
    const periodEntries = f.from ? entries.filter((e) => inRange(e.createdAt)) : [];
    return {
      id: c.id, name: c.name, phone: c.phone ?? null, email: c.email ?? null, cnic: c.cnic ?? null, city: c.city ?? null, area: c.area ?? null,
      gender: c.gender ?? null, dateOfBirth: c.dateOfBirth ?? null, avatarUrl: c.avatarUrl ?? null, creditLimit: Number(c.creditLimit ?? 0),
      loyaltyPoints: c.loyaltyPoints ?? 0, isActive: c.isActive !== false, isVip: !!c.isVip, createdAt: c.createdAt,
      balance, totalBalance: balance, overLimit: c.creditLimit > 0 && balance > c.creditLimit,
      visits: 0, spent: Number(c.totalSpent ?? 0), average: 0, lastSaleAt: null, firstSaleAt: null, daysSinceVisit: null,
      oldestDueAt: due, dueDays: due ? Math.floor((now - new Date(due).getTime()) / DAY) : null,
      period: f.from ? {
        visits: 0, spent: 0,
        credit: periodEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0),
        paid: periodEntries.filter((e) => e.type === 'PAYMENT_RECEIVED').reduce((s, e) => s - e.amount, 0),
      } : null,
    };
  });

  const typeTest: Record<DirectoryType, (r: DirectoryCustomer) => boolean> = {
    all: () => true, vip: (r) => r.isVip, khata: (r) => r.balance > EPS, advance: (r) => r.balance < -EPS, overLimit: (r) => r.overLimit, clear: (r) => Math.abs(r.balance) <= EPS,
  };
  const actTest: Record<DirectoryActivity, (r: DirectoryCustomer) => boolean> = {
    all: () => true, new: (r) => r.createdAt.slice(0, 7) === month, active30: () => false, inactive30: () => false, inactive60: () => false, inactive90: () => false, never: () => false,
  };
  const term = f.search?.trim().toLowerCase();
  const d = term ? digits(term) : '';
  const base = rows.filter((r) => (!term || [r.name, r.email, r.cnic, r.city, r.area].some((v) => v?.toLowerCase().includes(term)) || (d.length >= 3 && digits(r.phone).includes(d)))
    && (f.status === 'all' || (f.status === 'inactive' ? !r.isActive : r.isActive))
    && (!f.city || (r.city ?? '').toLowerCase() === f.city.toLowerCase())
    && (!f.from || (f.dateOn === 'joined' ? inRange(r.createdAt) : f.dateOn === 'khata' ? !!(r.period && (r.period.credit || r.period.paid)) : true)));
  const age = (r: DirectoryCustomer) => r.dueDays ?? -1;
  const filtered = base.filter((r) => typeTest[f.type](r) && actTest[f.activity](r)
    && (!f.aging || (f.aging === 'd0' ? age(r) >= 0 && age(r) < 7 : f.aging === 'd7' ? age(r) >= 7 && age(r) < 30 : f.aging === 'd30' ? age(r) >= 30 && age(r) < 90 : age(r) >= 90)));
  const sorters: Partial<Record<DirectoryFilters['sort'], (a: DirectoryCustomer, b: DirectoryCustomer) => number>> = {
    old: (a, b) => a.createdAt.localeCompare(b.createdAt), name: (a, b) => a.name.localeCompare(b.name), nameDesc: (a, b) => b.name.localeCompare(a.name),
    spent: (a, b) => b.spent - a.spent, balance: (a, b) => b.balance - a.balance, aging: (a, b) => (a.oldestDueAt ?? '9').localeCompare(b.oldestDueAt ?? '9'),
  };
  filtered.sort(sorters[f.sort] ?? ((a, b) => b.createdAt.localeCompare(a.createdAt)));

  const live = rows.filter((r) => r.isActive);
  const owing = live.filter(typeTest.khata);
  const bucket = (lo: number, hi: number) => {
    const l = owing.filter((r) => age(r) >= lo && age(r) < hi);
    return { count: l.length, amount: l.reduce((s, r) => s + r.balance, 0) };
  };
  const cities = new Map<string, number>();
  for (const r of base) if (r.city?.trim()) cities.set(r.city.trim(), (cities.get(r.city.trim()) ?? 0) + 1);
  return {
    page, limit, count: filtered.length, hasMore: page * limit < filtered.length, offline: true,
    items: filtered.slice((page - 1) * limit, page * limit),
    tabs: Object.fromEntries((Object.keys(typeTest) as DirectoryType[]).map((t) => [t, base.filter(typeTest[t]).length])) as Record<DirectoryType, number>,
    activity: Object.fromEntries((Object.keys(actTest) as DirectoryActivity[]).map((a) => [a, base.filter(actTest[a]).length])) as Record<DirectoryActivity, number>,
    cities: [...cities.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    period: f.from && f.to ? {
      from: f.from, to: f.to, visits: 0, spent: 0, buyers: 0,
      credit: rows.reduce((s, r) => s + (r.period?.credit ?? 0), 0), paid: rows.reduce((s, r) => s + (r.period?.paid ?? 0), 0),
      joined: rows.filter((r) => inRange(r.createdAt)).length,
    } : null,
    stats: {
      total: live.length, inactive: rows.length - live.length, vip: live.filter((r) => r.isVip).length,
      newThisMonth: live.filter(actTest.new).length, buyers: live.filter((r) => r.spent > 0).length, spent: live.reduce((s, r) => s + r.spent, 0),
      receivable: owing.reduce((s, r) => s + r.balance, 0), owingCount: owing.length,
      advance: live.filter(typeTest.advance).reduce((s, r) => s - r.balance, 0), advanceCount: live.filter(typeTest.advance).length,
      overLimit: live.filter(typeTest.overLimit).length,
      aging: { d0: bucket(0, 7), d7: bucket(7, 30), d30: bucket(30, 90), d90: bucket(90, 1e9) },
      inactive30: 0, inactive90: 0, never: 0,
      birthdays: [], topSpenders: [...live].sort((a, b) => b.spent - a.spent).filter((r) => r.spent > 0).slice(0, 5),
    },
  };
}
