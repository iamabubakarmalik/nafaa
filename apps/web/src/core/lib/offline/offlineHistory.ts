import { db } from './db';

export type HistoryEventType =
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
  | 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED' | 'CUSTOMER_DELETED'
  | 'CUSTOMER_PAYMENT' | 'CATEGORY_ADDED' | 'BRAND_ADDED'
  | 'EXPENSE_CREATED' | 'EXPENSE_DELETED' | 'SALE_OFFLINE'
  | 'SALE_SYNCED' | 'SALE_FAILED' | 'OTHER';

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  category: 'sale' | 'product' | 'customer' | 'expense' | 'lookup' | 'other';
  title: string;
  description: string;
  amount?: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
  createdAt: number;
  retryCount?: number;
}

const typeMap: Record<string, { cat: HistoryEvent['category']; label: string }> = {
  CREATE_PRODUCT: { cat: 'product', label: 'Product banaya' },
  UPDATE_PRODUCT: { cat: 'product', label: 'Product update kiya' },
  DELETE_PRODUCT: { cat: 'product', label: 'Product delete kiya' },
  TOGGLE_PRODUCT_ACTIVE: { cat: 'product', label: 'Product active toggle' },
  TOGGLE_PRODUCT_FEATURED: { cat: 'product', label: 'Product featured toggle' },
  CREATE_CUSTOMER: { cat: 'customer', label: 'Customer banaya' },
  UPDATE_CUSTOMER: { cat: 'customer', label: 'Customer update kiya' },
  DELETE_CUSTOMER: { cat: 'customer', label: 'Customer delete kiya' },
  PAYMENT_CUSTOMER: { cat: 'customer', label: 'Customer payment (khata)' },
  CREATE_EXPENSE: { cat: 'expense', label: 'Expense banaya' },
  DELETE_EXPENSE: { cat: 'expense', label: 'Expense delete kiya' },
  UPDATE_PRODUCT_STOCK: { cat: 'product', label: 'Stock adjust' },
  CREATE_LEDGER: { cat: 'customer', label: 'Ledger entry' },
  OTHER: { cat: 'other', label: 'Other change' },
};

function mapType(t: string): HistoryEventType {
  if (t.startsWith('CREATE_PRODUCT')) return 'PRODUCT_CREATED';
  if (t.startsWith('UPDATE_PRODUCT') || t.startsWith('TOGGLE_PRODUCT')) return 'PRODUCT_UPDATED';
  if (t === 'DELETE_PRODUCT') return 'PRODUCT_DELETED';
  if (t === 'CREATE_CUSTOMER') return 'CUSTOMER_CREATED';
  if (t === 'UPDATE_CUSTOMER') return 'CUSTOMER_UPDATED';
  if (t === 'DELETE_CUSTOMER') return 'CUSTOMER_DELETED';
  if (t === 'PAYMENT_CUSTOMER') return 'CUSTOMER_PAYMENT';
  if (t === 'CREATE_EXPENSE') return 'EXPENSE_CREATED';
  if (t === 'DELETE_EXPENSE') return 'EXPENSE_DELETED';
  return 'OTHER';
}

/** Full offline history — sales + queue merged, newest first */
export async function loadFullHistory(): Promise<HistoryEvent[]> {
  const [sales, queue] = await Promise.all([
    db.pendingSales.toArray(),
    db.syncQueue.toArray(),
  ]);

  const events: HistoryEvent[] = [];

  for (const s of sales) {
    const customerLabel = s.customerSnapshot?.name ? ` — ${s.customerSnapshot.name}` : '';
    events.push({
      id: `sale_${s.id}`,
      type: s.status === 'synced' ? 'SALE_SYNCED' : s.status === 'failed' ? 'SALE_FAILED' : 'SALE_OFFLINE',
      category: 'sale',
      title: s.serverSaleNumber || s.saleNumber,
      description: `${s.itemsSnapshot.length} items • ${s.paymentMethod}${customerLabel}`,
      amount: s.total,
      status: s.status,
      // Synced hai to error hide karo — sirf failed/pending pe dikhao
      error: s.status === 'synced' ? undefined : s.syncError,
      createdAt: s.createdAt,
      retryCount: s.status === 'synced' ? 0 : s.retryCount,
    });
  }

  for (const q of queue) {
    const meta = typeMap[q.type] || typeMap.OTHER;
    let title = meta.label;
    let desc = `${q.method} ${q.endpoint}`;
    try {
      const p = q.payload;
      if (p?.name) { title = `${meta.label}: ${p.name}`; }
      else if (p?.title) { title = `${meta.label}: ${p.title}`; }
      if (p?.amount) desc = `Amount Rs ${p.amount}`;
    } catch {}

    events.push({
      id: `q_${q.id}`,
      type: mapType(q.type),
      category: meta.cat,
      title,
      description: desc,
      amount: q.payload?.amount || q.payload?.price,
      status: q.status,
      error: q.status === 'synced' ? undefined : q.syncError,
      createdAt: q.createdAt,
      retryCount: q.status === 'synced' ? 0 : q.retryCount,
    });
  }

  events.sort((a, b) => b.createdAt - a.createdAt);
  return events;
}

/** Data snapshot — kya kya cached hai */
export async function getDataSnapshot() {
  const [products, customers, expenses, lookups, pendingSales, queueItems] = await Promise.all([
    db.products.count(),
    db.customers.count(),
    db.expenses.count(),
    db.lookups.toArray(),
    db.pendingSales.where('status').anyOf('pending', 'failed').count(),
    db.syncQueue.where('status').anyOf('pending', 'failed').count(),
  ]);

  const categories = lookups.filter((l: any) => l.type === 'category').length;
  const brands = lookups.filter((l: any) => l.type === 'brand').length;
  const tags = lookups.filter((l: any) => l.type === 'tag').length;
  const expCats = lookups.filter((l: any) => l.type === 'expenseCategory').length;
  const shops = lookups.filter((l: any) => l.type === 'shop').length;

  return {
    products, customers, expenses,
    categories, brands, tags, expCats, shops,
    pendingSales, queueItems,
    hasPending: pendingSales + queueItems > 0,
  };
}
