/**
 * Clinic counter on the shared POS engine: consultation, procedures and lab
 * tests (service lines, no stock) next to the medicines the clinic keeps.
 * Filter chips split services, lab and medicines; bills go to the patient's
 * khata when sold on credit, like any other sale.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlaskConical, Pill, Stethoscope } from 'lucide-react';
import { useComboBundles, useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { SERVICE_CATEGORIES } from '../api/constants';
import { clinicServicesApi, type ClinicService } from '../api/services.api';

const LAB = ['LAB_TEST', 'IMAGING', 'DIAGNOSTIC'];
/** Services carry no stock; the counter must never stop them for it. */
const SERVICE_STOCK = 9999;

function useClinicCatalog() {
  const servicesQ = useQuery({ queryKey: ['clinic-services', 'pos'], queryFn: () => clinicServicesApi.list({ active: true }), staleTime: 5 * 60_000, retry: 1 });
  const byName = useMemo(() => new Map<string, ClinicService>((servicesQ.data ?? []).map((s) => [(s.product?.name ?? s.name ?? '').toLowerCase(), s])), [servicesQ.data]);
  const catalog = useProductCatalog((it): PosItem => {
    const svc = byName.get(it.name.toLowerCase());
    const type = String((it.product as { productType?: string | null }).productType ?? '').toUpperCase();
    const isService = !!svc || it.unit.toLowerCase() === 'service' || type === 'SERVICE';
    const cat = svc ? SERVICE_CATEGORIES.find((c) => c.value === svc.category) : undefined;
    return {
      ...it,
      stock: isService ? SERVICE_STOCK : it.stock,
      badges: isService ? [{ label: cat?.label ?? 'Service', tone: 'info' as const, icon: LAB.includes(svc?.category ?? '') ? FlaskConical : Stethoscope }] : it.badges,
      subline: svc?.durationMin ? `${svc.durationMin} min${svc.requiresFasting ? ' · tayyari zaroori' : ''}` : it.subline,
      searchText: [it.searchText, svc?.serviceCode, cat?.label].filter(Boolean).join(' '),
      rank: isService ? 0 : 1,
      meta: { service: isService, category: svc?.category ?? null },
    };
  }, [byName]);
  // The fee line is billed only from appointments and lab orders.
  const items = useMemo(() => catalog.items.filter((i) => i.product.sku !== 'CLINIC-FEE'), [catalog.items]);
  return { ...catalog, items, refreshKeys: [...catalog.refreshKeys, 'clinic-services'] };
}

const filters: PosFilter[] = [
  { id: 'services', label: 'Services', icon: Stethoscope, match: (i) => !!i.meta?.service && !LAB.includes(String(i.meta?.category ?? '')) },
  { id: 'lab', label: 'Lab / X-ray', icon: FlaskConical, match: (i) => LAB.includes(String(i.meta?.category ?? '')) },
  { id: 'medicine', label: 'Dawai', icon: Pill, match: (i) => !i.meta?.service },
];

export const clinicPos: PosIndustryConfig = {
  id: 'clinic',
  label: 'Clinic',
  useCatalog: useClinicCatalog,
  useBundles: useComboBundles,
  quickKeys: true,
  filters,
  searchHint: 'Service, test ya dawai ka naam / barcode',
  receiptFooter: 'Dawai doctor ki hidayat ke mutabiq lein. Agli visit par ye bill saath laayein.',
  voiceAliases: { checkup: 'consultation', fees: 'consultation', goli: 'tablet', sharbat: 'syrup' },
};
