/**
 * Distribution helpers for the Team page: one-click presets (Order Booker,
 * Delivery, Distribution Manager) from GET /distribution/presets, shown
 * only while distribution is on, and the warning when someone can book
 * orders but lacks the reads the booker app needs. Like the POS warning it
 * blocks nothing; it says what will not work and offers the fix.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, Truck, UserCog } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { BOOKER_REQUIRED_PERMISSIONS, hasAnyPermission, PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { DIST_KEY, distSetupApi, type Preset } from '../api/distribution.api';
import { useDistributionEnabled } from '../hooks/useDistribution';

const ICON: Record<Preset['key'], typeof Truck> = { ORDER_BOOKER: ClipboardList, DELIVERY: Truck, VAN_SALESMAN: Truck, DISTRIBUTION_MANAGER: UserCog };

export function useDistributionPresets() {
  const on = useDistributionEnabled();
  const user = useAuthStore((s) => s.user);
  const can = !!user && hasAnyPermission(user.role as never, user.permissions, [PERMISSIONS.TEAM_VIEW, PERMISSIONS.STAFF_VIEW]);
  const q = useQuery({ queryKey: [DIST_KEY, 'presets'], queryFn: distSetupApi.presets, enabled: on && can, staleTime: 10 * 60_000, retry: false });
  return on ? q.data?.presets ?? [] : [];
}

/** Preset buttons; `onPick` gets the preset (role and permissions). */
export function DistributionPresetButtons({ onPick, active, size = 'sm' }: { onPick: (p: Preset) => void; active?: string[]; size?: 'sm' | 'md' }) {
  const presets = useDistributionPresets();
  if (!presets.length) return null;
  const same = (p: Preset) => !!active && active.length === p.permissions.length && p.permissions.every((x) => active.includes(x));
  return (
    <>
      {presets.map((p) => {
        const Icon = ICON[p.key] ?? Truck;
        const on = same(p);
        return (
          <button key={p.key} type="button" onClick={() => onPick(p)} title={p.description} aria-pressed={on}
            className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 font-semibold ring-1 transition',
              size === 'md' ? 'h-9 text-[0.8125rem]' : 'h-8 text-[0.75rem]',
              on ? 'bg-teal-50 text-teal-800 ring-teal-300' : 'bg-white text-slate-700 ring-slate-200 hover:bg-teal-50/60')}>
            <Icon className="h-3.5 w-3.5 text-teal-700" />{p.label}
          </button>
        );
      })}
    </>
  );
}

/** Warning when "book orders" is on without the reads the booker app needs. */
export function BookerGapWarning({ value, readOnly, onFix, label }: { value: string[]; readOnly?: boolean; onFix: (gap: string[]) => void; label: (p: string) => string }) {
  if (!value.includes(PERMISSIONS.DISTRIBUTION_ORDERS_BOOK)) return null;
  const gap = BOOKER_REQUIRED_PERMISSIONS.filter((p) => !value.includes(p));
  if (!gap.length) return null;
  return (
    <div className="flex flex-wrap items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Booker app theek se nahi chalegi</p>
        <p className="text-[0.75rem]">Order book karne ki permission hai magar yeh nahi: {gap.map(label).join(', ')}. In ke baghair booker ko customers ya maal nazar nahi aayega.</p>
      </div>
      {!readOnly && (
        <button type="button" onClick={() => onFix(gap)} className="h-8 rounded-lg bg-amber-600 px-3 text-[0.75rem] font-semibold text-white hover:bg-amber-700">Yeh bhi de dein</button>
      )}
    </div>
  );
}
