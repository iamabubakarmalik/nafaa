/**
 * Applies commission rules to one person's month.
 *
 * Which rules apply: the person's own active rules when they have any,
 * otherwise the rules for everyone. The page states this next to each rule.
 *
 * Each rule line has two parts: commission on the month's sales and the
 * commission taken back on goods returned in the month. A line can go below
 * zero only through returns; a sale made at a loss never costs the seller.
 *
 *   SALE    · PERCENT  rate % of the goods value
 *   PROFIT  · PERCENT  rate % of goods value less cost
 *   SALE / PROFIT · FIXED  rupees per unit sold
 *   PER_BILL           rupees per bill (a bill fully returned counts back)
 *
 * `minMonthlySale` blocks a rule until the month's net sale reaches it (the
 * nearest such step is reported, so stacked rules work as slabs);
 * `targetAmount` adds `targetBonus` once the net sale reaches it.
 */

import type { CommissionRule } from '@prisma/client';

export interface Bucket { sale: number; cost: number; qty: number }

/** One person's month, from the queries. Keys of the maps are category ids, '' for none. */
export interface PersonMonth {
  sales: Map<string, Bucket>;
  returns: Map<string, Bucket>;
  bills: number;
  fullReturns: number;
  reassigned: number;
  noCost: number;
}

export interface Line {
  ruleId: string;
  label: string;
  basis: string;
  /** Base the rate was applied to: rupees, units or bills. */
  base: number;
  rate: number;
  valueType: string;
  /** Net amount for the line (sales part less returns part). */
  amount: number;
  /** Base and amount taken back for goods returned in the month. */
  returnBase: number;
  returnAmount: number;
}

export interface Target { ruleId: string; amount: number; bonus: number; pct: number; reached: boolean }

export interface Result {
  grossSale: number;
  returnSale: number;
  /** Goods sold less goods returned in the month. */
  sale: number;
  profit: number;
  qty: number;
  bills: number;
  lines: Line[];
  earned: number;
  bonus: number;
  blockedByMin?: { need: number; short: number };
  targets: Target[];
}

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const emptyMonth = (): PersonMonth => ({ sales: new Map(), returns: new Map(), bills: 0, fullReturns: 0, reassigned: 0, noCost: 0 });

const sum = (map: Map<string, Bucket>, cats: string[]) => {
  const out: Bucket = { sale: 0, cost: 0, qty: 0 };
  map.forEach((b, cat) => {
    if (cats.length && !cats.includes(cat)) return;
    out.sale += b.sale; out.cost += b.cost; out.qty += b.qty;
  });
  return out;
};

/** The rules that apply to a person: their own when they have any, else the common ones. */
export function rulesFor(rules: CommissionRule[], userId: string) {
  const active = rules.filter((r) => r.isActive);
  const own = active.filter((r) => r.userId === userId);
  return own.length ? own : active.filter((r) => !r.userId);
}

export function ruleLabel(rule: Pick<CommissionRule, 'name' | 'basis' | 'valueType'>) {
  if (rule.name) return rule.name;
  if (rule.basis === 'PER_BILL') return 'Har bill par';
  if (rule.valueType === 'FIXED') return 'Har cheez par';
  return rule.basis === 'PROFIT' ? 'Munafa par' : 'Bikri par';
}

export function apply(pm: PersonMonth, rules: CommissionRule[], enrolled: boolean): Result {
  const all = sum(pm.sales, []);
  const back = sum(pm.returns, []);
  const sale = all.sale - back.sale;
  const res: Result = {
    grossSale: r2(all.sale), returnSale: r2(back.sale), sale: r2(sale),
    profit: r2(all.sale - all.cost - (back.sale - back.cost)), qty: all.qty - back.qty,
    bills: pm.bills, lines: [], earned: 0, bonus: 0, targets: [],
  };

  for (const rule of rules) {
    if (rule.targetAmount && rule.targetAmount > 0) {
      const reached = sale >= rule.targetAmount;
      res.targets.push({
        ruleId: rule.id, amount: rule.targetAmount, bonus: rule.targetBonus ?? 0,
        pct: Math.max(0, Math.min((sale / rule.targetAmount) * 100, 999)), reached,
      });
    }
  }
  if (!enrolled) return res;

  for (const rule of rules) {
    if (rule.minMonthlySale && sale < rule.minMonthlySale) {
      const short = r2(rule.minMonthlySale - sale);
      if (!res.blockedByMin || short < res.blockedByMin.short) res.blockedByMin = { need: rule.minMonthlySale, short };
      continue;
    }
    const label = ruleLabel(rule);
    let base = 0, returnBase = 0, plus = 0, minus = 0;
    if (rule.basis === 'PER_BILL') {
      base = pm.bills; returnBase = pm.fullReturns;
      plus = base * rule.value; minus = returnBase * rule.value;
    } else {
      const s = sum(pm.sales, rule.categoryIds);
      const b = sum(pm.returns, rule.categoryIds);
      if (rule.valueType === 'FIXED') {
        base = s.qty; returnBase = b.qty;
        plus = base * rule.value; minus = returnBase * rule.value;
      } else {
        base = rule.basis === 'PROFIT' ? s.sale - s.cost : s.sale;
        returnBase = rule.basis === 'PROFIT' ? b.sale - b.cost : b.sale;
        plus = Math.max(0, base) * rule.value / 100;
        minus = Math.max(0, returnBase) * rule.value / 100;
      }
    }
    const amount = r2(plus - minus);
    if (plus || minus) {
      res.lines.push({
        ruleId: rule.id, label, basis: rule.basis, base: r2(base), rate: rule.value,
        valueType: rule.basis === 'PER_BILL' ? 'FIXED' : rule.valueType,
        amount, returnBase: r2(returnBase), returnAmount: r2(minus),
      });
      res.earned += amount;
    }
    if (rule.targetAmount && rule.targetBonus && sale >= rule.targetAmount) {
      res.lines.push({
        ruleId: rule.id, label: `Target poora: ${Math.round(rule.targetAmount).toLocaleString('en-PK')}`, basis: 'TARGET',
        base: r2(sale), rate: 0, valueType: 'FIXED', amount: rule.targetBonus, returnBase: 0, returnAmount: 0,
      });
      res.earned += rule.targetBonus;
      res.bonus += rule.targetBonus;
    }
  }
  res.earned = Math.round(res.earned);
  return res;
}
