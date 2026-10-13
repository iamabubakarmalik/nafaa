/**
 * Unit tabs for goods counted one by one. Each reads the industry's own
 * stock report (IMEI ages and PTA for phones, serials and warranty for
 * electronics and appliances) and maps it into the shared DeviceUnits view.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShopParam } from '@core/stores/auth.store';
import { useReportMasked } from '@modules/reports/prefs';
import { mobileReportsApi } from '@industries/mobile/api/mobile-reports.api';
import { PTA_STATUS_LABELS } from '@industries/mobile/api/imei.api';
import { electronicsAnalyticsApi } from '@industries/electronics/api/analytics.api';
import { CONDITION_META } from '@industries/electronics/constants';
import { appliancesAnalyticsApi } from '@industries/appliances/api/analytics.api';
import { DeviceUnits, type DeviceReport } from './DeviceUnits';

const WARRANTY_SOON = 60;

/** Phones: new by IMEI, used by their buy-back record, with PTA status. */
export function MobileDevices() {
  const shop = useShopParam();
  const { cost } = useReportMasked();
  const q = useQuery({ queryKey: ['stock-report-phones', shop], queryFn: () => mobileReportsApi.stockAging(shop) });
  const pta = useQuery({ queryKey: ['stock-report-pta'], queryFn: () => mobileReportsApi.ptaBreakdown(), retry: false });
  const data = useMemo<DeviceReport | undefined>(() => {
    const d = q.data;
    if (!d) return undefined;
    return {
      unitLabel: 'IMEI',
      buckets: d.buckets.map((b) => ({ key: b.key, label: b.label, units: b.phones + b.usedPhones, cost: b.phoneValue + b.usedValue })),
      units: d.items.map((i) => ({
        id: i.id, name: [i.name, i.variantName].filter(Boolean).join(' · '), ref: i.ref, brand: i.brand,
        tag: i.kind === 'USED' ? `Used${i.condition ? ` · ${i.condition}` : ''}` : i.ptaStatus ? PTA_STATUS_LABELS[i.ptaStatus] : null,
        cost: i.cost, price: i.price, ageDays: i.ageDays, bucket: i.bucket, warrantyDaysLeft: null,
      })),
      dead: { count: d.deadStock.count, cost: d.deadStock.value },
      warranty: [],
      totals: { units: d.totals.phones + d.totals.usedPhones, cost: d.totals.phoneValue + d.totals.usedValue, retail: d.items.reduce((a, i) => a + i.price, 0) },
      chips: [
        { label: 'Naye phone', value: `${d.totals.phones} · ${cost(d.totals.phoneValue)}` },
        { label: 'Used phone', value: `${d.totals.usedPhones} · ${cost(d.totals.usedValue)}` },
        ...(pta.data ?? []).filter((p) => p.count > 0).map((p) => ({ label: PTA_STATUS_LABELS[p.ptaStatus], value: String(p.count) })),
      ],
    };
  }, [q.data, pta.data, cost]);
  return <DeviceUnits data={data} loading={q.isLoading} error={q.error} />;
}

/** Electronics: serial-tracked units with condition and warranty. */
export function ElectronicsSerials() {
  const shop = useShopParam();
  const q = useQuery({ queryKey: ['stock-report-electronics', shop], queryFn: () => electronicsAnalyticsApi.stock(shop) });
  const data = useMemo<DeviceReport | undefined>(() => {
    const d = q.data;
    if (!d) return undefined;
    const units = d.serials.map((s) => ({
      id: s.id, name: s.name, ref: s.imei ?? s.serialNumber, brand: s.brand,
      tag: s.conditionType ? CONDITION_META[s.conditionType]?.label ?? s.conditionType : null,
      cost: s.cost, price: s.price, ageDays: s.ageDays, bucket: s.bucket, warrantyDaysLeft: s.warrantyDaysLeft,
    }));
    return {
      unitLabel: 'Serial',
      buckets: d.buckets.map((b) => ({ key: b.key, label: b.label, units: b.units, cost: b.value })),
      units,
      dead: { count: d.deadStock.count, cost: d.deadStock.value },
      warranty: units.filter((u) => u.warrantyDaysLeft !== null && u.warrantyDaysLeft <= WARRANTY_SOON).sort((a, b) => a.warrantyDaysLeft! - b.warrantyDaysLeft!),
      totals: { units: d.totals.serialUnits, cost: d.totals.serialValue, retail: units.reduce((a, u) => a + u.price, 0) },
      chips: [{ label: 'Baghair serial ka maal', value: `${d.totals.productLines} cheezein · ${d.totals.productUnits} units` }],
    };
  }, [q.data]);
  return <DeviceUnits data={data} loading={q.isLoading} error={q.error} />;
}

/** Appliances: serial units with warranty, compressor/motor cover and installs still pending. */
export function AppliancesSerials() {
  const q = useQuery({ queryKey: ['stock-report-appliances'], queryFn: () => appliancesAnalyticsApi.stock() });
  const data = useMemo<DeviceReport | undefined>(() => {
    const d = q.data;
    if (!d) return undefined;
    const units = d.serials.map((s) => ({
      id: s.id, name: [s.name, s.capacity].filter(Boolean).join(' · '), ref: s.serialNumber, brand: s.brand,
      tag: s.modelNumber, cost: s.cost, price: s.price, ageDays: s.ageDays, bucket: s.bucket,
      warrantyDaysLeft: [s.warrantyDaysLeft, s.compressorDaysLeft, s.motorDaysLeft].filter((x): x is number => x !== null).sort((a, b) => a - b)[0] ?? null,
    }));
    return {
      unitLabel: 'Serial',
      buckets: d.buckets.map((b) => ({ key: b.key, label: b.label, units: b.units, cost: b.value })),
      units,
      dead: { count: d.deadStock.count, cost: d.deadStock.value },
      warranty: units.filter((u) => u.warrantyDaysLeft !== null && u.warrantyDaysLeft <= WARRANTY_SOON).sort((a, b) => a.warrantyDaysLeft! - b.warrantyDaysLeft!),
      totals: { units: d.totals.serialUnits, cost: d.totals.serialValue, retail: units.reduce((a, u) => a + u.price, 0) },
      chips: [
        { label: 'Bik gaya, laga nahi', value: String(d.pendingInstall.count) },
        { label: 'Baghair serial ka maal', value: `${d.totals.productLines} cheezein · ${d.totals.productUnits} units` },
      ],
    };
  }, [q.data]);
  return <DeviceUnits data={data} loading={q.isLoading} error={q.error} />;
}
