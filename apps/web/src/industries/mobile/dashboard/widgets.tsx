/** Mobile-shop-only dashboard widgets. */

import {
  AlertTriangle, BadgeCheck, Cable, CalendarClock, CreditCard, PackageCheck, PiggyBank, RotateCcw, ShieldCheck, Smartphone,
  Wrench, type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import type { PtaStatus } from '../api/imei.api';
import type { ProfitSourceKey } from '../api/mobile-reports.api';
import { useMobileOps } from './useMobileOps';

/** Mobile headline numbers, offered next to the common ones. */
export const mobileKpis: KpiDef[] = [
  {
    id: 'mobile-imei', label: 'Phone stock me', icon: Smartphone, tone: 'brand',
    useValue: () => {
      const { stock, loading } = useMobileOps();
      return { loading, to: '/imei-inventory', value: stock.inStock, hint: stock.soldToday ? `${stock.soldToday} aaj bike` : `${stock.sold} ab tak bike` };
    },
  },
  {
    id: 'mobile-repairs', label: 'Repair khule', icon: Wrench, tone: 'warning',
    useValue: () => {
      const { repairs, loading } = useMobileOps();
      return {
        loading, to: '/repair-tickets', value: repairs.open,
        hint: repairs.ready ? `${repairs.ready} pickup ke liye tayyar` : `${repairs.today} aaj aaye`,
      };
    },
  },
  {
    id: 'mobile-emi', label: 'Kist late', icon: CreditCard, tone: 'danger', sensitive: true,
    useValue: () => {
      const { emi, loading } = useMobileOps();
      const { cost } = useMasked();
      return {
        loading, to: '/emi-plans', value: emi.overdueCount, alert: emi.overdueCount > 0,
        hint: emi.overdueCount ? `${cost(emi.overdueAmount)} lena hai` : `${emi.active} plan chal rahe`,
      };
    },
  },
  {
    id: 'mobile-used', label: 'Used phone', icon: RotateCcw, tone: 'neutral',
    useValue: () => {
      const { used, loading } = useMobileOps();
      return { loading, to: '/used-phones', value: used.inStock, hint: used.inspection ? `${used.inspection} check baqi` : 'stock me' };
    },
  },
];

export function useMobileAttention(): AttentionItem[] {
  const { emi, repairs, used, stock } = useMobileOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (emi.overdueCount) items.push({ icon: CreditCard, level: 'danger', text: `${emi.overdueCount} kist late hain — ${cost(emi.overdueAmount)} receive karna hai`, to: '/emi-plans', cta: 'Kist dekhein' });
  if (repairs.ready) items.push({ icon: PackageCheck, level: 'warning', text: `${repairs.ready} phone repair ho kar tayyar — customer ko call karein`, to: '/repair-tickets', cta: 'Pickup' });
  if (repairs.approval) items.push({ icon: Wrench, level: 'warning', text: `${repairs.approval} repair par customer ki haan baqi hai — kaam ruka hua hai`, to: '/repair-tickets', cta: 'Approval lein' });
  if (repairs.parts) items.push({ icon: Cable, level: 'info', text: `${repairs.parts} repair parts ke intezar me`, to: '/repair-tickets', cta: 'Parts mangwayein' });
  if (used.inspection) items.push({ icon: RotateCcw, level: 'info', text: `${used.inspection} used phone check hona baqi — check ke baad hi bik sakte hain`, to: '/used-phones', cta: 'Check karein' });
  if (emi.upcomingCount) items.push({ icon: CalendarClock, level: 'info', text: `${emi.upcomingCount} kist jald aane wali hain — customer ko yaad dilayein`, to: '/emi-plans', cta: 'Dekhein' });
  if (stock.nonPta) items.push({ icon: ShieldCheck, level: 'neutral', text: `${stock.nonPta} phone non-PTA ya PTA pending — bechte waqt customer ko batayein`, to: '/imei-inventory', cta: 'IMEI dekhein' });
  return items;
}

export function MobileRepairs() {
  const { repairs } = useMobileOps();
  const { cost, costHidden } = useMasked();
  const stages: Array<[string, number, string]> = [
    ['Naye / check', repairs.fresh, 'text-slate-900'],
    ['Haan baqi', repairs.approval, 'text-amber-700'],
    ['Parts', repairs.parts, 'text-amber-700'],
    ['Kaam jari', repairs.working, 'text-brand-700'],
  ];
  return (
    <WidgetCard
      title="Repair desk"
      icon={Wrench}
      description={repairs.readyDue > 0 && !costHidden ? `${repairs.ready} tayyar · ${formatPKR(repairs.readyDue)} lena hai` : `${repairs.open} khule · ${repairs.today} aaj aaye`}
      to="/repair-tickets"
      flush
    >
      <dl className="grid grid-cols-4 gap-2 px-4 pb-3 text-center sm:px-5">
        {stages.map(([label, n, color]) => (
          <div key={label} className="rounded-lg bg-slate-50 py-2">
            <dd className={`text-lg font-bold tabular-nums ${color}`}>{n}</dd>
            <dt className="truncate text-[0.6875rem] text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      <RowList empty="Koi phone pickup ke liye tayyar nahi" emptyIcon={PackageCheck}>
        {repairs.readyList.map((t) => (
          <ListRow
            key={t.id}
            to={`/repair-tickets/${t.id}`}
            leading={<IconBubble icon={PackageCheck} tone="success" />}
            title={`${t.deviceBrand} ${t.deviceModel}`}
            meta={<span><span className="font-mono">{t.ticketNumber}</span> · {t.customer?.name ?? t.customerName}</span>}
            value={Number(t.balanceDue) > 0 ? cost(t.balanceDue) : <Badge variant="success" size="xs">Paid</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function MobileEmi() {
  const { emi } = useMobileOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Kist (EMI)"
      icon={CreditCard}
      description={costHidden ? `${emi.active} plan chal rahe` : `${formatPKR(emi.collected)} is mahine receive · ${formatPKR(emi.remaining)} baqi`}
      to="/emi-plans"
      flush
    >
      <RowList empty="Koi kist late nahi" emptyIcon={BadgeCheck}>
        {emi.overdueList.map((p) => (
          <ListRow
            key={p.id}
            to={`/emi-plans/${p.id}`}
            leading={<IconBubble icon={AlertTriangle} tone="danger" />}
            title={p.customer?.name ?? p.customerName}
            meta={<span><span className="font-mono">{p.planNumber}</span> · {p.overdueCount} kist late{p.customerPhone ? ` · ${p.customerPhone}` : ''}</span>}
            value={cost(p.overdueAmount)}
            valueHint={<span className="text-rose-700">late</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

const PTA_LABEL: Record<PtaStatus, string> = { APPROVED: 'PTA', NON_PTA: 'Non-PTA', PATCH: 'Patch', PENDING: 'Pending', EXEMPT: 'Exempt' };
const PTA_VARIANT: Record<PtaStatus, 'success' | 'danger' | 'warning' | 'default'> = {
  APPROVED: 'success', NON_PTA: 'danger', PATCH: 'warning', PENDING: 'warning', EXEMPT: 'default',
};

export function MobileStock() {
  const { stock, used } = useMobileOps();
  const { cost } = useMasked();
  return (
    <WidgetCard title="Phone stock" icon={Smartphone} description="IMEI wale naye phone aur used phone" to="/imei-inventory">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Smartphone} tone="brand" label="Stock me" value={stock.inStock} hint={`${cost(stock.value)} cost`} to="/imei-inventory" />
        <MetricTile icon={PackageCheck} tone="success" label="Aaj bike" value={stock.soldToday} hint={`${stock.sold} ab tak`} />
        <MetricTile icon={RotateCcw} tone="info" label="Used phone" value={used.inStock} hint={used.inspection ? `${used.inspection} check baqi` : `${cost(used.cost)} cost`} to="/used-phones" />
        <MetricTile icon={AlertTriangle} tone="danger" label="Wapas / kharab" value={stock.unsellable} hint="bik nahi sakte" alert={stock.unsellable > 0} />
      </div>
      {stock.pta.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stock.pta.map((p) => (
            <Badge key={p.status} variant={PTA_VARIANT[p.status] ?? 'default'} size="xs">{PTA_LABEL[p.status] ?? p.status}: {p.count}</Badge>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

const SOURCE_META: Record<ProfitSourceKey, { label: string; icon: LucideIcon; bar: string }> = {
  NEW_PHONE: { label: 'Naye phone', icon: Smartphone, bar: 'bg-brand-600' },
  USED_PHONE: { label: 'Used phone', icon: RotateCcw, bar: 'bg-sky-500' },
  ACCESSORY: { label: 'Accessories', icon: Cable, bar: 'bg-success-600' },
  REPAIR: { label: 'Repair', icon: Wrench, bar: 'bg-amber-500' },
};
const SOURCE_ORDER: ProfitSourceKey[] = ['NEW_PHONE', 'USED_PHONE', 'ACCESSORY', 'REPAIR'];

export function MobileProfitSources() {
  const { sources } = useMobileOps();
  const { cost } = useMasked();
  const rows = SOURCE_ORDER.map((k) => ({ key: k, ...SOURCE_META[k], row: sources?.sources.find((s) => s.key === k) }));
  const best = Math.max(...rows.map((r) => r.row?.profit ?? 0), 0);
  return (
    <WidgetCard
      title="Kamai ka rasta"
      icon={PiggyBank}
      description={sources ? `30 din · ${cost(sources.totals.profit)} profit (${sources.totals.margin.toFixed(1)}%)` : '30 din'}
      to="/reports"
    >
      <ul className="space-y-3">
        {rows.map(({ key, label, icon: Icon, bar, row }) => {
          const pct = best > 0 ? Math.max(((row?.profit ?? 0) / best) * 100, 0) : 0;
          return (
            <li key={key}>
              <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-800">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="truncate">{label}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900">{cost(row?.profit)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[0.75rem] text-slate-500">
                {row ? `${row.units} units · sale ${cost(row.revenue)} · ${row.margin.toFixed(1)}% margin` : 'Abhi kuch nahi'}
              </p>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

/** Used phones and EMI balances as extra "where the money is" tiles. */
export function useMobileMoneyTiles(): MoneyTileProps[] {
  const { used, emi } = useMobileOps();
  return [
    {
      key: 'used-phones', icon: RotateCcw, tone: 'info', to: '/used-phones', label: 'Used phone stock',
      value: formatPKR(used.cost), hint: `${used.inStock} phone · bikne par ${formatPKR(used.resale)}`,
    },
    {
      key: 'emi', icon: CreditCard, tone: 'warning', to: '/emi-plans', label: 'Kiston me baqi',
      value: formatPKR(emi.remaining), hint: emi.overdueCount ? `${emi.overdueCount} late · ${formatPKR(emi.overdueAmount)}` : `${emi.active} plan chal rahe`,
      alert: emi.overdueCount > 0,
    },
  ];
}
