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

/** Bakery headline numbers, offered next to the common ones. */
export const bakeryKpis: KpiDef[] = [
  {
    id: 'bakery-baking', label: 'Aaj banana hai', icon: Croissant, tone: 'neutral',
    useValue: () => {
      const { production: p, loading } = useBakeryOps();
      return {
        loading, to: '/bakery/production',
        value: p.total > 0 ? `${p.done}/${p.total}` : '—',
        hint: p.inOven > 0 ? `${p.inOven} oven me` : p.total ? `${p.pending} baqi` : 'plan nahi bana',
      };
    },
  },
  {
    id: 'bakery-orders', label: 'Order dene hain', icon: Cake, tone: 'warning',
    useValue: () => {
      const { orders, loading } = useBakeryOps();
      return {
        loading, to: '/bakery/cake-orders', value: orders.today.length, alert: orders.late.length > 0,
        hint: orders.late.length > 0 ? `${orders.late.length} late!` : `${orders.active.length} chaalu`,
      };
    },
  },
  {
    id: 'bakery-fresh', label: 'Jald kharab', icon: Timer, tone: 'danger',
    useValue: () => {
      const { fresh, loading } = useBakeryOps();
      const { cost } = useMasked();
      return {
        loading, to: '/bakery/freshness', value: fresh.expired.length + fresh.urgent.length, alert: fresh.expired.length > 0,
        hint: fresh.value > 0 ? `${cost(fresh.value)} ka maal` : `${fmtQty(fresh.qty)} cheezein`,
      };
    },
  },
  {
    id: 'bakery-raw', label: 'Saamaan kam', icon: Wheat, tone: 'warning',
    useValue: () => {
      const { raw, loading } = useBakeryOps();
      return { loading, to: '/bakery/ingredients', value: raw.low, hint: raw.critical ? `${raw.critical} khatam` : `${raw.total} cheezein`, alert: raw.critical > 0 };
    },
  },
];

export function useBakeryAttention(): AttentionItem[] {
  const { fresh, orders, raw, production } = useBakeryOps();
  const items: AttentionItem[] = [];

  if (fresh.expired.length) items.push({ icon: Flame, level: 'danger', text: `${fresh.expired.length} batch ka waqt guzar chuka — aaj hi nikalna ya phenkna hai`, to: '/bakery/freshness', cta: 'Taazgi dekhein' });
  if (orders.late.length) items.push({ icon: AlertTriangle, level: 'danger', text: `${orders.late.length} order late hai — customer ko batana zaroori hai`, to: '/bakery/cake-orders', cta: 'Orders dekhein' });
  if (fresh.urgent.length) items.push({ icon: Timer, level: 'warning', text: `${fresh.urgent.length} batch agle 12 ghante me kharab ho jayega — discount laga dein`, to: '/bakery/freshness', cta: 'Jaldi bechein' });
  if (raw.critical) items.push({ icon: Wheat, level: 'warning', text: `${raw.critical} zaroori saamaan khatam — is ke bagair banana ruk jayega`, to: '/bakery/ingredients', cta: 'Saamaan mangwayein' });
  if (orders.today.length) items.push({ icon: Cake, level: 'info', text: `${orders.today.length} order aaj dena hai`, to: '/bakery/cake-orders', cta: 'Dekhein' });
  if (production.pending) items.push({ icon: Croissant, level: 'info', text: `${production.pending} cheez abhi banani baqi hai`, to: '/bakery/production', cta: 'Baking dekhein' });
  if (production.planCount === 0) items.push({ icon: ChefHat, level: 'neutral', text: 'Aaj ka baking plan nahi bana — subah plan banana kaam asaan kar deta hai', to: '/bakery/production', cta: 'Plan banayein' });
  return items;
}

export function BakeryProduction() {
  const { production: p } = useBakeryOps();
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
  return (
    <WidgetCard title="Aaj ki baking" icon={ChefHat} description={p.planCount ? `${p.planCount} plan · ${pct}% mukammal` : 'Aaj ka plan nahi bana'} to="/bakery/production">
      {p.total === 0 ? (
        <div className="flex items-center gap-3">
          <IconBubble icon={ChefHat} />
          <p className="text-[0.8125rem] text-slate-600">Plan bana lein — kya, kitna aur kab banana hai sab yahan nazar aayega.</p>
        </div>
      ) : (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[['Baqi', p.pending, 'text-slate-900'], ['Oven me', p.inOven, 'text-amber-700'], ['Tayyar', p.done, 'text-success-700']].map(([label, n, color]) => (
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
      title="Jald kharab hone wala"
      icon={Timer}
      description={value > 0 && !costHidden ? `${formatPKR(value)} ka maal, ${hours} ghante me` : `${hours} ghante ke andar`}
      to="/bakery/freshness"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: 'Jald kharab hone wala', subtitle: `Agle ${hours} ghante`,
          sections: [{ kind: 'table', columns: [{ label: 'Item' }, { label: 'Batch', wideOnly: true }, { label: 'Baqi', align: 'right' }, { label: 'Waqt', align: 'right' }, { label: 'Maal', align: 'right' }],
            rows: rows.map((f) => [f.productName ?? 'Batch', f.batchNumber ?? '', fmtQty(f.currentQty), f.left <= 0 ? 'Guzar gaya' : `${Math.round(f.left)}h`, cost(f.value)]) }],
        })}>
        <MiniSelect label="Kitne ghante" value={st.hours} onChange={(v) => set({ hours: v })}
          options={[{ value: '0', label: 'Sirf guzar chuka' }, { value: '12', label: '12 ghante' }, { value: '24', label: '24 ghante' }, { value: '48', label: '2 din' }, { value: '72', label: '3 din' }]} />
        <MiniSelect label="Kitne" value={st.limit} onChange={(v) => set({ limit: v })} options={[{ value: '6', label: '6' }, { value: '12', label: '12' }, { value: '50', label: 'Sab' }]} />
      </WidgetToolbar>
      <RowList empty="Kuch jald kharab nahi ho raha" emptyIcon={Timer}>
        {rows.slice(0, Number(st.limit)).map((f) => {
          const gone = f.left <= 0;
          return (
            <ListRow
              key={f.id}
              leading={<IconBubble icon={gone ? Flame : Timer} tone={gone ? 'danger' : 'warning'} />}
              title={f.productName ?? 'Batch'}
              meta={`${fmtQty(f.currentQty)} baqi${f.batchNumber ? ` · ${f.batchNumber}` : ''}${f.value ? ` · ${cost(f.value)}` : ''}`}
              value={<Badge variant={gone ? 'danger' : 'warning'} size="xs">{gone ? 'Guzar gaya' : `${Math.round(f.left)}h`}</Badge>}
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
  const when = (left: number | null) => (left === null ? '—' : left < 0 ? 'Late' : left <= 24 ? `${Math.round(left)}h` : `${Math.round(left / 24)} din`);
  return (
    <WidgetCard
      title="Aane wale order"
      icon={Cake}
      description={orders.due > 0 && !costHidden ? `${orders.active.length} chaalu · ${formatPKR(orders.due)} baqi lena hai` : `${orders.active.length} chaalu`}
      to="/bakery/cake-orders"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: 'Aane wale order',
          sections: [{ kind: 'table', columns: [{ label: 'Order' }, { label: 'Customer' }, { label: 'Kab', align: 'right' }, { label: 'Kul', align: 'right', wideOnly: true }, { label: 'Baqi', align: 'right' }],
            rows: rows.map((o) => [o.number, o.name || 'Customer', when(o.left), cost(o.total), cost(o.due)]) }],
        })}>
        <MiniSelect label="Kab" value={st.when} onChange={(v) => set({ when: v })}
          options={[{ value: 'all', label: 'Sab chaalu' }, { value: 'late', label: 'Late' }, { value: 'today', label: '24 ghante me' }, { value: 'week', label: 'Is hafte' }, { value: 'due', label: 'Jin ka paisa baqi' }]} />
        <MiniSelect label="Qisam" value={st.kind} onChange={(v) => set({ kind: v })} options={[{ value: 'all', label: 'Cake + bare' }, { value: 'cake', label: 'Cake order' }, { value: 'bulk', label: 'Bare order' }]} />
        <MiniSelect label="Kitne" value={st.limit} onChange={(v) => set({ limit: v })} options={[{ value: '6', label: '6' }, { value: '12', label: '12' }, { value: '50', label: 'Sab' }]} />
      </WidgetToolbar>
      <RowList empty="Koi order nahi" emptyIcon={Cake}>
        {rows.slice(0, Number(st.limit)).map((o) => {
          const late = o.left !== null && o.left < 0;
          const soon = o.left !== null && o.left <= 24;
          return (
            <ListRow
              key={`${o.kind}-${o.id}`}
              to={o.kind === 'cake' ? `/bakery/cake-orders/${o.id}` : '/bakery/bulk-orders'}
              icon={o.kind === 'cake' ? Cake : ShoppingBag}
              title={o.name || 'Customer'}
              meta={<span className="font-mono">{o.number}{o.due > 0 ? ` · baqi ${cost(o.due)}` : ''}</span>}
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
      title="Banane ka saamaan"
      icon={Wheat}
      description={raw.critical > 0 ? `${raw.low} kam · ${raw.critical} bilkul khatam` : `${raw.low} cheezein kam · ${raw.total} kul`}
      to="/bakery/ingredients"
      flush
    >
      <WidgetToolbar
        print={() => ({
          title: 'Banane ka saamaan', subtitle: st.filter === 'all' ? 'Poori list' : 'Mangwane ki list',
          sections: [{ kind: 'table', columns: [{ label: 'Saamaan' }, { label: 'Baqi', align: 'right' }, { label: 'Reorder', align: 'right', wideOnly: true }, { label: 'Mangwana', align: 'right' }],
            rows: rows.map((i) => [i.name, `${fmtQty(i.currentStock)} ${i.unit ?? ''}`, fmtQty(i.reorderLevel ?? i.minStock ?? 0), '______']) }],
        })}>
        <MiniSelect label="Filter" value={st.filter} onChange={(v) => set({ filter: v })} options={[{ value: 'low', label: 'Kam wala' }, { value: 'out', label: 'Sirf khatam' }, { value: 'all', label: 'Sab saamaan' }]} />
        <MiniSelect label="Kitne" value={st.limit} onChange={(v) => set({ limit: v })} options={[{ value: '6', label: '6' }, { value: '12', label: '12' }, { value: '100', label: 'Sab' }]} />
      </WidgetToolbar>
      <RowList empty={st.filter === 'all' ? 'Abhi koi saamaan darj nahi' : 'Saara saamaan poora hai'} emptyIcon={Wheat}>
        {rows.slice(0, Number(st.limit)).map((i) => {
          const stock = Number(i.currentStock || 0);
          const out = stock <= 0;
          const low = stock <= Number(i.reorderLevel ?? i.minStock ?? 0);
          return (
            <ListRow
              key={i.id}
              leading={<IconBubble icon={Wheat} tone={out ? 'danger' : low ? 'warning' : 'neutral'} />}
              title={i.name}
              meta={`${fmtQty(stock)} ${i.unit ?? ''} baqi${i.supplierName ? ` · ${i.supplierName}` : ''}`}
              value={out ? <Badge variant="danger" size="xs">Khatam</Badge> : low ? <Badge variant="warning" size="xs">Kam</Badge> : <span className="text-[0.8125rem] text-slate-500">{cost(stock * Number(i.costPerUnit || 0))}</span>}
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
    key: 'ingredients', icon: Wheat, tone: 'warning', to: '/bakery/ingredients', label: 'Banane ka saamaan',
    value: formatPKR(raw.value), hint: raw.low > 0 ? `${raw.total} cheezein · ${raw.low} kam` : `${raw.total} cheezein`,
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
      title={`${formatPKR(fresh.value)} ka maal 24 ghante me kharab ho jayega`}
      text="Aaj nahi nikla to kal kachra hai — discount laga dein, ya staff ko de dein"
      to="/bakery/freshness"
      cta="Taazgi dekhein"
    />
  );
}
