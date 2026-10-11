/**
 * Agri numbers for the dashboard: sowing season readiness, farmer credit
 * recovery, government registration of seed/fertilizer/spray stock and
 * pending subsidy claims. Every agri widget calls this; React Query shares
 * the requests (same keys as the Farmers, Stock and Subsidy pages).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stockReportApi, type StockReportRow } from '@modules/inventory/stock-report/api/stock-report.api';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { farmersApi, type Farmer } from '../api/farmers.api';
import { seasonalPlansApi, type SeasonalPlan } from '../api/seasonal-plans.api';
import { subsidyApi, type SubsidyClaim } from '../api/subsidy.api';
import { certStatus } from '../lib/agriUnits';
import { deriveAgriKind, needsGovtReg, type AgriKind } from '../lib/agriCategory';

const MINUTE = 60_000;
const DAY = 86_400_000;

/** Whole days from today to `date`; negative when already past. */
const daysTo = (date: Date | null) => {
  if (!date) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - start.getTime()) / DAY);
};

/** Day and month in the current year, so last year's plan still works. */
const thisYear = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : new Date(new Date().getFullYear(), d.getMonth(), d.getDate());
};

export function useAgriOps() {
  const stockQ = useQuery({
    queryKey: ['agri-stock-report'],
    queryFn: () => stockReportApi.generate({ stockStatus: 'all', isActive: true }).catch(() => null),
    staleTime: 5 * MINUTE,
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}).catch(() => [] as AgriProductProfile[]),
    staleTime: 5 * MINUTE,
  });
  const farmersQ = useQuery({
    queryKey: ['agri-farmers-all'],
    queryFn: () => farmersApi.list({}).catch(() => [] as Farmer[]),
  });
  const plansQ = useQuery({
    queryKey: ['seasonal-plans-all'],
    queryFn: () => seasonalPlansApi.list({ active: true }).catch(() => [] as SeasonalPlan[]),
    staleTime: 5 * MINUTE,
  });
  const subsidyQ = useQuery({
    queryKey: ['subsidy-claims-all'],
    queryFn: () => subsidyApi.list({}).catch(() => [] as SubsidyClaim[]),
    staleTime: 5 * MINUTE,
  });

  const stock = useMemo(() => {
    const profileBy = new Map<string, AgriProductProfile>();
    (profilesQ.data ?? []).forEach((p) => p.productId && profileBy.set(p.productId, p));
    return ((stockQ.data?.rows ?? []) as StockReportRow[]).map((r) => {
      const profile = profileBy.get(r.productId);
      const kind = (profile?.category as AgriKind | undefined) ?? deriveAgriKind(r.category ?? undefined, r.productName);
      const regulated = needsGovtReg(kind);
      const cert = certStatus(profile?.govtRegExpiry);
      return {
        id: r.productId, name: r.productName, unit: r.unit, stock: Number(r.stock || 0), value: Number(r.stockValue || 0),
        crops: profile?.targetCrops ?? [],
        isOut: r.stockStatus === 'OUT_OF_STOCK',
        blocked: regulated && cert.state === 'expired',
        certSoon: regulated && cert.state === 'soon',
        certDays: cert.days,
      };
    });
  }, [stockQ.data, profilesQ.data]);

  const registration = useMemo(() => {
    const blocked = stock.filter((r) => r.blocked && r.stock > 0);
    const soon = stock.filter((r) => r.certSoon);
    return {
      blocked: blocked.length,
      blockedValue: blocked.reduce((s, r) => s + r.value, 0),
      soon: soon.length,
      list: [...blocked, ...soon].sort((a, b) => (a.certDays ?? 0) - (b.certDays ?? 0)).slice(0, 6),
    };
  }, [stock]);

  const farmers = useMemo(() => {
    const rows = (farmersQ.data ?? []).map((f) => {
      const owed = Number(f.currentBalance || 0) || Number(f.totalOutstanding || 0);
      const since = f.lastPurchaseAt ? Math.floor((Date.now() - new Date(f.lastPurchaseAt).getTime()) / DAY) : null;
      const lateBy = owed > 0 && since !== null ? since - Number(f.creditDays || 60) : null;
      return { ...f, owed, lateBy, overdue: owed > 0 && lateBy !== null && lateBy > 0 };
    });
    const owing = rows.filter((f) => f.owed > 0);
    const overdue = rows.filter((f) => f.overdue).sort((a, b) => (b.lateBy ?? 0) - (a.lateBy ?? 0));
    return {
      total: rows.length,
      owed: owing.reduce((s, f) => s + f.owed, 0),
      owing: owing.length,
      overdue: overdue.length,
      overdueAmount: overdue.reduce((s, f) => s + f.owed, 0),
      list: overdue.slice(0, 6),
    };
  }, [farmersQ.data]);

  const season = useMemo(() => {
    const list = (plansQ.data ?? []).flatMap((p) => {
      const toSow = daysTo(thisYear(p.sowingStart));
      const sowEnd = daysTo(thisYear(p.sowingEnd));
      const now = toSow !== null && sowEnd !== null && toSow <= 0 && sowEnd >= 0;
      const soon = toSow !== null && toSow > 0 && toSow <= 45;
      if (!now && !soon) return [];
      // Match the crop to stock both ways, as the seasonal calendar does.
      const key = (p.cropName || '').trim().toLowerCase();
      const items = stock.filter((r) => r.crops.some((c) => {
        const k = c.trim().toLowerCase();
        return k === key || k.includes(key) || key.includes(k);
      }));
      const out = items.filter((i) => i.isOut).length;
      return [{ id: p.id, crop: p.cropName, toSow: toSow ?? 0, now, items: items.length, out, risky: items.length === 0 || out > 0 }];
    });
    return { list: list.sort((a, b) => Number(b.risky) - Number(a.risky) || a.toSow - b.toSow).slice(0, 6), risky: list.filter((s) => s.risky).length };
  }, [plansQ.data, stock]);

  const subsidy = useMemo(() => {
    const stuck = (subsidyQ.data ?? []).filter((c) => c.status === 'PENDING' || c.status === 'APPROVED');
    return { count: stuck.length, amount: stuck.reduce((s, c) => s + Number(c.subsidyAmount || 0), 0), list: stuck.slice(0, 6) };
  }, [subsidyQ.data]);

  return { registration, farmers, season, subsidy, loading: farmersQ.isLoading || stockQ.isLoading };
}
