/** Tax overview: one card per authority, the tax trend, this month against last, and bills that need attention. */

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, CalendarRange, CheckCircle2, Clock, Landmark, RefreshCw, Settings2, XCircle } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { Authority, TaxAnalytics, TaxStatus } from '../api';
import { AUTH, AUTHORITY_ORDER, change, dayShort, dayTime, monthName } from '../meta';

type Money = (n: number | null | undefined) => string;

export function OverviewView({ data, loading, failed, onRetryLoad, money, onInvoices, onReport, onSettings, onOpen }: {
  data: TaxAnalytics | undefined;
  loading: boolean;
  failed: boolean;
  onRetryLoad: () => void;
  money: Money;
  onInvoices: (status: TaxStatus | '', authority?: Authority) => void;
  onReport: (month: string) => void;
  onSettings: () => void;
  onOpen: (id: string) => void;
}) {
  const theme = useChartTheme();
  if (loading) return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>;
  if (failed || !data) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Tax ka hisaab load nahi hua</p>
        <Button className="mt-3" variant="secondary" onClick={onRetryLoad}>Dobara koshish</Button>
      </div>
    );
  }
  if (!data.enabled && !data.byAuthority.length) return <NotSetUp onSettings={onSettings} />;

  const series = data.series.map((d) => ({ ...d, label: data.bucket === 'month' ? monthName(d.day).split(' ')[0].slice(0, 3) : d.day.slice(8) }));
  const lm = data.lastMonth;
  const vs = change(data.thisMonth.tax, data.lastMonthToDate.tax);

  return (
    <div className="space-y-4">
      {data.migrationPending && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Server par tax ka database update abhi baqi hai. Update ke baad bill authority ko jane lagenge.
        </p>
      )}
      {data.missing > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2.5 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
          <Clock className="h-4 w-4 shrink-0" /> {data.missing} naye bill abhi authority ko nahi gaye. Nafaa har 2 minute me khud bhejta hai, kuch karne ki zaroorat nahi.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[...data.byAuthority].sort((x, y) => AUTHORITY_ORDER.indexOf(x.authority) - AUTHORITY_ORDER.indexOf(y.authority)).map((a) => {
          const meta = AUTH[a.authority];
          const h = a.health;
          const sent = h.success + h.failed;
          return (
            <div key={a.authority} className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}</p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-500">{meta.province}</p>
                </div>
                {!a.enabled ? <Badge>Band</Badge> : a.env === 'live' ? <Badge variant="success" dot>Live</Badge> : <Badge variant="warning" dot>Test</Badge>}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.8125rem]">
                <div><dt className="text-[0.75rem] text-slate-500">Taxable sale</dt><dd className="font-semibold tabular-nums text-slate-900">{money(a.totals.saleValue)}</dd></div>
                <div><dt className="text-[0.75rem] text-slate-500">Tax</dt><dd className="font-semibold tabular-nums text-slate-900">{money(a.totals.tax)}</dd></div>
              </dl>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                {sent > 0 && <span className="bg-emerald-500" style={{ width: `${(h.success / (sent + h.pending)) * 100}%` }} />}
                {h.pending > 0 && <span className="bg-amber-400" style={{ width: `${(h.pending / (sent + h.pending)) * 100}%` }} />}
                {h.failed > 0 && <span className="bg-rose-500" style={{ width: `${(h.failed / (sent + h.pending)) * 100}%` }} />}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem]">
                <button type="button" onClick={() => onInvoices('SUCCESS', a.authority)} className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><CheckCircle2 className="h-3.5 w-3.5" />{h.success} liye</button>
                <button type="button" onClick={() => onInvoices('PENDING', a.authority)} className="inline-flex items-center gap-1 text-amber-700 hover:underline"><Clock className="h-3.5 w-3.5" />{h.pending} qatar me</button>
                <button type="button" onClick={() => onInvoices('FAILED', a.authority)} className={cn('inline-flex items-center gap-1 hover:underline', h.failed ? 'font-semibold text-rose-700' : 'text-slate-500')}><XCircle className="h-3.5 w-3.5" />{h.failed} fail</button>
              </div>
              {a.notSent.tax !== 0 && <p className="mt-2 text-[0.75rem] text-slate-500">Atke bills ka tax: <span className="font-medium text-slate-700">{money(a.notSent.tax)}</span></p>}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{data.bucket === 'month' ? 'Har mahine ka tax' : 'Roz ka tax'}</h3>
            <span className="text-[0.75rem] text-slate-500">{dayShort(data.period.from)} – {dayShort(data.period.to)} · return minus</span>
          </div>
          {data.totals.bills === 0 && data.totals.returns === 0 ? (
            <p className="py-16 text-center text-[0.8125rem] text-slate-500">Is period me authority ne koi bill nahi liya.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                  <XAxis dataKey="label" tick={theme.axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis tick={theme.axis} tickLine={false} axisLine={false} width={48} tickFormatter={axisMoney} />
                  <Tooltip {...theme.tooltip}
                    formatter={(v, name) => [money(Number(v ?? 0)), name === 'tax' ? 'Tax' : 'Taxable sale']}
                    labelFormatter={(_, p) => {
                      const d = p?.[0]?.payload as (typeof series)[number] | undefined;
                      return d ? `${data.bucket === 'month' ? monthName(d.day) : dayShort(d.day)} · ${d.bills} bill` : '';
                    }} />
                  <Bar dataKey="tax" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900"><CalendarRange className="h-4 w-4 text-slate-400" />Is mahine aur pichla</h3>
          <dl className="mt-3 space-y-2 text-[0.8125rem]">
            <Line k={`${monthName(data.thisMonth.month)} (ab tak)`} v={money(data.thisMonth.tax)} strong />
            <Line k="Pichle mahine isi din tak" v={money(data.lastMonthToDate.tax)} />
            <Line k="Farq" v={vs == null ? '—' : `${vs > 0 ? '+' : ''}${vs}%`} tone={vs == null ? undefined : vs >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
            <Line k={`${monthName(lm.month)} poora`} v={money(lm.tax)} />
            <Line k="Us mahine ki taxable sale" v={money(lm.saleValue)} />
          </dl>
          <Button className="mt-4" size="sm" variant="secondary" onClick={() => onReport(lm.month)} rightIcon={<ArrowRight className="h-4 w-4" />}>
            {monthName(lm.month)} ki report
          </Button>
        </section>
      </div>

      {data.recentFails.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-rose-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle className="h-4 w-4 text-rose-600" />Authority ne yeh bill nahi liye</h3>
            <Button size="sm" variant="secondary" onClick={() => onInvoices('FAILED')} leftIcon={<RefreshCw className="h-4 w-4" />}>Sab fail dekhein</Button>
          </div>
          <p className="mt-1 text-[0.8125rem] text-slate-500">Nafaa khud dobara bhejta rehta hai. Aksar wajah POS ID, token ya PCT code hoti hai: Settings me check karein.</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {data.recentFails.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => onOpen(f.id)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50">
                  <span className="rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold" style={{ backgroundColor: `${AUTH[f.authority]?.color ?? '#64748b'}17`, color: AUTH[f.authority]?.color }}>{f.authority}</span>
                  <span className="font-mono text-[0.8125rem] font-semibold text-slate-900">{f.usin}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-rose-700">{f.error ?? 'Wajah nahi mili'}</span>
                  <span className="hidden text-[0.75rem] text-slate-500 sm:inline">{f.attempts} koshish{f.nextAttemptAt ? ` · agli ${dayTime(f.nextAttemptAt)}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Line({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-900', tone)}>{v}</dd>
    </div>
  );
}

function NotSetUp({ onSettings }: { onSettings: () => void }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-10 shadow-sm ring-1 ring-slate-200/80">
      <div className="mx-auto max-w-2xl text-center">
        <Landmark className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-lg font-semibold text-slate-900">Tax abhi chalu nahi</p>
        <p className="mt-1 text-[0.875rem] text-slate-600">Chalu karte hi har bill khud tax authority ko jata hai aur bill par us ka number aur QR chhapta hai. Mahine ke aakhir me return ke figures tayyar milte hain.</p>
      </div>
      <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
        {AUTHORITY_ORDER.map((a) => (
          <div key={a} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AUTH[a].color }} />{AUTH[a].label}</p>
            <p className="mt-0.5 text-[0.8125rem] text-slate-600">{AUTH[a].who}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Button onClick={onSettings} leftIcon={<Settings2 className="h-4 w-4" />}>Tax set karein</Button>
      </div>
    </div>
  );
}
