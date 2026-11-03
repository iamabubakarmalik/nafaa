/**
 * Biometric unlock (Face ID / fingerprint). When switched on, the app asks
 * for it on a cold start and after 5 minutes in the background. The session
 * itself stays in secure storage; this only guards opening the app.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { create } from 'zustand';
import { t } from '@/core/i18n';
import { kv } from '../storage/kv';

const KEY = 'nafaa.biometric';
const RELOCK_AFTER_MS = 5 * 60_000;

interface BiometricState {
  enabled: boolean;
  locked: boolean;
  backgroundAt: number | null;
  setEnabled: (on: boolean) => Promise<boolean>;
  lockIfNeeded: (coldStart?: boolean) => void;
  markBackground: () => void;
  unlock: () => Promise<boolean>;
}

export async function biometricAvailable(): Promise<{ available: boolean; face: boolean }> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return { available: hardware && enrolled, face: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) };
  } catch {
    return { available: false, face: false };
  }
}

async function prompt(): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t('Nafaa kholne ke liye tasdeeq karein'),
      cancelLabel: t('Cancel'),
      fallbackLabel: t('Passcode'),
    });
    return res.success;
  } catch {
    return false;
  }
}

export const useBiometric = create<BiometricState>((set, get) => ({
  enabled: kv.get<boolean>(KEY, false),
  locked: false,
  backgroundAt: null,
  setEnabled: async (on) => {
    if (on && !(await prompt())) return false;
    kv.set(KEY, on);
    set({ enabled: on });
    return true;
  },
  lockIfNeeded: (coldStart) => {
    const { enabled, backgroundAt } = get();
    if (!enabled) return;
    if (coldStart || (backgroundAt && Date.now() - backgroundAt > RELOCK_AFTER_MS)) set({ locked: true });
  },
  markBackground: () => set({ backgroundAt: Date.now() }),
  unlock: async () => {
    const ok = await prompt();
    if (ok) set({ locked: false, backgroundAt: null });
    return ok;
  },
}));
