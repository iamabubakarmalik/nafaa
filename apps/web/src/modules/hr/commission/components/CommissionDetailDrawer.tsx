/**
 * One person's commission statement in a side panel: how each rule worked
 * out (with returns taken back), targets, the rules that apply, goods by
 * product and category, the bills, the returns and the last six months.
 * Prints as an A4 statement or a signed slip, and records payments.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { HandCoins, Printer, ReceiptText, RotateCcw, Target, Undo2, X } from 'lucide-react';
import { Avatar, Button, IconButton, Segmented, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { CommissionDetail } from '../api/commission.api';
import { useCommissionDetail } from '../hooks/useCommission';
import { PAY, day, dayTime, periodLabel, qtyText, rateText, signed } from './meta';
import { lineBase, returnText, statementDoc } from './print';
import { StatementPrintModal } from './StatementPrintModal';

type Tab = 'hisab' | 'goods' | 'bills' | 'returns' | 'months';

export function CommissionDetailDrawer({ userId, name, period, canManage, costHidden, busy, onPay, onUndo, onClose }: {
  userId: string;
  name: string;
  period: string;
  canManage: boolean;
  costHidden: boolean;
  busy: boolean;
  onPay: (d: CommissionDetail) => void;
  onUndo: (d: CommissionDetail) => void;
  onClose: () => void;
}) {
  const q = useCommissionDetail(userId, period);
  const d = q.data;
  const [tab, setTab] = useState<Tab>('hisab');
  const [slip, setSlip] = useState(false);
  const showCost = !costHidden && d?.profit != null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !slip) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, slip]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={name}
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={name} size={44} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">{name}</h2>
              <p className="truncate text-[0.8125rem] text-slate-500">
                {periodLabel(period)}{d?.staff?.designation ? ` · ${d.staff.designation}` : ''}{d && !d.enrolled ? ' · commission chaalu nahi' : ''}
              </p>
            </div>
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </header>

        {!d ? (
          <div className="space-y-3 p-5">
            {q.isError
              ? <div className="py-14 text-center"><p className="font-semibold text-slate-900">Hisab load nahi hua</p><Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button></div>
              : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : (<>
          <div className="grid grid-cols-3 gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
            <Fig label="Commission" value={signed(d.earned)} tone="text-brand-700" />
            <Fig label={d.paidAmount != null ? `Ada · ${day(d.paidAt)}` : 'Ada'} value={d.paidAmount != null ? formatPKR(d.paidAmount) : '—'} />
            <Fig label="Baqi" value={formatPKR(d.due)} tone={d.due > 0 ? 'text-amber-700' : undefined} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', PAY[d.payStatus].tone)}>
              {(() => { const I = PAY[d.payStatus].icon; return <I className="h-3 w-3" />; })()}{PAY[d.payStatus].label}
            </span>
            <span className="flex-1" />
            <PrintButton size="sm" label="Statement" doc={() => statementDoc(d, showCost)} />
            <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => setSlip(true)}>Slip</Button>
            {d.paidInSalary && <span className="text-[0.75rem] text-slate-500">Tankhwah ke saath ada hui</span>}
            {canManage && d.paidAmount != null && !d.paidInSalary && (
              <Button size="sm" variant="ghost" leftIcon={<Undo2 className="h-4 w-4" />} disabled={busy} onClick={() => onUndo(d)}>Payment wapas</Button>
            )}
            {canManage && d.enrolled && d.due > 0 && !d.paidInSalary && (
              <Button size="sm" leftIcon={<HandCoins className="h-4 w-4" />} disabled={busy} onClick={() => onPay(d)}>Ada karein</Button>
            )}
          </div>

          <div className="border-b border-slate-100 px-4 py-2 sm:px-5">
            <Segmented label="Hissa" value={tab} onChange={(v) => setTab(v as Tab)} className="max-w-full overflow-x-auto"
              items={[
                { value: 'hisab', label: 'Hisab' }, { value: 'goods', label: 'Cheezein' }, { value: 'bills', label: `Bill (${d.billCount})` },
                { value: 'returns', label: `Return (${d.returnList.length})` }, { value: 'months', label: 'Mahine' },
              ]} />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {tab === 'hisab' && <Working d={d} showCost={showCost} />}
            {tab === 'goods' && <Goods d={d} />}
            {tab === 'bills' && <Bills d={d} showCost={showCost} />}
            {tab === 'returns' && <Returns d={d} />}
            {tab === 'months' && <Months d={d} />}
          </div>
        </>)}
      </aside>
      {slip && d && <StatementPrintModal d={d} onClose={() => setSlip(false)} />}
    </div>,
    document.body,
  );
}

function Fig({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[0.6875rem] text-slate-500">{label}</p>
      <p className={cn('truncate text-lg font-bold tabular-nums text-slate-900', tone)}>{value}</p>
    </div>
  );
}

function Working({ d, showCost }: { d: CommissionDetail; showCost: boolean }) {
  return (<>
    <section className="rounded-2xl ring-1 ring-slate-200">
      <dl className="divide-y divide-slate-100 text-sm">
        <Row k="Sale (discount ke baad)" v={formatPKR(d.grossSale)} hint={`${d.bills} bill${d.reassigned ? ` · ${d.reassigned} counter par kisi aur ne banaye` : ''}`} />
        {d.returnSale > 0 && <Row k="Is mahine wapas aaya maal" v={`−${formatPKR(d.returnSale)}`} hint="Return us mahine me katti hai jis me maal wapas aaya" tone="text-rose-700" />}
        <Row k="Asal sale" v={formatPKR(d.sale)} strong />
        {showCost && <Row k="Profit" v={formatPKR(d.profit ?? 0)} hint={d.noCost ? `${d.noCost} line par cost nahi thi — aaj ki cost lagi` : undefined} />}
      </dl>
    </section>

    <section>
      <h3 className="mb-2 text-[0.8125rem] font-semibold text-slate-700">Commission kaise bani</h3>
      {!d.enrolled ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">Is bande par commission chaalu nahi — Team tab se chaalu karein.</p>
      ) : !d.lines.length ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {d.blockedByMin ? `Abhi ${formatPKR(d.blockedByMin.short)} aur sale chahiye — tab commission shuru hogi (hadd ${formatPKR(d.blockedByMin.need)})` : 'Is mahine koi commission nahi bani'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
          {d.lines.map((l, i) => (
            <li key={`${l.ruleId}-${i}`} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{l.label}</p>
                <p className="text-[0.75rem] text-slate-500">{lineBase(l)}{l.returnAmount ? ` · ${returnText(l)}: −${formatPKR(l.returnAmount)}` : ''}</p>
              </div>
              <p className={cn('shrink-0 font-semibold tabular-nums', l.amount < 0 ? 'text-rose-700' : 'text-slate-900')}>{signed(l.amount)}</p>
            </li>
          ))}
          <li className="flex justify-between bg-slate-50 px-4 py-2.5 font-bold text-slate-900"><span>Kul</span><span className="tabular-nums">{signed(d.earned)}</span></li>
        </ul>
      )}
      {d.earned < 0 && <p className="mt-2 text-xs text-rose-700">Is mahine return sale se zyada thi, is liye commission minus me hai. Agle mahine ki payment me hisab kar lein.</p>}
      {d.blockedByMin && d.lines.length > 0 && <p className="mt-2 text-xs text-slate-500">Agla slab: {formatPKR(d.blockedByMin.short)} aur sale par (hadd {formatPKR(d.blockedByMin.need)})</p>}
    </section>

    {d.targets.length > 0 && (
      <section className="space-y-2">
        <h3 className="text-[0.8125rem] font-semibold text-slate-700">Target</h3>
        {d.targets.map((t) => (
          <div key={t.ruleId} className="rounded-2xl px-4 py-3 ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 text-slate-700"><Target className="h-4 w-4 text-brand-600" />{formatPKR(t.amount)} → bonus {formatPKR(t.bonus)}</span>
              <span className={cn('font-semibold tabular-nums', t.reached ? 'text-success-700' : 'text-slate-900')}>{Math.round(t.pct)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', t.reached ? 'bg-success-500' : 'bg-brand-500')} style={{ width: `${Math.min(100, t.pct)}%` }} /></div>
            {!t.reached && <p className="mt-1 text-[0.6875rem] text-slate-500">{formatPKR(Math.max(0, t.amount - d.sale))} aur sale chahiye</p>}
          </div>
        ))}
      </section>
    )}

    <section>
      <h3 className="mb-2 text-[0.8125rem] font-semibold text-slate-700">Is bande par kaunse rule lagte hain</h3>
      {!d.rules.length ? <p className="text-sm text-slate-500">Koi chaalu rule nahi.</p> : (
        <ul className="space-y-1.5">
          {d.rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-200">
              <span className="font-medium text-slate-900">{r.label}</span>
              <span className="text-slate-600">{rateText(r)}</span>
              <span className="text-[0.6875rem] text-slate-500">{r.own ? 'sirf is ka' : 'sab ke liye'}{r.categoryIds.length ? ` · ${r.categoryIds.length} category` : ''}{r.minMonthlySale ? ` · hadd ${formatPKR(r.minMonthlySale)}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
      {d.rules.some((r) => r.own) && <p className="mt-1.5 text-[0.6875rem] text-slate-500">Is bande ka apna rule hai, is liye "sab ke liye" wale rule is par nahi lagte.</p>}
      <p className="mt-1.5 text-[0.6875rem] text-slate-500">Sale yaani discount ke baad maal ki qeemat; service charge shamil nahi. Void bill shamil nahi.</p>
    </section>
  </>);
}

function Row({ k, v, hint, strong, tone }: { k: string; v: string; hint?: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0"><dt className={cn('text-slate-700', strong && 'font-semibold text-slate-900')}>{k}</dt>{hint && <p className="text-[0.6875rem] text-slate-500">{hint}</p>}</div>
      <dd className={cn('shrink-0 tabular-nums', strong ? 'font-bold text-slate-900' : 'text-slate-900', tone)}>{v}</dd>
    </div>
  );
}

function Goods({ d }: { d: CommissionDetail }) {
  const [view, setView] = useState<'product' | 'category'>('product');
  if (!d.byProduct.length) return <Empty text="Is mahine koi cheez nahi biki" />;
  return (<>
    <Segmented label="Kis tarah" value={view} onChange={(v) => setView(v as 'product' | 'category')} items={[{ value: 'product', label: 'Cheez' }, { value: 'category', label: 'Category' }]} />
    <Table minWidth="32rem" className="rounded-2xl ring-1 ring-slate-200 [&_table]:text-[0.8125rem]">
      <THead><Tr>
        <Th className="px-3 py-2">{view === 'product' ? 'Cheez' : 'Category'}</Th>
        <Th className="px-3 py-2 text-right">Quantity</Th>
        <Th className="px-3 py-2 text-right">Sale</Th>
        <Th className="px-3 py-2 text-right">Wapas</Th>
        <Th className="px-3 py-2 text-right">Commission</Th>
      </Tr></THead>
      <TBody>
        {view === 'product' ? d.byProduct.map((p) => (
          <Tr key={p.productId}>
            <Td className="max-w-[14rem] px-3 py-2"><p className="truncate font-medium text-slate-900">{p.name}</p><p className="truncate text-[0.6875rem] text-slate-500">{p.categoryName ?? 'Bina category'}</p></Td>
            <Td className="px-3 py-2 text-right tabular-nums">{qtyText(p.qty)} {p.unit}</Td>
            <Td className="px-3 py-2 text-right tabular-nums">{formatPKR(p.sale)}</Td>
            <Td className="px-3 py-2 text-right tabular-nums text-rose-700">{p.returnedSale ? `−${formatPKR(p.returnedSale)}` : '—'}</Td>
            <Td className="px-3 py-2 text-right font-semibold tabular-nums">{signed(p.commission)}</Td>
          </Tr>
        )) : d.byCategory.map((c) => (
          <Tr key={c.categoryId ?? 'none'}>
            <Td className="px-3 py-2 font-medium text-slate-900">{c.name} <span className="text-[0.6875rem] font-normal text-slate-500">{c.items} cheezein</span></Td>
            <Td className="px-3 py-2 text-right tabular-nums">{qtyText(c.qty)}</Td>
            <Td className="px-3 py-2 text-right tabular-nums">{formatPKR(c.sale)}</Td>
            <Td className="px-3 py-2 text-right tabular-nums text-rose-700">{c.returnedSale ? `−${formatPKR(c.returnedSale)}` : '—'}</Td>
            <Td className="px-3 py-2 text-right font-semibold tabular-nums">{signed(c.commission)}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
    <p className="text-[0.6875rem] text-slate-500">Har bill aur target wali amount kisi ek cheez par nahi lagti, is liye yahan shamil nahi.</p>
  </>);
}

function Bills({ d, showCost }: { d: CommissionDetail; showCost: boolean }) {
  if (!d.billList.length) return <Empty text="Is mahine koi bill nahi" />;
  return (<>
    <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
      {d.billList.map((b) => (
        <li key={b.id} className="flex items-center gap-3 px-3 py-2.5 text-[0.8125rem]">
          <ReceiptText className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900"><span className="font-mono">{b.saleNumber}</span>{b.customer ? ` · ${b.customer}` : ''}</p>
            <p className="truncate text-[0.6875rem] text-slate-500">
              {dayTime(b.soldAt)}{b.shop ? ` · ${b.shop}` : ''}{b.cashier ? ` · bill ${b.cashier} ne banaya` : ''}
              {b.status === 'PARTIALLY_RETURNED' ? ' · kuch wapas' : b.status === 'FULLY_RETURNED' ? ' · poora wapas' : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums text-slate-900">{formatPKR(b.goods)}</p>
            {showCost && b.profit != null && <p className="text-[0.6875rem] tabular-nums text-slate-500">profit {formatPKR(b.profit)}</p>}
          </div>
        </li>
      ))}
    </ul>
    {d.billCount > d.billList.length && <p className="text-center text-[0.75rem] text-slate-500">Pehle {d.billList.length} bill dikhaye — kul {d.billCount}</p>}
  </>);
}

function Returns({ d }: { d: CommissionDetail }) {
  if (!d.returnList.length) return <Empty text="Is mahine is bande ke beche maal ki koi return nahi" />;
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
      {d.returnList.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 text-[0.8125rem]">
          <RotateCcw className="h-4 w-4 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900"><span className="font-mono">{r.returnNumber}</span> · bill {r.saleNumber}</p>
            <p className="truncate text-[0.6875rem] text-slate-500">Wapas {dayTime(r.returnedAt)} · becha tha {day(r.soldAt)} · {r.items} cheezein</p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums text-rose-700">−{formatPKR(r.value)}</p>
        </li>
      ))}
    </ul>
  );
}

function Months({ d }: { d: CommissionDetail }) {
  const theme = useChartTheme();
  const data = d.history.map((h) => ({ ...h, label: periodLabel(h.period, true), paidN: h.paid ?? 0 }));
  return (<>
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
          <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
          <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'earned' ? 'Commission' : 'Ada']} {...theme.tooltip} />
          <Bar dataKey="earned" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="paidN" fill={theme.profit} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
      {[...d.history].reverse().map((h) => (
        <li key={h.period} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
          <div><p className="font-medium text-slate-900">{periodLabel(h.period)}</p><p className="text-[0.6875rem] text-slate-500">{h.bills} bill · {formatPKR(h.sale)}</p></div>
          <div className="text-right">
            <p className="font-semibold tabular-nums">{signed(h.earned)}</p>
            <p className={cn('text-[0.6875rem]', h.payStatus === 'over' ? 'text-rose-700' : 'text-slate-500')}>{h.paid != null ? `Ada ${formatPKR(h.paid)}` : PAY[h.payStatus].label}</p>
          </div>
        </li>
      ))}
    </ul>
  </>);
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">{text}</p>;
}
