/**
 * Data-sharing consent for Nafaa AI (App Store guideline 5.1.2).
 *
 * Questions and the shop data needed to answer them leave the device only
 * after the person allows it. The choice is kept per user on this device
 * (there is no per-user preference endpoint yet) and can be changed in
 * Settings -> Nafaa AI.
 */

import { create } from 'zustand';
import { useAuthStore } from '@/core/auth/store';
import { kv } from '@/core/storage/kv';

export type AiConsentChoice = 'allowed' | 'declined';
interface Stored { choice: AiConsentChoice; at: string }

/** A question held back until the person answers the consent sheet. */
export interface QueuedAsk { text: string; context?: unknown; via?: 'text' | 'voice' }

const keyFor = (uid: string | undefined) => `nafaa.ai.consent.${uid ?? 'anon'}`;
const currentUid = () => useAuthStore.getState().user?.id;

interface ConsentUi {
  /** Bumped on every change so hooks re-read the stored choice. */
  rev: number;
  sheetOpen: boolean;
  queued: QueuedAsk | null;
}

export const useAiConsentUi = create<ConsentUi>(() => ({ rev: 0, sheetOpen: false, queued: null }));

export function getAiConsent(uid: string | undefined = currentUid()): AiConsentChoice | null {
  return kv.get<Stored | null>(keyFor(uid), null)?.choice ?? null;
}

export function hasAiConsent(): boolean {
  return getAiConsent() === 'allowed';
}

export function setAiConsent(choice: AiConsentChoice) {
  kv.set(keyFor(currentUid()), { choice, at: new Date().toISOString() } satisfies Stored);
  useAiConsentUi.setState((s) => ({ rev: s.rev + 1 }));
}

/** Opens the consent sheet; `queued` is asked once the person allows. */
export function requestAiConsent(queued: QueuedAsk | null = null) {
  useAiConsentUi.setState({ sheetOpen: true, queued });
}

export function closeAiConsent() {
  useAiConsentUi.setState({ sheetOpen: false, queued: null });
}

/** The signed-in person's choice; null until they answer the sheet. */
export function useAiConsent(): AiConsentChoice | null {
  const uid = useAuthStore((s) => s.user?.id);
  useAiConsentUi((s) => s.rev);
  return getAiConsent(uid);
}
