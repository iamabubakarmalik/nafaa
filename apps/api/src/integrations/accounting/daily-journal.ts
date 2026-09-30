/**
 * Roz ka summary journal — POS ke saare bill ek entry me (Shopify POS /
 * Square jaisa). Har accounting software (Zoho, QuickBooks, Xero) isi ko
 * apne format me bhejta hai. Hamesha balanced: debit = credit.
 *
 *   Sale:        Dr payment tareeqa (cash/card/…)  Dr udhaar  Dr discount   |  Cr sale
 *   Refund:      Dr sales returns                                          |  Cr payment tareeqa
 *   Udhaar wapsi:Dr payment tareeqa                                        |  Cr udhaar
 *   COGS:        Dr cost of goods                                          |  Cr inventory
 *   Kharcha:     Dr kharche ka account                                     |  Cr payment tareeqa
 */
export type PayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export const PAY_METHODS: PayMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];

export interface AccountMapping {
  sales?: string | null;
  discounts?: string | null;
  returns?: string | null;
  receivable?: string | null;
  cogs?: string | null;
  inventory?: string | null;
  /** Har payment tareeqe ka account (cash in hand, bank, JazzCash wallet…) */
  methods?: Partial<Record<PayMethod, string | null>>;
  /** Kharchon ka aam account + category-wise */
  expenseDefault?: string | null;
  expenseByCategory?: Record<string, string | null>;
  /** Udhaar wapsi kis tareeqe se aati hai (ledger me tareeqa nahi hota) */
  collectionMethod?: PayMethod;
}

export interface DayData {
  sales: { subtotal: number; discount: number; total: number; creditAmount: number; paymentMethod: string; costOfGoods: number }[];
  returns: { refundAmount: number; refundMethod: string }[];
  collections: { amount: number }[];
  expenses: { amount: number; paymentMethod: string; categoryId: string | null; categoryName: string | null }[];
}

export interface JournalLine {
  accountId: string;
  side: 'debit' | 'credit';
  amount: number;
  description: string;
}

export interface BuiltJournal {
  lines: JournalLine[];
  totals: { sales: number; discount: number; credit: number; refunds: number; collections: number; cogs: number; expenses: number; bills: number };
  /** Kaunse accounts abhi chune nahi — sync se pehle zaroori */
  missing: string[];
}

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const METHOD_LABEL: Record<PayMethod, string> = { CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank transfer', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa' };
const asMethod = (m: string): PayMethod => (PAY_METHODS.includes(m as PayMethod) ? (m as PayMethod) : 'CASH');

export function buildDailyJournal(day: DayData, map: AccountMapping, opts: { includeCogs?: boolean } = {}): BuiltJournal {
  const raw: (JournalLine & { key: string })[] = [];
  const missing = new Set<string>();
  const acct = (key: string, label: string): string | null => {
    const id = key.startsWith('method:') ? map.methods?.[key.slice(7) as PayMethod] : key.startsWith('exp:') ? map.expenseByCategory?.[key.slice(4)] ?? map.expenseDefault : (map as any)[key];
    if (!id) missing.add(label);
    return id ?? null;
  };
  const push = (key: string, label: string, side: 'debit' | 'credit', amount: number, description: string) => {
    const a = r2(amount);
    if (a <= 0) return;
    const id = acct(key, label);
    if (id) raw.push({ key, accountId: id, side, amount: a, description });
  };

  // ── Sale ──
  const byMethod = new Map<PayMethod, number>();
  let credit = 0, discount = 0, gross = 0, cogs = 0;
  for (const s of day.sales) {
    const total = r2(s.total);
    const cr = Math.min(total, Math.max(0, r2(s.creditAmount)));
    byMethod.set(asMethod(s.paymentMethod), (byMethod.get(asMethod(s.paymentMethod)) ?? 0) + (total - cr));
    credit += cr;
    discount += Math.max(0, r2(s.discount));
    // Sale = total + discount (subtotal me farq ho to bhi balanced rahe)
    gross += total + Math.max(0, r2(s.discount));
    cogs += Math.max(0, r2(s.costOfGoods));
  }
  for (const [m, amt] of byMethod) push(`method:${m}`, `${METHOD_LABEL[m]} ka account`, 'debit', amt, `POS sale — ${METHOD_LABEL[m]}`);
  push('receivable', 'Udhaar (receivable) account', 'debit', credit, 'POS sale — udhaar');
  push('discounts', 'Discount account', 'debit', discount, 'POS discount');
  push('sales', 'Sale (income) account', 'credit', gross, `POS sale — ${day.sales.length} bill`);

  // ── Refund ──
  let refunds = 0;
  const refundBy = new Map<PayMethod, number>();
  for (const x of day.returns) {
    const a = Math.max(0, r2(x.refundAmount));
    refunds += a;
    refundBy.set(asMethod(x.refundMethod), (refundBy.get(asMethod(x.refundMethod)) ?? 0) + a);
  }
  push('returns', 'Sales returns account', 'debit', refunds, 'Returns / refund');
  for (const [m, amt] of refundBy) push(`method:${m}`, `${METHOD_LABEL[m]} ka account`, 'credit', amt, `Refund — ${METHOD_LABEL[m]}`);

  // ── Udhaar wapsi ──
  const collections = day.collections.reduce((s, c) => s + Math.max(0, r2(c.amount)), 0);
  const cm = map.collectionMethod ?? 'CASH';
  push(`method:${cm}`, `${METHOD_LABEL[cm]} ka account`, 'debit', collections, 'Udhaar wapsi');
  push('receivable', 'Udhaar (receivable) account', 'credit', collections, 'Udhaar wapsi');

  // ── COGS (optional) ──
  if (opts.includeCogs) {
    push('cogs', 'Cost of goods account', 'debit', cogs, 'Bika hua maal (cost)');
    push('inventory', 'Inventory account', 'credit', cogs, 'Bika hua maal (cost)');
  }

  // ── Kharche ──
  let expenses = 0;
  const expBy = new Map<string, { amt: number; name: string }>();
  const expMethod = new Map<PayMethod, number>();
  for (const e of day.expenses) {
    const a = Math.max(0, r2(e.amount));
    expenses += a;
    const k = e.categoryId ?? '-';
    expBy.set(k, { amt: (expBy.get(k)?.amt ?? 0) + a, name: e.categoryName ?? 'Kharcha' });
    expMethod.set(asMethod(e.paymentMethod), (expMethod.get(asMethod(e.paymentMethod)) ?? 0) + a);
  }
  for (const [k, v] of expBy) push(`exp:${k}`, `Kharche ka account (${v.name})`, 'debit', v.amt, `Kharcha — ${v.name}`);
  for (const [m, amt] of expMethod) push(`method:${m}`, `${METHOD_LABEL[m]} ka account`, 'credit', amt, `Kharcha — ${METHOD_LABEL[m]}`);

  // Ek hi account + side ki lines jor do; aamne saamne wali (debit/credit) net
  const merged = new Map<string, JournalLine>();
  for (const l of raw) {
    const k = `${l.accountId}|${l.side}`;
    const m = merged.get(k);
    if (m) { m.amount = r2(m.amount + l.amount); if (!m.description.includes(l.description)) m.description = `${m.description}; ${l.description}`.slice(0, 250); }
    else merged.set(k, { accountId: l.accountId, side: l.side, amount: l.amount, description: l.description });
  }
  const lines = [...merged.values()];
  const dr = r2(lines.filter((l) => l.side === 'debit').reduce((s, l) => s + l.amount, 0));
  const cr = r2(lines.filter((l) => l.side === 'credit').reduce((s, l) => s + l.amount, 0));
  if (!missing.size && Math.abs(dr - cr) > 0.009) throw new Error(`Journal balanced nahi: debit ${dr} ≠ credit ${cr}`);

  return {
    lines,
    totals: { sales: r2(gross), discount: r2(discount), credit: r2(credit), refunds: r2(refunds), collections: r2(collections), cogs: r2(cogs), expenses: r2(expenses), bills: day.sales.length },
    missing: [...missing],
  };
}
