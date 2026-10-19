/**
 * Mobile shop products on the shared page: phones show how many units are on
 * the shelf by IMEI, and a banner lists models whose stock and IMEIs differ.
 * Scanning an IMEI that is not a product barcode opens its record.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Hash, Recycle, ShieldCheck, Smartphone } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { useShopParam } from '@core/stores/auth.store';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { imeiApi } from '../api/imei.api';

function HeroLinks() {
  return (
    <>
      <Link to="/imei-inventory" className={heroButton}><Smartphone className="h-4 w-4" /><span className="hidden sm:inline">IMEI</span></Link>
      <Link to="/used-phones" className={heroButton}><Recycle className="h-4 w-4" /><span className="hidden sm:inline">Used phones</span></Link>
    </>
  );
}

/** Models whose branch stock is not the number of phones on the shelf. */
function ImeiMismatch() {
  const shopId = useShopParam();
  const { data = [] } = useQuery({ queryKey: ['mobile-imei-shelf', shopId], queryFn: () => imeiApi.shelfCounts(shopId), staleTime: 30_000 });
  const off = data.filter((r) => Math.round(r.stock) !== r.inStock);
  if (!off.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 ring-1 ring-violet-200/70">
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-violet-900">
        <Hash className="h-4 w-4 text-violet-600" />{off.length} phone models ka stock aur IMEI barabar nahi:
      </span>
      {off.slice(0, 5).map((r) => (
        <Link key={r.productId} to={`/products/${r.productId}/imei`} className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100">
          {r.name} · stock {Math.round(r.stock)} / IMEI {r.inStock}
        </Link>
      ))}
      <span className="ml-auto text-[0.75rem] text-violet-800">Purchase ke baad IMEI daalna na bhoolein</span>
    </div>
  );
}

const config: ProductsPageConfig = {
  label: 'Mobile',
  noun: 'model',
  paths: {
    detail: (id) => `/mobile-products/${id}`,
    edit: (id) => `/mobile-products/${id}/edit`,
    create: '/mobile-products/new',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  extras: (item) => {
    const tracked = item.productType === 'PHONE' || item.counts.imeis > 0;
    if (!tracked) return { line: item.brand?.name };
    return {
      line: [item.brand?.name, item.variants.length ? `${item.variants.length} variants` : ''].filter(Boolean).join(' · ') || undefined,
      badges: <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Smartphone className="h-3 w-3" />IMEI</span>,
      actions: (
        <Link to={`/products/${item.id}/imei`} title="IMEI dekhein" aria-label="IMEI dekhein" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
          <Hash className="h-4 w-4" />
        </Link>
      ),
    };
  },
  columns: [
    {
      id: 'kind', label: 'Kaisa', cell: (i) => {
        const phone = i.productType === 'PHONE' || i.counts.imeis > 0;
        return <span className={cn('rounded-md px-1.5 py-0.5 text-[0.75rem] font-medium', phone ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>{phone ? 'Phone (IMEI)' : 'Accessory'}</span>;
      },
    },
  ],
  Banners: ImeiMismatch,
  onScanMiss: async (code, navigate) => {
    if (code.replace(/\D/g, '').length < 8) return false;
    const hit = await imeiApi.lookup(code).catch(() => null);
    if (!hit || (!hit.newPhones.length && !hit.usedPhones.length && !hit.repairs.length)) return false;
    toast.success('Ye IMEI mil gaya', { action: { label: 'Kholein', onClick: () => navigate(`/imei-inventory?q=${encodeURIComponent(code)}`) } });
    return true;
  },
  guide: [
    { icon: Smartphone, color: '#2563eb', title: 'Phone ka stock IMEI se', text: 'Har phone ka apna IMEI hai. Stock wohi hai jitne IMEI shelf par hain — purchase ke baad IMEI zaroor daalein.' },
    { icon: Hash, color: '#7c3aed', title: 'Jamni patti', text: 'Jis model ka stock aur IMEI barabar nahi, wo upar jamni patti me aata hai. Us par click kar ke IMEI theek karein.' },
    { icon: ShieldCheck, color: '#16a34a', title: 'Accessories', text: 'Charger, cover, handsfree ka IMEI nahi hota — unka stock aam ginti se chalta hai.' },
  ],
};

export default function MobileProductsPage() {
  return <ProductsPage config={config} />;
}
