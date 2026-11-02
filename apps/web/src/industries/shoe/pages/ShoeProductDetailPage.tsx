/**
 * Shoe article detail on the shared page: who it is for, type, article,
 * season, MRP and Sale; a size × colour grid with pairs in this branch,
 * every branch and what sold in 30 days; and a warning for sizes that sell
 * but are finished.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Grid3x3, PackagePlus, Ruler } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { shoeProductsApi, type ShoeProductProfile, type SizeGrid } from '../api/products.api';
import { genderLabel, systemLabel, typeLabel } from '../components/meta';
import { t } from '@core/i18n';

interface Extra { profile: ShoeProductProfile | null; grid: SizeGrid | null }

const tone = (stock: number, alert: number) => (stock <= 0 ? 'bg-rose-50 text-rose-700' : stock <= alert ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700');

/** Sizes across, colours down (one row when there is no colour); each cell is a small tile. */
function Grid({ grid }: { grid: SizeGrid }) {
  const colors = grid.colors.length ? grid.colors : [''];
  const sizes = grid.sizes;
  if (!sizes.length) {
    return (
      <ul className="divide-y divide-slate-100">
        {grid.variants.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[0.8125rem] sm:px-5">
            <span className="font-medium text-slate-800">{v.name}{v.barcode && <span className="ms-2 font-mono text-[0.6875rem] text-slate-400">{v.barcode}</span>}</span>
            <span className={cn('rounded-lg px-2 py-0.5 font-semibold tabular-nums', tone(v.stock, v.lowStockAlert))}>{t('{{stock}} · {{sold30}} bike', { stock: Math.round(v.stock), sold30: Math.round(v.sold30) })}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-4 p-4 sm:p-5">
      {colors.map((c) => (
        <div key={c || 'all'}>
          {c && <p className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{c}</p>}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {sizes.map((s) => {
              const v = grid.variants.find((x) => x.size === s && (x.colorName ?? '') === c);
              if (!v) return <div key={s} className="rounded-xl border border-dashed border-slate-200 p-2 text-center text-[0.75rem] text-slate-300">{s}</div>;
              return (
                <div key={s} title={v.byShop.map((b) => `${b.name}: ${b.stock}`).join(' · ')} className={cn('rounded-xl p-2 text-center ring-1 ring-black/5', tone(v.stock, v.lowStockAlert), !v.isActive && 'opacity-50')}>
                  <p className="text-[0.75rem] font-medium">{s}</p>
                  <p className="text-lg font-bold tabular-nums">{Math.round(v.stock)}</p>
                  <p className="text-[0.6875rem] opacity-80">{t('{{sold30}} bike{{value}}', { sold30: Math.round(v.sold30), value: grid.shops.length > 1 ? t(' · kul {{allStock}}', { allStock: Math.round(v.allStock) }) : '' })}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const config: DetailConfig<Extra> = {
  label: t('Shoes'),
  paths: { list: '/shoe-products', edit: (id) => `/shoe-products/${id}/edit` },
  stockChips: [1, 2, 6, 12, 24],
  extra: {
    key: 'shoe-product-detail-extra',
    load: async (id) => {
      const [profile, grid] = await Promise.all([
        shoeProductsApi.byProduct(id).catch(() => null),
        shoeProductsApi.sizeGrid(id).catch(() => null),
      ]);
      return { profile, grid: grid && grid.variants.length ? grid : null };
    },
  },
  badges: ({ extra, product }) => {
    const p = extra?.profile;
    if (!p) return null;
    const price = Number(product.price);
    const off = p.mrp && price > 0 && p.mrp > price ? Math.round(((p.mrp - price) / p.mrp) * 100) : 0;
    return (
      <>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700">{genderLabel(p.gender)}</span>
        {p.categoryType && <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[0.75rem] font-medium text-orange-700">{typeLabel(p.categoryType)}</span>}
        {off > 0 && <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[0.75rem] font-bold text-white">{t('Sale {{off}}%', { off })}</span>}
        {p.isNewArrival && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700">{t('Naya')}</span>}
        {p.isBridal && <span className="rounded-md bg-pink-50 px-2 py-0.5 text-[0.75rem] font-semibold text-pink-700">{t('Bridal')}</span>}
      </>
    );
  },
  facts: ({ extra }) => {
    const p = extra?.profile;
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      [t('Article'), p.modelCode || '—'],
      [t('Season'), p.season || '—'],
      [t('Size system'), systemLabel(p.sizeSystem)],
      ['MRP', p.mrp ? formatPKR(p.mrp) : '—'],
      [t('Fitting'), p.runsSmall ? t('Chhota aata hai — ek size bara dein') : p.runsLarge ? t('Bara aata hai — ek size chhota dein') : t('Sahi size')],
      [t('Material'), [p.upperMaterial, p.soleMaterial && t('sole {{soleMaterial}}', { soleMaterial: p.soleMaterial })].filter(Boolean).join(' · ') || '—'],
      [t('Warranty'), p.warrantyMonths ? t('{{count}} mahine', { count: p.warrantyMonths }) : '—'],
    ];
    if (p.sizingNotes) rows.push([t('Fitting ki baat'), p.sizingNotes]);
    return rows;
  },
  tile: ({ extra }) => {
    const g = extra?.grid;
    if (!g) return null;
    const active = g.variants.filter((v) => v.isActive);
    const empty = active.filter((v) => v.stock <= 0).length;
    return { label: t('Sizes'), value: `${active.length - empty}/${active.length}`, hint: empty ? t('{{empty}} khatam', { empty }) : t('Sab stock me') };
  },
  alerts: ({ extra }) => {
    const empty = (extra?.grid?.variants ?? []).filter((v) => v.isActive && v.stock <= 0 && v.sold30 > 0);
    if (!empty.length) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
        <Ruler className="h-4 w-4" />
        <span className="text-[0.875rem] font-medium">{t('Bikne wale size khatam: {{value}}', { value: empty.map((v) => v.name).join(', ') })}</span>
        <Link to="/purchases/new" className="ms-auto inline-flex items-center gap-1 text-[0.8125rem] font-semibold hover:underline"><PackagePlus className="h-4 w-4" />{t('Purchase')}</Link>
      </div>
    );
  },
  tabs: [
    {
      id: 'sizes', label: t('Sizes'), icon: Grid3x3, when: ({ extra }) => !!extra?.grid,
      render: ({ extra }) => (
        <Card className="rounded-2xl" flush title={t('Har size ke joray')} description={t('Is branch ka stock · pichle 30 din ki Sale. Khane par mouse rakhein to har branch ka stock.')}>
          <Grid grid={extra!.grid!} />
        </Card>
      ),
    },
  ],
  guide: [
    { icon: Grid3x3, color: '#ea580c', title: t('Sizes'), text: t('Har size (aur rang) ke joray is branch me — laal khatam, peela kam. Doosri branch me ho to Transfer karein.') },
  ],
};

export default function ShoeProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
