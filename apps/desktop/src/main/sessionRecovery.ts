import { ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';

/* ═══════════════════════════════════════════════════════════
   SESSION RECOVERY — save in-progress cart to disk
   Crash ho jaye to next launch pe cart wapis milta hai
   ═══════════════════════════════════════════════════════════ */

const SESSION_FILE = path.join(app.getPath('userData'), 'session-state.json');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SessionState {
  savedAt: number;
  version: string;
  data: any;
}

function saveSession(data: any): { success: boolean } {
  try {
    const state: SessionState = {
      savedAt: Date.now(),
      version: app.getVersion(),
      data,
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(state), 'utf-8');
    return { success: true };
  } catch (e) {
    log.error('Session save failed:', e);
    return { success: false };
  }
}

function loadSession(): SessionState | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    const state = JSON.parse(raw) as SessionState;

    // Check if too old
    if (Date.now() - state.savedAt > MAX_AGE_MS) {
      fs.unlinkSync(SESSION_FILE);
      return null;
    }
    return state;
  } catch (e) {
    log.error('Session load failed:', e);
    return null;
  }
}

function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
      log.info('Session cleared');
    }
  } catch (e) {
    log.warn('Session clear failed:', e);
  }
}

export function setupSessionRecovery() {
  ipcMain.handle('session:save', async (_e, data: any) => saveSession(data));
  ipcMain.handle('session:load', async () => loadSession());
  ipcMain.handle('session:clear', async () => {
    clearSession();
    return { success: true };
  });

  log.info(`Session recovery registered — file: ${SESSION_FILE}`);
}
