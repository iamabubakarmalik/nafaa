/**
 * Automatic collection rules ("category is Shoes AND price under 3000") →
 * a Prisma filter on Product. Shopify smart-collection rules are mapped to
 * the same shape on import.
 */
import { Prisma } from '@prisma/client';

export type RuleField = 'category' | 'tag' | 'brand' | 'price' | 'stock' | 'created' | 'title' | 'vendor_sku';
export type RuleOp = 'is' | 'is_not' | 'gt' | 'lt' | 'contains' | 'in_stock' | 'within_days';
export interface RuleCondition { field: RuleField; op: RuleOp; value: string | number }
export interface CollectionRules { match: 'all' | 'any'; conditions: RuleCondition[] }

const OPS: Record<RuleField, RuleOp[]> = {
  category: ['is', 'is_not'],
  tag: ['is', 'is_not'],
  brand: ['is', 'is_not'],
  price: ['gt', 'lt'],
  stock: ['in_stock'],
  created: ['within_days'],
  title: ['contains'],
  vendor_sku: ['contains'],
};

/** Cleans a rules document; returns an error message when it cannot be used. */
export function readRules(raw: unknown): CollectionRules | { error: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const list = Array.isArray(r.conditions) ? r.conditions.slice(0, 20) : [];
  const conditions: RuleCondition[] = [];
  for (const c of list) {
    const field = c?.field as RuleField;
    const op = c?.op as RuleOp;
    if (!OPS[field] || !OPS[field].includes(op)) return { error: `Shart sahi nahi: ${String(field)} ${String(op)}` };
    let value: string | number = c?.value;
    if (field === 'price' || field === 'created') {
      value = Number(value);
      if (!Number.isFinite(value) || value < 0) return { error: 'Shart me number sahi likhein' };
    } else if (field === 'stock') {
      value = 1;
    } else {
      value = String(value ?? '').trim().slice(0, 120);
      if (!value) return { error: 'Shart ki value khali hai' };
    }
    conditions.push({ field, op, value });
  }
  if (!conditions.length) return { error: 'Kam az kam ek shart lagayein' };
  return { match: r.match === 'any' ? 'any' : 'all', conditions };
}

export function ruleWhere(rules: CollectionRules, shopId: string | null, now = Date.now()): Prisma.ProductWhereInput {
  const parts = rules.conditions.map((c): Prisma.ProductWhereInput => {
    const v = c.value;
    switch (c.field) {
      case 'category':
        return c.op === 'is' ? { categoryId: String(v) } : { NOT: { categoryId: String(v) } };
      case 'brand':
        return c.op === 'is' ? { brandId: String(v) } : { NOT: { brandId: String(v) } };
      case 'tag':
        return c.op === 'is' ? { tags: { some: { tagId: String(v) } } } : { tags: { none: { tagId: String(v) } } };
      case 'price':
        return c.op === 'gt' ? { price: { gt: Number(v) } } : { price: { lt: Number(v) } };
      case 'stock':
        return shopId ? { shopStocks: { some: { shopId, stock: { gt: 0 } } } } : { stock: { gt: 0 } };
      case 'created':
        return { createdAt: { gte: new Date(now - Number(v) * 86_400_000) } };
      case 'title':
        return { name: { contains: String(v), mode: 'insensitive' } };
      case 'vendor_sku':
        return { sku: { contains: String(v), mode: 'insensitive' } };
    }
  });
  return rules.match === 'any' ? { OR: parts } : { AND: parts };
}
