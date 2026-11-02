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
import { t as tr } from '@core/i18n';

/** Mobile headline numbers, offered next to the common ones. */
export const mobileKpis: KpiDef[] = [
  {
    id: 'mobile-imei', label: tr('Phone stock me'), icon: Smartphone, tone: 'brand',
    useValue: () => {
      const { stock, loading } = useMobileOps();
      return { loading, to: '/imei-inventory', value: stock.inStock, hint: stock.soldToday ? tr('{{soldToday}} aaj bike', { soldToday: stock.soldToday }) : tr('{{sold}} ab tak bike', { sold: stock.sold }) };
    },
  },
  {
    id: 'mobile-repairs', label: tr('Repair khule'), icon: Wrench, tone: 'warning',
    useValue: () => {
      const { repairs, loading } = useMobileOps();
      return {
        loading, to: '/repair-tickets', value: repairs.open,
        hint: repairs.ready ? tr('{{ready}} pickup ke liye tayyar', { ready: repairs.ready }) : tr('{{today}} aaj aaye', { today: repairs.today }),
      };
    },
  },
  {
    id: 'mobile-emi', label: tr('Kist late'), icon: CreditCard, tone: 'danger', sensitive: true,
    useValue: () => {
      const { emi, loading } = useMobileOps();
      const { cost } = useMasked();
      return {
        loading, to: '/emi-plans', value: emi.overdueCount, alert: emi.overdueCount > 0,
        hint: emi.overdueCount ? tr('{{overdueAmount}} lena hai', { overdueAmount: cost(emi.overdueAmount) }) : tr('{{active}} plan chal rahe', { active: emi.active }),
      };
    },
  },
  {
    id: 'mobile-used', label: tr('Used phone'), icon: RotateCcw, tone: 'neutral',
    useValue: () => {
      const { used, loading } = useMobileOps();
      return { loading, to: '/used-phones', value: used.inStock, hint: used.inspection ? tr('{{inspection}} check baqi', { inspection: used.inspection }) : tr('stock me') };
    },
  },
];

export function useMobileAttention(): AttentionItem[] {
  const { emi, repairs, used, stock } = useMobileOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];

  if (emi.overdueCount) items.push({ icon: CreditCard, level: 'danger', text: tr('{{overdueCount}} kist late hain — {{overdueAmount}} receive karna hai', { overdueCount: emi.overdueCount, overdueAmount: cost(emi.overdueAmount) }), to: '/emi-plans', cta: tr('Kist dekhein') });
  if (repairs.ready) items.push({ icon: PackageCheck, level: 'warning', text: tr('{{ready}} phone repair ho kar tayyar — customer ko call karein', { ready: repairs.ready }), to: '/repair-tickets', cta: tr('Pickup') });
  if (repairs.approval) items.push({ icon: Wrench, level: 'warning', text: tr('{{approval}} repair par customer ki haan baqi hai — kaam ruka hua hai', { approval: repairs.approval }), to: '/repair-tickets', cta: tr('Approval lein') });
  if (repairs.parts) items.push({ icon: Cable, level: 'info', text: tr('{{parts}} repair parts ke intezar me', { parts: repairs.parts }), to: '/repair-tickets', cta: tr('Parts mangwayein') });
  if (used.inspection) items.push({ icon: RotateCcw, level: 'info', text: tr('{{inspection}} used phone check hona baqi — check ke baad hi bik sakte hain', { inspection: used.inspection }), to: '/used-phones', cta: tr('Check karein') });
  if (emi.upcomingCount) items.push({ icon: CalendarClock, level: 'info', text: tr('{{upcomingCount}} kist jald aane wali hain — customer ko yaad dilayein', { upcomingCount: emi.upcomingCount }), to: '/emi-plans', cta: tr('Dekhein') });
  if (stock.nonPta) items.push({ icon: ShieldCheck, level: 'neutral', text: tr('{{nonPta}} phone non-PTA ya PTA pending — bechte waqt customer ko batayein', { nonPta: stock.nonPta }), to: '/imei-inventory', cta: tr('IMEI dekhein') });
  return items;
}

export function MobileRepairs() {
  const { repairs } = useMobileOps();
  const { cost, costHidden } = useMasked();
  const stages: Array<[string, number, string]> = [
    [tr('Naye / check'), repairs.fresh, 'text-slate-900'],
    [tr('Haan baqi'), repairs.approval, 'text-amber-700'],
    [tr('Parts'), repairs.parts, 'text-amber-700'],
    [tr('Kaam jari'), repairs.working, 'text-brand-700'],
  ];
  return (
    <WidgetCard
      title={tr('Repair desk')}
      icon={Wrench}
      description={repairs.readyDue > 0 && !costHidden ? tr('{{ready}} tayyar · {{readyDue}} lena hai', { ready: repairs.ready, readyDue: formatPKR(repairs.readyDue) }) : tr('{{open}} khule · {{today}} aaj aaye', { open: repairs.open, today: repairs.today })}
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
      <RowList empty={tr('Koi phone pickup ke liye tayyar nahi')} emptyIcon={PackageCheck}>
        {repairs.readyList.map((t) => (
          <ListRow
            key={t.id}
            to={`/repair-tickets/${t.id}`}
            leading={<IconBubble icon={PackageCheck} tone="success" />}
            title={`${t.deviceBrand} ${t.deviceModel}`}
            meta={<span><span className="font-mono">{t.ticketNumber}</span> · {t.customer?.name ?? t.customerName}</span>}
            value={Number(t.balanceDue) > 0 ? cost(t.balanceDue) : <Badge variant="success" size="xs">{tr('Paid')}</Badge>}
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
      title={tr('Kist (EMI)')}
      icon={CreditCard}
      description={costHidden ? tr('{{active}} plan chal rahe', { active: emi.active }) : tr('{{collected}} is mahine receive · {{remaining}} baqi', { collected: formatPKR(emi.collected), remaining: formatPKR(emi.remaining) })}
      to="/emi-plans"
      flush
    >
      <RowList empty={tr('Koi kist late nahi')} emptyIcon={BadgeCheck}>
        {emi.overdueList.map((p) => (
          <ListRow
            key={p.id}
            to={`/emi-plans/${p.id}`}
            leading={<IconBubble icon={AlertTriangle} tone="danger" />}
            title={p.customerName}
            meta={<span><span className="font-mono">{p.planNumber}</span> {' '}{tr('· {{overdueCount}} kist late{{value}}', { overdueCount: p.overdueCount, value: p.customerPhone ? ` · ${p.customerPhone}` : '' })}</span>}
            value={cost(p.overdueAmount)}
            valueHint={<span className="text-rose-700">{tr('late')}</span>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

const PTA_LABEL: Record<PtaStatus, string> = { APPROVED: tr('PTA'), NON_PTA: tr('Non-PTA'), PATCH: tr('Patch'), PENDING: tr('Pending'), EXEMPT: tr('Exempt') };
const PTA_VARIANT: Record<PtaStatus, 'success' | 'danger' | 'warning' | 'default'> = {
  APPROVED: 'success', NON_PTA: 'danger', PATCH: 'warning', PENDING: 'warning', EXEMPT: 'default',
};

export function MobileStock() {
  const { stock, used } = useMobileOps();
  const { cost } = useMasked();
  return (
    <WidgetCard title={tr('Phone stock')} icon={Smartphone} description={tr('IMEI wale naye phone aur used phone')} to="/imei-inventory">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Smartphone} tone="brand" label={tr('Stock me')} value={stock.inStock} hint={tr('{{cost}} cost', { cost: cost(stock.value) })} to="/imei-inventory" />
        <MetricTile icon={PackageCheck} tone="success" label={tr('Aaj bike')} value={stock.soldToday} hint={tr('{{sold}} ab tak', { sold: stock.sold })} />
        <MetricTile icon={RotateCcw} tone="info" label={tr('Used phone')} value={used.inStock} hint={used.inspection ? tr('{{inspection}} check baqi', { inspection: used.inspection }) : tr('{{cost}} cost', { cost: cost(used.cost) })} to="/used-phones" />
        <MetricTile icon={AlertTriangle} tone="danger" label={tr('Wapas / kharab')} value={stock.unsellable} hint={tr('bik nahi sakte')} alert={stock.unsellable > 0} />
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
  NEW_PHONE: { label: tr('Naye phone'), icon: Smartphone, bar: 'bg-brand-600' },
  USED_PHONE: { label: tr('Used phone'), icon: RotateCcw, bar: 'bg-sky-500' },
  ACCESSORY: { label: tr('Accessories'), icon: Cable, bar: 'bg-success-600' },
  REPAIR: { label: tr('Repair'), icon: Wrench, bar: 'bg-amber-500' },
};
const SOURCE_ORDER: ProfitSourceKey[] = ['NEW_PHONE', 'USED_PHONE', 'ACCESSORY', 'REPAIR'];

export function MobileProfitSources() {
  const { sources } = useMobileOps();
  const { cost } = useMasked();
  const rows = SOURCE_ORDER.map((k) => ({ key: k, ...SOURCE_META[k], row: sources?.sources.find((s) => s.key === k) }));
  const best = Math.max(...rows.map((r) => r.row?.profit ?? 0), 0);
  return (
    <WidgetCard
      title={tr('Kamai ka rasta')}
      icon={PiggyBank}
      description={sources ? tr('30 din · {{profit}} profit ({{value}}%)', { profit: cost(sources.totals.profit), value: sources.totals.margin.toFixed(1) }) : tr('30 din')}
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
                {row ? tr('{{units}} units · sale {{revenue}} · {{value}}% margin', { units: row.units, revenue: cost(row.revenue), value: row.margin.toFixed(1) }) : tr('Abhi kuch nahi')}
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
      key: 'used-phones', icon: RotateCcw, tone: 'info', to: '/used-phones', label: tr('Used phone stock'),
      value: formatPKR(used.cost), hint: tr('{{inStock}} phone · bikne par {{resale}}', { inStock: used.inStock, resale: formatPKR(used.resale) }),
    },
    {
      key: 'emi', icon: CreditCard, tone: 'warning', to: '/emi-plans', label: tr('Kiston me baqi'),
      value: formatPKR(emi.remaining), hint: emi.overdueCount ? tr('{{overdueCount}} late · {{overdueAmount}}', { overdueCount: emi.overdueCount, overdueAmount: formatPKR(emi.overdueAmount) }) : tr('{{active}} plan chal rahe', { active: emi.active }),
      alert: emi.overdueCount > 0,
    },
  ];
}
