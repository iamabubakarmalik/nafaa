/**
 * Appliance sales history: the shared history, and under each bill the
 * serial units that left with it (warranty end and fitting state), and for
 * job bills (installation, repair, AMC, delivery, warranty claim, old unit
 * sold on) a link to the job.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Barcode, FileSignature, HardHat, Recycle, Shield, Truck, Wrench } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { SERIAL_KEY, dayOnly, installStatusOf } from '../components/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem]';

/** Job behind a job bill, from its number (INST-2026-0001, SR-…, AMC-…, APDL-…, WC-…, ATI-… for an old unit sold on; "-2" after a void). */
const JOBS: Array<{ re: RegExp; label: string; to: (n: string) => string; icon: typeof Wrench; cls: string }> = [
  { re: /^INST-\d{4}-\d+/, label: 'Installation', to: (n) => `/appliances/installations?q=${n}&view=all`, icon: HardHat, cls: 'bg-blue-50 text-blue-700' },
  { re: /^SR-\d{4}-\d+/, label: 'Repair', to: (n) => `/appliances/service-requests?q=${n}&view=all`, icon: Wrench, cls: 'bg-violet-50 text-violet-700' },
  { re: /^AMC-\d{4}-\d+/, label: 'AMC', to: () => '/appliances/amc-contracts?view=all', icon: FileSignature, cls: 'bg-emerald-50 text-emerald-700' },
  { re: /^APDL-\d{4}-\d+/, label: 'Delivery', to: (n) => `/appliances/deliveries?q=${n}&view=all`, icon: Truck, cls: 'bg-amber-50 text-amber-800' },
  { re: /^WC-\d{4}-\d+/, label: 'Warranty claim', to: () => '/appliances/warranty-claims', icon: Shield, cls: 'bg-sky-50 text-sky-700' },
  { re: /^ATI-\d{4}-\d+/, label: 'Purana saman', to: (n) => `/appliances/trade-ins?q=${n}`, icon: Recycle, cls: 'bg-amber-50 text-amber-800' },
];

function useApplianceExtras(sales: HistorySale[]) {
  const ids = useMemo(() => sales.filter((s) => !s.pending).map((s) => s.id), [sales]);
  const { data } = useQuery({
    queryKey: [SERIAL_KEY, 'for-sales', ids],
    queryFn: () => applianceSerialApi.forSales(ids).catch(() => []),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  return (sale: HistorySale) => {
    const units = (data ?? []).filter((u) => u.saleId === sale.id);
    const job = JOBS.find((j) => j.re.test(sale.saleNumber));
    if (!units.length && !job) return null;
    const number = job ? (job.re.exec(sale.saleNumber)?.[0] ?? sale.saleNumber) : '';
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      job ? createElement(Link, { key: 'job', to: job.to(number), className: `${chip} font-semibold hover:underline ${job.cls}` }, createElement(job.icon, { className: 'h-3 w-3' }), `${job.label} ${number}`) : null,
      ...units.map((u) => createElement('span', { key: u.id, className: `${chip} bg-slate-100 font-mono text-slate-600` },
        createElement(Barcode, { className: 'h-3 w-3' }), u.serialNumber,
        u.warrantyEndDate ? createElement('span', { className: 'font-sans text-emerald-700' }, `· warranty ${dayOnly(u.warrantyEndDate)}`) : null,
        u.shopWarrantyEndDate ? createElement('span', { className: 'font-sans text-emerald-700' }, `· dukaan ${dayOnly(u.shopWarrantyEndDate)}`) : null,
        u.installationStatus && u.installationStatus !== 'PENDING' ? createElement('span', { className: 'font-sans text-blue-700' }, `· ${installStatusOf(u.installationStatus).label}`) : null)),
    );
  };
}

const config: SalesHistoryConfig = { label: 'Appliances', useBillExtras: useApplianceExtras };

export default function AppliancesSalesPage() {
  return <SalesHistoryPage config={config} />;
}
