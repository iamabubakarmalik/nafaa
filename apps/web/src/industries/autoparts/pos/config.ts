/**
 * Auto parts counter on the shared POS engine. Every part carries its part
 * number, OEM and other numbers, brand and the vehicles it fits, so "corolla
 * brake" or a part number finds it. Genuine, local and used parts are marked
 * on the card. Vehicles whose job is finished show under "Gaari wapsi"; a
 * click (or scanning the job number) takes the money and hands the vehicle
 * back with its bill.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, Car, Globe2, Recycle, Wrench, Zap } from 'lucide-react';
import type { Product } from '@modules/inventory/products/api/products.api';
import { useProductCatalog, type PosEngineApi, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useShopParam } from '@core/stores/auth.store';
import { workshopJobsApi, type WorkshopJob } from '../api/workshop-jobs.api';
import { JOB_KEY, conditionOf, statusOf } from '../components/meta';
import { PART_FACTS_KEY, partSearchText, usePartFacts } from '../hooks/usePartFacts';
import { JobHandover } from './JobHandover';

type Kind = 'part' | 'job';
const kindOf = (it: PosItem) => it.meta?.kind as Kind | undefined;

const GOOD = ['GENUINE', 'OEM'];
const OTHER = ['AFTERMARKET', 'LOCAL'];
const SECOND = ['USED', 'REFURBISHED'];

const jobProduct = (j: WorkshopJob, due: number) => ({
  id: `job:${j.id}`, name: j.registrationNumber ?? j.jobNumber, sku: j.jobNumber, barcode: null, unit: 'pcs', price: due,
  costPrice: 0, isActive: true, images: [],
}) as unknown as Product;

/** Finished vehicles waiting to go back, priced at what is still due. */
function jobItems(list: WorkshopJob[]): PosItem[] {
  return list.map((j) => {
    const due = Math.max((Number(j.total) || 0) - (Number(j.paidAmount) || 0), 0);
    const car = [j.registrationNumber, j.makeName, j.modelName].filter(Boolean).join(' ');
    return {
      id: `job:${j.id}`,
      product: jobProduct(j, due),
      name: `${car || j.jobNumber}${j.customerName ? ` — ${j.customerName}` : ''}`,
      price: due,
      stock: 1,
      unit: 'pcs',
      searchText: [j.jobNumber, j.registrationNumber, j.customerName, j.customerPhone, 'job gaari'].filter(Boolean).join(' '),
      rank: 3,
      badges: [{ label: statusOf(j.status).label, tone: 'success' as const, icon: Wrench }],
      subline: `${j.jobNumber} · ${due > 0 ? 'baqi' : 'kuch baqi nahi'}`,
      meta: { kind: 'job' satisfies Kind, job: j },
    };
  });
}

function useAutoPartsCatalog() {
  const shopId = useShopParam();
  const canHandOver = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const facts = usePartFacts();
  const parts = useProductCatalog((it): PosItem => {
    const f = facts.get(it.id);
    if (!f) return { ...it, meta: { ...it.meta, kind: 'part' satisfies Kind } };
    const c = conditionOf(f.condition);
    return {
      ...it,
      badges: [
        ...(f.condition !== 'NEW' ? [{ label: c.label, tone: GOOD.includes(f.condition) ? 'success' as const : SECOND.includes(f.condition) ? 'neutral' as const : 'info' as const }] : []),
        ...(f.isFastMoving ? [{ label: 'Zyada bikta', tone: 'brand' as const, icon: Zap }] : []),
      ],
      subline: [f.partNumber, f.brand, f.universal ? 'Har gaari' : f.fitment].filter(Boolean).join(' · ') || undefined,
      searchText: [it.searchText, partSearchText(f)].filter(Boolean).join(' '),
      meta: { ...it.meta, kind: 'part' satisfies Kind, condition: f.condition, universal: f.universal, fits: !!f.fitment, warrantyMonths: f.warrantyMonths },
    };
  }, [facts]);
  const jobs = useQuery({
    queryKey: [JOB_KEY, 'handover', shopId],
    queryFn: () => workshopJobsApi.page({ view: 'ready', shopId: shopId || undefined, limit: 200 }),
    enabled: canHandOver,
    staleTime: 15_000,
  });
  const items = useMemo(() => [...parts.items, ...jobItems(jobs.data?.items ?? [])], [parts.items, jobs.data]);
  return { items, loading: parts.loading, refreshKeys: [...parts.refreshKeys, PART_FACTS_KEY, JOB_KEY] };
}

function handOver(item: PosItem, api: PosEngineApi) {
  if (!navigator.onLine) { toast.error('Internet nahi — gaari wapas dena sirf online hota hai. Parts offline bik sakte hain.'); return; }
  api.openPicker(createElement(JobHandover, { job: item.meta?.job as WorkshopJob, onClose: api.closePicker }));
}

const filters: PosFilter[] = [
  { id: 'genuine', label: 'Genuine / OEM', icon: BadgeCheck, match: (i) => GOOD.includes(String(i.meta?.condition)) },
  { id: 'local', label: 'Local / aftermarket', icon: Globe2, match: (i) => OTHER.includes(String(i.meta?.condition)) },
  { id: 'used', label: 'Used / kabari', icon: Recycle, match: (i) => SECOND.includes(String(i.meta?.condition)) },
  { id: 'universal', label: 'Har gaari ka', icon: Car, match: (i) => !!i.meta?.universal },
  { id: 'jobs', label: 'Gaari wapsi', icon: Wrench, match: (i) => kindOf(i) === 'job' },
];

export const autoPartsPos: PosIndustryConfig = {
  id: 'autoparts',
  label: 'Auto parts',
  useCatalog: useAutoPartsCatalog,
  quickKeys: true,
  filters,
  searchHint: 'Part ka naam, part number, gaari (corolla brake) — ya job number',
  receiptFooter: 'Bijli ka saman aur fit kiya hua part wapas nahi hota. Part wapas karna ho to bill aur dabba saath laayein.',
  beforeAdd: (item, opts, api) => {
    if (kindOf(item) === 'job') { handOver(item, api); return 'handled'; }
    const months = Number(item.meta?.warrantyMonths) || 0;
    if (months > 0 && !opts.warrantyMonths) {
      api.addItem(item, { ...opts, warrantyMonths: months });
      return 'handled';
    }
    return 'continue';
  },
  scan: async (code, api) => {
    const lower = code.trim().toLowerCase();
    if (lower.length < 5) return false;
    const it = api.items.find((x) => kindOf(x) === 'job' && (x.meta?.job as WorkshopJob).jobNumber.toLowerCase() === lower);
    if (!it) return false;
    handOver(it, api);
    return true;
  },
  voiceAliases: {
    plug: 'plug spark', filter: 'filter', oil: 'oil engine', mobil: 'mobil oil', brake: 'brake pad shoe', shoe: 'brake shoe',
    clutch: 'clutch plate', battery: 'battery', bulb: 'bulb light', tyre: 'tyre tire', tube: 'tube',
  },
};
