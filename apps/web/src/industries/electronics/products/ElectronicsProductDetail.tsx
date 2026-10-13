/** Electronics product detail: condition and type, specs, warranty, box contents and every serial. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Barcode, Cpu, Hash, ShieldCheck } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { electronicsProductsApi, type ElectronicsProductProfile } from '../api/products.api';
import { serialTrackingApi, type ElectronicsSerial } from '../api/serial-tracking.api';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '../constants';

interface Extra { profile: ElectronicsProductProfile | null; serials: ElectronicsSerial[] }

const STATUS: Record<string, string> = {
  IN_STOCK: 'Shelf par', SOLD: 'Bik gaya', IN_TRANSIT: 'Raaste mein', RESERVED: 'Rakha hua', RETURNED: 'Wapas aaya',
  IN_REPAIR: 'Repair mein', DEFECTIVE: 'Kharab', LOST: 'Gum',
};

const spec = (rows: Array<[string, ReactNode]>): Array<[string, ReactNode]> => rows.filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length));

const config: DetailConfig<Extra> = {
  label: 'Electronics',
  paths: { list: '/products', edit: (id) => `/electronics-products/${id}/edit` },
  stockChips: [1, 2, 5, 10, 25],
  extra: {
    // Own cache key: other screens keep the bare profile under 'electronics-profile'.
    key: 'electronics-product-detail-extra',
    load: async (id) => {
      const [profile, serials] = await Promise.all([
        electronicsProductsApi.byProduct(id).catch(() => null),
        serialTrackingApi.list({ productId: id }).catch(() => [] as ElectronicsSerial[]),
      ]);
      return { profile: profile ?? null, serials: Array.isArray(serials) ? (serials as ElectronicsSerial[]) : [] };
    },
  },
  badges: ({ extra }) => {
    const p = extra?.profile;
    if (!p) return null;
    const cond = p.conditionType ? CONDITION_META[p.conditionType as ConditionType] : null;
    return (
      <>
        {p.categoryType && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700">{CATEGORY_META[p.categoryType as CategoryType]?.emoji} {CATEGORY_META[p.categoryType as CategoryType]?.label}</span>}
        {cond && <span className={cn('rounded-md px-2 py-0.5 text-[0.75rem] font-semibold', cond.chip)}>{cond.label}</span>}
        {p.isBestSeller && <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[0.75rem] font-semibold text-orange-700">Best seller</span>}
        {p.isNewArrival && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700">Naya</span>}
      </>
    );
  },
  facts: ({ extra, product, money }) => {
    const p = extra?.profile;
    if (!p) return [];
    return spec([
      ['Model', p.modelNumber], ['Part number', p.partNumber],
      ['Rang', p.colorName ? <span className="inline-flex items-center gap-1.5">{p.colorHex && <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: p.colorHex }} />}{p.colorName}</span> : undefined],
      ['Warranty', p.warrantyMonths ? `${p.warrantyMonths} mahine · ${p.warrantyType ?? ''}` : 'Nahi'],
      ['MRP', p.mrp ? <span className={cn(product.price > p.mrp && 'text-rose-600')}>{money(p.mrp)}</span> : undefined],
    ]);
  },
  tile: ({ extra, stock }) => {
    const p = extra?.profile;
    if (!p?.requiresSerial) return null;
    const onShelf = extra!.serials.filter((s) => s.status === 'IN_STOCK').length;
    return { label: 'Serial shelf par', value: onShelf, hint: Math.round(stock) !== onShelf ? `stock se ${Math.abs(Math.round(stock) - onShelf)} ka farq` : 'stock ke barabar' };
  },
  alerts: ({ extra, stock, product, money }) => {
    const p = extra?.profile;
    if (!p) return null;
    const onShelf = extra!.serials.filter((s) => s.status === 'IN_STOCK').length;
    return (
      <>
        {p.requiresSerial && Math.round(stock) !== onShelf && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-violet-900 ring-1 ring-violet-200">
            <Hash className="h-4 w-4" /><span className="text-[0.875rem] font-medium">Stock {Math.round(stock)} hai magar shelf par {onShelf} serial — ginti dobara karein</span>
            <Link to={`/electronics/serials?product=${product.id}`} className="ml-auto text-[0.8125rem] font-semibold hover:underline">Serials →</Link>
          </div>
        )}
        {p.mrp && product.price > p.mrp && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] font-medium text-rose-900 ring-1 ring-rose-200">Rate {money(product.price)} hai — MRP {money(p.mrp)} se zyada. Grahak shikayat kar sakta hai.</div>
        )}
      </>
    );
  },
  tabs: [
    {
      id: 'specs', label: 'Specs', icon: Cpu, when: ({ extra }) => !!extra?.profile,
      render: ({ extra }) => {
        const p = extra!.profile!;
        const rows = spec([
          ['Battery', p.batteryCapacity], ['Battery kitne ghante', p.batteryLifeHours], ['Charge ka waqt (min)', p.chargingTimeMinutes], ['Power', p.powerRating],
          ['Connectivity', p.connectivity?.join(', ')], ['Screen', p.screenSize], ['Resolution', p.resolution], ['Refresh rate', p.refreshRate],
          ['OS', p.compatibleOS?.join(', ')], ['Kis ke saath', p.compatibleWith?.join(', ')], ['Paani se hifazat', p.waterResistance], ['Range', p.operatingRange],
          ['Wazan (g)', p.weightGrams], ['Naap (mm)', p.lengthMm || p.widthMm || p.heightMm ? `${p.lengthMm ?? '—'} × ${p.widthMm ?? '—'} × ${p.heightMm ?? '—'}` : undefined],
        ]);
        return (
          <Card className="rounded-2xl" title="Specs">
            {rows.length === 0 ? <p className="py-8 text-center text-[0.8125rem] text-slate-500">Specs nahi bhare — "Badlein" se bharein</p> : (
              <dl className="grid gap-x-8 sm:grid-cols-2">{rows.map(([l, v]) => <div key={l} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-[0.8125rem]"><dt className="text-slate-500">{l}</dt><dd className="text-right font-medium text-slate-800">{String(v)}</dd></div>)}</dl>
            )}
          </Card>
        );
      },
    },
    {
      id: 'warranty', label: 'Warranty', icon: ShieldCheck, when: ({ extra }) => !!extra?.profile,
      render: ({ extra }) => {
        const p = extra!.profile!;
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl" title="Warranty">
              <dl className="space-y-2 text-[0.875rem]">
                <div className="flex justify-between"><dt className="text-slate-500">Period</dt><dd className="font-semibold">{p.warrantyMonths ? `${p.warrantyMonths} mahine` : 'Koi nahi'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Kis ki</dt><dd>{p.warrantyType ?? '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">International</dt><dd>{p.hasInternationalWarranty ? 'Haan' : 'Nahi'}</dd></div>
              </dl>
              <Link to="/electronics/warranty-claims" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Warranty claims →</Link>
            </Card>
            <Card className="rounded-2xl" title="Dabbe mein">
              <div className="flex flex-wrap gap-1.5">
                {(p.boxContents ?? []).map((b) => <span key={b} className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.8125rem] text-slate-700">{b}</span>)}
                {p.hasManual && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.8125rem] text-slate-700">Manual</span>}
                {p.hasWarrantyCard && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.8125rem] text-slate-700">Warranty card</span>}
              </div>
            </Card>
          </div>
        );
      },
    },
    {
      id: 'serials', label: 'Serials', icon: Barcode, when: ({ extra }) => !!extra?.serials?.length || !!extra?.profile?.requiresSerial,
      render: ({ extra, cost, product }) => {
        const list = extra!.serials;
        const counts = list.reduce<Record<string, number>>((m, s) => ({ ...m, [s.status]: (m[s.status] ?? 0) + 1 }), {});
        return (
          <Card className="rounded-2xl" flush title="Serial / IMEI" description={Object.entries(counts).map(([k, v]) => `${STATUS[k] ?? k}: ${v}`).join(' · ') || 'Abhi koi serial nahi'}
            actions={<Link to={`/electronics/serials?product=${product.id}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab sambhalein →</Link>}>
            {list.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-[0.8125rem]">
                  <thead><tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Serial</th><th className="px-3 py-2.5">IMEI</th><th className="px-3 py-2.5">Halat</th><th className="px-3 py-2.5">Warranty tak</th><th className="px-5 py-2.5 text-right">Khareed</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-2 font-mono">{s.serialNumber}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{[s.imei, s.imei2].filter(Boolean).join(' / ') || '—'}</td>
                        <td className={cn('px-3 py-2 font-medium', s.status === 'IN_STOCK' ? 'text-success-700' : s.status === 'SOLD' ? 'text-slate-600' : 'text-amber-700')}>{STATUS[s.status] ?? s.status}</td>
                        <td className="px-3 py-2 text-slate-600">{s.warrantyEndDate ? new Date(s.warrantyEndDate).toLocaleDateString('en-PK') : '—'}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{s.purchasePrice ? cost(s.purchasePrice) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      },
    },
  ],
};

export default function ElectronicsProductDetail() {
  return <ProductDetailPage config={config} />;
}
