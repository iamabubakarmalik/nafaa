import { useEffect } from 'react';
import { toast } from 'sonner';
import { getElectron, isElectron } from './electron';
import { db, getMeta, setMeta } from '@core/lib/offline/db';

/* ═══════════════════════════════════════════════════════════
   AUTO-BACKUP TO LOCAL DISK (Desktop only)
   • Runs once per day (background)
   • Saves to ~/Documents/Nafaa Backups/
   • Silent — no notifications unless user asks
   ═══════════════════════════════════════════════════════════ */

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const BACKUP_EVERY_MS = 24 * 60 * 60 * 1000; // Backup once per day
const LAST_LOCAL_BACKUP_KEY = 'lastLocalBackupAt';

async function performLocalBackup(silent = true): Promise<boolean> {
  const electron = getElectron() as any;
  if (!electron?.backupSave) return false;

  try {
    const [products, customers, expenses, lookups, pendingSales, syncQueue, meta] =
      await Promise.all([
        db.products.toArray(),
        db.customers.toArray(),
        db.expenses.toArray(),
        db.lookups.toArray(),
        db.pendingSales.toArray(),
        db.syncQueue.toArray(),
        db.meta.toArray(),
      ]);

    const backup = {
      app: 'nafaa-pos',
      version: 2,
      type: 'auto',
      exportedAt: new Date().toISOString(),
      counts: {
        products: products.length,
        customers: customers.length,
        expenses: expenses.length,
        pendingSales: pendingSales.length,
      },
      tables: { products, customers, expenses, lookups, pendingSales, syncQueue, meta },
    };

    const json = JSON.stringify(backup);
    const result = await electron.backupSave(json);

    if (result.success) {
      await setMeta(LAST_LOCAL_BACKUP_KEY, Date.now());
      console.log(`[auto-backup] Saved to: ${result.path}`);
      if (!silent) {
        toast.success('Backup saved to Documents folder');
      }
      return true;
    } else {
      console.warn('[auto-backup] Save failed:', result.message);
      return false;
    }
  } catch (e) {
    console.warn('[auto-backup] Error:', e);
    return false;
  }
}

async function checkAndBackup() {
  const last = await getMeta<number>(LAST_LOCAL_BACKUP_KEY);
  const gap = last ? Date.now() - last : Infinity;
  if (gap > BACKUP_EVERY_MS) {
    await performLocalBackup(true);
  }
}

let started = false;
let checkInterval: ReturnType<typeof setInterval> | null = null;

export function useDesktopAutoBackup() {
  useEffect(() => {
    if (!isElectron() || started) return;
    started = true;

    // First check 60s after mount
    setTimeout(checkAndBackup, 60_000);
    checkInterval = setInterval(checkAndBackup, CHECK_INTERVAL_MS);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      checkInterval = null;
      started = false;
    };
  }, []);
}

export async function manualLocalBackup(): Promise<boolean> {
  return performLocalBackup(false);
}

export function openBackupFolder() {
  const electron = getElectron() as any;
  electron?.backupOpenFolder?.();
}
