/**
 * Settings → Reports, as every report page uses it: the period and comparison
 * a report opens with, money round-off, and the figures the shop hides from
 * staff. A viewer's own choice on a page always wins over the default.
 * Also the "no access" screen for reports that need two permissions.
 */

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { apiClient } from '@core/api/client';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import type { DatePreset } from '@core/lib/dateRange';
import { formatPKR } from '@core/lib/format';
import { hasPermission, permissionLabel, type PermissionKey } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import { MASK, useMasked } from '@modules/dashboard/engine/useMasked';
import { EmptyState, PageShell, type DateRangeValue } from '@/design-system/components';

export type ReportFigure = 'profit' | 'drawer';
export type ReportPeriod = 'auto' | 'today' | 'yesterday' | 'week' | 'month' | 'thisMonth' | 'lastMonth' | 'fiscalYear';

export interface ReportPrefs {
  fiscalYearStartMonth: number;
  defaultPeriod: ReportPeriod;
  compareDefault: 'prev' | 'year' | 'off';
  roundOff: 'paisa' | 'rupee';
  /** When khata (udhaar) profit is the headline: when the money comes ('paid') or on the bill day ('bill'). */
  creditProfit: 'paid' | 'bill';
  /** Figures the shop hides from this user (always empty for the owner). */
  hidden: ReportFigure[];
}

const DEFAULTS: ReportPrefs = { fiscalYearStartMonth: 7, defaultPeriod: 'auto', compareDefault: 'prev', roundOff: 'paisa', creditProfit: 'paid', hidden: [] };
const NO_DATES = { from: '', to: '' };

export const REPORT_PREFS_KEY = 'report-prefs';

const unwrap = <T,>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export function useReportPrefs(): ReportPrefs {
  const userId = useAuthStore((s) => s.user?.id);
  const q = useQuery({
    queryKey: [REPORT_PREFS_KEY, userId ?? null],
    queryFn: () => apiClient.get('/settings/report-prefs').then((r) => unwrap<ReportPrefs>(r)),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  return useMemo(() => ({ ...DEFAULTS, ...(q.data ?? {}) }), [q.data]);
}

/** First day of the financial year that contains `today` (business-day keys). */
export function fiscalYearStart(today: string, startMonth: number): string {
  const [y, m] = today.split('-').map(Number);
  return `${m >= startMonth ? y : y - 1}-${String(startMonth).padStart(2, '0')}-01`;
}

/**
 * The page's period: the shop's default from Settings → Reports until the
 * viewer picks one. `fallback` is the page's own default ("auto").
 */
export function useReportRange(fallback: DatePreset) {
  const { defaultPeriod, fiscalYearStartMonth } = useReportPrefs();
  const startHour = useBusinessDayStart();
  const [picked, setPicked] = useState<DateRangeValue | null>(null);
  const range = useMemo<DateRangeValue>(() => {
    if (picked) return picked;
    if (defaultPeriod === 'auto') return { preset: fallback, custom: NO_DATES };
    if (defaultPeriod === 'fiscalYear') {
      if (fiscalYearStartMonth === 1) return { preset: 'year', custom: NO_DATES };
      const today = businessDayKey(new Date(), startHour);
      return { preset: 'custom', custom: { from: fiscalYearStart(today, fiscalYearStartMonth), to: today } };
    }
    return { preset: defaultPeriod, custom: NO_DATES };
  }, [picked, defaultPeriod, fiscalYearStartMonth, fallback, startHour]);
  const setRange = useCallback((v: DateRangeValue) => setPicked(v), []);
  return [range, setRange] as const;
}

/** Compare on/off: the viewer's last choice in this browser, else the shop's default. */
export function useReportCompare(storageKey: string) {
  const { compareDefault } = useReportPrefs();
  const fallback = useRef(compareDefault !== 'off');
  fallback.current = compareDefault !== 'off';
  const [stored, setStored] = useState<boolean | null>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v === 'on' ? true : v === 'off' ? false : null;
    } catch { return null; }
  });
  const toggle = useCallback(() => setStored((v) => {
    const next = !(v ?? fallback.current);
    try { localStorage.setItem(storageKey, next ? 'on' : 'off'); } catch { /* storage blocked */ }
    return next;
  }), [storageKey]);
  return [stored ?? compareDefault !== 'off', toggle] as const;
}

/**
 * Money formatters for reports: useMasked plus the shop's round-off, and
 * profit treated as hidden when the shop hides it from this user.
 */
export function useReportMasked() {
  const base = useMasked();
  const { roundOff, hidden } = useReportPrefs();
  const costHidden = base.costHidden || hidden.includes('profit');
  const whole = roundOff === 'rupee';
  const money = useCallback(
    (n: number | null | undefined) => (whole ? formatPKR(Math.round(n ?? 0), { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : formatPKR(n ?? 0)),
    [whole],
  );
  const cost = useCallback((n: number | null | undefined) => (costHidden ? MASK : money(n)), [costHidden, money]);
  const sales = useCallback((n: number | null | undefined) => (base.salesHidden ? MASK : money(n)), [base.salesHidden, money]);
  return { cost, sales, costHidden, salesHidden: base.salesHidden };
}

/** Renders the report only when the user has every permission in `need`; otherwise says which one is missing. */
export function RequireAllPermissions({ need, title, children }: { need: PermissionKey[]; title: string; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const missing = need.filter((p) => !hasPermission(user?.role as never, user?.permissions, p));
  if (!missing.length) return <>{children}</>;
  return (
    <PageShell>
      <EmptyState
        className="min-h-[50vh]"
        icon={<ShieldAlert className="h-6 w-6" />}
        title={`${title} dekhne ki permission nahi`}
        description={`Is report ke liye ye sab permissions chahiye: ${need.map((p) => `"${permissionLabel(p)}"`).join(' aur ')}. Aap ke paas ${missing.map((p) => `"${permissionLabel(p)}"`).join(' aur ')} nahi hai. Malik se kahein ke Team me de dein.`}
      />
    </PageShell>
  );
}
