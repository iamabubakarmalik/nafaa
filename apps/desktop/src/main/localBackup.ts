import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   LOCAL BACKUP — auto-save daily backup to disk
   Path: ~/Documents/Nafaa Backups/
   Retention: 30 days (auto-cleanup)
   Format: JSON (from renderer via IPC)
   ═══════════════════════════════════════════════════════════ */

const BACKUP_DIR = path.join(app.getPath('documents'), 'Nafaa Backups');
const MAX_BACKUPS = 30;

function ensureBackupDir(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log.info(`Created backup directory: ${BACKUP_DIR}`);
  }
  return BACKUP_DIR;
}

/**
 * Save backup JSON to local disk (called from renderer)
 */
async function saveBackup(jsonData: string, name?: string): Promise<{
  success: boolean;
  path?: string;
  message?: string;
}> {
  try {
    const dir = ensureBackupDir();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = name || `nafaa-backup-${timestamp}.json`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, jsonData, 'utf-8');
    log.info(`Backup saved: ${filePath}`);

    // Cleanup old backups
    cleanupOldBackups();

    return { success: true, path: filePath };
  } catch (e: any) {
    log.error('Backup save failed:', e);
    return { success: false, message: e.message };
  }
}

function cleanupOldBackups() {
  try {
    const dir = ensureBackupDir();
    const files = fs.readdirSync(dir)
      .filter((n) => n.startsWith('nafaa-backup-') && n.endsWith('.json'))
      .map((name) => ({
        name,
        path: path.join(dir, name),
        time: fs.statSync(path.join(dir, name)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS) {
      files.slice(MAX_BACKUPS).forEach((f) => {
        try {
          fs.unlinkSync(f.path);
          log.info(`Deleted old backup: ${f.name}`);
        } catch {}
      });
    }
  } catch (e) {
    log.warn('Backup cleanup failed:', e);
  }
}

/**
 * List all backups
 */
function listBackups(): Array<{ name: string; path: string; size: number; time: number }> {
  try {
    const dir = ensureBackupDir();
    return fs.readdirSync(dir)
      .filter((n) => n.startsWith('nafaa-backup-') && n.endsWith('.json'))
      .map((name) => {
        const p = path.join(dir, name);
        const stat = fs.statSync(p);
        return { name, path: p, size: stat.size, time: stat.mtime.getTime() };
      })
      .sort((a, b) => b.time - a.time);
  } catch {
    return [];
  }
}

/**
 * Read a backup file (for restore)
 */
async function readBackup(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Open backup folder in Finder/Explorer
 */
function openBackupFolder() {
  ensureBackupDir();
  shell.openPath(BACKUP_DIR);
}

/**
 * Pick backup file to restore (native file dialog)
 */
async function pickBackupFile(mainWindow: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select backup file to restore',
    defaultPath: BACKUP_DIR,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

export function setupLocalBackup(mainWindow: BrowserWindow) {
  ensureBackupDir();

  ipcMain.handle('backup:save', async (_event, jsonData: string, name?: string) => {
    return saveBackup(jsonData, name);
  });

  ipcMain.handle('backup:list', async () => {
    return listBackups();
  });

  ipcMain.handle('backup:read', async (_event, filePath: string) => {
    return readBackup(filePath);
  });

  ipcMain.handle('backup:pick', async () => {
    return pickBackupFile(mainWindow);
  });

  ipcMain.handle('backup:openFolder', async () => {
    openBackupFolder();
    return true;
  });

  ipcMain.handle('backup:getPath', async () => {
    return BACKUP_DIR;
  });

  log.info(`Local backup handlers registered — folder: ${BACKUP_DIR}`);
}
