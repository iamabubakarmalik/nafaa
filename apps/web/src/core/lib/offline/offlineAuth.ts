import type { AuthUser, AuthTenant } from '@core/stores/auth.store';

/* ════════════════════════════════════════════════════════════
   OFFLINE AUTH — device-local login fallback
   ────────────────────────────────────────────────────────────
   • Pehli successful ONLINE login pe credential cache hota hai
   • Password ka SHA-256 hash store hota hai (plain kabhi nahi)
   • Offline me verify karke saved session snapshot se boot
   • Tokens expire ho bhi jayein to koi masla nahi — offline me
     API calls hongi hi nahi; online aate hi refresh chalega
   ════════════════════════════════════════════════════════════ */

const KEY = 'nafaa.offline-auth-v1';
const SALT = 'nafaa-offline-salt-v1';

export interface OfflineCredential {
  email: string;
  passwordHash: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenant: AuthTenant;
  savedAt: number;
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Login success pe call karo — credential cache */
export async function cacheOfflineCredential(
  email: string,
  password: string,
  session: { accessToken: string; refreshToken: string; user: AuthUser; tenant: AuthTenant },
): Promise<void> {
  try {
    const rec: OfflineCredential = {
      email: email.toLowerCase().trim(),
      passwordHash: await sha256(SALT + password),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      tenant: session.tenant,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(rec));
    console.log('[offline-auth] Credential cached for', rec.email);
  } catch (e) {
    console.warn('[offline-auth] Cache failed:', e);
  }
}

export function getOfflineCredential(): OfflineCredential | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OfflineCredential) : null;
  } catch {
    return null;
  }
}

export function hasOfflineCredential(): boolean {
  return !!getOfflineCredential();
}

/** Offline login verify — match email + password hash */
export async function verifyOfflineLogin(
  email: string,
  password: string,
): Promise<OfflineCredential | null> {
  const rec = getOfflineCredential();
  if (!rec) return null;
  if (rec.email !== email.toLowerCase().trim()) return null;
  const hash = await sha256(SALT + password);
  return hash === rec.passwordHash ? rec : null;
}

export function clearOfflineCredential(): void {
  try { localStorage.removeItem(KEY); } catch {}
  console.log('[offline-auth] Credential cleared');
}

/** Check if a saved credential exists for a given email */
export function isOfflineCredentialForEmail(email: string): boolean {
  const rec = getOfflineCredential();
  if (!rec) return false;
  return rec.email === email.toLowerCase().trim();
}
