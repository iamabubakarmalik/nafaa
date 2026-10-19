/** Appliance product detail on the shared product page: type and size, warranty, fitting, and its serial units. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Barcode, HardHat, ShieldCheck } from 'lucide-react';
import { Card } from '@/design-system/components';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { applianceProductsApi, type ApplianceProductProfile } from '../api/products.api';
import { applianceSerialApi, type ApplianceSerial } from '../api/serial-tracking.api';
import { Pill } from '../components/ui';
import { catLabel, dayOnly, serialStatusOf } from '../components/meta';
import { sizeLine } from './ApplianceProducts';

interface Extra { profile: ApplianceProductProfile | null; units: ApplianceSerial[]; total: number }

const config: DetailConfig<Extra> = {
  label: 'Appliance',
  paths: { list: '/products', edit: (id) => `/appliances-products/${id}/edit` },
  stockChips: [1, 2, 5, 10],
  extra: {
    key: 'appliance-product-detail',
    load: async (id) => {
      const [profile, units] = await Promise.all([
        applianceProductsApi.byProduct(id).catch(() => null),
        applianceSerialApi.list({ productId: id, limit: 50 }).catch(() => ({ items: [] as ApplianceSerial[], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } })),
      ]);
      return { profile, units: units.items, total: units.meta.total };
    },
  },
  badges: ({ extra }) => {
    const p = extra?.profile;
    if (!p) return null;
    return (
      <>
        {p.categoryType && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-800 ring-1 ring-sky-200">{catLabel(p.categoryType)}</span>}
        {p.warrantyMonths > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[0.75rem] font-semibold text-emerald-700"><ShieldCheck className="h-3 w-3" />{p.warrantyMonths} mahine</span>}
        {p.requiresInstallation && <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[0.75rem] font-semibold text-blue-700"><HardHat className="h-3 w-3" />Fitting</span>}
      </>
    );
  },
  facts: ({ extra, money }) => {
    const p = extra?.profile;
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Model', p.modelNumber], ['Size', sizeLine(p)], ['Rang', p.colorName], ['Bijli', p.powerConsumption],
      ['Warranty', p.warrantyMonths ? `${p.warrantyMonths} mahine (${p.warrantyType === 'SHOP' ? 'dukaan' : p.warrantyType === 'BOTH' ? 'company + dukaan' : 'company'})` : undefined],
      ['Compressor', p.compressorWarrantyMonths ? `${p.compressorWarrantyMonths} mahine` : undefined], ['Motor', p.motorWarrantyMonths ? `${p.motorWarrantyMonths} mahine` : undefined],
      ['Installation', p.requiresInstallation ? (p.installationCovered ? 'Free' : money(Number(p.installationCharge) || 0)) : undefined],
      ['MRP', p.mrp ? money(p.mrp) : undefined], ['Delivery', p.freeDelivery ? 'Free' : p.requiresLargeVehicle ? 'Bari gaari' : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra }) => (extra?.profile?.requiresSerial ? { label: 'Serial stock me', value: String(extra.units.filter((u) => u.status === 'IN_STOCK').length), hint: `${extra.total} kul register` } : null),
  alerts: ({ extra, stock }) => {
    const shelf = extra?.units.filter((u) => u.status === 'IN_STOCK').length ?? 0;
    if (!extra?.profile?.requiresSerial || extra.total > 50 || Math.round(stock) === shelf) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-violet-900 ring-1 ring-violet-200">
        <Barcode className="h-4 w-4" />
        <span className="text-[0.875rem] font-medium">Stock {Math.round(stock)} hai lekin {shelf} serial register me — naye maal ke serial jorein</span>
        <Link to="/appliances/serials" className="ml-auto text-[0.8125rem] font-semibold hover:underline">Serial register →</Link>
      </div>
    );
  },
  tabs: [
    {
      id: 'serials', label: 'Serial', icon: Barcode, when: ({ extra }) => !!extra?.units.length,
      render: ({ extra }) => (
        <Card className="rounded-2xl" flush title="Serial units" description={extra!.total > extra!.units.length ? `Pehle ${extra!.units.length} (kul ${extra!.total})` : undefined}>
          <ul className="divide-y divide-slate-100">
            {extra!.units.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-[0.875rem]">
                <Link to={`/appliances/serials?id=${u.id}`} className="font-mono font-semibold text-slate-900 hover:underline">{u.serialNumber}</Link>
                <span className="flex items-center gap-2 text-[0.8125rem] text-slate-500"><Pill meta={serialStatusOf(u.status)} />{u.status === 'SOLD' ? `${u.customerName ?? ''} · ${dayOnly(u.soldAt)}` : dayOnly(u.purchaseDate ?? u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ),
    },
  ],
  guide: [
    { icon: Barcode, color: '#7c3aed', title: 'Serial', text: 'Is product ke har unit ka serial, kis ko bika aur kab — tab "Serial" me.' },
    { icon: ShieldCheck, color: '#16a34a', title: 'Warranty', text: 'Warranty ke mahine product par hain; har unit ki warranty bill ki date se chalti hai.' },
  ],
};

export default function ApplianceProductDetail() {
  return <ProductDetailPage config={config} />;
}
