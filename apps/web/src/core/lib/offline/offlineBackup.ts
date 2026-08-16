import { db } from './db';
import { getDeviceId } from './offlineDevice';

export async function exportBackup(): Promise<void> {
  const [products, customers, expenses, lookups, pendingSales, syncQueue, meta] =
    await Promise.all([
      db.products.toArray(), db.customers.toArray(), db.expenses.toArray(),
      db.lookups.toArray(), db.pendingSales.toArray(), db.syncQueue.toArray(), db.meta.toArray(),
    ]);

  const backup = {
    app: 'nafaa-pos', version: 2, deviceId: getDeviceId(),
    exportedAt: new Date().toISOString(),
    counts: {
      products: products.length, customers: customers.length, expenses: expenses.length,
      pendingSales: pendingSales.length, syncQueue: syncQueue.length,
    },
    tables: { products, customers, expenses, lookups, pendingSales, syncQueue, meta },
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `nafaa-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Mark backup done — 7-day reminder reset
  try {
    const { markBackupDone } = await import('./offlineAutoBackup');
    await markBackupDone();
  } catch {}
}

export async function importBackup(file: File): Promise<{ restored: number }> {
  const text = await file.text();
  const backup = JSON.parse(text);
  if (backup?.app !== 'nafaa-pos' || !backup?.tables) throw new Error('Ye Nafaa backup file nahi hai');

  const t = backup.tables;
  let restored = 0;

  await db.transaction(
    'rw',
    [db.products, db.customers, db.expenses, db.lookups, db.pendingSales, db.syncQueue, db.meta],
    async () => {
      if (Array.isArray(t.products)) { await db.products.bulkPut(t.products); restored += t.products.length; }
      if (Array.isArray(t.customers)) { await db.customers.bulkPut(t.customers); restored += t.customers.length; }
      if (Array.isArray(t.expenses)) { await db.expenses.bulkPut(t.expenses); restored += t.expenses.length; }
      if (Array.isArray(t.lookups)) { await db.lookups.bulkPut(t.lookups); restored += t.lookups.length; }
      if (Array.isArray(t.pendingSales)) { await db.pendingSales.bulkPut(t.pendingSales); restored += t.pendingSales.length; }
      if (Array.isArray(t.syncQueue)) { await db.syncQueue.bulkPut(t.syncQueue); restored += t.syncQueue.length; }
      if (Array.isArray(t.meta)) { await db.meta.bulkPut(t.meta); }
    },
  );
  return { restored };
}
