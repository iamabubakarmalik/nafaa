/**
 * The eye on Home: hides every amount on this device (web "hide sales" and
 * the cost lock). Cost and profit are also hidden without `cost.view`, the
 * same rule as the web useMasked().
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kvZustandStorage } from '@/core/storage/kv';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';

interface PrivacyState { hidden: boolean; toggle: () => void }

export const useHomePrivacy = create<PrivacyState>()(persist(
  (set) => ({ hidden: false, toggle: () => set((s) => ({ hidden: !s.hidden })) }),
  { name: 'home.privacy', storage: createJSONStorage(() => kvZustandStorage) },
));

export const MASK = '••••';

export function useMasked() {
  const can = usePermission();
  const hidden = useHomePrivacy((s) => s.hidden);
  const noCost = !can(P.COST_VIEW);
  return { salesHidden: hidden, costHidden: hidden || noCost, noCost };
}
