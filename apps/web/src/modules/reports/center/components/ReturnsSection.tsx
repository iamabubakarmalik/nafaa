/** Wapsi: refunds by date returned, why, which items, how paid back, by whom, and voided bills. */

import { Link } from 'react-router-dom';
import { Ban, MessageSquareWarning, Package, Percent, RotateCcw, TrendingDown, UserRound, Wallet } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import { PAYMENT_COLORS, PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import type { ReturnsReport } from '../api';
import { BarList, DataTable, Delta, Donut, Empty, Panel, TrendChart, type Formatter } from './parts';
import { t as tr } from '@core/i18n';

export function ReturnsSection({ data: d, f, compare }: { data: ReturnsReport; f: Formatter; compare: boolean }) {
  const t = d.totals;
  return (
    <div className="space-y-4">
      <KpiRow cols={4}>
        <KpiCard icon={RotateCcw} color="#ea580c" label={tr('Maal wapas')} value={f.money(t.amount)} hint={compare && d.previous ? <Delta now={t.amount} before={d.previous.amount} up="bad" /> : tr('{{count}} return', { count: t.count })} />
        <KpiCard icon={Percent} color="#7c3aed" label={tr('Sale ka kitna wapas')} value={`${t.rate.toFixed(1)}%`} />
        {!f.costHidden && t.cost != null && <KpiCard icon={Package} color="#0891b2" label={tr('Wapas aaye maal ki cost')} value={f.cost(t.cost)} hint={tr('stock me wapas')} />}
        <KpiCard icon={Ban} color="#e11d48" label={tr('Void bill')} value={String(t.voidedBills)} hint={f.money(t.voidedValue)} />
      </KpiRow>

      <Panel icon={TrendingDown} title={tr('Return ka rujhan')} hint={tr('Jis din maal wapas aaya')}
        actions={<Link to="/returns" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Return →')}</Link>}>
        {!t.count ? <Empty text={tr('Is period me koi return nahi')} /> : (
          <TrendChart id="rc-ret" f={f} data={d.trend} series={[{ key: 'amount', label: tr('Return'), color: '#ea580c', fmt: 'money' }]} />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={MessageSquareWarning} title={tr('Return ki wajah')}>
          <BarList f={f} fmt="money" empty={tr('Koi return nahi')} rows={d.reasons.map((r, i) => ({ key: `${r.reason}-${i}`, name: r.reason ?? 'Wajah nahi likhi', value: r.amount, hint: tr('{{count}} dafa', { count: r.count }) }))} />
        </Panel>
        <Panel icon={Wallet} title={tr('Paise kaise lautaye')}>
          {!d.methods.length ? <Empty text={tr('Koi return nahi')} /> : (
            <Donut f={f} fmt="money" data={d.methods.map((m) => ({ name: PAYMENT_LABELS[m.method] ?? m.method, value: m.amount, color: PAYMENT_COLORS[m.method] }))} />
          )}
        </Panel>
        <Panel icon={UserRound} title={tr('Kis ne return li')}>
          <BarList f={f} fmt="money" empty={tr('Koi return nahi')} rows={d.staff.map((s) => ({ key: s.id ?? s.name, name: s.name, value: s.amount, hint: tr('{{count}} return', { count: s.count }) }))} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Package} title={tr('Sab se zyada wapas aane wala maal')}>
          <DataTable rows={d.products} rowKey={(p) => p.id} empty={tr('Koi return nahi')} columns={[
            { label: tr('Cheez'), render: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
            { label: tr('Quantity'), align: 'right', render: (p) => `${f.qty(p.qty)} ${p.unit}` },
            { label: tr('Dafa'), align: 'right', render: (p) => p.times },
            { label: tr('Amount'), align: 'right', render: (p) => <span className="font-semibold">{f.money(p.amount)}</span> },
          ]} />
        </Panel>
        <Panel icon={Ban} title={tr('Void bill')} hint={tr('Is period ke cancel bill')}>
          <DataTable rows={d.voided} rowKey={(v) => v.id} empty={tr('Koi bill void nahi hua')} columns={[
            { label: tr('Bill'), render: (v) => <span className="font-medium text-slate-900">{v.saleNumber}</span> },
            { label: tr('Date'), render: (v) => f.date(v.soldAt) },
            { label: tr('Staff'), render: (v) => v.staff ?? '—' },
            { label: tr('Amount'), align: 'right', render: (v) => f.money(v.total) },
          ]} />
        </Panel>
      </div>
    </div>
  );
}
