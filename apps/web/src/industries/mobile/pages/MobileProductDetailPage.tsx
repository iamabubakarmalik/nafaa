/**
 * Mobile product detail on the shared page: for a phone, every unit by IMEI
 * with its variant, PTA status, shelf age and bill, and a warning when the
 * stock and the phones on the shelf differ.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Hash, Smartphone } from 'lucide-react';
import { Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { imeiApi, type ImeiRow } from '../api/imei.api';
import { ageText, dayOnly, imeiStatusOf, ptaOf } from '../components/meta';

interface Extra { rows: ImeiRow[]; total: number; counts: Partial<Record<string, number>> }

const isPhone = (p: object, x?: Extra) => (p as { productType?: string | null }).productType === 'PHONE' || (x?.total ?? 0) > 0;
/** Model number as the old wizard kept it ("Model: SM-A155"). */
const modelOf = (p: { shortDescription?: string | null }) => p.shortDescription?.replace(/^Model:\s*/i, '') || undefined;

const config: DetailConfig<Extra> = {
  label: 'Mobile',
  paths: { list: '/products', edit: (id) => `/mobile-products/${id}/edit` },
  stockChips: [1, 5, 10, 25],
  extra: {
    key: 'mobile-product-imeis',
    load: async (id) => {
      const page = await imeiApi.listAll({ productId: id, limit: 500, sort: 'new' }).catch(() => null);
      return { rows: page?.items ?? [], total: page?.total ?? 0, counts: page?.counts ?? {} };
    },
  },
  badges: ({ product, extra }) => (
    <span className={cn('rounded-md px-2 py-0.5 text-[0.75rem] font-semibold', isPhone(product, extra) ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700')}>
      {isPhone(product, extra) ? 'Phone (IMEI)' : 'Accessory'}
    </span>
  ),
  facts: ({ product, extra }) => {
    const rows: Array<[string, ReactNode]> = [];
    const model = modelOf(product);
    if (model) rows.push(['Model', model]);
    if (isPhone(product, extra)) {
      const months = extra?.rows.find((r) => r.warrantyMonths)?.warrantyMonths;
      rows.push(['Warranty', months ? `${months} mahine` : 'Nahi']);
    }
    return rows;
  },
  tile: ({ product, extra, stock }) => {
    if (!isPhone(product, extra)) return null;
    const onShelf = extra?.counts.IN_STOCK ?? 0;
    return { label: 'IMEI shelf par', value: onShelf, hint: Math.round(stock) !== onShelf ? `stock se ${Math.abs(Math.round(stock) - onShelf)} ka farq` : 'stock ke barabar' };
  },
  alerts: ({ product, extra, stock }) => {
    if (!isPhone(product, extra)) return null;
    const onShelf = extra?.counts.IN_STOCK ?? 0;
    if (Math.round(stock) === onShelf) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-violet-900 ring-1 ring-violet-200">
        <Hash className="h-4 w-4" />
        <span className="text-[0.875rem] font-medium">Stock {Math.round(stock)} hai magar shelf par {onShelf} IMEI — {Math.round(stock) > onShelf ? 'purchase ke phone ke IMEI daalein' : 'stock ginti dobara karein'}</span>
        <Link to={`/products/${product.id}/imei`} className="ml-auto text-[0.8125rem] font-semibold hover:underline">IMEI sambhalein →</Link>
      </div>
    );
  },
  tabs: [
    {
      id: 'imei', label: 'IMEI', icon: Smartphone, when: ({ product, extra }) => isPhone(product, extra),
      render: ({ extra, product, cost, money }) => {
        const rows = extra?.rows ?? [];
        const summary = Object.entries(extra?.counts ?? {}).map(([k, v]) => `${imeiStatusOf(k).label}: ${v}`).join(' · ');
        return (
          <Card className="rounded-2xl" flush title="Har phone IMEI ke saath" description={summary || 'Abhi koi IMEI nahi'}
            actions={<Link to={`/products/${product.id}/imei`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">IMEI daalein / badlein →</Link>}>
            {rows.length > 0 && (
              <Table minWidth="46rem">
                <THead>
                  <Tr>
                    <Th className="px-5 py-2.5">IMEI</Th><Th className="px-3 py-2.5">Variant</Th><Th className="px-3 py-2.5">PTA</Th>
                    <Th className="px-3 py-2.5">Halat</Th><Th className="px-3 py-2.5">Bill</Th><Th className="px-5 py-2.5 text-right">Cost / Sale</Th>
                  </Tr>
                </THead>
                <TBody>
                  {rows.map((r) => (
                    <Tr key={r.id}>
                      <Td className="px-5 py-2 font-mono">{r.imei1}{r.imei2 && <span className="block text-[0.6875rem] text-slate-400">{r.imei2}</span>}</Td>
                      <Td className="px-3 py-2 text-slate-600">{r.variant?.name ?? '—'}</Td>
                      <Td className="px-3 py-2"><span className="font-medium" style={{ color: ptaOf(r.ptaStatus).color }}>{ptaOf(r.ptaStatus).label}</span></Td>
                      <Td className="px-3 py-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', imeiStatusOf(r.status).tone)}>{imeiStatusOf(r.status).label}</span>
                        {r.status === 'IN_STOCK' && <span className="ml-1.5 text-[0.6875rem] text-slate-500">{ageText(r.daysInStock)}</span>}
                      </Td>
                      <Td className="px-3 py-2 text-slate-600">{r.sale ? <span className="font-mono">{r.sale.saleNumber}{r.sale.customer ? ` · ${r.sale.customer.name}` : ''}</span> : r.purchasedAt ? `Aaya ${dayOnly(r.purchasedAt)}` : '—'}</Td>
                      <Td className="px-5 py-2 text-right tabular-nums">{cost(r.costPrice)}{r.soldPrice ? <span className="block text-[0.6875rem] text-slate-500">{money(r.soldPrice)}</span> : null}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        );
      },
    },
  ],
  guide: [
    { icon: Smartphone, color: '#2563eb', title: 'Phone ka stock', text: 'Phone ka stock IMEI se chalta hai. Naye phone ke IMEI "IMEI daalein" se daalein — stock khud barh jata hai.' },
    { icon: Hash, color: '#7c3aed', title: 'Farq ho to', text: 'Stock aur IMEI barabar na hon to jamni patti aati hai. Purchase ke baad IMEI daalna aksar reh jata hai.' },
  ],
};

export default function MobileProductDetailPage() {
  return <ProductDetailPage config={config} />;
}
