/**
 * Settles a load sheet when the van comes back. For each invoice: delivered,
 * partly returned (quantities per line, damaged or not) or all returned with
 * a reason, and the cash taken at the door. When the delivery man sent his
 * report from the phone, every invoice starts from it and the office only
 * checks and changes what is wrong; the cash is counted here, once. Old dues
 * collected on the trip are added as recoveries. The cash handed in is compared live with what is
 * expected; Finish posts returns through the bill, cash to the khata and
 * closes the sheet. Returns that need the refund PIN ask for it and resend.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Gift, HandCoins, Plus, RotateCcw, Smartphone, Trash2, Truck, Wallet } from 'lucide-react';
import { Alert, Button, Checkbox, Kbd, PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { askManagerPin } from '@core/security/ManagerPin';
import {
  DIST_KEY, distError, distributionApi, type DeliveryOutcome, type DeliveryReportSummary, type MoneyMethod, type SettleBody, type SettleOrderRow,
  type SettleResult,
} from '../api/distribution.api';
import { DistributionGate } from '../components/DistributionGate';
import { Panel, Pill } from '../components/parts';
import { METHOD_LABEL, METHODS, OUTCOME, packText, partyName, partySub, RETURN_REASONS, rs, trim } from '../lib/meta';

interface LineDraft { ret: string; freeRet: string; damaged: boolean }
interface Draft { outcome: DeliveryOutcome; cash: string; method: MoneyMethod; reason: string; lines: Record<string, LineDraft>; open: boolean }
interface Recovery { key: string; customerId: string; amount: string; method: MoneyMethod }

const num = (v: string) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const str = (n?: number | null) => (n ? String(n) : '');

/** A fresh draft for an invoice: the delivery man's report when there is one, else "delivered, no cash". */
function draftFor(o: SettleOrderRow): Draft {
  const r = o.report;
  const lines = Object.fromEntries(o.items.map((i) => {
    const l = r?.outcome === 'PARTIAL' ? r.lines.find((x) => x.orderItemId === i.id) : undefined;
    return [i.id, { ret: str(l?.returnBaseQty), freeRet: str(l?.returnFreeQty), damaged: !!l?.damaged }];
  }));
  if (!r) return { outcome: 'DELIVERED', cash: '', method: 'CASH', reason: '', open: false, lines };
  return { outcome: r.outcome, cash: str(r.cashCollected), method: r.method, reason: r.returnReason ?? '', open: r.outcome === 'PARTIAL', lines };
}

/** True while the office's draft still says what the phone report said. */
function matchesReport(o: SettleOrderRow, d: Draft): boolean {
  const r = o.report;
  if (!r) return false;
  if (d.outcome !== r.outcome || r2(num(d.cash)) !== r2(r.cashCollected) || (num(d.cash) > 0 && d.method !== r.method)) return false;
  if (d.outcome !== 'PARTIAL') return true;
  return o.items.every((i) => {
    const l = r.lines.find((x) => x.orderItemId === i.id);
    const dl = d.lines[i.id];
    return num(dl?.ret ?? '') === (l?.returnBaseQty ?? 0) && num(dl?.freeRet ?? '') === (l?.returnFreeQty ?? 0) && !!dl?.damaged === !!l?.damaged;
  });
}

export default function SettlePage() {
  return <DistributionGate><Settle /></DistributionGate>;
}

function Settle() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canVerify = usePermission(PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY);
  const q = useQuery({ queryKey: [DIST_KEY, 'settlement', id], queryFn: () => distributionApi.settlement(id) });
  const p = q.data;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [handedIn, setHandedIn] = useState('');
  const [verifyNow, setVerifyNow] = useState(canVerify);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pending = useMemo(() => (p?.orders ?? []).filter((o) => !o.settled), [p]);
  useEffect(() => {
    if (!p) return;
    setDrafts((d) => {
      const n = { ...d };
      p.orders.filter((o) => !o.settled && !n[o.id]).forEach((o) => { n[o.id] = draftFor(o); });
      return n;
    });
  }, [p]);

  const set = (orderId: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [orderId]: { ...d[orderId], ...patch } }));
  const setLine = (orderId: string, itemId: string, patch: Partial<LineDraft>) =>
    setDrafts((d) => ({ ...d, [orderId]: { ...d[orderId], lines: { ...d[orderId].lines, [itemId]: { ...d[orderId].lines[itemId], ...patch } } } }));

  const returnsOf = (o: SettleOrderRow, d?: Draft) => {
    if (!d || d.outcome === 'DELIVERED') return 0;
    if (d.outcome === 'RETURNED') return o.total;
    return r2(o.items.reduce((a, i) => a + Math.min(num(d.lines[i.id]?.ret ?? ''), i.baseQty) * i.netPerBase, 0));
  };
  const dueOf = (o: SettleOrderRow, d?: Draft) => Math.max(0, r2(o.total - returnsOf(o, d)));

  const newCash = pending.reduce((a, o) => { const d = drafts[o.id]; return a + (d && d.method === 'CASH' && d.outcome !== 'RETURNED' ? num(d.cash) : 0); }, 0)
    + recoveries.reduce((a, r) => a + (r.method === 'CASH' ? num(r.amount) : 0), 0);
  const expected = r2((p?.money.expectedCash ?? 0) + newCash);
  const handed = handedIn.trim() === '' ? null : num(handedIn);
  const diff = handed == null ? null : r2(expected - handed);
  const customers = useMemo(() => {
    const m = new Map<string, string>();
    (p?.orders ?? []).forEach((o) => { if (o.customer) m.set(o.customer.id, partyName(o.customer)); });
    return [...m.entries()];
  }, [p]);

  const body = (pin?: string, only?: Set<string>): SettleBody => ({
    orders: pending.filter((o) => !only || only.has(o.id)).map((o) => {
      const d = drafts[o.id];
      return {
        orderId: o.id,
        outcome: d.outcome,
        ...(d.outcome === 'PARTIAL' ? {
          lines: o.items.map((i) => ({ orderItemId: i.id, returnBaseQty: num(d.lines[i.id]?.ret ?? ''), returnFreeQty: num(d.lines[i.id]?.freeRet ?? ''), damaged: d.lines[i.id]?.damaged || undefined }))
            .filter((l) => (l.returnBaseQty ?? 0) > 0 || (l.returnFreeQty ?? 0) > 0),
        } : {}),
        ...(d.outcome !== 'RETURNED' && num(d.cash) > 0 ? { cashCollected: num(d.cash), method: d.method } : {}),
        ...(d.outcome !== 'DELIVERED' && d.reason ? { returnReason: d.reason } : {}),
      };
    }),
    recoveries: only ? [] : recoveries.filter((r) => r.customerId && num(r.amount) > 0).map((r) => ({ customerId: r.customerId, amount: num(r.amount), method: r.method })),
    ...(handed != null ? { handedIn: handed } : {}),
    ...(canVerify && verifyNow && !only ? { verifyRecoveries: true } : {}),
    ...(pin ? { managerPin: pin } : {}),
  });

  const settle = useMutation({
    mutationFn: async (): Promise<SettleResult> => {
      for (const o of pending) {
        const d = drafts[o.id];
        if (d.outcome === 'PARTIAL' && !o.items.some((i) => num(d.lines[i.id]?.ret ?? '') > 0 || num(d.lines[i.id]?.freeRet ?? '') > 0)) throw new Error(`${partyName(o.customer)}: wapas aane wala maal likhein`);
        if (num(d.cash) > dueOf(o, d) + 0.5) throw new Error(`${partyName(o.customer)}: cash invoice se zyada hai`);
      }
      let r = await distributionApi.settle(id, body());
      const pinFails = r.results.filter((x) => !x.ok && /PIN/i.test(x.error ?? ''));
      if (pinFails.length) {
        const pin = await askManagerPin(`${pinFails.length} invoice ka maal wapas — Return`, 'refund');
        if (pin) {
          const again = await distributionApi.settle(id, body(pin, new Set(pinFails.map((x) => x.orderId))));
          const byId = new Map(again.results.map((x) => [x.orderId, x]));
          r = { ...again, results: r.results.map((x) => byId.get(x.orderId) ?? x), recoveries: r.recoveries };
        }
      }
      return r;
    },
    onSuccess: (r) => {
      const bad = r.results.filter((x) => !x.ok);
      const badRec = r.recoveries.filter((x) => !x.ok);
      setErrors(Object.fromEntries(bad.map((x) => [x.orderId, x.error ?? 'Settle nahi hua'])));
      qc.invalidateQueries({ queryKey: [DIST_KEY] });
      if (!bad.length) setRecoveries([]);
      badRec.forEach((x) => toast.error(x.error ?? 'Recovery save nahi hui'));
      if (r.sheet.status === 'SETTLED') {
        toast.success(`${r.sheet.number} settle ho gayi${r.sheet.shortAmount ? ` · ${r.sheet.shortAmount > 0 ? 'kam' : 'zyada'} ${rs(Math.abs(r.sheet.shortAmount))}` : ''}`);
        navigate(`/distribution/load-sheets/${id}`);
      } else if (bad.length) toast.error(`${bad.length} invoice settle nahi hui — neeche dekhein`);
      else toast.success(handed == null ? 'Invoices settle — ab jama hua cash likh kar Finish karein' : 'Save ho gaya');
    },
    onError: (e) => toast.error(distError(e, 'Settle nahi hua')),
  });

  if (!p) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  const sheet = p.sheet;
  if (sheet.status === 'SETTLED' || sheet.status === 'CANCELLED') {
    return (
      <PageShell>
        <PageHero back={`/distribution/load-sheets/${id}`} backLabel={sheet.number} title={`${sheet.number} settle`} />
        <Alert tone="info">Ye load sheet {sheet.status === 'SETTLED' ? 'settle ho chuki hai' : 'cancel hai'}. <Link to={`/distribution/load-sheets/${id}`} className="font-semibold underline">Sheet dekhein</Link></Alert>
      </PageShell>
    );
  }

  const settledCount = p.orders.length - pending.length;
  const pendingCollections = p.collections.filter((c) => c.status === 'PENDING');

  return (
    <PageShell>
      <PageHero
        back={`/distribution/load-sheets/${id}`} backLabel={sheet.number}
        title={`${sheet.number} settle`}
        chip={<><Truck /> {sheet.routeName ?? 'Mili juli'}</>}
        meta={[sheet.deliveryUserName, sheet.driverName, sheet.vehicleNo].filter(Boolean).join(' · ') || 'Gaari wapas aayi — har invoice ka hisaab'}
        actions={<Link to={`/distribution/load-sheets/${id}`} className={heroButton}>Sheet</Link>}
        stats={[
          { label: 'Invoices', value: `${settledCount}/${p.orders.length}`, hint: 'settle hui' },
          { label: 'Value', value: rs(sheet.totalValue) },
          { label: 'Expected cash', value: rs(expected) },
        ]}
      />

      {p.deliveryReport && <ReportBanner r={p.deliveryReport} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
        <div className="space-y-3">
          {p.orders.map((o, idx) => {
            const d = drafts[o.id];
            if (o.settled || !d) {
              return (
                <section key={o.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{partyName(o.customer)}</span>
                    <span className="block text-[0.75rem] text-slate-500">{o.saleNumber} · cash {rs(o.cashCollected)}{o.returnsValue ? ` · wapas ${rs(o.returnsValue)}` : ''}</span>
                  </span>
                  {o.deliveryStatus && <Pill tone={OUTCOME[o.deliveryStatus].tone}>{OUTCOME[o.deliveryStatus].label}</Pill>}
                </section>
              );
            }
            const ret = returnsOf(o, d);
            const due = dueOf(o, d);
            return (
              <section key={o.id} className={cn('rounded-2xl bg-white shadow-sm ring-1', errors[o.id] ? 'ring-rose-300' : 'ring-slate-200/80')}>
                <div className="flex flex-wrap items-start gap-3 px-4 pt-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.75rem] font-bold text-slate-600">{idx + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{partyName(o.customer)}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{o.saleNumber} · {o.orderNumber}{partySub(o.customer) ? ` · ${partySub(o.customer)}` : ''}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{rs(o.total)}</span>
                    {ret > 0 && <span className="block text-[0.75rem] text-rose-600">wapas −{rs(ret)}</span>}
                  </span>
                </div>
                {errors[o.id] && <div className="px-4 pt-2"><Alert tone="danger" icon={<AlertTriangle className="h-4 w-4" />}>{errors[o.id]}</Alert></div>}
                {o.report ? (
                  <div className={cn('mx-4 mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-1.5 text-[0.75rem]', matchesReport(o, d) ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800')}>
                    <Smartphone className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <b>Phone report:</b> {OUTCOME[o.report.outcome].label}
                      {o.report.cashCollected > 0 && <> · {METHOD_LABEL[o.report.method]} {rs(o.report.cashCollected)}</>}
                      {o.report.returnReason && <> · {o.report.returnReason}</>}
                      {o.report.note && <> · “{o.report.note}”</>}
                    </span>
                    {matchesReport(o, d) ? <span className="font-semibold">Report ke mutabiq</span> : (
                      <button type="button" onClick={() => set(o.id, draftFor(o))} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                        <RotateCcw className="h-3 w-3" /> Aap ne badla — report wala lagayein
                      </button>
                    )}
                  </div>
                ) : p.deliveryReport ? (
                  <p className="mx-4 mt-2.5 rounded-xl bg-slate-50 px-3 py-1.5 text-[0.75rem] text-slate-500">Is invoice ki phone report nahi aayi — khud bharein</p>
                ) : null}
                <div className="flex flex-wrap items-end gap-3 px-4 py-3">
                  <div role="radiogroup" aria-label="Delivery" className="inline-flex rounded-xl bg-slate-100 p-1">
                    {(['DELIVERED', 'PARTIAL', 'RETURNED'] as DeliveryOutcome[]).map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={d.outcome === k}
                        onClick={() => set(o.id, { outcome: k, open: k === 'PARTIAL', ...(k === 'RETURNED' ? { cash: '' } : {}) })}
                        className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-semibold transition', d.outcome === k
                          ? k === 'DELIVERED' ? 'bg-success-600 text-white shadow' : k === 'PARTIAL' ? 'bg-teal-600 text-white shadow' : 'bg-rose-600 text-white shadow'
                          : 'text-slate-600 hover:bg-white')}>
                        {OUTCOME[k].label}
                      </button>
                    ))}
                  </div>
                  {d.outcome !== 'RETURNED' && (
                    <div className="flex items-end gap-2">
                      <label className="block">
                        <span className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Cash mila</span>
                        <span className="flex">
                          <input inputMode="decimal" value={d.cash} placeholder="0" onChange={(e) => set(o.id, { cash: e.target.value.replace(/[^\d.]/g, '') })}
                            className="h-9 w-28 rounded-l-lg border border-slate-200 bg-white px-2 text-right text-[0.875rem] font-semibold tabular-nums outline-none focus:border-brand-500" />
                          <button type="button" onClick={() => set(o.id, { cash: String(due) })} title="Poora amount"
                            className="h-9 rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 px-2 text-[0.75rem] font-semibold text-slate-600 hover:bg-slate-100">Poora</button>
                        </span>
                      </label>
                      <select aria-label="Tareeqa" value={d.method} onChange={(e) => set(o.id, { method: e.target.value as MoneyMethod })}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] outline-none focus:border-brand-500">
                        {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
                      </select>
                    </div>
                  )}
                  {d.outcome !== 'DELIVERED' && (
                    <select aria-label="Wapsi ki wajah" value={d.reason} onChange={(e) => set(o.id, { reason: e.target.value })}
                      className="h-9 min-w-[10rem] flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] outline-none focus:border-brand-500 sm:flex-none">
                      <option value="">Wajah chunein</option>
                      {d.reason && !RETURN_REASONS.includes(d.reason) && <option value={d.reason}>{d.reason}</option>}
                      {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                  <span className="ml-auto text-right text-[0.75rem] text-slate-500">Khata me jayega<br /><b className="text-[0.875rem] text-slate-900">{rs(Math.max(0, due - (d.outcome === 'RETURNED' ? 0 : num(d.cash))))}</b></span>
                </div>
                {d.outcome === 'PARTIAL' && (
                  <div className="border-t border-slate-100">
                    <button type="button" onClick={() => set(o.id, { open: !d.open })} className="flex w-full items-center gap-1 px-4 py-2 text-[0.75rem] font-semibold text-slate-600 hover:bg-slate-50">
                      {d.open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Kya wapas aaya (pcs me)
                    </button>
                    {d.open && (
                      <div className="overflow-x-auto px-4 pb-3">
                        <table className="w-full min-w-[27rem] text-[0.8125rem]">
                          <thead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                            <tr><th className="py-1.5">Product</th><th className="py-1.5 text-right">Gaya</th><th className="w-20 py-1.5 text-right">Wapas pcs</th><th className="w-20 py-1.5 text-right">Free wapas</th><th className="w-14 py-1.5 text-center">Kharab</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {o.items.map((i) => {
                              const l = d.lines[i.id] ?? { ret: '', freeRet: '', damaged: false };
                              const over = num(l.ret) > i.baseQty;
                              return (
                                <tr key={i.id}>
                                  <td className="py-1.5 pr-2"><div className="font-semibold text-slate-900">{i.productName}</div>{num(l.ret) > 0 && <div className="text-[0.6875rem] text-rose-600">−{rs(Math.min(num(l.ret), i.baseQty) * i.netPerBase)}</div>}</td>
                                  <td className="py-1.5 text-right tabular-nums text-slate-600">{packText(i.baseQty, i.conversionRate, i.unitName, i.baseUnit)}
                                    {i.freeBaseQty > 0 && <div className="flex items-center justify-end gap-0.5 text-[0.6875rem] text-violet-700"><Gift className="h-3 w-3" />+{trim(i.freeBaseQty)} free</div>}</td>
                                  <td className="py-1.5 pl-2"><input inputMode="decimal" value={l.ret} placeholder="0" aria-label={`${i.productName} wapas`} onChange={(e) => setLine(o.id, i.id, { ret: e.target.value.replace(/[^\d.]/g, '') })}
                                    className={cn('h-8 w-full rounded-lg border bg-white px-2 text-right tabular-nums outline-none focus:border-brand-500', over ? 'border-rose-400' : 'border-slate-200')} /></td>
                                  <td className="py-1.5 pl-2">{i.freeBaseQty > 0 ? <input inputMode="decimal" value={l.freeRet} placeholder="0" aria-label={`${i.productName} free wapas`} onChange={(e) => setLine(o.id, i.id, { freeRet: e.target.value.replace(/[^\d.]/g, '') })}
                                    className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-right tabular-nums outline-none focus:border-brand-500" /> : <span className="block text-right text-slate-300">—</span>}</td>
                                  <td className="py-1.5 text-center"><Checkbox aria-label={`${i.productName} kharab`} checked={l.damaged} onChange={(e) => setLine(o.id, i.id, { damaged: e.target.checked })} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <p className="mt-1.5 text-[0.6875rem] text-slate-500">Kharab maal stock me wapas nahi jata. Baqi wapsi godown ke stock me jati hai.</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Panel title={<span className="inline-flex items-center gap-1.5"><HandCoins className="h-4 w-4 text-success-600" />Recovery (purana udhaar)</span>} sub="Trip me purane bills ka paisa mila ho to"
            right={<Button size="sm" variant="ghost" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setRecoveries((r) => [...r, { key: Math.random().toString(36).slice(2), customerId: customers[0]?.[0] ?? '', amount: '', method: 'CASH' }])}>Jorein</Button>}>
            {pendingCollections.length > 0 && (
              <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-800">{pendingCollections.length} recovery phone se aayi, verify baqi ({rs(pendingCollections.reduce((a, c) => a + c.amount, 0))})</p>
            )}
            {!recoveries.length ? <p className="text-[0.8125rem] text-slate-500">Koi recovery nahi likhi.</p> : (
              <ul className="space-y-2">
                {recoveries.map((r) => (
                  <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-1.5">
                    <select aria-label="Customer" value={r.customerId} onChange={(e) => setRecoveries((l) => l.map((x) => (x.key === r.key ? { ...x, customerId: e.target.value } : x)))}
                      className="col-span-3 h-9 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] outline-none focus:border-brand-500">
                      {customers.map(([cid, name]) => <option key={cid} value={cid}>{name}</option>)}
                    </select>
                    <input inputMode="decimal" aria-label="Amount" placeholder="Amount" value={r.amount} onChange={(e) => setRecoveries((l) => l.map((x) => (x.key === r.key ? { ...x, amount: e.target.value.replace(/[^\d.]/g, '') } : x)))}
                      className="col-span-1 h-9 rounded-lg border border-slate-200 bg-white px-2 text-right tabular-nums outline-none focus:border-brand-500" />
                    <select aria-label="Tareeqa" value={r.method} onChange={(e) => setRecoveries((l) => l.map((x) => (x.key === r.key ? { ...x, method: e.target.value as MoneyMethod } : x)))}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] outline-none focus:border-brand-500">
                      {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
                    </select>
                    <button type="button" aria-label="Hatayein" onClick={() => setRecoveries((l) => l.filter((x) => x.key !== r.key))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            {canVerify && (recoveries.length > 0 || pendingCollections.length > 0) && (
              <label className="mt-3 flex items-start gap-2 text-[0.8125rem] text-slate-700">
                <Checkbox checked={verifyNow} onChange={(e) => setVerifyNow(e.target.checked)} />
                <span>Abhi verify karein — seedha khata me jaye</span>
              </label>
            )}
          </Panel>

          <Panel title={<span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4 text-brand-600" />Cash ka hisaab</span>}>
            <dl className="space-y-1.5 text-[0.8125rem]">
              {(p.money.invoiceCollected > 0 || p.money.recoveries > 0) && <Row label="Pehle se likha (phone recovery waghera)" value={rs(p.money.expectedCash)} />}
              <Row label="Abhi likha cash" value={rs(newCash)} />
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-[0.9375rem] font-bold text-slate-900"><dt>Expected</dt><dd className="tabular-nums">{rs(expected)}</dd></div>
            </dl>
            <label className="mt-3 block">
              <span className="mb-1 block text-[0.75rem] font-semibold text-slate-600">Delivery wale ne jama karaya</span>
              <input inputMode="decimal" value={handedIn} placeholder={String(expected)} onChange={(e) => setHandedIn(e.target.value.replace(/[^\d.]/g, ''))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-[1.125rem] font-bold tabular-nums outline-none focus:border-brand-500" />
            </label>
            {diff != null && (
              <div className={cn('mt-2 rounded-xl px-3 py-2 text-center text-[0.875rem] font-semibold', diff > 0 ? 'bg-rose-50 text-rose-700' : diff < 0 ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-700')}>
                {diff > 0 ? `${rs(diff)} kam hai` : diff < 0 ? `${rs(-diff)} zyada hai` : 'Poora — koi farq nahi'}
              </div>
            )}
            <Button fullWidth className="mt-3" size="lg" variant="success" loading={settle.isPending} disabled={!pending.length && handed == null}
              leftIcon={<CheckCircle2 className="h-5 w-5" />} onClick={() => settle.mutate()}>
              {handed == null ? 'Invoices settle karein' : 'Finish — sheet band karein'}
            </Button>
            <p className="mt-2 text-[0.6875rem] text-slate-500">Wapsi bill se hoti hai aur khata kam karti hai. Cash usi waqt khata me jama hota hai. Sheet tab band hoti hai jab sab invoices settle hon aur jama cash likha ho.</p>
          </Panel>
          <p className="hidden items-center justify-center gap-1 text-[0.75rem] text-slate-400 xl:flex"><Kbd>Tab</Kbd> agla khana</p>
        </aside>
      </div>
    </PageShell>
  );
}

function ReportBanner({ r }: { r: DeliveryReportSummary }) {
  const when = new Date(r.lastReportedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
  const parts = [
    r.delivered ? `${r.delivered} poora deliver` : null,
    r.partial ? `${r.partial} kuch wapas` : null,
    r.returned ? `${r.returned} sab wapas` : null,
  ].filter(Boolean).join(' · ');
  return (
    <section className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-200/80">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white"><Smartphone className="h-[1.125rem] w-[1.125rem]" /></span>
        <div className="min-w-0 flex-1 basis-[14rem]">
          <h2 className="text-[0.9375rem] font-semibold text-sky-950">Delivery wale ki report</h2>
          <p className="text-[0.8125rem] text-sky-900/80">
            {r.reportedByName ?? 'Delivery wala'} ne phone se {r.reported}/{r.invoices} invoices ki report bheji · {when}
            {parts && <> · {parts}</>}
          </p>
        </div>
        <div className="basis-full pl-12 sm:basis-auto sm:pl-0 sm:text-right">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-sky-700">Cash bataya</div>
          <div className="text-[1.0625rem] font-bold tabular-nums text-sky-950">{rs(r.cash)}</div>
          {r.otherMoney > 0 && <div className="text-[0.6875rem] text-sky-800">+ {rs(r.otherMoney)} bank / wallet</div>}
        </div>
      </div>
      <p className="mt-2 text-[0.75rem] text-sky-900/70">Neeche har invoice isi report se bhari hai. Maal aur cash gin kar check karein, jo ghalat ho badlein, phir Finish. Cash yahin ek baar ginti hota hai.</p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-slate-600"><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>;
}
