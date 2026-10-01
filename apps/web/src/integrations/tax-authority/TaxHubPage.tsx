import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, Download, FileText, Landmark, RefreshCw, Search, Settings2 } from 'lucide-react';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { whenText } from '@integrations/online-orders/lib/labels';
import { Badge, Banner, Btn, Card, EmptyState, Page, Stat, inputCls } from '@integrations/online-orders/components/ui/kit';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { qrSvg } from '@core/payments/qrSvg';
import { TaxSettingsTab } from './TaxAuthorityPage';
import { taxAuthorityApi, type TaxInvoiceRow } from './taxAuthority.api';

/* ═════════════════════════════════════════════════════════════
   TAX — ek hi jagah: PRA / SRB / KPRA / FBR POS.
     Overview  — is mahine ka tax, roz ka chart, sehat, atke bill
     Invoices  — har bill: fiscal number, QR, ghalti, "dobara bhejein"
     Reports   — mahine ki report (filing ke liye) + Excel
     Settings  — authority, POS ID, keys, rate
   ═════════════════════════════════════════════════════════════ */

const AUTH_NAME: Record<string, string> = { PRA: 'PRA (Punjab)', SRB: 'SRB (Sindh)', KPRA: 'KPRA (KP)', FBR: 'FBR POS' };
const pkMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date()).slice(0, 7);

const TABS = [
  { to: '/tax', label: 'Overview', icon: Landmark, end: true },
  { to: '/tax/invoices', label: 'Invoices', icon: FileText },
  { to: '/tax/reports', label: 'Reports', icon: Download },
  { to: '/tax/settings', label: 'Settings', icon: Settings2 },
];

export default function TaxHubPage() {
  const { pathname } = useLocation();
  const tab = pathname.startsWith('/tax/invoices') ? 'invoices' : pathname.startsWith('/tax/reports') ? 'reports' : pathname.startsWith('/tax/settings') ? 'settings' : 'overview';
  return (
    <Page title="Tax" subtitle="Sales tax ek jagah — har bill authority ko, bill par fiscal number, aur mahine ki report."
      tabs={
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => cn('inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px] font-medium transition',
                isActive ? 'border-emerald-600 text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
              <t.icon className="h-4 w-4" /> {t.label}
            </NavLink>
          ))}
        </div>
      }>
      {tab === 'overview' && <Overview />}
      {tab === 'invoices' && <Invoices />}
      {tab === 'reports' && <Reports />}
      {tab === 'settings' && <TaxSettingsTab />}
    </Page>
  );
}

/* ─────────────────────────── OVERVIEW ─────────────────────────── */

function Overview() {
  const { data, isLoading, error } = useQuery({ queryKey: ['tax-analytics'], queryFn: taxAuthorityApi.analytics, refetchInterval: 60_000 });
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>;
  if (error || !data) return <Card><EmptyState title="Tax ka haal nahi khula">{apiErrorMessage(error)}</EmptyState></Card>;

  if (!data.enabled) {
    return (
      <Card>
        <EmptyState icon={<Landmark className="h-8 w-8 text-slate-400" />} title="Tax abhi chalu nahi"
          action={<Link to="/tax/settings"><Btn variant="primary">Tax set karein</Btn></Link>}>
          Restaurant, salon ya services — Punjab me <b>PRA</b>, Sindh me <b>SRB</b>, KP me <b>KPRA</b>. Bara retail store (Tier-1) — <b>FBR POS</b>.
          Set karte hi har bill authority ko jayega aur bill par fiscal number + QR chhapega.
        </EmptyState>
      </Card>
    );
  }
  const t = data.thisMonth, l = data.lastMonth;
  const change = l.tax > 0 ? Math.round(((t.tax - l.tax) / l.tax) * 100) : null;
  return (
    <>
      {data.migrationPending && (
        <Banner tone="warning" title="Database update baqi hai">Server par tax ki migration abhi nahi chali — chalte hi bill authority ko jane lagenge.</Banner>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
        <Badge tone="success" dot>{AUTH_NAME[data.authority ?? ''] ?? data.authority}</Badge>
        <Badge tone={data.env === 'live' ? 'info' : 'warning'}>{data.env === 'live' ? 'Live' : 'Sandbox (test)'}</Badge>
        {data.startAt && <span>{whenText(data.startAt)} se chalu</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Is mahine ka tax" value={formatPKR(t.tax)} hint={change === null ? `${t.bills} bill` : `${change >= 0 ? '+' : ''}${change}% pichle mahine se · ${t.bills} bill`} />
        <Stat label="Is mahine ki sale (tax ke baghair)" value={formatPKR(t.saleValue)} hint={`${t.returns} return`} />
        <Stat label="Kamyabi (30 din)" value={data.health.successRate === null ? '—' : `${data.health.successRate}%`}
          hint={data.health.avgSeconds !== null ? `ausat ${data.health.avgSeconds}s me number` : 'abhi koi bill nahi'} tone={(data.health.successRate ?? 100) < 95 ? 'attention' : undefined} />
        <Stat label="Atke / baqi" value={data.health.failed + data.health.pending + data.missing}
          hint={`${data.health.failed} fail · ${data.health.pending + data.missing} qatar me`} tone={data.health.failed > 0 ? 'attention' : undefined} />
      </div>

      {data.recentFails.length > 0 && (
        <Banner tone="warning" title={`${data.health.failed} bill authority ne nahi liye`} icon={<AlertTriangle className="h-4 w-4" />}
          action={<Link to="/tax/invoices?status=FAILED"><Btn size="sm">Dekhein</Btn></Link>}>
          Nafaa khud dobara bhej raha hai. Aakhri wajah: <b>{data.recentFails[0].error ?? '—'}</b>
        </Banner>
      )}

      <Card title="Roz ka tax (30 din)" description="Sirf wo bill jo authority ne qabool kiye — returns minus.">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.series.map((d) => ({ ...d, label: d.day.slice(8) }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => [formatPKR(Number(v ?? 0)), 'Tax']} labelFormatter={(_, p) => (p?.[0]?.payload?.day ?? '') + ` · ${p?.[0]?.payload?.bills ?? 0} bill`} />
              <Bar dataKey="tax" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Pichla mahina (${l.month})`}>
          <dl className="grid grid-cols-2 gap-2 text-[13px]">
            <dt className="text-slate-500">Bill</dt><dd className="text-right font-semibold tabular-nums">{l.bills}</dd>
            <dt className="text-slate-500">Sale (tax ke baghair)</dt><dd className="text-right font-semibold tabular-nums">{formatPKR(l.saleValue)}</dd>
            <dt className="text-slate-500">Tax</dt><dd className="text-right font-semibold tabular-nums">{formatPKR(l.tax)}</dd>
          </dl>
          <Link to={`/tax/reports?month=${l.month}`} className="mt-3 inline-block text-[13px] font-semibold text-emerald-700 hover:underline">Poori report →</Link>
        </Card>
        <Card title="Kya karna hai">
          <ul className="space-y-1.5 text-[13px] text-slate-700 dark:text-slate-200">
            <li>• Har mahine <b>Reports</b> se Excel nikal kar accountant ko dein (return filing)</li>
            <li>• <b>Invoices</b> me koi bill fail ho to wajah dekhein — aksar POS ID / token / PCT code</li>
            <li>• {data.env === 'live' ? 'Live chal raha hai ✓' : <>Abhi <b>Sandbox</b> hai — test ho jaye to Settings me <b>Live</b> karein</>}</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

/* ─────────────────────────── INVOICES ─────────────────────────── */

const STATUS_TABS = [
  { v: '', label: 'Sab' }, { v: 'SUCCESS', label: 'Kamyab' }, { v: 'FAILED', label: 'Fail' }, { v: 'PENDING', label: 'Qatar me' },
];

function Invoices() {
  const qc = useQueryClient();
  const initial = new URLSearchParams(window.location.search).get('status') ?? '';
  const [status, setStatus] = useState(initial);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<TaxInvoiceRow | null>(null);
  const q = { status: status || undefined, search: search.trim() || undefined, page: String(page) };
  const { data, isLoading, error, isFetching } = useQuery({ queryKey: ['tax-invoices', q], queryFn: () => taxAuthorityApi.invoices(q), placeholderData: (p) => p });
  const retry = useMutation({
    mutationFn: taxAuthorityApi.retry,
    onSuccess: (r) => { r.status === 'SUCCESS' ? toast.success(`Number mil gaya: ${r.fiscalNumber}`) : toast.error(r.error ?? 'Abhi bhi fail'); qc.invalidateQueries({ queryKey: ['tax-invoices'] }); qc.invalidateQueries({ queryKey: ['tax-analytics'] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {STATUS_TABS.map((s) => (
            <button key={s.v} type="button" onClick={() => { setStatus(s.v); setPage(1); }}
              className={cn('rounded-md px-3 py-1 text-[13px] font-medium', status === s.v ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}>{s.label}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Bill ya fiscal number…" className={cn(inputCls, 'w-64 pl-8')} />
        </div>
        {isFetching && <span className="text-[12px] text-slate-400">Taaza ho raha…</span>}
      </div>

      {isLoading ? <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        : error || !data ? <Card><EmptyState title="List nahi khuli">{apiErrorMessage(error)}</EmptyState></Card>
        : data.migrationPending ? <Banner tone="warning" title="Database update baqi hai">Tax ki migration chalne ke baad yahan bill nazar aayenge.</Banner>
        : !data.rows.length ? <Card><EmptyState title="Koi bill nahi">Tax chalu hone ke baad ke bill yahan aate hain.</EmptyState></Card>
        : (
          <Card flush>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40">
                  <tr><th className="px-4 py-2">Waqt</th><th className="px-2 py-2">Bill</th><th className="px-2 py-2 text-right">Kul</th><th className="px-2 py-2 text-right">Tax</th><th className="px-4 py-2">Authority number</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-4 py-2 text-slate-500">{whenText(r.createdAt)}</td>
                      <td className="px-2 py-2 font-mono">{r.kind === 'RETURN' && <Badge tone="warning">Return</Badge>} {r.usin}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatPKR(r.kind === 'RETURN' ? -r.totalAmount : r.totalAmount)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatPKR(r.taxAmount)} <span className="text-[11px] text-slate-400">{r.taxRate}%</span></td>
                      <td className="px-4 py-2">
                        {r.status === 'SUCCESS' ? <button type="button" onClick={() => setOpen(r)} className="inline-flex items-center gap-1 font-mono text-[12px] text-emerald-700 hover:underline"><CheckCircle2 className="h-3.5 w-3.5" /> {r.fiscalNumber}</button>
                          : r.status === 'FAILED' ? <span title={r.error ?? ''} className="text-[12px] text-rose-600">Fail ({r.attempts}) — {(r.error ?? '').slice(0, 50)}</span>
                          : <span className="text-[12px] text-amber-600">Bheja ja raha{r.nextAttemptAt ? ` · agli koshish ${whenText(r.nextAttemptAt)}` : ''}</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {r.status !== 'SUCCESS' && <Btn size="sm" loading={retry.isPending && retry.variables === r.id} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => retry.mutate(r.id)}>Dobara</Btn>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[13px] dark:border-slate-800">
                <span className="text-slate-500">{data.total} bill · safha {data.page}/{data.pages}</span>
                <div className="flex gap-1">
                  <Btn size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Pichla</Btn>
                  <Btn size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Agla</Btn>
                </div>
              </div>
            )}
          </Card>
        )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{AUTH_NAME[open.authority]} · {open.usin}</div>
            <div className="mt-1 break-all font-mono text-lg font-bold text-slate-900 dark:text-white">{open.fiscalNumber}</div>
            {open.qrText && <div className="mx-auto mt-3 inline-block rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg(open.qrText, 180) }} />}
            <div className="mt-2 text-[13px] text-slate-600 dark:text-slate-300">Kul {formatPKR(open.totalAmount)} · Tax {formatPKR(open.taxAmount)} ({open.taxRate}%)</div>
            {/^https?:\/\//.test(open.qrText ?? '') && <a href={open.qrText!} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[13px] font-semibold text-emerald-700 hover:underline">Authority ki site par check karein</a>}
            <div className="mt-4"><Btn onClick={() => setOpen(null)}>Band karein</Btn></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── REPORTS ─────────────────────────── */

function Reports() {
  const [month, setMonth] = useState(() => new URLSearchParams(window.location.search).get('month') ?? pkMonth());
  const { data, isLoading, error } = useQuery({ queryKey: ['tax-report', month], queryFn: () => taxAuthorityApi.report(month), placeholderData: (p) => p });
  const dl = useMutation({ mutationFn: () => taxAuthorityApi.reportCsv(month), onSuccess: () => toast.success('Excel (CSV) download ho gayi'), onError: (e) => toast.error(apiErrorMessage(e)) });
  const busyDays = useMemo(() => (data?.daily ?? []).filter((d) => d.bills || d.returns), [data]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input type="month" value={month} max={pkMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className={cn(inputCls, 'w-auto')} />
        <Btn loading={dl.isPending} icon={<Download className="h-4 w-4" />} onClick={() => dl.mutate()}>Excel (CSV)</Btn>
        <Btn variant="plain" onClick={() => window.print()}>Print</Btn>
      </div>
      {isLoading ? <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        : error || !data ? <Card><EmptyState title="Report nahi bani">{apiErrorMessage(error)}</EmptyState></Card>
        : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Bill" value={data.totals.bills} hint={`${data.totals.returns} return`} />
              <Stat label="Sale (tax ke baghair)" value={formatPKR(data.totals.saleValue)} />
              <Stat label="Tax" value={formatPKR(data.totals.tax)} />
              <Stat label="Kul (tax samet)" value={formatPKR(data.totals.total)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Rate ke hisaab se" flush>
                <Table head={['Rate', 'Bill', 'Sale', 'Tax']} rows={data.byRate.map((r) => [`${r.rate}%`, r.bills, formatPKR(r.saleValue), formatPKR(r.tax)])} />
              </Card>
              <Card title="Branch ke hisaab se" flush>
                <Table head={['Branch', 'Bill', 'Sale', 'Tax']} rows={data.byShop.map((r) => [r.name, r.bills, formatPKR(r.saleValue), formatPKR(r.tax)])} />
              </Card>
            </div>
            <Card title={`Roz ka hisaab — ${data.month}`} description={`${data.authority ? AUTH_NAME[data.authority] : ''} · ${data.business} · sirf authority ke qabool kiye bill`} flush>
              <Table head={['Din', 'Bill', 'Return', 'Sale', 'Tax', 'Kul']} rows={busyDays.map((d) => [d.day, d.bills, d.returns, formatPKR(d.saleValue), formatPKR(d.tax), formatPKR(d.total)])} />
            </Card>
            {(data.health.failed > 0 || data.health.pending > 0) && (
              <Banner tone="warning" title="Kuch bill report me shamil nahi">
                {data.health.failed} fail aur {data.health.pending} qatar me — authority tak pohanchne ke baad hi report me aate hain. <Link to="/tax/invoices?status=FAILED" className="font-semibold underline">Invoices dekhein</Link>
              </Banner>
            )}
          </>
        )}
    </>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <EmptyState title="Kuch nahi" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40">
          <tr>{head.map((h, i) => <th key={h} className={cn('px-4 py-2', i > 0 && 'text-right')}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cn('px-4 py-1.5', j > 0 ? 'text-right tabular-nums' : 'font-medium text-slate-900 dark:text-white')}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
