/** Hardware item detail on the shared product page: size or shade, quantity rates, reorder point and delivery marks. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Paintbrush, RefreshCw, Tags, Truck } from 'lucide-react';
import { Card } from '@/design-system/components';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { hardwareProductsApi, type HardwareProduct } from '../api/products.api';
import { reorderRulesApi, type ReorderRule } from '../api/reorder-rules.api';
import { categoryLabel, isPaint, qty } from '../lib/meta';

interface Extra { profile: HardwareProduct | null; rule: ReorderRule | null }

const config: DetailConfig<Extra> = {
  label: 'Hardware',
  paths: { list: '/hardware/products', edit: (id) => `/hardware-products/${id}/edit` },
  stockChips: [1, 10, 50, 100],
  extra: {
    key: 'hardware-product-detail',
    load: async (id) => {
      const [profile, rule] = await Promise.all([
        hardwareProductsApi.byProduct(id).catch(() => null),
        reorderRulesApi.byProduct(id).catch(() => null),
      ]);
      return { profile, rule: rule?.isActive ? rule : null };
    },
  },
  badges: ({ extra }) => {
    const p = extra?.profile;
    if (!p) return null;
    return (
      <>
        {p.categoryType && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-amber-200">{categoryLabel(p.categoryType)}</span>}
        {p.requiresTruck && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold text-slate-700"><Truck className="h-3 w-3" />Gaari me jata hai</span>}
        {isPaint(p.categoryType) && (p.colorName || p.colorCode) && (
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[0.75rem] font-semibold text-violet-700">
            <Paintbrush className="h-3 w-3" />{[p.colorName, p.colorCode].filter(Boolean).join(' ')}
          </span>
        )}
      </>
    );
  },
  facts: ({ extra, money }) => {
    const p = extra?.profile;
    if (!p) return [];
    const rows: Array<[string, ReactNode]> = [
      ['Size / dia', p.diameter], ['Grade', p.grade ?? p.gradeStrength], ['Bag', p.bagWeight ? `${p.bagWeight} kg` : undefined],
      ['Tile size', p.tileSize], ['Finish', p.finishSheen ?? p.finishType], ['Dabba', p.litersPerCan ? `${p.litersPerCan} liter` : undefined],
      ['Kitni deewar', p.coverage ? `${p.coverage} sq ft / liter` : undefined], ['Ek dabba', [p.piecesPerBox && `${p.piecesPerBox} tiles`, p.sqftPerBox && `${p.sqftPerBox} sq ft`].filter(Boolean).join(' · ') || undefined],
      ['Kahan bana', p.manufacturingLocation], ['Wholesale', p.wholesalePrice ? money(p.wholesalePrice) : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra }) => (extra?.rule ? { label: 'Reorder point', value: qty(extra.rule.reorderPoint), hint: `${qty(extra.rule.reorderQty)} mangwana` } : null),
  alerts: ({ extra, stock, product }) => (extra?.rule && stock <= extra.rule.reorderPoint ? (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
      <RefreshCw className="h-4 w-4" />
      <span className="text-[0.875rem] font-medium">Stock reorder point ({qty(extra.rule.reorderPoint)}) tak aa gaya — {qty(extra.rule.reorderQty)} {product.unit} mangwayein{extra.rule.preferredSupplier ? ` (${extra.rule.preferredSupplier})` : ''}</span>
      <Link to="/purchases/new" className="ml-auto text-[0.8125rem] font-semibold hover:underline">Purchase →</Link>
    </div>
  ) : null),
  tabs: [
    {
      id: 'rates', label: 'Quantity rate', icon: Tags, when: ({ extra }) => !!extra?.profile?.bulkPricing?.length,
      render: ({ extra, product, money }) => (
        <Card className="rounded-2xl" flush title="Quantity rate" description="Itni ya zyada quantity par POS khud ye rate lagata hai">
          <ul className="divide-y divide-slate-100">
            <li className="flex items-center justify-between px-5 py-2.5 text-[0.875rem]"><span className="text-slate-600">Aam rate (1 {product.unit})</span><span className="font-semibold tabular-nums">{money(product.price)}</span></li>
            {extra!.profile!.bulkPricing!.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-2.5 text-[0.875rem]">
                <span className="text-slate-700">{qty(t.minQuantity)}{t.maxQuantity ? `–${qty(t.maxQuantity)}` : '+'} {product.unit}{t.label ? ` · ${t.label}` : ''}</span>
                <span className="font-semibold tabular-nums text-emerald-700">{money(t.price)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ),
    },
  ],
  guide: [
    { icon: Tags, color: '#16a34a', title: 'Quantity rate', text: 'Quantity rate tab me dekhein kitne par kaunsa rate lagta hai. Edit se badlein.' },
  ],
};

export default function HardwareProductDetail() {
  return <ProductDetailPage config={config} />;
}
