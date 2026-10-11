/** Garments-only dashboard widgets: tailoring, alterations, workshop load and catalogue mix. */

import { BookmarkPlus, CheckCircle2, CreditCard, Palette, Ruler, Scissors, Shirt, Sparkles, Tag } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { useGarmentsOps } from './useGarmentsOps';

const TAILORING = '/garments/tailoring';
const ALTERATIONS = '/garments/alterations';

const when = (days: number | null) => (days === null ? '—' : days === 0 ? 'Aaj' : days === 1 ? 'Kal' : `${days} din`);
const whenVariant = (days: number | null) => (days === null ? 'default' : days === 0 ? 'danger' : days <= 2 ? 'warning' : 'default') as 'default' | 'danger' | 'warning';

export const garmentsKpis: KpiDef[] = [
  {
    id: 'garments-tailoring', label: 'Silai chal rahi', icon: Scissors, tone: 'brand',
    useValue: () => {
      const g = useGarmentsOps();
      return {
        loading: g.loading, to: TAILORING, value: g.pending.tailoring, alert: g.tailoringSoon.length > 0,
        hint: g.tailoringSoon.length ? `${g.tailoringSoon.length} aaj/kal dene` : `${g.tailoring.length} is hafte`,
      };
    },
  },
  {
    id: 'garments-alterations', label: 'Alteration', icon: Ruler, tone: 'warning',
    useValue: () => {
      const g = useGarmentsOps();
      return { loading: g.loading, to: ALTERATIONS, value: g.pending.alterations, hint: g.alterationsSoon.length ? `${g.alterationsSoon.length} aaj/kal` : 'intezar me' };
    },
  },
  {
    id: 'garments-holds', label: 'Hold aur qist', icon: BookmarkPlus, tone: 'info',
    useValue: () => {
      const g = useGarmentsOps();
      return { loading: g.loading, to: '/garments/reservations', value: g.pending.reservations + g.pending.layaway, hint: `${g.pending.reservations} hold · ${g.pending.layaway} qist` };
    },
  },
  {
    id: 'garments-stitching', label: 'Silai ki kamai', icon: Sparkles, tone: 'success',
    useValue: () => {
      const g = useGarmentsOps();
      const { sales } = useMasked();
      return { loading: g.loading, to: TAILORING, value: sales(g.revenue.total), hint: `30 din · ${g.revenue.count} suit diye` };
    },
  },
];

export function useGarmentsAttention(): AttentionItem[] {
  const g = useGarmentsOps();
  const items: AttentionItem[] = [];
  const today = g.tailoring.filter((o) => o.days === 0);
  if (g.urgent.length) items.push({ icon: Scissors, level: 'danger', text: `${g.urgent.length} urgent silai order — karigar ko pehle ye dein`, to: TAILORING, cta: 'Orders dekhein' });
  if (today.length) items.push({ icon: Scissors, level: 'warning', text: `${today.length} silai order aaj dena hai — tayyar hai ya nahi, check kar lein`, to: TAILORING, cta: 'Silai dekhein' });
  if (g.alterationsSoon.length) items.push({ icon: Ruler, level: 'warning', text: `${g.alterationsSoon.length} alteration aaj ya kal deni hai`, to: ALTERATIONS, cta: 'Alterations' });
  if (g.pending.layaway) items.push({ icon: CreditCard, level: 'info', text: `${g.pending.layaway} qist plan chaalu — baqi qist yaad dila dein`, to: '/garments/layaway', cta: 'Qist dekhein' });
  if (g.pending.reservations) items.push({ icon: BookmarkPlus, level: 'neutral', text: `${g.pending.reservations} kapre customers ke liye hold par hain`, to: '/garments/reservations', cta: 'Hold dekhein' });
  return items;
}

export function GarmentsTailoring() {
  const g = useGarmentsOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title="Silai — agle 7 din" icon={Scissors} description={`${g.tailoring.length} order dene hain`} to={TAILORING} flush>
      <RowList empty="Is hafte koi silai order nahi" emptyIcon={CheckCircle2}>
        {g.tailoring.slice(0, 6).map((o) => (
          <ListRow
            key={o.id}
            to={`${TAILORING}/${o.id}`}
            leading={<IconBubble icon={Scissors} tone={o.priority === 'URGENT' ? 'danger' : o.priority === 'HIGH' ? 'warning' : 'brand'} />}
            title={o.customerName || 'Walk-in'}
            meta={<span className="font-mono">{o.orderNumber}{o.priority === 'URGENT' ? ' · Urgent' : ''}{o.total ? ` · ${sales(Number(o.total))}` : ''}</span>}
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
    <WidgetCard title="Alterations — agle 7 din" icon={Ruler} description={`${g.pending.alterations} chal rahi`} to={ALTERATIONS} flush>
      <RowList empty="Koi alteration baqi nahi" emptyIcon={CheckCircle2}>
        {g.alterations.slice(0, 6).map((a) => (
          <ListRow
            key={a.id}
            to={ALTERATIONS}
            leading={<IconBubble icon={Ruler} tone="warning" />}
            title={a.garmentDescription || 'Kapra'}
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
  const due = Math.max(g.revenue.total - g.revenue.paid, 0);
  return (
    <WidgetCard title="Silai ka kaam" icon={Scissors} description="Kaam ka bojh aur 30 din ki kamai" to={TAILORING}>
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Scissors} tone="brand" label="Silai" value={g.pending.tailoring} hint="chal rahi" to={TAILORING} />
        <MetricTile icon={Ruler} tone="warning" label="Alteration" value={g.pending.alterations} hint="intezar me" to={ALTERATIONS} />
        <MetricTile icon={BookmarkPlus} tone="info" label="Hold" value={g.pending.reservations} to="/garments/reservations" />
        <MetricTile icon={CreditCard} tone="success" label="Qist plan" value={g.pending.layaway} to="/garments/layaway" />
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-[0.8125rem]">
        <span className="text-slate-500">Silai ki kamai <strong className="tabular-nums text-slate-900">{sales(g.revenue.total)}</strong></span>
        <span className="text-slate-500">{due > 0 ? <>Baqi <strong className="tabular-nums text-amber-700">{sales(due)}</strong></> : `${g.revenue.count} suit diye`}</span>
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
          <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-slate-900">{r.count}</span>
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
    <WidgetCard title="Maal ka mix" icon={Shirt} description={`${t.activeCollections}/${t.totalCollections} collections chaalu`} to="/garments/products">
      <div className="flex flex-wrap gap-2">
        <Badge variant="brand" size="sm"><Sparkles className="h-3 w-3" /> {t.newArrivals} naya maal</Badge>
        <Badge variant="success" size="sm"><Palette className="h-3 w-3" /> {t.bestSellers} best seller</Badge>
        <Badge variant="warning" size="sm"><Tag className="h-3 w-3" /> {t.onSaleCount} sale par</Badge>
      </div>
      {g.seasons.length === 0 && g.genders.length === 0 ? (
        <p className="mt-4 text-[0.8125rem] text-slate-500">Products me season aur gender likhein to yahan mix nazar aayega.</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {g.seasons.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Season</h4>
              <Bars rows={g.seasons} />
            </div>
          )}
          {g.genders.length > 0 && (
            <div>
              <h4 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kis ke liye</h4>
              <Bars rows={g.genders} />
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
