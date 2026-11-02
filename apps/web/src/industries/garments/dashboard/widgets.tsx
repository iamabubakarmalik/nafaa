/** Garments-only dashboard widgets: tailoring, alterations, workshop load and catalogue mix. */

import { BookmarkPlus, CheckCircle2, CreditCard, Palette, Ruler, Scissors, Shirt, Sparkles, Tag } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useQuery } from '@tanstack/react-query';
import { garmentProductsApi } from '../api/products.api';
import { META_KEY } from '../components/meta';
import { useGarmentsOps } from './useGarmentsOps';
import { t as tr } from '@core/i18n';

const TAILORING = '/garments/tailoring';
const ALTERATIONS = '/garments/alterations';

const when = (days: number | null) => (days === null ? '—' : days < 0 ? tr('{{value}} din late', { value: -days }) : days === 0 ? tr('Aaj') : days === 1 ? tr('Kal') : tr('{{days}} din', { days }));
const whenVariant = (days: number | null) => (days === null ? 'default' : days <= 0 ? 'danger' : days <= 2 ? 'warning' : 'default') as 'default' | 'danger' | 'warning';

export const garmentsKpis: KpiDef[] = [
  {
    id: 'garments-tailoring', label: tr('Silai chal rahi'), icon: Scissors, tone: 'brand',
    useValue: () => {
      const g = useGarmentsOps();
      return {
        loading: g.loading, to: TAILORING, value: g.pending.tailoring, alert: g.tailoringSoon.length > 0,
        hint: g.tailoringSoon.length ? tr('{{count}} aaj/kal dene', { count: g.tailoringSoon.length }) : tr('{{count}} is hafte', { count: g.tailoring.length }),
      };
    },
  },
  {
    id: 'garments-alterations', label: tr('Alteration'), icon: Ruler, tone: 'warning',
    useValue: () => {
      const g = useGarmentsOps();
      return { loading: g.loading, to: ALTERATIONS, value: g.pending.alterations, hint: g.alterationsSoon.length ? tr('{{count}} aaj/kal', { count: g.alterationsSoon.length }) : tr('intezar me') };
    },
  },
  {
    id: 'garments-holds', label: tr('Hold aur qist'), icon: BookmarkPlus, tone: 'info',
    useValue: () => {
      const g = useGarmentsOps();
      return { loading: g.loading, to: '/garments/reservations', value: g.pending.reservations + g.pending.layaway, hint: tr('{{reservations}} hold · {{layaway}} qist', { reservations: g.pending.reservations, layaway: g.pending.layaway }) };
    },
  },
  {
    id: 'garments-stitching', label: tr('Silai ki kamai'), icon: Sparkles, tone: 'success',
    useValue: () => {
      const g = useGarmentsOps();
      const { sales } = useMasked();
      return { loading: g.loading, to: TAILORING, value: sales(g.revenue.total), hint: tr('Is mahine · {{count}} order diye', { count: g.revenue.count }) };
    },
  },
];

export function useGarmentsAttention(): AttentionItem[] {
  const g = useGarmentsOps();
  const items: AttentionItem[] = [];
  const t = g.today;
  if (t.tailoringLate) items.push({ icon: Scissors, level: 'danger', text: tr('{{tailoringLate}} silai order late hain — customer ko batayein aur karigar se pehle ye karwayein', { tailoringLate: t.tailoringLate }), to: `${TAILORING}?view=late`, cta: tr('Late orders') });
  if (g.urgent.length) items.push({ icon: Scissors, level: 'danger', text: tr('{{count}} bohat jaldi wale silai order — karigar ko pehle ye dein', { count: g.urgent.length }), to: TAILORING, cta: tr('Orders dekhein') });
  if (t.tailoringDue) items.push({ icon: Scissors, level: 'warning', text: tr('{{tailoringDue}} silai order aaj dena hai — tayyar hai ya nahi, check kar lein', { tailoringDue: t.tailoringDue }), to: `${TAILORING}?view=today`, cta: tr('Silai dekhein') });
  if (t.tailoringReady + t.alterationsReady) items.push({ icon: CheckCircle2, level: 'info', text: tr('{{value}} kapre tayyar rakhe hain — customers ko WhatsApp karein', { value: t.tailoringReady + t.alterationsReady }), to: `${TAILORING}?view=ready`, cta: tr('Tayyar') });
  if (t.alterationsDue || t.alterationsLate) items.push({ icon: Ruler, level: 'warning', text: tr('{{alterationsDue}} alteration aaj deni hai{{value}}', { alterationsDue: t.alterationsDue, value: t.alterationsLate ? tr(', {{alterationsLate}} late', { alterationsLate: t.alterationsLate }) : '' }), to: ALTERATIONS, cta: tr('Alterations') });
  if (t.layawayOverdue) items.push({ icon: CreditCard, level: 'warning', text: tr('{{layawayOverdue}} qist plan ki qist late hai — phone karein', { layawayOverdue: t.layawayOverdue }), to: '/garments/layaway', cta: tr('Qist dekhein') });
  if (t.holdsEndingToday) items.push({ icon: BookmarkPlus, level: 'neutral', text: tr('{{holdsEndingToday}} hold aaj khatam ho rahe hain — customer ko yaad dilayein', { holdsEndingToday: t.holdsEndingToday }), to: '/garments/reservations', cta: tr('Hold dekhein') });
  return items;
}

export function GarmentsTailoring() {
  const g = useGarmentsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title={tr('Silai — agle 7 din')} icon={Scissors} description={tr('{{count}} order dene hain', { count: g.tailoring.length })} to={TAILORING} flush>
      <RowList empty={tr('Is hafte koi silai order nahi')} emptyIcon={CheckCircle2}>
        {g.tailoring.slice(0, 6).map((o) => (
          <ListRow
            key={o.id}
            to={`${TAILORING}/${o.id}`}
            leading={<IconBubble icon={Scissors} tone={o.priority === 'URGENT' ? 'danger' : o.priority === 'HIGH' ? 'warning' : 'brand'} />}
            title={o.customerName || tr('Walk-in')}
            meta={<span className="font-mono">{o.orderNumber}{o.priority === 'URGENT' ? tr(' · Urgent') : ''}{o.total ? ` · ${sales(Number(o.total))}` : ''}</span>}
            value={<Badge variant={whenVariant(o.days)} size="xs">{when(o.days)}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function GarmentsAlterations() {
  const g = useGarmentsOps();
  return (
    <WidgetCard title={tr('Alterations — agle 7 din')} icon={Ruler} description={tr('{{alterations}} chal rahi', { alterations: g.pending.alterations })} to={ALTERATIONS} flush>
      <RowList empty={tr('Koi alteration baqi nahi')} emptyIcon={CheckCircle2}>
        {g.alterations.slice(0, 6).map((a) => (
          <ListRow
            key={a.id}
            to={ALTERATIONS}
            leading={<IconBubble icon={Ruler} tone="warning" />}
            title={a.customerName ? `${a.customerName} — ${a.garmentDescription || 'Kapra'}` : a.garmentDescription || tr('Kapra')}
            meta={<span className="font-mono">{a.ticketNumber}</span>}
            value={<Badge variant={whenVariant(a.days)} size="xs">{when(a.days)}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Workshop load and stitching income in one card. */
export function GarmentsWorkshop() {
  const g = useGarmentsOps();
  const { sales } = useMasked();
  const due = g.today.toCollect;
  return (
    <WidgetCard title={tr('Silai ka kaam')} icon={Scissors} description={tr('Kaam ka bojh aur is mahine ki kamai')} to={TAILORING}>
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Scissors} tone="brand" label={tr('Silai')} value={g.pending.tailoring} hint={tr('chal rahi')} to={TAILORING} />
        <MetricTile icon={Ruler} tone="warning" label={tr('Alteration')} value={g.pending.alterations} hint={tr('intezar me')} to={ALTERATIONS} />
        <MetricTile icon={BookmarkPlus} tone="info" label={tr('Hold')} value={g.pending.reservations} to="/garments/reservations" />
        <MetricTile icon={CreditCard} tone="success" label={tr('Qist plan')} value={g.pending.layaway} to="/garments/layaway" />
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-[0.8125rem]">
        <span className="text-slate-500">{tr('Silai ki kamai')}{' '} <strong className="tabular-nums text-slate-900">{sales(g.revenue.total)}</strong></span>
        <span className="text-slate-500">{due > 0 ? <>{tr('Lena baqi')}{' '} <strong className="tabular-nums text-amber-700">{sales(due)}</strong></> : tr('{{count}} order diye', { count: g.revenue.count })}</span>
      </div>
    </WidgetCard>
  );
}

function Bars({ rows }: { rows: { key: string; label: string; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-2">
      {rows.slice(0, 5).map((r) => (
        <div key={r.key} className="flex items-center gap-3 text-[0.8125rem]">
          <span className="w-24 shrink-0 truncate text-slate-600">{r.label}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(r.count / max) * 100}%` }} />
          </span>
          <span className="w-8 shrink-0 text-end font-semibold tabular-nums text-slate-900">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

/** Catalogue mix by season and gender, with new, best-selling and on-sale counts. */
export function GarmentsCatalog() {
  const g = useGarmentsOps();
  const t = g.totals;
  return (
    <WidgetCard title={tr('Maal ka mix')} icon={Shirt} description={tr('{{activeCollections}}/{{totalCollections}} collections chaalu', { activeCollections: t.activeCollections, totalCollections: t.totalCollections })} to="/garments/products">
      <div className="flex flex-wrap gap-2">
        <Badge variant="brand" size="sm"><Sparkles className="h-3 w-3" /> {' '}{tr('{{newArrivals}} naya maal', { newArrivals: t.newArrivals })}</Badge>
        <Badge variant="success" size="sm"><Palette className="h-3 w-3" /> {' '}{tr('{{bestSellers}} best seller', { bestSellers: t.bestSellers })}</Badge>
        <Badge variant="warning" size="sm"><Tag className="h-3 w-3" /> {' '}{tr('{{onSaleCount}} sale par', { onSaleCount: t.onSaleCount })}</Badge>
      </div>
      {g.seasons.length === 0 && g.genders.length === 0 ? (
        <p className="mt-4 text-[0.8125rem] text-slate-500">{tr('Products me season aur gender likhein to yahan mix nazar aayega.')}</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {g.seasons.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{tr('Season')}</h4>
              <Bars rows={g.seasons} />
            </div>
          )}
          {g.genders.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{tr('Kis ke liye')}</h4>
              <Bars rows={g.genders} />
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}

/** Sizes and colours running out in this branch, with how many to buy. */
export function GarmentsReorder() {
  const q = useQuery({ queryKey: [META_KEY, 'reorder', 8], queryFn: () => garmentProductsApi.reorder(8), staleTime: 5 * 60_000 });
  const items = q.data?.items ?? [];
  return (
    <WidgetCard title={tr('Size reorder')} icon={Ruler} description={q.data?.products ? tr('{{products}} products ke size khatam ho rahe', { products: q.data.products }) : tr('Bikne wale size jo khatam ho rahe')} to="/garments/products" flush>
      <RowList empty={tr('Koi size khatam nahi ho raha')} emptyIcon={CheckCircle2}>
        {items.map((g) => (
          <ListRow key={g.productId} to={`/garment-products/${g.productId}`} leading={<IconBubble icon={Shirt} tone="warning" />}
            title={g.name} meta={g.sizes.map((x) => `${x.name} ${Math.round(x.stock)}`).join(' · ')}
            value={`${g.sizes.reduce((s, x) => s + x.suggest, 0)} pc`} valueHint={<span className="text-slate-500">{tr('mangwayein')}</span>} />
        ))}
      </RowList>
    </WidgetCard>
  );
}
