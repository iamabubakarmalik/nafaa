/**
 * COD reconciliation: upload a courier's payment statement (CSV or Excel
 * from TCS, Leopards, PostEx, Trax, M&P, …). Columns are found by their
 * header names and the shop maps any it cannot read. Rows are matched to
 * orders by CN (else order number) and shown in three groups: matched (with
 * any difference), in the statement but not in Nafaa, and delivered in
 * Nafaa but missing from the statement (money still with the courier).
 * "Paisa mil gaya" settles the ticked rows and keeps the courier's charges
 * as each order's actual costs. The file never leaves the browser except
 * as the rows sent for matching.
 */

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, GraduationCap, HelpCircle, Hourglass, ListChecks, RefreshCw, Upload, Wallet } from 'lucide-react';
import {
  Alert, Button, Card, Checkbox, KpiCard, KpiRow, PageHero, PageShell, Select, Table, TBody, Td, Th, THead, Tr, ViewTabs, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { apiErrorMessage } from '../api/online-orders.api';
import { STATEMENT_FIELDS, orderMoneyApi, type ColumnMap, type ReconcileResult, type StatementField } from '../api/order-money.api';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { courierBrand, COURIER_OPTIONS } from '../lib/labels';
import { t as tr } from '@core/i18n';

type Tab = 'matched' | 'unknown' | 'missing';
const FIELD_LABEL: Record<StatementField, string> = {
  cn: tr('CN / tracking'), orderRef: tr('Order number'), amount: tr('COD amount (customer se)'), charge: tr('Delivery charge'), codFee: tr('COD fee'),
  tax: tr('GST / tax'), net: tr('Net (aap ko mila)'), status: tr('Status'),
};
const STATEMENT_COURIERS = COURIER_OPTIONS.filter((c) => c.code !== 'RIDER');

/** Reads the first sheet; the header is the first row with at least three filled cells. */
async function readFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const wb = XLSX.read(await file.arrayBuffer());
  const all = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false }) as unknown[][];
  const filled = (r: unknown[]) => r.filter((c) => String(c ?? '').trim() !== '').length;
  const h = all.findIndex((r) => filled(r) >= 3);
  if (h < 0) throw new Error(tr('File me column wali row nahi mili'));
  return {
    headers: all[h].map((c) => String(c ?? '').trim()),
    rows: all.slice(h + 1).filter((r) => filled(r) > 0).map((r) => r.map((c) => String(c ?? '').trim())),
  };
}

export default function CodReconcilePage() {
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const fileRef = useRef<HTMLInputElement>(null);
  const guide = usePageGuide();
  const [file, setFile] = useState<{ name: string; headers: string[]; rows: string[][] } | null>(null);
  const [courier, setCourier] = useState('');
  const [mapping, setMapping] = useState<ColumnMap | undefined>();
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [tab, setTab] = useState<Tab>('matched');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState('');
  const [withCharges, setWithCharges] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);

  const match = useMutation({
    mutationFn: (v: { file: NonNullable<typeof file>; courier: string; mapping?: ColumnMap }) =>
      orderMoneyApi.reconcile({ headers: v.file.headers, rows: v.file.rows, mapping: v.mapping, courier: v.courier || undefined }),
    onSuccess: (r) => {
      setResult(r);
      setMapping(r.mapping);
      if (r.courier && !courier) setCourier(r.courier.code);
      setPicked(new Set((r.matched ?? []).filter((m) => (m.ok || m.returned) && !(m.settled && !m.charge)).map((m) => m.orderId)));
      setTab((r.matched?.length ?? 0) > 0 ? 'matched' : (r.missing?.length ?? 0) > 0 ? 'missing' : 'unknown');
    },
    onError: (e) => toast.error(apiErrorMessage(e, tr('Statement nahi mili'))),
  });

  const settle = useMutation({
    mutationFn: () => orderMoneyApi.settleStatement({
      reference: reference.trim() || undefined,
      withCharges,
      items: (result?.matched ?? []).filter((m) => picked.has(m.orderId)).map((m) => ({
        orderId: m.orderId, received: m.received,
        charge: result?.hasCharges ? m.charge : null,
        codFee: result?.hasCodFee ? m.codFee : null,
      })),
    }),
    onSuccess: (r) => {
      toast.success(tr('{{settled}} order ka paisa mil gaya{{value}}', { settled: r.settled, value: r.charged ? tr(' · {{charged}} par courier charges likhe', { charged: r.charged }) : '' }));
      ['cod-summary', 'cod-history', 'online-orders', 'online-report', 'online-profit'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (file) match.mutate({ file, courier, mapping });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const onFile = async (f: File) => {
    try {
      const parsed = await readFile(f);
      if (!parsed.rows.length) throw new Error(tr('File me koi row nahi'));
      const next = { name: f.name, ...parsed };
      setFile(next);
      setMapping(undefined);
      setResult(null);
      match.mutate({ file: next, courier });
    } catch (e) {
      toast.error((e as Error).message || tr('File nahi parhi gayi'));
    }
  };

  const matched = result?.matched ?? [];
  const pickedRows = matched.filter((m) => picked.has(m.orderId));
  const toSettle = pickedRows.filter((m) => !m.settled && !m.returned).length;
  const diffs = matched.filter((m) => !m.ok);
  const t = result?.totals;
  const columnsOpen = !!result && (result.needs.length > 0);
  const courierName = STATEMENT_COURIERS.find((c) => c.code === courier)?.name;

  const mappingCard = useMemo(() => file && result && (
    <Card title={tr('Columns')} description={result.needs.length ? tr('Kuch zaroori columns nahi mile — file ke column chunein.') : tr('Nafaa ne khud pehchane. Ghalat ho to badal dein.')}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATEMENT_FIELDS.map((f) => (
          <Select key={f} size="sm" label={FIELD_LABEL[f]} value={mapping?.[f] === undefined ? '' : String(mapping[f])}
            error={(result.needs.includes('cn') && (f === 'cn' || f === 'orderRef')) || (result.needs.includes('amount') && (f === 'amount' || f === 'net')) ? tr('Zaroori') : undefined}
            onChange={(e) => setMapping((m) => { const n = { ...(m ?? {}) }; if (e.target.value === '') delete n[f]; else n[f] = Number(e.target.value); return n; })}
            options={[{ value: '', label: tr('— nahi hai —') }, ...file.headers.map((h, i) => ({ value: String(i), label: h || tr('Column {{value}}', { value: i + 1 }) }))]} />
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="secondary" loading={match.isPending} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => match.mutate({ file, courier, mapping })}>{tr('Dobara milayein')}</Button>
      </div>
    </Card>
  ), [file, result, mapping, courier, match]);

  return (
    <PageShell>
      <PageHero back="/online-orders/cod" backLabel={tr('COD & courier')} title={tr('Statement milayein')} chip={<><FileSpreadsheet />{courierName ?? tr('COD statement')}</>}
        meta={file ? file.name : tr('Courier ki payment statement')} busy={match.isPending}
        subtitle={tr('Courier ki payment statement upload karein — har CN order se milta hai.')}
        actions={<>
          {file && <Button size="sm" variant="secondary" leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>{tr('File')}</Button>}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={result && t && !columnsOpen ? [
          { label: tr('Mil gaye'), value: String(matched.length), hint: tr('{{count}} me farq', { count: diffs.length }) },
          { label: tr('Nafaa me nahi'), value: String(result.unknown?.length ?? 0), hint: money(t.unknownValue) },
          { label: tr('Statement me nahi'), value: String(result.missing?.length ?? 0), hint: money(t.missingValue) },
        ] : undefined} />
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          {courier ? <BrandLogo name={courierBrand(courier)} size={32} /> : <FileSpreadsheet className="h-8 w-8 text-slate-300" />}
          <div className="min-w-[10rem] flex-1">
            <div className="truncate text-[0.875rem] font-semibold text-slate-900">{file ? file.name : tr('Statement chunein')}</div>
            <div className="text-[0.75rem] text-slate-500">{file ? tr('{{count}} rows · {{count2}} columns', { count: file.rows.length, count2: file.headers.length }) : tr('TCS, Leopards, PostEx, Trax, M&P — Excel (.xlsx) ya CSV')}</div>
          </div>
          <Select size="sm" aria-label={tr('Courier')} value={courier} wrapperClassName="w-full sm:w-48"
            onChange={(e) => { setCourier(e.target.value); if (file) match.mutate({ file, courier: e.target.value, mapping }); }}
            options={[{ value: '', label: tr('Courier — khud pehchano') }, ...STATEMENT_COURIERS.map((c) => ({ value: c.code, label: c.name }))]} />
          {!file && <Button size="sm" variant="primary" leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>{tr('File chunein')}</Button>}
        </div>
        {!file && (
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void onFile(f); }}
            className="mt-4 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-10 text-center hover:border-brand-300 hover:bg-brand-50/30">
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="mt-2 text-[0.875rem] font-semibold text-slate-700">{tr('File yahan chhorein ya click karein')}</span>
            <span className="mt-1 max-w-md text-[0.75rem] text-slate-500">{tr('Nafaa CN, COD amount, delivery charge, COD fee, GST aur net columns khud dhoondta hai. File kahin save nahi hoti.')}</span>
          </button>
        )}
      </Card>

      {match.isPending && !result && <Card><div className="h-24 animate-pulse rounded-xl bg-slate-100" /></Card>}

      {columnsOpen ? mappingCard : result && t && (<>
        <KpiRow>
          <KpiCard icon={FileSpreadsheet} color="#2563eb" label={tr('Statement me COD')} value={money(t.statement)} hint={tr('{{rows}} rows · charges {{charges}}', { rows: result.rows, charges: money(t.charges) })} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Mil gaye')} value={String(matched.length)} hint={tr('{{matchedReceived}} · {{count}} me farq', { matchedReceived: money(t.matchedReceived), count: diffs.length })} onClick={() => setTab('matched')} active={tab === 'matched'} />
          <KpiCard icon={HelpCircle} color="#d97706" label={tr('Nafaa me nahi')} value={String(result.unknown?.length ?? 0)} hint={money(t.unknownValue)} onClick={() => setTab('unknown')} active={tab === 'unknown'} />
          <KpiCard icon={Hourglass} color="#e11d48" label={tr('Statement me nahi')} value={money(t.missingValue)} hint={tr('{{value}} deliver · paisa {{value2}} ke paas', { value: result.missing?.length ?? 0, value2: courierName ?? 'courier' })} onClick={() => setTab('missing')} active={tab === 'missing'} />
        </KpiRow>

        <ViewTabs value={tab} onChange={setTab} tabs={[
          { id: 'matched', label: tr('Mil gaye'), icon: ListChecks, count: matched.length },
          { id: 'unknown', label: tr('Nafaa me nahi'), icon: HelpCircle, count: result.unknown?.length ?? 0 },
          { id: 'missing', label: tr('Statement me nahi'), icon: Wallet, count: result.missing?.length ?? 0 },
        ]} />

        {tab === 'matched' ? (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {diffs.length > 0 && (
              <div className="px-4 pt-4 sm:px-5"><Alert tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>{tr('{{count}} order me statement ka amount Nafaa se alag hai — dekh kar tick karein. Farq order par likha rahega.', { count: diffs.length })}</Alert></div>
            )}
            {!matched.length ? <Empty text={tr('Statement ka koi CN Nafaa ke kisi order se nahi mila. Columns aur courier dobara dekhein.')} /> : (
              <div className="overflow-x-auto">
                <Table minWidth="52rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr>
                      <Th className="w-10 px-4 py-2 sm:px-5"><Checkbox aria-label={tr('Sab chunein')} checked={matched.every((m) => picked.has(m.orderId))} onChange={(e) => setPicked(e.target.checked ? new Set(matched.map((m) => m.orderId)) : new Set())} /></Th>
                      <Th className="px-3 py-2">{tr('Order · CN')}</Th>
                      <Th className="px-3 py-2 text-end">{tr('Nafaa me COD')}</Th>
                      <Th className="px-3 py-2 text-end">{tr('Statement')}</Th>
                      <Th className="px-3 py-2 text-end">{tr('Farq')}</Th>
                      <Th className="px-3 py-2 text-end">{tr('Charges')}</Th>
                      <Th className="px-4 py-2 sm:px-5">{tr('Halat')}</Th>
                    </Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {matched.map((m) => (
                      <Tr key={m.orderId} className={cn('hover:bg-slate-50/80', !m.ok && 'bg-amber-50/40')}>
                        <Td className="px-4 py-2.5 sm:px-5"><Checkbox aria-label={`#${m.number}`} checked={picked.has(m.orderId)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(m.orderId)) n.delete(m.orderId); else n.add(m.orderId); return n; })} /></Td>
                        <Td className="px-3 py-2.5">
                          <button type="button" onClick={() => setOrderId(m.orderId)} className="font-semibold text-slate-900 hover:underline">#{m.number}</button>
                          <span className="text-slate-500"> · {m.customerName}{m.city ? ` · ${m.city}` : ''}</span>
                          <div className="font-mono text-[0.75rem] text-slate-500">{m.cn ?? '—'}{m.by === 'ORDER' && <span className="ms-1 font-sans text-amber-700">{tr('(order # se mila)')}</span>}</div>
                        </Td>
                        <Td className="px-3 py-2.5 text-end tabular-nums text-slate-600">{money(m.expected)}</Td>
                        <Td className="px-3 py-2.5 text-end font-semibold tabular-nums text-slate-900">{money(m.received)}</Td>
                        <Td className={cn('px-3 py-2.5 text-end font-semibold tabular-nums', m.ok ? 'text-slate-400' : 'text-rose-600')}>{m.ok ? '—' : `${m.diff > 0 ? '+' : '−'} ${money(Math.abs(m.diff))}`}</Td>
                        <Td className="px-3 py-2.5 text-end tabular-nums text-slate-600">{m.charge + m.codFee > 0 ? money(m.charge + m.codFee) : '—'}</Td>
                        <Td className="px-4 py-2.5 sm:px-5">
                          {m.returned ? <Pill tone="rose">{tr('Wapas aaya — sirf charges')}</Pill>
                            : m.settled ? <Pill tone="slate">{tr('Pehle se paid')}</Pill>
                              : m.orderStatus !== 'DELIVERED' ? <Pill tone="amber">{tr('Nafaa me abhi deliver nahi')}</Pill>
                                : <Pill tone="green">{tr('Courier ke paas')}</Pill>}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
            {matched.length > 0 && (
              <div className="sticky bottom-2 z-10 m-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-lg sm:m-4">
                <span className="text-[0.8125rem] font-semibold">{tr('{{count}} chune · {{value}}', { count: pickedRows.length, value: money(pickedRows.reduce((a, m) => a + m.received, 0)) })}</span>
                <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={tr('Statement / cheque ref (zaroori nahi)')}
                  className="h-8 min-w-[12rem] flex-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[0.8125rem] text-white outline-none placeholder:text-white/50" />
                {(result.hasCharges || result.hasCodFee) && (
                  <label className="flex items-center gap-1.5 text-[0.75rem] text-white/80">
                    <input type="checkbox" checked={withCharges} onChange={(e) => setWithCharges(e.target.checked)} className="h-3.5 w-3.5" /> {' '}{tr('Charges costs me likhein')}
                  </label>
                )}
                <Button size="sm" variant="success" disabled={!pickedRows.length} loading={settle.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => settle.mutate()}>
                  {tr('Paisa mil gaya{{value}}', { value: toSettle ? ` (${toSettle})` : '' })}
                </Button>
              </div>
            )}
          </section>
        ) : tab === 'unknown' ? (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {!result.unknown?.length ? <Empty text={tr('Statement ki har row Nafaa ke kisi order se mil gayi.')} /> : (
              <div className="overflow-x-auto">
                <p className="px-4 pt-4 text-[0.8125rem] text-slate-500 sm:px-5">{tr('Ye parcels shayad courier portal se seedha book hue, ya order par CN nahi likha. Order par CN likh kar dobara milayein.')}</p>
                <Table minWidth="36rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr><Th className="px-4 py-2 sm:px-5">{tr('Row')}</Th><Th className="px-3 py-2">{tr('CN · order')}</Th><Th className="px-3 py-2">{tr('Status')}</Th><Th className="px-3 py-2 text-end">{tr('COD')}</Th><Th className="px-4 py-2 text-end sm:px-5">{tr('Charges')}</Th></Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {result.unknown.map((u) => (
                      <Tr key={u.line}>
                        <Td className="px-4 py-2.5 text-slate-400 sm:px-5">{u.line}</Td>
                        <Td className="px-3 py-2.5 font-mono">{u.cn ?? '—'}{u.orderRef && <span className="ms-2 font-sans text-slate-500">#{u.orderRef}</span>}</Td>
                        <Td className="px-3 py-2.5 text-slate-600">{u.status ?? '—'}</Td>
                        <Td className="px-3 py-2.5 text-end tabular-nums">{money(u.amount)}</Td>
                        <Td className="px-4 py-2.5 text-end tabular-nums text-slate-600 sm:px-5">{money(u.charge)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {!courier ? <Empty text={tr('Courier chunein — phir us ke deliver hue orders jo statement me nahi, yahan dikhenge.')} />
              : !result.missing?.length ? <Empty text={tr('{{value}} ke paas koi deliver order baqi nahi jo is statement me na ho.', { value: courierName ?? 'Courier' })} /> : (
                <ul className="divide-y divide-slate-100">
                  <li className="px-4 py-3 text-[0.8125rem] text-slate-500 sm:px-5">{tr('Ye orders Nafaa me deliver hain magar statement me nahi — in ka paisa abhi {{courierName}} ke paas hai. List courier ko bhej kar poochein.', { courierName })}</li>
                  {result.missing.map((o) => (
                    <li key={o.orderId}>
                      <button type="button" onClick={() => setOrderId(o.orderId)} className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-slate-50/80 sm:px-5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.875rem] font-semibold text-slate-900">#{o.number} <span className="font-normal text-slate-600">· {o.customerName}{o.city ? ` · ${o.city}` : ''}</span></span>
                          <span className="block font-mono text-[0.75rem] text-slate-500">{o.cn ?? tr('CN nahi')}</span>
                        </span>
                        {o.days != null && <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', o.days >= 7 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>{tr('{{days}} din', { days: o.days })}</span>}
                        <span className="w-24 text-end text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.expected)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        )}

        {mappingCard}
      </>)}

      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
      {guide.isOpen && (
        <PageGuide title={tr('Statement milayein')} onClose={guide.close}
          flow={[
            { label: tr('Statement file'), hint: 'Excel / CSV', icon: Upload, color: '#2563eb' },
            { label: tr('CN se match'), icon: ListChecks, color: '#7c3aed' },
            { label: tr('Paisa mil gaya'), hint: tr('Orders settle'), icon: CheckCircle2, color: '#16a34a' },
          ]}
          steps={[
            { icon: Upload, color: '#2563eb', title: tr('File chunein'), text: tr('Courier ki payment statement (Excel ya CSV) daalein. File kahin save nahi hoti.') },
            { icon: HelpCircle, color: '#d97706', title: tr('Farq dekhein'), text: tr('Jo Nafaa me nahi ya statement me nahi woh alag tab me aate hain — courier se poochein.') },
            { icon: Wallet, color: '#16a34a', title: tr('Paisa mil gaya'), text: tr('Tick kiye orders settle ho jate hain aur courier ke asli charges order par likhe jate hain.') },
          ]}
          shortcuts={[['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

function Pill({ tone, children }: { tone: 'green' | 'rose' | 'amber' | 'slate'; children: React.ReactNode }) {
  const cls = { green: 'bg-success-50 text-success-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-800', slate: 'bg-slate-100 text-slate-600' }[tone];
  return <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', cls)}>{children}</span>;
}

function Empty({ text }: { text: string }) {
  return <p className="px-6 py-12 text-center text-[0.8125rem] text-slate-500">{text}</p>;
}
