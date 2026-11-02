/** Carpet product detail on the shared product page: rolls and remnant pieces of this carpet, with their sqft and rates. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Scissors } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { carpetRollsApi, type CarpetRoll } from '../api/carpet-rolls.api';
import { carpetCutPiecesApi, type CarpetCutPiece } from '../api/carpet-cut-pieces.api';
import { PIECE_STATUS, ROLL_STATUS, ftIn, isCarpetUnit, r2, unitLabel } from '../lib/meta';
import { t } from '@core/i18n';

interface Extra { rolls: CarpetRoll[]; pieces: CarpetCutPiece[] }

const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0));

const config: DetailConfig<Extra> = {
  label: t('Carpet'),
  paths: { list: '/products', edit: (id) => `/carpet-products/${id}/edit` },
  stockChips: [1, 2, 5, 10],
  extra: {
    key: 'carpet-product-detail',
    load: async (id) => {
      const [rolls, pieces] = await Promise.all([
        carpetRollsApi.list({ productId: id, limit: 200 }).then((r) => r.items).catch(() => []),
        carpetCutPiecesApi.list({ productId: id, status: 'AVAILABLE', limit: 200 }).then((r) => r.items).catch(() => []),
      ]);
      return { rolls, pieces };
    },
  },
  badges: ({ product }) => (isCarpetUnit(product.unit)
    ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[0.75rem] font-semibold text-emerald-700 ring-1 ring-emerald-200"><Layers className="h-3 w-3" />{t('Roll se {{unit}} me', { unit: unitLabel(product.unit) })}</span>
    : null),
  facts: ({ extra, product, money }) => {
    if (!isCarpetUnit(product.unit) || !extra) return [];
    const active = extra.rolls.filter((r) => r.status === 'ACTIVE' && r.remainingSqft > 0);
    const rates = active.map((r) => Number(r.salePricePerSqft)).filter((x) => x > 0);
    const rows: Array<[string, ReactNode]> = [
      [t('Chalu rolls'), `${active.length} · ${sum(active.map((r) => r.remainingSqft))} sqft`],
      [t('Tukre'), `${extra.pieces.length} · ${sum(extra.pieces.map((p) => p.totalSqft))} sqft`],
      [t('Roll rate'), rates.length ? `${money(Math.min(...rates))} – ${money(Math.max(...rates))} / sqft` : '—'],
      [t('Khatam rolls'), String(extra.rolls.filter((r) => r.status === 'FINISHED').length)],
    ];
    return rows;
  },
  tile: ({ extra, product }) => (isCarpetUnit(product.unit) && extra
    ? { label: t('Rolls + tukre'), value: `${Math.round(sum(extra.rolls.filter((r) => r.status === 'ACTIVE').map((r) => r.remainingSqft)) + sum(extra.pieces.map((p) => p.totalSqft)))} sqft`, hint: t('Stock inhi se banta hai') }
    : null),
  alerts: ({ extra, product }) => (isCarpetUnit(product.unit) && extra && !extra.rolls.some((r) => r.status === 'ACTIVE') && !extra.pieces.length ? (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
      <Layers className="h-4 w-4" />
      <span className="text-[0.875rem] font-medium">{t('Is carpet ka koi chalu roll ya tukra nahi — counter par nahi bikega')}</span>
      <Link to="/purchases/new" className="ms-auto text-[0.8125rem] font-semibold hover:underline">{t('Purchase →')}</Link>
    </div>
  ) : null),
  tabs: [
    {
      id: 'rolls', label: t('Rolls'), icon: Layers, when: ({ product }) => isCarpetUnit(product.unit),
      render: ({ extra, money }) => (
        <Card className="rounded-2xl" flush title={t('Rolls')} description={t('Har roll ki bachi lambai, sqft aur rate')}>
          {!extra?.rolls.length ? <p className="px-5 py-6 text-[0.875rem] text-slate-500">{t('Koi roll nahi.')}</p> : (
            <ul className="divide-y divide-slate-100">
              {extra.rolls.map((r) => (
                <li key={r.id}>
                  <Link to={`/carpet-rolls/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.875rem] hover:bg-slate-50">
                    <span className="font-mono font-semibold text-slate-900">{r.rollNumber}{r.variant?.name && <span className="ms-2 font-sans font-normal text-slate-500">{r.variant.name}</span>}</span>
                    <span className="tabular-nums text-slate-600">{t('{{widthFt}} × {{remainingLengthFt}} · {{remainingSqft}} sqft · {{salePricePerSqft}}/sqft', { widthFt: ftIn(r.widthFt, r.widthInch), remainingLengthFt: ftIn(r.remainingLengthFt, r.remainingLengthInch), remainingSqft: r2(r.remainingSqft), salePricePerSqft: money(r.salePricePerSqft) })}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ring-1', ROLL_STATUS[r.status].tone)}>{ROLL_STATUS[r.status].label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ),
    },
    {
      id: 'pieces', label: t('Tukre'), icon: Scissors, when: ({ product, extra }) => isCarpetUnit(product.unit) && !!extra?.pieces.length,
      render: ({ extra, money }) => (
        <Card className="rounded-2xl" flush title={t('Tukre')} description={t('Bikne ko tayyar tukre')}>
          <ul className="divide-y divide-slate-100">
            {extra!.pieces.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[0.875rem]">
                <span className="font-mono font-semibold text-slate-900">{p.pieceCode}</span>
                <span className="tabular-nums text-slate-600">{t('{{widthFt}} × {{lengthFt}} · {{totalSqft}} sqft · {{salePrice}}', { widthFt: ftIn(p.widthFt, p.widthInch), lengthFt: ftIn(p.lengthFt, p.lengthInch), totalSqft: r2(p.totalSqft), salePrice: money(p.salePrice) })}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ring-1', PIECE_STATUS[p.status].tone)}>{PIECE_STATUS[p.status].label}</span>
              </li>
            ))}
          </ul>
        </Card>
      ),
    },
  ],
  guide: [
    { icon: Layers, color: '#059669', title: t('Rolls'), text: t('Rolls tab me har roll ki bachi lambai — roll par click kar ke kaatein, adjust ya damage karein.') },
  ],
};

export default function CarpetProductDetail() {
  return <ProductDetailPage config={config} />;
}
