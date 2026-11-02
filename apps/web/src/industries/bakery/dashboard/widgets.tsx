/** Bakery-only dashboard widgets. */

import { AlertTriangle, Cake, ChefHat, Croissant, Flame, ShoppingBag, Timer, Wheat } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { fmtQty, IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import { MiniSelect, useWidgetState } from '@modules/dashboard/engine/controls';
import { WidgetToolbar } from '@modules/dashboard/widgets/WidgetToolbar';
import { MoneyNote, type AttentionItem, type MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useBakeryOps } from './useBakeryOps';
import { t } from '@core/i18n';

/** Bakery headline numbers, offered next to the common ones. */
export const bakeryKpis: KpiDef[] = [
  {
    id: 'bakery-baking', label: t('Aaj banana hai'), icon: Croissant, tone: 'neutral',
    useValue: () => {
      const { production: p, loading } = useBakeryOps();
      return {
        loading, to: '/bakery/production',
        value: p.total > 0 ? `${p.done}/${p.total}` : '—',
        hint: p.inOven > 0 ? t('{{inOven}} oven me', { inOven: p.inOven }) : p.total ? t('{{pending}} baqi', { pending: p.pending }) : t('plan nahi bana'),
      };
    },
  },
  {
    id: 'bakery-orders', label: t('Order dene hain'), icon: Cake, tone: 'warning',
    useValue: () => {
      const { orders, loading } = useBakeryOps();
      return {
        loading, to: '/bakery/cake-orders', value: orders.today.length, alert: orders.late.length > 0,
        hint: orders.late.length > 0 ? t('{{count}} late!', { count: orders.late.length }) : t('{{count}} chaalu', { count: orders.active.length }),
      };
    },
  },
  {
    id: 'bakery-fresh', label: t('Jald kharab'), icon: Timer, tone: 'danger',
    useValue: () => {
      const { fresh, loading } = useBakeryOps();
      const { cost } = useMasked();
      return {
        loading, to: '/bakery/freshness', value: fresh.expired.length + fresh.urgent.length, alert: fresh.expired.length > 0,
        hint: fresh.value > 0 ? t('{{cost}} ka maal', { cost: cost(fresh.value) }) : t('{{qty}} cheezein', { qty: fmtQty(fresh.qty) }),
      };
    },
  },
  {
    id: 'bakery-raw', label: t('Saamaan kam'), icon: Wheat, tone: 'warning',
    useValue: () => {
      const { raw, loading } = useBakeryOps();
      return { loading, to: '/bakery/ingredients', value: raw.low, hint: raw.critical ? t('{{critical}} khatam', { critical: raw.critical }) : t('{{total}} cheezein', { total: raw.total }), alert: raw.critical > 0 };
    },
  },
];

export function useBakeryAttention(): AttentionItem[] {
  const { fresh, orders, raw, production } = useBakeryOps();
  const items: AttentionItem[] = [];

  if (fresh.expired.length) items.push({ icon: Flame, level: 'danger', text: t('{{count}} batch ka waqt guzar chuka — aaj hi nikalna ya phenkna hai', { count: fresh.expired.length }), to: '/bakery/freshness', cta: t('Freshness dekhein') });
  if (orders.late.length) items.push({ icon: AlertTriangle, level: 'danger', text: t('{{count}} order late hai — customer ko batana zaroori hai', { count: orders.late.length }), to: '/bakery/cake-orders', cta: t('Orders dekhein') });
  if (fresh.urgent.length) items.push({ icon: Timer, level: 'warning', text: t('{{count}} batch agle 12 ghante me kharab ho jayega — discount laga dein', { count: fresh.urgent.length }), to: '/bakery/freshness', cta: t('Jaldi bechein') });
  if (raw.critical) items.push({ icon: Wheat, level: 'warning', text: t('{{critical}} zaroori saamaan khatam — is ke bagair banana ruk jayega', { critical: raw.critical }), to: '/bakery/ingredients', cta: t('Saamaan mangwayein') });
  if (orders.today.length) items.push({ icon: Cake, level: 'info', text: t('{{count}} order aaj dena hai', { count: orders.today.length }), to: '/bakery/cake-orders', cta: t('Dekhein') });
  if (production.pending) items.push({ icon: Croissant, level: 'info', text: t('{{pending}} cheez abhi banani baqi hai', { pending: production.pending }), to: '/bakery/production', cta: t('Baking dekhein') });
  if (production.planCount === 0) items.push({ icon: ChefHat, level: 'neutral', text: t('Aaj ka baking plan nahi bana — subah plan banana kaam asaan kar deta hai'), to: '/bakery/production', cta: t('Plan banayein') });
  return items;
}

export function BakeryProduction() {
  const { production: p } = useBakeryOps();
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
  return (
    <WidgetCard title={t('Aaj ki baking')} icon={ChefHat} description={p.planCount ? t('{{planCount}} plan · {{pct}}% mukammal', { planCount: p.planCount, pct }) : t('Aaj ka plan nahi bana')} to="/bakery/production">
      {p.total === 0 ? (
        <div className="flex items-center gap-3">
          <IconBubble icon={ChefHat} />
          <p className="text-[0.8125rem] text-slate-600">{t('Plan bana lein — kya, kitna aur kab banana hai sab yahan nazar aayega.')}</p>
        </div>
      ) : (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[[t('Baqi'), p.pending, 'text-slate-900'], [t('Oven me'), p.inOven, 'text-amber-700'], [t('Tayyar'), p.done, 'text-success-700']].map(([label, n, color]) => (
              <div key={label as string} className="rounded-lg bg-slate-50 py-2.5">
                <dd className={cn('text-xl font-bold tabular-nums', color as string)}>{n}</dd>
                <dt className="text-[0.75rem] text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>
        </>
      )}
    </WidgetCard>
  );
}

export function BakeryFreshness() {
  const { fresh } = useBakeryOps();
  const { cost, costHidden } = useMasked();
  const [st, set] = useWidgetState('bakery-freshness', { hours: '24', limit: '6' });
  const hours = Number(st.hours);
  const rows = fresh.live.filter((f) => f.left <= hours);
  const value = rows.reduce((x, f) => x + f.value, 0);
  return (
    <WidgetCard
      title={t('Jald kharab hone wala')}
      icon={Timer}
      description={value > 0 && !costHidden ? t('{{formatPKR}} ka maal, {{hours}} ghante me', { formatPKR: formatPKR(value), hours }) : t('{{hours}} ghante ke andar', { hours })}
      to="/bakery/freshness"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: t('Jald kharab hone wala'), subtitle: t('Agle {{hours}} ghante', { hours }),
          sections: [{ kind: 'table', columns: [{ label: t('Item') }, { label: t('Batch'), wideOnly: true }, { label: t('Baqi'), align: 'right' }, { label: t('Waqt'), align: 'right' }, { label: t('Maal'), align: 'right' }],
            rows: rows.map((f) => [f.productName ?? t('Batch'), f.batchNumber ?? '', fmtQty(f.currentQty), f.left <= 0 ? t('Guzar gaya') : t('{{left}}h', { left: Math.round(f.left) }), cost(f.value)]) }],
        })}>
        <MiniSelect label={t('Kitne ghante')} value={st.hours} onChange={(v) => set({ hours: v })}
          options={[{ value: '0', label: t('Sirf guzar chuka') }, { value: '12', label: t('12 ghante') }, { value: '24', label: t('24 ghante') }, { value: '48', label: t('2 din') }, { value: '72', label: t('3 din') }]} />
        <MiniSelect label={t('Kitne')} value={st.limit} onChange={(v) => set({ limit: v })} options={[{ value: '6', label: '6' }, { value: '12', label: '12' }, { value: '50', label: t('Sab') }]} />
      </WidgetToolbar>
      <RowList empty={t('Kuch jald kharab nahi ho raha')} emptyIcon={Timer}>
        {rows.slice(0, Number(st.limit)).map((f) => {
          const gone = f.left <= 0;
          return (
            <ListRow
              key={f.id}
              leading={<IconBubble icon={gone ? Flame : Timer} tone={gone ? 'danger' : 'warning'} />}
              title={f.productName ?? t('Batch')}
              meta={t('{{currentQty}} baqi{{value}}{{value2}}', { currentQty: fmtQty(f.currentQty), value: f.batchNumber ? ` · ${f.batchNumber}` : '', value2: f.value ? ` · ${cost(f.value)}` : '' })}
              value={<Badge variant={gone ? 'danger' : 'warning'} size="xs">{gone ? t('Guzar gaya') : t('{{left}}h', { left: Math.round(f.left) })}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function BakeryOrders() {
  const { orders } = useBakeryOps();
  const { cost, costHidden } = useMasked();
  const [st, set] = useWidgetState('bakery-orders', { when: 'all', kind: 'all', limit: '6' });
  const rows = orders.sorted.filter((o) => {
    if (st.kind !== 'all' && o.kind !== st.kind) return false;
    if (st.when === 'late') return o.left !== null && o.left < 0;
    if (st.when === 'today') return o.left !== null && o.left <= 24;
    if (st.when === 'week') return o.left !== null && o.left <= 24 * 7;
    if (st.when === 'due') return o.due > 0;
    return true;
  });
  const when = (left: number | null) => (left === null ? '—' : left < 0 ? t('Late') : left <= 24 ? t('{{left}}h', { left: Math.round(left) }) : t('{{value}} din', { value: Math.round(left / 24) }));
  return (
    <WidgetCard
      title={t('Aane wale order')}
      icon={Cake}
      description={orders.due > 0 && !costHidden ? t('{{count}} chaalu · {{due}} baqi lena hai', { count: orders.active.length, due: formatPKR(orders.due) }) : t('{{count}} chaalu', { count: orders.active.length })}
      to="/bakery/cake-orders"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: t('Aane wale order'),
          sections: [{ kind: 'table', columns: [{ label: t('Order') }, { label: t('Customer') }, { label: t('Kab'), align: 'right' }, { label: t('Kul'), align: 'right', wideOnly: true }, { label: t('Baqi'), align: 'right' }],
            rows: rows.map((o) => [o.number, o.name || t('Customer'), when(o.left), cost(o.total), cost(o.due)]) }],
        })}>
        <MiniSelect label={t('Kab')} value={st.when} onChange={(v) => set({ when: v })}
          options={[{ value: 'all', label: t('Sab chaalu') }, { value: 'late', label: t('Late') }, { value: 'today', label: t('24 ghante me') }, { value: 'week', label: t('Is hafte') }, { value: 'due', label: t('Jin ka paisa baqi') }]} />
        <MiniSelect label={t('Type')} value={st.kind} onChange={(v) => set({ kind: v })} options={[{ value: 'all', label: t('Cake + bare') }, { value: 'cake', label: t('Cake order') }, { value: 'bulk', label: t('Bare order') }]} />
        <MiniSelect label={t('Kitne')} value={st.limit} onChange={(v) => set({ limit: v })} options={[{ value: '6', label: '6' }, { value: '12', label: '12' }, { value: '50', label: t('Sab') }]} />
      </WidgetToolbar>
      <RowList empty={t('Koi order nahi')} emptyIcon={Cake}>
        {rows.slice(0, Number(st.limit)).map((o) => {
          const late = o.left !== null && o.left < 0;
          const soon = o.left !== null && o.left <= 24;
          return (
            <ListRow
              key={`${o.kind}-${o.id}`}
              to={o.kind === 'cake' ? `/bakery/cake-orders/${o.id}` : '/bakery/bulk-orders'}
              icon={o.kind === 'cake' ? Cake : ShoppingBag}
              title={o.name || t('Customer')}
              meta={<span className="font-mono">{o.number}{o.due > 0 ? t(' · baqi {{due}}', { due: cost(o.due) }) : ''}</span>}
              value={<Badge variant={late ? 'danger' : soon ? 'warning' : 'default'} size="xs">{when(o.left)}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function BakeryIngredients() {
  const { raw } = useBakeryOps();
  const { cost } = useMasked();
  const [st, set] = useWidgetState('bakery-ingredients', { filter: 'low', limit: '6' });
  const rows = (st.filter === 'all' ? raw.all : st.filter === 'out' ? raw.lowAll.filter((i) => Number(i.currentStock || 0) <= 0) : raw.lowAll);
  return (
    <WidgetCard
      title={t('Banane ka saamaan')}
      icon={Wheat}
      description={raw.critical > 0 ? t('{{low}} kam · {{critical}} bilkul khatam', { low: raw.low, critical: raw.critical }) : t('{{low}} cheezein kam · {{total}} kul', { low: raw.low, total: raw.total })}
      to="/bakery/ingredients"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: t('Banane ka saamaan'), subtitle: st.filter === 'all' ? t('Poori list') : t('Mangwane ki list'),
          sections: [{ kind: 'table', columns: [{ label: t('Saamaan') }, { label: t('Baqi'), align: 'right' }, { label: t('Reorder'), align: 'right', wideOnly: true }, { label: t('Mangwana'), align: 'right' }],
            rows: rows.map((i) => [i.name, `${fmtQty(i.currentStock)} ${i.unit ?? ''}`, fmtQty(i.reorderLevel ?? i.minStock ?? 0), '______']) }],
        })}>
        <MiniSelect label={t('Filter')} value={st.filter} onChange={(v) => set({ filter: v })} options={[{ value: 'low', label: t('Kam wala') }, { value: 'out', label: t('Sirf khatam') }, { value: 'all', label: t('Sab saamaan') }]} />
        <MiniSelect label={t('Kitne')} value={st.limit} onChange={(v) => set({ limit: v })} options={[{ value: '6', label: '6' }, { value: '12', label: '12' }, { value: '100', label: t('Sab') }]} />
      </WidgetToolbar>
      <RowList empty={st.filter === 'all' ? t('Abhi koi saamaan darj nahi') : t('Saara saamaan poora hai')} emptyIcon={Wheat}>
        {rows.slice(0, Number(st.limit)).map((i) => {
          const stock = Number(i.currentStock || 0);
          const out = stock <= 0;
          const low = stock <= Number(i.reorderLevel ?? i.minStock ?? 0);
          return (
            <ListRow
              key={i.id}
              leading={<IconBubble icon={Wheat} tone={out ? 'danger' : low ? 'warning' : 'neutral'} />}
              title={i.name}
              meta={t('{{stock}} {{value}} baqi{{value2}}', { stock: fmtQty(stock), value: i.unit ?? '', value2: i.supplierName ? ` · ${i.supplierName}` : '' })}
              value={out ? <Badge variant="danger" size="xs">{t('Khatam')}</Badge> : low ? <Badge variant="warning" size="xs">{t('Kam')}</Badge> : <span className="text-[0.8125rem] text-slate-500">{cost(stock * Number(i.costPerUnit || 0))}</span>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

/** Raw-material value as an extra "where the money is" tile. */
export function useBakeryMoneyTiles(): MoneyTileProps[] {
  const { raw } = useBakeryOps();
  return [{
    key: 'ingredients', icon: Wheat, tone: 'warning', to: '/bakery/ingredients', label: t('Banane ka saamaan'),
    value: formatPKR(raw.value), hint: raw.low > 0 ? t('{{total}} cheezein · {{low}} kam', { total: raw.total, low: raw.low }) : t('{{total}} cheezein', { total: raw.total }),
    alert: raw.critical > 0,
  }];
}

/** Stock that becomes waste tomorrow, called out under the money map. */
export function useBakeryMoneyNotes() {
  const { fresh } = useBakeryOps();
  if (fresh.value <= 0) return null;
  return (
    <MoneyNote
      tone="danger"
      icon={Timer}
      title={t('{{formatPKR}} ka maal 24 ghante me kharab ho jayega', { formatPKR: formatPKR(fresh.value) })}
      text={t('Aaj nahi nikla to kal kachra hai — discount laga dein, ya staff ko de dein')}
      to="/bakery/freshness"
      cta={t('Freshness dekhein')}
    />
  );
}
