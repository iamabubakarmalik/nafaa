/** Shoe-only dashboard widgets: size gaps, best-selling sizes, size-request / exchange desk and brands. */

import { AlertTriangle, Award, CheckCircle2, Footprints, HandMetal, PackageX, RefreshCw, Ruler } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useShoeOps } from './useShoeOps';
import { t as tr } from '@core/i18n';

const PRODUCTS = '/shoe-products';
const sizeLabel = (v: { size: string; sizeSystem: string; width?: string }) =>
  tr('Size {{size}} {{sizeSystem}}{{value}}', { size: v.size, sizeSystem: v.sizeSystem, value: v.width && v.width !== 'REGULAR' ? ` · ${v.width.toLowerCase()}` : '' });

export const shoeKpis: KpiDef[] = [
  {
    id: 'shoe-pairs', label: tr('Joray stock me'), icon: Footprints, tone: 'brand',
    useValue: () => {
      const s = useShoeOps();
      return { loading: s.loading, to: PRODUCTS, value: s.totals.totalStockUnits.toLocaleString('en-PK'), hint: tr('{{totalSizeVariants}} size · {{totalProducts}} design', { totalSizeVariants: s.totals.totalSizeVariants, totalProducts: s.totals.totalProducts }) };
    },
  },
  {
    id: 'shoe-size-gaps', label: tr('Size khatam'), icon: PackageX, tone: 'danger',
    useValue: () => {
      const s = useShoeOps();
      return {
        loading: s.loading, to: `${PRODUCTS}?stockFilter=out`, value: s.totals.outOfStockCount,
        alert: s.totals.outOfStockCount > 0, hint: tr('{{lowStockCount}} size kam', { lowStockCount: s.totals.lowStockCount }),
      };
    },
  },
  {
    id: 'shoe-tryons', label: tr('Size farmaish baqi'), icon: HandMetal, tone: 'info',
    useValue: () => {
      const s = useShoeOps();
      return { loading: s.loading, to: '/shoe/try-on', value: s.tryOn.pending + s.tryOn.scheduled, hint: tr('{{conversion}} ne khareeda', { conversion: s.tryOn.conversion }) };
    },
  },
  {
    id: 'shoe-exchanges', label: tr('Exchange (30 din)'), icon: RefreshCw, tone: 'neutral',
    useValue: () => {
      const s = useShoeOps();
      const { sales: money } = useMasked();
      return { loading: s.loading, to: '/shoe/exchanges', value: s.exchanges.count, hint: tr('{{value}} ka maal badla', { value: money(s.exchanges.value) }) };
    },
  },
];

export function useShoeAttention(): AttentionItem[] {
  const s = useShoeOps();
  const t = s.totals;
  const items: AttentionItem[] = [];
  if (t.outOfStockCount) items.push({ icon: PackageX, level: 'warning', text: tr('{{outOfStockCount}} size bilkul khatam — customer us size ke liye wapas chala jayega', { outOfStockCount: t.outOfStockCount }), to: `${PRODUCTS}?stockFilter=out`, cta: tr('Sizes dekhein') });
  if (s.tryOn.pending) items.push({ icon: HandMetal, level: 'info', text: tr('{{pending}} customer size ke intezar me — maal mangwa kar batayein', { pending: s.tryOn.pending }), to: '/shoe/try-on', cta: tr('Size farmaish') });
  if (t.lowStockCount) items.push({ icon: AlertTriangle, level: 'info', text: tr('{{lowStockCount}} size kam reh gaye — agle order me shamil karein', { lowStockCount: t.lowStockCount }), to: `${PRODUCTS}?stockFilter=low`, cta: tr('Kam sizes') });
  return items;
}

export function ShoeSizeGaps() {
  const s = useShoeOps();
  return (
    <WidgetCard
      title={tr('Size khatam / kam')}
      icon={PackageX}
      description={tr('{{outOfStockCount}} khatam · {{lowStockCount}} kam', { outOfStockCount: s.totals.outOfStockCount, lowStockCount: s.totals.lowStockCount })}
      to={`${PRODUCTS}?stockFilter=out`}
      flush
    >
      <RowList empty={tr('Har size stock me hai')} emptyIcon={CheckCircle2}>
        {s.gaps.slice(0, 6).map((v) => (
          <ListRow
            key={v.id}
            to={`${PRODUCTS}/${v.productId}`}
            leading={<IconBubble icon={Ruler} tone={v.out ? 'danger' : 'warning'} />}
            title={v.name ?? sizeLabel(v)}
            meta={v.name ? sizeLabel(v) : v.boxNumber ? tr('Dabba {{boxNumber}}', { boxNumber: v.boxNumber }) : undefined}
            value={<Badge variant={v.out ? 'danger' : 'warning'} size="xs">{v.out ? tr('Khatam') : tr('{{stock}} baqi', { stock: v.stock })}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function ShoeTopSizes() {
  const s = useShoeOps();
  const max = Math.max(...s.topSizes.map((x) => x.sold), 1);
  return (
    <WidgetCard title={tr('Sab se zyada bikne wale size')} icon={Ruler} description={tr('In sizes ka stock poora rakhein')} to={PRODUCTS}>
      {s.topSizes.length === 0 ? (
        <div className="flex items-center gap-3">
          <IconBubble icon={Ruler} />
          <p className="text-[0.8125rem] text-slate-600">{tr('Sale shuru hote hi yahan nazar aayega kaunsa size sab se zyada bikta hai.')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {s.topSizes.map((x, i) => (
            <div key={x.size} className="flex items-center gap-3 text-[0.8125rem]">
              <span className="w-24 shrink-0 truncate font-medium text-slate-700">{x.size}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className={`block h-full rounded-full ${i === 0 ? 'bg-brand-600' : 'bg-brand-400'}`} style={{ width: `${(x.sold / max) * 100}%` }} />
              </span>
              <span className="w-14 shrink-0 text-end font-semibold tabular-nums text-slate-900">{tr('{{sold}} joray', { sold: x.sold })}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

/** Size requests waiting at the counter and exchanges of the last 30 days. */
export function ShoeDesk() {
  const s = useShoeOps();
  const { sales: money } = useMasked();
  return (
    <WidgetCard title={tr('Size farmaish aur exchange')} icon={HandMetal} description={tr('Counter par jo kaam baqi hai')}>
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={HandMetal} tone="info" label={tr('Farmaish baqi')} value={s.tryOn.pending} hint={tr('{{scheduled}} ko bata diya', { scheduled: s.tryOn.scheduled })} to="/shoe/try-on" />
        <MetricTile icon={CheckCircle2} tone="success" label={tr('Farmaish se bika')} value={s.tryOn.conversion} hint={tr('{{completed}} mukammal', { completed: s.tryOn.completed })} to="/shoe/try-on" />
        <MetricTile icon={RefreshCw} tone="neutral" label={tr('Exchange (30 din)')} value={s.exchanges.count} hint={tr('Size / rang badla')} to="/shoe/exchanges" />
        <MetricTile icon={RefreshCw} tone="neutral" label={tr('Badla hua maal')} value={money(s.exchanges.value)} hint={tr('30 din me')} to="/shoe/exchanges" />
      </div>
    </WidgetCard>
  );
}

export function ShoeBrands() {
  const s = useShoeOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={tr('Top brands')} icon={Award} description={tr('{{totalBrands}} brands', { totalBrands: s.totals.totalBrands })} to="/shoe/brands" flush>
      <RowList empty={tr('Abhi koi brand nahi — brands add karein')} emptyIcon={Award}>
        {s.brands.slice(0, 5).map((b) => {
          const tags = [b.isPremium && 'Premium', b.isLocal && 'Local', b.isSportsBrand && 'Sports'].filter(Boolean).join(' · ');
          return (
            <ListRow
              key={b.id}
              to="/shoe/brands"
              leading={b.logoUrl
                ? <img src={b.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" />
                : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">{b.name.charAt(0)}</span>}
              title={b.name}
              meta={tags || undefined}
              value={sales(Number(b.totalRevenue || 0))}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
