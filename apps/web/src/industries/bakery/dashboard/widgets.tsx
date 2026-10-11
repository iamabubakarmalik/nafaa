/** Bakery-only dashboard widgets. */

import {
  AlertTriangle, Cake, ChefHat, Croissant, Flame, Package, Receipt, ShoppingBag, Timer, TrendingUp, Wheat,
} from 'lucide-react';
import { Badge } from '@/design-system/components';
import { useOverview } from '@modules/dashboard/data/queries';
import { fmtQty, IconBubble, ListRow, RowList, useMasked, WidgetCard } from '@modules/dashboard/engine';
import { AttentionList, KpiStrip, MoneyNote, type AttentionItem, type MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useBakeryOps } from './useBakeryOps';

export function BakeryKpis() {
  const { data, isLoading } = useOverview();
  const { production, orders, fresh } = useBakeryOps();
  const { sales, cost, salesHidden } = useMasked();
  const s = data?.stats;
  const growth = s?.salesGrowthVsYesterday ?? 0;

  return (
    <KpiStrip
      loading={isLoading}
      items={[
        {
          label: 'Aaj ki bikri', icon: TrendingUp, value: sales(s?.salesToday),
          hint: salesHidden || !growth ? 'Aaj' : `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% kal se`,
        },
        { label: 'Aaj ke bill', icon: Receipt, tone: 'info', value: s?.ordersToday ?? 0, hint: `Ausat ${sales(s?.aovToday)}`, to: '/sales' },
        {
          label: 'Aaj banana hai', icon: Croissant, tone: 'neutral', to: '/bakery/production',
          value: production.total > 0 ? `${production.done}/${production.total}` : '—',
          hint: production.inOven > 0 ? `${production.inOven} oven me` : `${production.pending} baqi`,
        },
        {
          label: 'Order dene hain', icon: Cake, tone: 'warning', to: '/bakery/cake-orders', value: orders.today.length,
          hint: orders.late.length > 0 ? `${orders.late.length} late!` : `${orders.active.length} chaalu`, alert: orders.late.length > 0,
        },
        {
          label: 'Jald kharab', icon: Timer, tone: 'danger', to: '/bakery/freshness',
          value: fresh.expired.length + fresh.urgent.length,
          hint: fresh.value > 0 ? `${cost(fresh.value)} ka maal` : `${fmtQty(fresh.qty)} cheezein`, alert: fresh.expired.length > 0,
        },
      ]}
    />
  );
}

export function BakeryAttention() {
  const { data } = useOverview();
  const { fresh, orders, raw, production } = useBakeryOps();
  const lowStock = data?.stats.lowStockCount ?? 0;
  const items: AttentionItem[] = [];

  if (fresh.expired.length) items.push({ icon: Flame, level: 'danger', text: `${fresh.expired.length} batch ka waqt guzar chuka — aaj hi nikalna ya phenkna hai`, to: '/bakery/freshness', cta: 'Taazgi dekhein' });
  if (orders.late.length) items.push({ icon: AlertTriangle, level: 'danger', text: `${orders.late.length} order late hai — customer ko batana zaroori hai`, to: '/bakery/cake-orders', cta: 'Orders dekhein' });
  if (fresh.urgent.length) items.push({ icon: Timer, level: 'warning', text: `${fresh.urgent.length} batch agle 12 ghante me kharab ho jayega — discount laga dein`, to: '/bakery/freshness', cta: 'Jaldi bechein' });
  if (raw.critical) items.push({ icon: Wheat, level: 'warning', text: `${raw.critical} zaroori saamaan khatam — is ke bagair banana ruk jayega`, to: '/bakery/ingredients', cta: 'Saamaan mangwayein' });
  if (orders.today.length) items.push({ icon: Cake, level: 'info', text: `${orders.today.length} order aaj dena hai`, to: '/bakery/cake-orders', cta: 'Dekhein' });
  if (production.pending) items.push({ icon: Croissant, level: 'info', text: `${production.pending} cheez abhi banani baqi hai`, to: '/bakery/production', cta: 'Baking dekhein' });
  if (production.planCount === 0) items.push({ icon: ChefHat, level: 'neutral', text: 'Aaj ka baking plan nahi bana — subah plan banana kaam asaan kar deta hai', to: '/bakery/production', cta: 'Plan banayein' });
  if (lowStock) items.push({ icon: Package, level: 'neutral', text: `${lowStock} cheez counter par kam ho gayi`, to: '/low-stock', cta: 'Kya banana hai' });

  return <AttentionList items={items} />;
}

export function BakeryProduction() {
  const { production: p } = useBakeryOps();
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
  return (
    <WidgetCard title="Aaj ki baking" description={p.planCount ? `${p.planCount} plan · ${pct}% mukammal` : 'Aaj ka plan nahi bana'} to="/bakery/production">
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
  return (
    <WidgetCard
      title="Jald kharab hone wala"
      description={fresh.value > 0 && !costHidden ? `${formatPKR(fresh.value)} ka maal, 24 ghante me` : '24 ghante ke andar'}
      to="/bakery/freshness"
      flush
    >
      <RowList empty="Kuch jald kharab nahi ho raha" emptyIcon={Timer}>
        {fresh.list.map((f) => {
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
  return (
    <WidgetCard
      title="Aane wale order"
      description={orders.due > 0 && !costHidden ? `${formatPKR(orders.due)} baqi lena hai` : `${orders.active.length} chaalu`}
      to="/bakery/cake-orders"
      flush
    >
      <RowList empty="Koi order baqi nahi" emptyIcon={Cake}>
        {orders.list.map((o) => {
          const late = o.left !== null && o.left < 0;
          const soon = o.left !== null && o.left <= 24;
          const when = o.left === null ? '—' : late ? 'Late' : soon ? `${Math.round(o.left)}h` : `${Math.round(o.left / 24)} din`;
          return (
            <ListRow
              key={`${o.kind}-${o.id}`}
              to={o.kind === 'cake' ? `/bakery/cake-orders/${o.id}` : '/bakery/bulk-orders'}
              icon={o.kind === 'cake' ? Cake : ShoppingBag}
              title={o.name || 'Customer'}
              meta={<span className="font-mono">{o.number}{o.due > 0 ? ` · baqi ${cost(o.due)}` : ''}</span>}
              value={<Badge variant={late ? 'danger' : soon ? 'warning' : 'default'} size="xs">{when}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function BakeryIngredients() {
  const { raw } = useBakeryOps();
  return (
    <WidgetCard
      title="Saamaan kam ho gaya"
      description={raw.critical > 0 ? `${raw.critical} bilkul khatam` : `${raw.low} cheezein kam`}
      to="/bakery/ingredients"
      flush
    >
      <RowList empty="Saara saamaan poora hai" emptyIcon={Wheat}>
        {raw.list.map((i) => {
          const out = Number(i.currentStock || 0) <= 0;
          return (
            <ListRow
              key={i.id}
              leading={<IconBubble icon={Wheat} tone={out ? 'danger' : 'warning'} />}
              title={i.name}
              meta={`${fmtQty(i.currentStock)} ${i.unit ?? ''} baqi`}
              value={out ? <Badge variant="danger" size="xs">Khatam</Badge> : undefined}
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
