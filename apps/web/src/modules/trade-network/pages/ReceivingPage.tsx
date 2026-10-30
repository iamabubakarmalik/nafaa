/**
 * Goods delivered by network suppliers, waiting to go into stock. Each
 * order shows what actually arrived (returns already taken out) at the
 * invoice's net cost; items not yet matched to the shop's own products are
 * matched once (or made as new products) and remembered. "Maal mil gaya"
 * receives the draft purchase into stock.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Link2, PackageCheck, PackagePlus, RefreshCw, Search } from 'lucide-react';
import { Alert, Button, PageHero, PageShell, Skeleton, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { Empty, Pill } from '@modules/distribution/components/parts';
import { useMoney } from '@modules/distribution/hooks/useDistribution';
import { dayTime } from '@modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type MapChoice, type Receiving } from '../api/trade.api';
import { ORDER_STATUS } from '../lib/meta';
import { BizAvatar } from '../components/shared';

type Waiting = Receiving['waiting'][number];

export default function ReceivingPage() {
  const qc = useQueryClient();
  const money = useMoney();
  const [params] = useSearchParams();
  const focus = params.get('id');
  const q = useQuery({ queryKey: [TRADE_KEY, 'receiving'], queryFn: tradeApi.receiving, refetchInterval: 60_000 });
  const waiting = q.data?.waiting ?? [];
  const value = waiting.reduce((s, w) => s + (w.deliveredValue ?? 0), 0);

  return (
    <PageShell>
      <PageHero
        back="/network" backLabel="Suppliers"
        title="Receive goods"
        chip={<><PackageCheck /> Receiving</>}
        meta="Supplier ne jo deliver kiya woh yahan Purchase ban kar aata hai — check karein aur stock me daalein"
        busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        actions={<button type="button" onClick={() => qc.invalidateQueries({ queryKey: [TRADE_KEY] })} className={heroIconButton} aria-label="Taaza karein"><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>}
        stats={[{ label: 'Receive baqi', value: String(waiting.length) }, { label: 'Maal ki qeemat', value: money(value) }]}
      />
      {q.isLoading ? <Skeleton className="h-64 rounded-3xl" />
        : !waiting.length ? (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <Empty icon={<CheckCircle2 className="h-5 w-5" />} text="Sab maal receive ho chuka. Supplier deliver karega to yahan aa jayega." action={<Link to="/network/orders"><Button variant="secondary">Supplier orders</Button></Link>} />
          </section>
        ) : <div className="space-y-4">{waiting.map((w) => <WaitingCard key={w.id} w={w} focus={focus === w.id} />)}</div>}

      {(q.data?.recent.length ?? 0) > 0 && (
        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <h2 className="px-4 pt-4 text-[0.8125rem] font-semibold text-slate-500 sm:px-5">Haal hi me receive hua</h2>
          <ul className="divide-y divide-slate-100">
            {q.data!.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                <CheckCircle2 className="h-4 w-4 text-success-600" />
                <span className="min-w-0 flex-1 truncate"><b>{r.seller?.name}</b> · {r.orderNumber} · {r.invoiceNumber}</span>
                <span className="text-slate-500">{dayTime(r.receivedAt)}</span>
                <span className="font-semibold tabular-nums">{money(r.deliveredValue ?? 0)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}

function WaitingCard({ w, focus }: { w: Waiting; focus: boolean }) {
  const qc = useQueryClient();
  const money = useMoney();
  const canReceive = usePermission(PERMISSIONS.TRADE_RECEIVE);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (focus) ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [focus]);
  const unmatched = w.lines.filter((l) => !l.mine);
  const [choices, setChoices] = useState<Record<string, MapChoice>>({});
  const keyOf = (l: { sellerProductId: string; sellerVariantId: string | null }) => `${l.sellerProductId}|${l.sellerVariantId ?? ''}`;
  const pending = unmatched.filter((l) => !choices[keyOf(l)]);
  const receive = useMutation({
    mutationFn: () => tradeApi.receive(w.id, Object.values(choices)),
    onSuccess: (r) => {
      toast.success(r.state === 'RECEIVED' ? 'Maal stock me aa gaya — Purchase receive ho gayi' : 'Save ho gaya');
      qc.invalidateQueries({ queryKey: [TRADE_KEY] });
    },
    onError: (e) => toast.error(tradeError(e)),
  });
  const free = w.lines.filter((l) => l.free);

  return (
    <section ref={ref} className={cn('rounded-3xl bg-white shadow-sm ring-1', focus ? 'ring-2 ring-brand-500' : 'ring-slate-200/80')}>
      <header className="flex flex-wrap items-start gap-3 px-4 pt-4 sm:px-5">
        <BizAvatar card={w.seller} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[0.9375rem] font-semibold text-slate-900">{w.seller?.name}</h2>
          <div className="text-[0.75rem] text-slate-500">Order {w.orderNumber} · Invoice {w.invoiceNumber ?? '—'} · {dayTime(w.deliveredAt)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={ORDER_STATUS[w.status].tone}>{ORDER_STATUS[w.status].label}</Pill>
          {w.purchase && <Pill tone="slate">{w.purchase.purchaseNumber}</Pill>}
        </div>
      </header>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-[0.8125rem]">
          <thead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-2 sm:px-5">Supplier ka item</th><th className="px-3 py-2 text-right">Aaya</th><th className="px-3 py-2 text-right">Cost</th><th className="px-4 py-2 sm:px-5">Aap ka product</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {w.lines.map((l, i) => (
              <tr key={i} className={cn(!l.mine && !choices[keyOf(l)] && 'bg-amber-50/50')}>
                <td className="px-4 py-2.5 sm:px-5">
                  <div className="font-semibold text-slate-900">{l.name}{l.free && <span className="ml-1.5 rounded bg-success-50 px-1.5 py-0.5 text-[0.625rem] font-bold text-success-700">FREE</span>}</div>
                  <div className="text-[0.6875rem] text-slate-500">{[l.sku, l.barcode].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{l.baseQty} {l.baseUnit}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{l.free ? 'Rs 0' : money(l.unitCost)}<div className="text-[0.6875rem] text-slate-500">{money(l.value)}</div></td>
                <td className="px-4 py-2.5 sm:px-5">
                  {l.mine
                    ? <span className="inline-flex items-center gap-1.5 text-slate-700"><Link2 className="h-3.5 w-3.5 text-success-600" />{l.mine.name}<span className="text-[0.6875rem] text-slate-400">({l.mine.matchedBy === 'CREATED' ? 'naya' : l.mine.matchedBy.toLowerCase()})</span></span>
                    : <MatchPicker line={l} value={choices[keyOf(l)]} onChange={(c) => setChoices((p) => { const n = { ...p }; if (c) n[keyOf(l)] = c; else delete n[keyOf(l)]; return n; })} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1 text-[0.8125rem] text-slate-600">
          Purchase: <b className="tabular-nums text-slate-900">{money(w.deliveredValue ?? 0)}</b>
          {w.returnsValue > 0 && <> · wapas gaya {money(w.returnsValue)}</>}
          {free.length > 0 && <> · {free.length} free item (Rs 0 cost)</>}
        </div>
        {pending.length > 0 && <span className="text-[0.75rem] font-medium text-amber-700">{pending.length} item milana baqi</span>}
        {canReceive
          ? <Button leftIcon={<PackageCheck className="h-4 w-4" />} loading={receive.isPending} disabled={pending.length > 0} onClick={() => receive.mutate()}>Mark received</Button>
          : <span className="text-[0.75rem] text-slate-500">Receive ki permission nahi</span>}
      </footer>
      {unmatched.length > 0 && <div className="px-4 pb-4 sm:px-5"><Alert tone="info">Naye items ek dafa apne product se milayein — agli dafa Nafaa khud pehchan lega.</Alert></div>}
    </section>
  );
}

function MatchPicker({ line, value, onChange }: { line: Waiting['lines'][number]; value?: MapChoice; onChange: (c: MapChoice | null) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const term = search.trim();
  const q = useQuery({ queryKey: [TRADE_KEY, 'my-products', term], queryFn: () => tradeApi.myProducts(term), enabled: open && term.length >= 2, staleTime: 30_000 });
  const label = useMemo(() => (value?.create ? 'Naya product banega' : value?.buyerProductId ? q.data?.find((p) => p.id === value.buyerProductId)?.name ?? 'Chuna hua' : null), [value, q.data]);
  if (value) {
    return (
      <span className="inline-flex items-center gap-2">
        <Pill tone={value.create ? 'blue' : 'green'}>{label}</Pill>
        <button type="button" onClick={() => onChange(null)} className="text-[0.75rem] font-medium text-slate-500 hover:text-rose-600">Edit</button>
      </span>
    );
  }
  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <label className="relative min-w-[11rem] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Apna product dhoondein"
          className="h-8 w-full rounded-lg bg-white pl-8 pr-2 text-[0.8125rem] ring-1 ring-slate-200 outline-none focus:ring-brand-500" />
        {open && term.length >= 2 && (
          <ul className="absolute left-0 right-0 top-9 z-20 max-h-56 overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
            {(q.data ?? []).map((p) => (
              <li key={p.id}><button type="button" onClick={() => { onChange({ sellerProductId: line.sellerProductId, sellerVariantId: line.sellerVariantId, buyerProductId: p.id }); setOpen(false); }}
                className="block w-full px-3 py-1.5 text-left text-[0.8125rem] hover:bg-slate-50">{p.name}<span className="ml-1 text-[0.6875rem] text-slate-400">{p.sku ?? ''} · stock {p.stock}</span></button></li>
            ))}
            {q.data && !q.data.length && <li className="px-3 py-1.5 text-[0.75rem] text-slate-500">Kuch nahi mila</li>}
          </ul>
        )}
      </label>
      <Button size="xs" variant="secondary" leftIcon={<PackagePlus className="h-3.5 w-3.5" />} onClick={() => onChange({ sellerProductId: line.sellerProductId, sellerVariantId: line.sellerVariantId, create: true })}>New product</Button>
    </div>
  );
}
