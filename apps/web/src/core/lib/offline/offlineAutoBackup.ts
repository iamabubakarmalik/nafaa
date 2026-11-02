import { toast } from 'sonner';
import { exportBackup } from './offlineBackup';
import { getMeta, setMeta } from './db';
import { t } from '@core/i18n';

const LAST_BACKUP_KEY = 'lastBackupExportedAt';
const REMIND_EVERY_MS = 7 * 24 * 60 * 60 * 1000; // 7 din
const CHECK_INTERVAL_MS = 60 * 60 * 1000;         // check every hour

let checkInterval: ReturnType<typeof setInterval> | null = null;
let started = false;

async function checkAndRemind() {
  try {
    const last = await getMeta<number>(LAST_BACKUP_KEY);
    const gap = last ? Date.now() - last : Infinity;

    if (gap > REMIND_EVERY_MS) {
      toast.info(t('📦 Weekly Backup Reminder'), {
        description: t('Apna offline data safe rakhne ke liye backup download karein'),
        duration: 10000,
        action: {
          label: t('Download Now'),
          onClick: async () => {
            try {
              await exportBackup();
              await setMeta(LAST_BACKUP_KEY, Date.now());
              toast.success(t('✅ Backup download ho gaya — safe jagah rakhein'));
            } catch {
              toast.error(t('Backup fail — /sync page se try karein'));
            }
          },
        },
      });
    }
  } catch {}
}

export function startAutoBackupReminder(): void {
  if (started) return;
  started = true;

  // Pehli check 30s baad (app boot pe distract na kare)
  setTimeout(checkAndRemind, 30_000);
  checkInterval = setInterval(checkAndRemind, CHECK_INTERVAL_MS);
}

export async function markBackupDone(): Promise<void> {
  await setMeta(LAST_BACKUP_KEY, Date.now());
}

export function stopAutoBackupReminder(): void {
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = null;
  started = false;
}
