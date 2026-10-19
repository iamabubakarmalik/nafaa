/**
 * Service-business counter on the shared POS engine: rate-list services
 * (service lines, no stock), parts and materials the shop keeps, and jobs
 * that are ready for their bill. A click on a ready job (or scanning its
 * job number) takes the money and closes it with its bill; services and
 * parts sold over the counter are a normal sale.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Box, CheckCircle2, Wrench } from 'lucide-react';
import type { Product } from '@modules/inventory/products/api/products.api';
import { useProductCatalog, type PosEngineApi, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useShopParam } from '@core/stores/auth.store';
import { jobsApi, type ServiceJob } from '../api/jobs.api';
import { JOB_KEY, itemName, statusOf } from '../components/meta';
import { JobHandover } from './JobHandover';

type Kind = 'service' | 'part' | 'job';
const kindOf = (it: PosItem) => it.meta?.kind as Kind | undefined;
/** Services carry no stock; the counter must never stop them for it. */
const SERVICE_STOCK = 9999;

const jobProduct = (j: ServiceJob, due: number) => ({
  id: `job:${j.id}`, name: j.serviceName, sku: j.jobNumber, barcode: null, unit: 'pcs', price: due, costPrice: 0, isActive: true, images: [],
}) as unknown as Product;

/** Jobs ready for their bill, priced at what is still due. */
function jobItems(list: ServiceJob[]): PosItem[] {
  return list.map((j) => {
    const due = j.due ?? Math.max(j.totalCharge - j.paidAmount, 0);
    return {
      id: `job:${j.id}`,
      product: jobProduct(j, due),
      name: `${j.serviceName}${j.customerName ? ` — ${j.customerName}` : ''}`,
      price: due,
      stock: 1,
      unit: 'pcs',
      searchText: [j.jobNumber, j.customerName, j.customerPhone, itemName(j), 'job'].filter(Boolean).join(' '),
      rank: 3,
      badges: [{ label: statusOf(j.status).label, tone: 'success' as const, icon: CheckCircle2 }],
      subline: `${j.jobNumber} · ${due > 0 ? 'baqi' : 'kuch baqi nahi'}`,
      meta: { kind: 'job' satisfies Kind, job: j },
    };
  });
}

function useServicesCatalog() {
  const shopId = useShopParam();
  const canBill = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const catalog = useProductCatalog((it): PosItem => {
    const type = String((it.product as { productType?: string | null }).productType ?? '').toUpperCase();
    const isService = it.unit.toLowerCase() === 'service' || type === 'SERVICE' || String(it.product.sku ?? '').startsWith('SVCB-');
    return isService
      ? { ...it, stock: SERVICE_STOCK, rank: 0, badges: [{ label: 'Service', tone: 'info' as const, icon: Wrench }], meta: { ...it.meta, kind: 'service' satisfies Kind } }
      : { ...it, rank: 1, meta: { ...it.meta, kind: 'part' satisfies Kind } };
  }, []);
  const jobs = useQuery({
    queryKey: [JOB_KEY, 'counter', shopId],
    queryFn: () => jobsApi.page({ view: 'ready', shopId: shopId || undefined, limit: 200 }),
    enabled: canBill,
    staleTime: 15_000,
  });
  const items = useMemo(() => [...catalog.items, ...jobItems(jobs.data?.items ?? [])], [catalog.items, jobs.data]);
  return { items, loading: catalog.loading, refreshKeys: [...catalog.refreshKeys, JOB_KEY] };
}

function billJob(item: PosItem, api: PosEngineApi) {
  if (!navigator.onLine) { toast.error('Internet nahi — job ka bill sirf online banta hai. Services aur parts offline bik sakte hain.'); return; }
  api.openPicker(createElement(JobHandover, { job: item.meta?.job as ServiceJob, onClose: api.closePicker }));
}

const filters: PosFilter[] = [
  { id: 'services', label: 'Services', icon: Wrench, match: (i) => kindOf(i) === 'service' },
  { id: 'parts', label: 'Parts / saman', icon: Box, match: (i) => kindOf(i) === 'part' },
  { id: 'jobs', label: 'Tayyar jobs', icon: CheckCircle2, match: (i) => kindOf(i) === 'job' },
];

export const servicesBizPos: PosIndustryConfig = {
  id: 'services-biz',
  label: 'Services',
  useCatalog: useServicesCatalog,
  quickKeys: true,
  filters,
  searchHint: 'Service, part ka naam / barcode — ya job number',
  receiptFooter: 'Kaam ki warranty bill ke saath. Shikayat ho to ye bill saath laayein.',
  beforeAdd: (item, _opts, api) => {
    if (kindOf(item) === 'job') { billJob(item, api); return 'handled'; }
    return 'continue';
  },
  scan: async (code, api) => {
    const lower = code.trim().toLowerCase();
    if (!lower.startsWith('job-')) return false;
    const it = api.items.find((x) => kindOf(x) === 'job' && (x.meta?.job as ServiceJob).jobNumber.toLowerCase() === lower);
    if (!it) return false;
    billJob(it, api);
    return true;
  },
  voiceAliases: { service: 'service', gas: 'gas refill', wire: 'wire taar', pipe: 'pipe' },
};
