import { apiClient } from '@core/api/client';

/* ═════════════════════════════════════════════════════════════
   MALIK KA PIN — server par, har device par wohi
   ─────────────────────────────────────────────────────────────
   Pehle PIN browser ke localStorage me tha. Matlab:
     • Doosre mobile par login karo → PIN kaam hi nahi karta
     • Browser ka data saaf karo → PIN gayab, cost hamesha chhupi
     • Malik kisi ko PIN bataye → us ke device par be-kaar

   Ab PIN server par bcrypt se mehfooz hai. Malik jahan bhi login
   kare, wohi PIN chalta hai — aur bataye to doosra banda bhi
   apne phone se dekh sakta hai.
   ═════════════════════════════════════════════════════════════ */

export interface PinStatus {
  hasPin: boolean;
  pinUpdatedAt: string | null;
  /** Jin safhon par PIN maanga jayega */
  lockedRoutes: string[];
  /** Ek dafa PIN daalne ke baad kitni der khula rahe */
  unlockMinutes: number;
  hideCostByDefault: boolean;
  /** Ye user PIN/lock ka intezam kar sakta hai ya nahi */
  canManage: boolean;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const securityApi = {
  status: () =>
    apiClient.get('/settings/security/pin-status').then(unwrap<PinStatus>),

  verifyPin: (pin: string) =>
    apiClient.post('/settings/security/verify-pin', { pin })
      .then(unwrap<{ valid: boolean; message: string }>),

  /** Pehli dafa set, ya tabdeel (tabdeel ke liye purana PIN lazmi) */
  setPin: (pin: string, currentPin?: string) =>
    apiClient.post('/settings/security/set-pin', { pin, ...(currentPin ? { currentPin } : {}) })
      .then(unwrap<{ success: boolean; message: string }>),

  /** PIN bhool gaye — account ke password se naya PIN */
  resetPin: (password: string, newPin: string) =>
    apiClient.post('/settings/security/reset-pin', { password, newPin })
      .then(unwrap<{ success: boolean; message: string }>),

  removePin: (body: { currentPin?: string; password?: string }) =>
    apiClient.post('/settings/security/remove-pin', body)
      .then(unwrap<{ success: boolean; message: string }>),

  setLockedRoutes: (routes: string[]) =>
    apiClient.patch('/settings/security/locked-routes', { routes })
      .then(unwrap<{ success: boolean; lockedRoutes: string[] }>),

  updatePrefs: (body: { unlockMinutes?: number; hideCostByDefault?: boolean }) =>
    apiClient.patch('/settings/security/pin-prefs', body)
      .then(unwrap<{ success: boolean }>),
};
