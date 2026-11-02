/** Hardware item detail on the shared product page: size or shade, quantity rates, reorder point and delivery marks. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Paintbrush, RefreshCw, Tags, Truck } from 'lucide-react';
import { Card } from '@/design-system/components';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { hardwareProductsApi, type HardwareProduct } from '../api/products.api';
import { reorderRulesApi, type ReorderRule } from '../api/reorder-rules.api';
import { categoryLabel, isPaint, qty } from '../lib/meta';
import { t as tr } from '@core/i18n';

interface Extra { profile: HardwareProduct | null; rule: ReorderRule | null }

const config: DetailConfig<Extra> = {
  label: tr('Hardware'),
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
        {p.requiresTruck && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] font-semibold text-slate-700"><Truck className="h-3 w-3" />{tr('Gaari me jata hai')}</span>}
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
      [tr('Size / dia'), p.diameter], [tr('Grade'), p.grade ?? p.gradeStrength], [tr('Bag'), p.bagWeight ? `${p.bagWeight} kg` : undefined],
      [tr('Tile size'), p.tileSize], [tr('Finish'), p.finishSheen ?? p.finishType], [tr('Dabba'), p.litersPerCan ? `${p.litersPerCan} liter` : undefined],
      [tr('Kitni deewar'), p.coverage ? tr('{{coverage}} sq ft / liter', { coverage: p.coverage }) : undefined], [tr('Ek dabba'), [p.piecesPerBox && `${p.piecesPerBox} tiles`, p.sqftPerBox && `${p.sqftPerBox} sq ft`].filter(Boolean).join(' · ') || undefined],
      [tr('Kahan bana'), p.manufacturingLocation], [tr('Wholesale'), p.wholesalePrice ? money(p.wholesalePrice) : undefined],
    ];
    return rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  },
  tile: ({ extra }) => (extra?.rule ? { label: tr('Reorder point'), value: qty(extra.rule.reorderPoint), hint: tr('{{reorderQty}} mangwana', { reorderQty: qty(extra.rule.reorderQty) }) } : null),
  alerts: ({ extra, stock, product }) => (extra?.rule && stock <= extra.rule.reorderPoint ? (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
      <RefreshCw className="h-4 w-4" />
      <span className="text-[0.875rem] font-medium">{tr('Stock reorder point ({{reorderPoint}}) tak aa gaya — {{reorderQty}} {{unit}} mangwayein{{value}}', { reorderPoint: qty(extra.rule.reorderPoint), reorderQty: qty(extra.rule.reorderQty), unit: product.unit, value: extra.rule.preferredSupplier ? ` (${extra.rule.preferredSupplier})` : '' })}</span>
      <Link to="/purchases/new" className="ms-auto text-[0.8125rem] font-semibold hover:underline">{tr('Purchase →')}</Link>
    </div>
  ) : null),
  tabs: [
    {
      id: 'rates', label: tr('Quantity rate'), icon: Tags, when: ({ extra }) => !!extra?.profile?.bulkPricing?.length,
      render: ({ extra, product, money }) => (
        <Card className="rounded-2xl" flush title={tr('Quantity rate')} description={tr('Itni ya zyada quantity par POS khud ye rate lagata hai')}>
          <ul className="divide-y divide-slate-100">
            <li className="flex items-center justify-between px-5 py-2.5 text-[0.875rem]"><span className="text-slate-600">{tr('Aam rate (1 {{unit}})', { unit: product.unit })}</span><span className="font-semibold tabular-nums">{money(product.price)}</span></li>
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
    { icon: Tags, color: '#16a34a', title: tr('Quantity rate'), text: tr('Quantity rate tab me dekhein kitne par kaunsa rate lagta hai. Edit se badlein.') },
  ],
};

export default function HardwareProductDetail() {
  return <ProductDetailPage config={config} />;
}
