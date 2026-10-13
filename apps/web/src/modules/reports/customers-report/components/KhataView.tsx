/**
 * Udhaar tab: what customers owe and how old it is (payments settle the
 * oldest credit first), credit given against money collected in the
 * period, collection rate, and the slowest payers with a WhatsApp reminder
 * list, CSV and print.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlarmClock, BookOpen, Download, HandCoins, Hourglass, MessageCircle, Percent, ShieldAlert, Timer, TrendingUp, Wallet } from 'lucide-react';
import { Button, KpiCard, KpiRow, SearchField, Segmented } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { AgeKey, Debtor, Khata } from '../api';
import { downloadCsv, khataDoc } from '../print';
import { AGE_COLORS } from './meta';
import { CustomerCell, DataTable, Delta, Empty, Panel, daysAgo, keyLabel, type Formatter } from './parts';
import { WhatsAppList } from './WhatsAppList';

type Sort = 'risk' | 'balance' | 'oldest' | 'silent';

export function KhataView({ data: d, f, compare, period, shop }: { data: Khata; f: Formatter; compare: boolean; period: string; shop: string }) {
  const theme = useChartTheme();
  const t = d.totals;
  const prev = compare ? d.previous : null;
  const [age, setAge] = useState<AgeKey | 'over60' | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('risk');
  const [wa, setWa] = useState(false);
  const totalAged = d.aging.reduce((s, a) => s + a.amount, 0);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const list = d.rows.filter((r) => (!age || (age === 'over60' ? r.over60 > 0.009 : r.ages[age] > 0.009))
      && (!term || r.name.toLowerCase().includes(term) || (r.city ?? '').toLowerCase().includes(term) || (digits.length >= 3 && (r.phone ?? '').replace(/\D/g, '').includes(digits))));
    const by: Record<Sort, (a: Debtor, b: Debtor) => number> = {
      risk: (a, b) => b.over60 - a.over60 || b.balance - a.balance,
      balance: (a, b) => b.balance - a.balance,
      oldest: (a, b) => (b.oldestDays ?? -1) - (a.oldestDays ?? -1),
      silent: (a, b) => (b.daysSincePayment ?? 1e9) - (a.daysSincePayment ?? 1e9) || b.balance - a.balance,
    };
    return [...list].sort(by[sort]);
  }, [d.rows, age, search, sort]);

  const ctx = { f, period, shop, noun: 'Customers' };
  const exportCsv = () => {
    if (!rows.length) { toast.error('List khali hai'); return; }
    downloadCsv(khataDoc(d, rows, ctx), 'udhaar-report.csv');
    toast.success(`${rows.length} customers CSV me`);
  };
  const trend = d.trend.map((x) => ({ ...x, label: keyLabel(x.key) }));
  const rateTone = t.collectionRate == null ? undefined : t.collectionRate >= 60 ? 'text-emerald-600' : t.collectionRate >= 30 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="space-y-4">
      <KpiRow>
        <KpiCard icon={BookOpen} color="#d97706" label="Kul udhaar baqi" value={f.money(t.receivable)} hint={`${t.owing} customers par · abhi tak`} />
        <KpiCard icon={Percent} color="#16a34a" label="Wasooli ki sharah"
          value={<span className={rateTone}>{f.pct(t.collectionRate)}</span>}
          hint={prev && t.collectionRate != null ? <Delta now={t.collectionRate} before={prev.collectionRate} points /> : 'shuru ka baqi + naya udhaar me se kitna mila'} />
        <KpiCard icon={Timer} color="#2563eb" label="Paisa aane me din" value={t.daysToCollect != null ? `${t.daysToCollect} din` : '—'}
          hint={t.daysToCollect != null ? 'baqi ÷ roz ka ausat udhaar' : 'is period me udhaar nahi diya'} />
        <KpiCard icon={Hourglass} color="#e11d48" label="60 din se purana" value={f.money(t.over60)} hint={`${t.noPayment60} ne 60 din se kuch nahi diya`}
          onClick={() => { setAge(age === 'over60' ? null : 'over60'); setSort('risk'); }} active={age === 'over60'} />
        <KpiCard icon={Wallet} color="#0891b2" label="Advance" value={f.money(t.advance)} hint={`${t.advanceCount} customers ka paisa hamare paas`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel icon={AlarmClock} className="lg:col-span-2" title="Udhaar kitna purana"
          hint="Har customer ki wasooli pehle sab se purane udhaar me gini gayi. Khana dabayein to neeche list usi umar ki.">
          {totalAged <= 0 ? <Empty text="Kisi par udhaar baqi nahi" /> : (
            <>
              <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                {d.aging.map((a) => a.amount > 0 && <div key={a.key} style={{ width: `${(a.amount / totalAged) * 100}%`, background: AGE_COLORS[a.key] }} title={`${a.label}: ${f.money(a.amount)}`} />)}
              </div>
              <ul className="mt-3 space-y-1.5">
                {d.aging.map((a) => (
                  <li key={a.key}>
                    <button type="button" onClick={() => setAge(age === a.key ? null : a.key)}
                      className={cn('flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[0.8125rem] transition hover:bg-slate-50', age === a.key && 'bg-slate-100 ring-1 ring-slate-200')}>
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: AGE_COLORS[a.key] }} /><span className="font-medium text-slate-700">{a.label}</span><span className="text-slate-400">· {a.customers}</span></span>
                      <span className="tabular-nums font-semibold text-slate-900">{f.money(a.amount)} <span className="font-normal text-slate-400">{((a.amount / totalAged) * 100).toFixed(0)}%</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel icon={TrendingUp} className="lg:col-span-3" title="Udhaar diya vs wasooli"
          hint={`${d.grouping === 'month' ? 'Har mahine' : 'Har din'} kitna udhaar gaya aur kitna wapas aaya`}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} tickFormatter={f.salesHidden ? () => '' : axisMoney} />
                <Tooltip {...theme.tooltip} formatter={(v, n) => [f.money(Number(v)), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="given" name="Udhaar diya" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="received" name="Wasooli" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-slate-100 pt-3 text-[0.8125rem] sm:grid-cols-3">
            <Fact label="Shuru me baqi" value={f.money(t.opening)} />
            <Fact label="Udhaar diya" value={f.money(t.given)} sub={prev ? <Delta now={t.given} before={prev.given} up="bad" /> : `${t.takers} customers`} />
            <Fact label="Wasooli" value={f.money(t.received)} sub={prev ? <Delta now={t.received} before={prev.received} /> : `${t.payments} dafa · ${t.payers} log`} />
            <Fact label="Return / correction" value={f.money(t.reduced)} />
            <Fact label="Aakhir me baqi" value={f.money(t.closing)} strong />
            <Fact label="Udhaar wale bill" value={`${t.creditBills}`} sub={`${f.pct(t.creditShare)} sale udhaar par`} />
          </dl>
        </Panel>
      </div>

      <Panel icon={ShieldAlert} flush title={`Udhaar wale customers · ${rows.length}`}
        hint="Pehle woh jin ka 60 din se purana udhaar sab se zyada hai. Naam dabayein to khata khulega."
        actions={<>
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" />CSV</Button>
          <PrintButton size="sm" doc={() => khataDoc(d, rows, ctx)} disabled={!rows.length} />
          <Button size="sm" onClick={() => setWa(true)} disabled={!rows.length}><MessageCircle className="h-4 w-4" />Yaad dihani</Button>
        </>}>
        <div className="space-y-3 px-4 pb-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField value={search} onChange={setSearch} placeholder="Naam, phone ya shehar…" label="Udhaar wale search" />
            <Segmented label="Sort" value={sort} onChange={setSort} items={[
              { value: 'risk', label: 'Khatra' }, { value: 'balance', label: 'Baqi' }, { value: 'oldest', label: 'Purana' }, { value: 'silent', label: 'Wasooli nahi' },
            ]} />
          </div>
          {age && (
            <p className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-100">
              Sirf woh jin ka kuch udhaar {age === 'over60' ? '60 din se zyada' : d.aging.find((a) => a.key === age)?.label} purana hai
              <button type="button" onClick={() => setAge(null)} className="font-semibold text-brand-700 hover:underline">Sab dikhayein</button>
            </p>
          )}
          <DataTable rows={rows.slice(0, 300)} rowKey={(r) => r.id} empty={d.rows.length ? 'Is filter me koi nahi' : 'Kisi par udhaar baqi nahi'}
            columns={[
              { label: 'Customer', render: (r) => <CustomerCell id={r.id} name={r.name} phone={r.phone} isVip={r.isVip} sub={r.overLimit ? <span className="font-semibold text-rose-600">Had se zyada</span> : r.city} /> },
              { label: 'Baqi', align: 'right', render: (r) => <span className="font-semibold text-slate-900">{f.money(r.balance)}</span> },
              { label: '60+ din', align: 'right', render: (r) => (r.over60 > 0 ? <span className="text-rose-600">{f.money(r.over60)}</span> : '—') },
              { label: 'Umar', render: (r) => <AgeBar ages={r.ages} total={r.balance} /> },
              { label: 'Sab se purana', align: 'right', render: (r) => (r.oldestDays != null ? `${r.oldestDays} din` : '—') },
              { label: 'Aakhri wasooli', align: 'right', render: (r) => (r.lastPaymentAt ? daysAgo(r.daysSincePayment) : <span className="text-rose-600">Kabhi nahi</span>) },
              { label: 'Is period me diya', align: 'right', render: (r) => (r.paidInPeriod > 0 ? f.money(r.paidInPeriod) : '—') },
            ]} />
          {rows.length > 300 && <p className="text-center text-[0.75rem] text-slate-500">Pehle 300 dikh rahe hain — poori list CSV ya print me.</p>}
          <p className="text-[0.75rem] text-slate-500">
            <HandCoins className="mr-1 inline h-3.5 w-3.5" />Wasooli likhni ho to <Link to="/khata" className="font-semibold text-brand-700 hover:underline">Khata</Link> page kholein.
          </p>
        </div>
      </Panel>

      {wa && (
        <WhatsAppList kind="khata" title="Udhaar ki yaad dihani" onClose={() => setWa(false)}
          people={rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, gender: r.gender, days: r.oldestDays, balance: r.balance }))} />
      )}
    </div>
  );
}

function Fact({ label, value, sub, strong }: { label: string; value: string; sub?: ReactNode; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] text-slate-500">{label}</dt>
      <dd className={cn('tabular-nums text-slate-900', strong ? 'font-bold' : 'font-semibold')}>{value}</dd>
      {sub && <dd className="text-[0.6875rem] text-slate-500">{sub}</dd>}
    </div>
  );
}

/** Thin bar of one customer's balance split by age. */
function AgeBar({ ages, total }: { ages: Record<AgeKey, number>; total: number }) {
  const keys: AgeKey[] = ['d30', 'd60', 'd90', 'd180', 'old'];
  return (
    <div className="flex h-2 w-24 overflow-hidden rounded-full bg-slate-100">
      {keys.map((k) => ages[k] > 0 && <div key={k} style={{ width: `${(ages[k] / (total || 1)) * 100}%`, background: AGE_COLORS[k] }} />)}
    </div>
  );
}
