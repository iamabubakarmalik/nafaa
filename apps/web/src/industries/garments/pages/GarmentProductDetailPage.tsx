/**
 * Garment product detail on the shared page: who it is for, type, season,
 * collection and marks; a size × colour grid with stock in this branch
 * (and how many pieces are held for customers), every branch and what sold
 * in 30 days; and a warning for empty sizes.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Grid3x3, PackagePlus, Ruler } from 'lucide-react';
import { Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { collectionsApi, type GarmentCollection } from '../api/collections.api';
import { garmentProductsApi, type GarmentProductProfile, type SizeGrid } from '../api/products.api';
import { fabricLabel, garmentLabel, genderLabel, seasonLabel } from '../components/meta';

interface Extra { profile: GarmentProductProfile | null; grid: SizeGrid | null; collection: GarmentCollection | null }

/** Size rows × colour columns; a plain list when variants have no size/colour. */
function GridTable({ grid }: { grid: SizeGrid }) {
  const sizes = grid.sizes.length ? grid.sizes : [''];
  const colors = grid.colors.length ? grid.colors : [''];
  const cell = (s: string, c: string) => grid.variants.find((v) => (v.size ?? '') === s && (v.colorName ?? '') === c);
  const matrix = grid.sizes.length > 0 && grid.variants.every((v) => v.size);
  if (!matrix) {
    return (
      <ul className="divide-y divide-slate-100">
        {grid.variants.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[0.8125rem] sm:px-5">
            <span className="font-medium text-slate-800">{v.name}{v.barcode && <span className="ml-2 font-mono text-[0.6875rem] text-slate-400">{v.barcode}</span>}</span>
            <span className={cn('tabular-nums font-semibold', v.stock <= 0 ? 'text-rose-600' : v.stock <= v.lowStockAlert ? 'text-amber-700' : 'text-slate-900')}>{Math.round(v.stock)}{v.reserved > 0 ? ` (${Math.round(v.reserved)} hold)` : ''} · {Math.round(v.sold30)} bike</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Table minWidth="24rem">
      <THead><Tr>
        <Th className="px-4 py-2.5 sm:px-5">Size</Th>{colors.map((c) => <Th align="center" key={c} className="px-3 py-2.5">{c || 'Stock'}</Th>)}
      </Tr></THead>
      <TBody>
        {sizes.map((s) => (
          <Tr key={s}>
            <Td className="px-4 py-2 font-semibold sm:px-5">{s}</Td>
            {colors.map((c) => {
              const v = cell(s, c);
              if (!v) return <Td align="center" key={c} className="px-3 py-2 text-slate-300">—</Td>;
              return (
                <Td align="center" key={c} className="px-3 py-2" title={v.byShop.map((b) => `${b.name}: ${b.stock}`).join(' · ')}>
                  <span className={cn('inline-block min-w-[2.5rem] rounded-lg px-2 py-1 font-bold tabular-nums', v.stock <= 0 ? 'bg-rose-50 text-rose-700' : v.stock <= v.lowStockAlert ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700')}>{Math.round(v.stock)}</span>
                  <span className="block text-[0.6875rem] text-slate-500">{Math.round(v.sold30)} bike{v.reserved > 0 ? ` · ${Math.round(v.reserved)} hold` : ''}{grid.shops.length > 1 ? ` · kul ${Math.round(v.allStock)}` : ''}</span>
                </Td>
              );
            })}
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

const config: DetailConfig<Extra> = {
  label: 'Garments',
  paths: { list: '/garments/products', edit: (id) => `/garment-products/${id}/edit` },
  stockChips: [1, 3, 6, 12, 24],
  extra: {
    key: 'garment-product-detail-extra',
    load: async (id) => {
      const [profile, grid] = await Promise.all([
        garmentProductsApi.byProduct(id).catch(() => null),
        garmentProductsApi.sizeGrid(id).catch(() => null),
      ]);
      const collection = profile?.collectionId ? await collectionsApi.getOne(profile.collectionId).catch(() => null) : null;
      return { profile, grid: grid && grid.variants.length ? grid : null, collection };
    },
  },
  badges: ({ extra }) => {
    const p = extra?.profile;
    if (!p) return null;
    return (
      <>
        {p.gender && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700">{genderLabel(p.gender)}</span>}
        {p.categoryType && <span className="rounded-md bg-pink-50 px-2 py-0.5 text-[0.75rem] font-medium text-pink-700">{garmentLabel(p.categoryType)}</span>}
        {p.isFabricOnly && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700">Unstitched</span>}
        {p.isOnSale && <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[0.75rem] font-bold text-white">Sale</span>}
        {p.isNewArrival && <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700">Naya</span>}
      </>
    );
  },
  facts: ({ extra }) => {
    const p = extra?.profile;
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Season', seasonLabel(p.season)],
      ['Collection', extra?.collection ? <Link to="/garments/collections" className="text-brand-700 hover:underline">{extra.collection.name}</Link> : '—'],
      ['Kapra', fabricLabel(p.fabricType)],
      ['Article code', p.styleCode || '—'],
      ['Ho sakta hai', [p.allowAlteration && 'Alteration', p.allowReservation && 'Hold', p.allowLayaway && 'Qist'].filter(Boolean).join(', ') || '—'],
    ];
    if (p.careInstructions) rows.push(['Dhulai', p.careInstructions]);
    return rows;
  },
  tile: ({ extra }) => {
    const g = extra?.grid;
    if (!g) return null;
    const empty = g.variants.filter((v) => v.isActive && v.stock <= 0).length;
    return { label: 'Sizes', value: `${g.variants.length - empty}/${g.variants.length}`, hint: empty ? `${empty} khatam` : 'Sab stock me' };
  },
  alerts: ({ extra }) => {
    const empty = (extra?.grid?.variants ?? []).filter((v) => v.isActive && v.stock <= 0 && v.sold30 > 0);
    if (!empty.length) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
        <Ruler className="h-4 w-4" />
        <span className="text-[0.875rem] font-medium">Bikne wale size khatam: {empty.map((v) => v.name).join(', ')}</span>
        <Link to="/purchases/new" className="ml-auto inline-flex items-center gap-1 text-[0.8125rem] font-semibold hover:underline"><PackagePlus className="h-4 w-4" />Purchase</Link>
      </div>
    );
  },
  tabs: [
    {
      id: 'sizes', label: 'Size × rang', icon: Grid3x3, when: ({ extra }) => !!extra?.grid,
      render: ({ extra }) => (
        <Card className="rounded-2xl" flush title="Size aur rang ka stock" description="Is branch ka stock · pichle 30 din ki Sale. Khane par mouse rakhein to har branch ka stock.">
          <GridTable grid={extra!.grid!} />
        </Card>
      ),
    },
  ],
  guide: [
    { icon: Grid3x3, color: '#7c3aed', title: 'Size × rang', text: 'Har size aur rang ka stock is branch me — laal khatam, peela kam. "hold" wale piece customer ke liye rakhe hain, POS par nahi bikte. Doosri branch se Transfer kar sakte hain.' },
  ],
};

export default function GarmentProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
