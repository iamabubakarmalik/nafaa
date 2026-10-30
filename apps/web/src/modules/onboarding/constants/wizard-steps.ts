/**
 * The five onboarding steps shown to the owner and how each maps onto the
 * API's eight saved steps (PATCH /onboarding/step/:n).
 *
 *   business  → 1 (industry, size, city) + 2 (WhatsApp)
 *   branch    → 3 (address, hours, working days, NTN)
 *   products  → 6 (samples or quick products), categories through 4
 *   receipt   → 4 (receipt size, payments, tax, low-stock alert)
 *   staff     → 7 (team logins)
 *   finish    → 8 (marks onboarding complete)
 *
 * Resume uses the API's completedSteps, so the owner continues where they
 * stopped on any device.
 */

import { Building2, Package, ReceiptText, Store, Users, type LucideIcon } from 'lucide-react';
import type { OnboardingProgress } from '../api/onboarding.api';

export type WizardStepId = 'business' | 'branch' | 'products' | 'receipt' | 'staff';
export type WizardPosition = WizardStepId | 'finish';

export interface WizardStep {
  id: WizardStepId;
  title: string;
  description: string;
  icon: LucideIcon;
  minutes: number;
  /** Business is needed to set the app up; the rest can wait. */
  skippable: boolean;
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  { id: 'business', title: 'Aap ka business', description: 'Kaise bechte hain, kya kaam hai aur shahar — is se app aap ke hisaab se set hoti hai.', icon: Store, minutes: 1, skippable: false },
  { id: 'branch', title: 'Pehli branch', description: 'Dukaan ka pata, khulne ka waqt aur chhutti ke din.', icon: Building2, minutes: 1, skippable: true },
  { id: 'products', title: 'Pehle products', description: 'Misaal wale products, khud likhein ya file se import.', icon: Package, minutes: 2, skippable: true },
  { id: 'receipt', title: 'Bill aur payment', description: 'Parchi ka size, payment ke tareeqe aur tax.', icon: ReceiptText, minutes: 1, skippable: true },
  { id: 'staff', title: 'Staff bulayein', description: 'Cashier ya manager ke liye alag login.', icon: Users, minutes: 1, skippable: true },
];

export function isStepDone(id: WizardStepId, p: OnboardingProgress): boolean {
  const done = p.completedSteps ?? [];
  switch (id) {
    case 'business': return done.includes(1);
    case 'branch': return done.includes(3);
    case 'products': return done.includes(6);
    // Categories also save through step 4, so the receipt size marks this step.
    case 'receipt': return done.includes(4) && !!p.receiptTemplate;
    case 'staff': return done.includes(7);
  }
}

/** Where to resume: the first step not done yet, or the finish screen. */
export function resumePosition(p: OnboardingProgress): WizardPosition {
  return WIZARD_STEPS.find((s) => !isStepDone(s.id, p))?.id ?? 'finish';
}

export function nextPosition(current: WizardStepId): WizardPosition {
  const i = WIZARD_STEPS.findIndex((s) => s.id === current);
  return WIZARD_STEPS[i + 1]?.id ?? 'finish';
}

export function previousPosition(current: WizardPosition): WizardStepId | null {
  if (current === 'finish') return WIZARD_STEPS[WIZARD_STEPS.length - 1].id;
  const i = WIZARD_STEPS.findIndex((s) => s.id === current);
  return i > 0 ? WIZARD_STEPS[i - 1].id : null;
}

// ─── Where to go after finishing ────────────────────────────────
// "Import from a file" opens the import page once setup is done.

const AFTER_SETUP_KEY = 'nafaa.onboarding.after';

export function rememberAfterSetup(path: string | null): void {
  try {
    if (path) sessionStorage.setItem(AFTER_SETUP_KEY, path);
    else sessionStorage.removeItem(AFTER_SETUP_KEY);
  } catch { /* storage blocked */ }
}

export function takeAfterSetup(): string {
  try {
    const path = sessionStorage.getItem(AFTER_SETUP_KEY);
    sessionStorage.removeItem(AFTER_SETUP_KEY);
    return path && path.startsWith('/') ? path : '/dashboard';
  } catch {
    return '/dashboard';
  }
}
