/**
 * The five onboarding steps and how they map onto the API's saved steps
 * (same as the web constants/wizard-steps.ts). Only Business is required.
 *
 *   business  → 1 (models, industry, size, city) + 2 (WhatsApp)
 *   branch    → 3 (address, hours, working days, NTN)
 *   products  → 6 (samples or quick products), categories through 4
 *   receipt   → 4 (receipt size, payments, tax, low-stock alert)
 *   staff     → 7 (team logins)
 *   finish    → 8 (marks onboarding complete)
 */

import type { LucideIcon } from 'lucide-react-native';
import { Building2, Package, ReceiptText, Store, Users } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import type { OnboardingProgress } from './api';

export type StepId = 'business' | 'branch' | 'products' | 'receipt' | 'staff';
export type Position = StepId | 'finish';

export interface StepDef {
  id: StepId;
  title: string;
  description: string;
  icon: LucideIcon;
  minutes: number;
  skippable: boolean;
}

export const STEPS: readonly StepDef[] = [
  { id: 'business', title: msg('Aap ka business'), description: msg('Kaise bechte hain, kya kaam hai aur shahar — is se app aap ke hisaab se set hoti hai.'), icon: Store, minutes: 1, skippable: false },
  { id: 'branch', title: msg('Pehli branch'), description: msg('Dukaan ka pata, khulne ka waqt aur chhutti ke din.'), icon: Building2, minutes: 1, skippable: true },
  { id: 'products', title: msg('Pehle products'), description: msg('Misaal wale products, khud likhein ya file se import.'), icon: Package, minutes: 2, skippable: true },
  { id: 'receipt', title: msg('Bill aur payment'), description: msg('Parchi ka size, payment ke tareeqe aur tax.'), icon: ReceiptText, minutes: 1, skippable: true },
  { id: 'staff', title: msg('Staff bulayein'), description: msg('Cashier ya manager ke liye alag login.'), icon: Users, minutes: 1, skippable: true },
];

export function isStepDone(id: StepId, p: OnboardingProgress): boolean {
  const done = p.completedSteps ?? [];
  switch (id) {
    case 'business': return done.includes(1);
    case 'branch': return done.includes(3);
    case 'products': return done.includes(6);
    case 'receipt': return done.includes(4) && !!p.receiptTemplate;
    case 'staff': return done.includes(7);
  }
}

export const resumePosition = (p: OnboardingProgress): Position => STEPS.find((s) => !isStepDone(s.id, p))?.id ?? 'finish';

export function nextPosition(current: StepId): Position {
  const i = STEPS.findIndex((s) => s.id === current);
  return STEPS[i + 1]?.id ?? 'finish';
}

export function previousPosition(current: Position): StepId | null {
  if (current === 'finish') return STEPS[STEPS.length - 1].id;
  const i = STEPS.findIndex((s) => s.id === current);
  return i > 0 ? STEPS[i - 1].id : null;
}
