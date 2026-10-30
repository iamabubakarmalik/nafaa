/**
 * Market returns: goods retailers hand back on the route (expired, damaged,
 * unsold). Bookers and van salesmen record them; the office approves them
 * once the goods reach the godown, which credits the khata (against the
 * customer's invoices first), restocks good goods and writes off the rest.
 *
 * Keys: N new · 1-3 tabs · A approve ticked.
 */

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Plus, RefreshCw, Trash2, Undo2, XCircle } from 'lucide-react';
import {
  Button, Checkbox, Input, Kbd, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen } from '@core/lib/shortcuts';
import { DIST_KEY, distError } from '../../api/distribution.api';
import {
  phase2Api, RETURN_CONDITION_LABEL, type ApproveResult, type MarketReturnLine, type MarketReturnStatus, type ReturnCondition,
} from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { BulkBar, Empty, Fact, Pill } from '../../components/parts';
import { useMoney } from '../../hooks/useDistribution';
import { dayTime, partyName, partySub, rs, trim, typingInField, type Tone } from '../../lib/meta';
import { CustomerSearch, ItemSearch, PackSelect, defaultPack, newKey, useCatalog, type PickedCustomer } from '../shared';

const KEY = [DIST_KEY, 'market-returns'] as const;
const TABS: Array<{ id: MarketReturnStatus; label: string }> = [
  { id: 'PENDING', label: 'Approve baqi' }, { id: 'APPROVED', label: 'Approved' }, { id: 'REJECTED', label: 'Reject' },
];
const CONDITION_TONE: Record<ReturnCondition, Tone> = { GOOD: 'green', DAMAGED: 'rose', EXPIRED: 'amber' };
const STATUS_TONE: Record<MarketReturnStatus, Tone> = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'slate' };

export default function MarketReturnsPage() {
  return <DistributionGate><Returns /></DistributionGate>;
}

function Returns() {
  const qc = useQueryClient();
  const money = useMoney();
  const canApprove = usePermission(PERMISSIONS.DISTRIBUTION_RETURNS_APPROVE);
  const canCollect = usePermission(PERMISSIONS.DISTRIBUTION_RETURNS_COLLECT);
  const [tab, setTab] = useState<MarketReturnStatus>('PENDING');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pinFor, setPinFor] = useState<string[] | null>(null);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  useEffect(() => { setPage(1); setPicked(new Set()); }, [tab]);

  const q = useQuery({ queryKey: [...KEY, tab, page], queryFn: () => phase2Api.returns({ status: tab, page, limit: 50 }), placeholderData: keepPreviousData });
  const counts = useQuery({ queryKey: [...KEY, 'counts'], queryFn: () => phase2Api.returns({ limit: 1 }) });
  const rows = q.data?.returns ?? [];
  const total = q.data?.total ?? 0;
  const totals = counts.data?.totals ?? {};

  const handle = (r: ApproveResult, ids: string[]) => {
    qc.invalidateQueries({ queryKey: KEY });
    if (r.approved) toast.success(`${r.approved} return approve — khata credit ho gaya`);
    if (r.needsPin) { setPinFor(r.results.filter((x) => x.needsPin).map((x) => x.id)); return; }
    const bad = r.results.filter((x) => !x.ok);
    if (bad.length) toast.error(`${bad[0].number ?? ''} ${bad[0].error ?? ''}`.trim());
    setPicked((p) => new Set([...p].filter((id) => !ids.includes(id))));
  };
  const approve = useMutation({
    mutationFn: ({ ids, pin }: { ids: string[]; pin?: string }) => phase2Api.approveReturns(ids, pin).then((r) => ({ r, ids })),
    onSuccess: ({ r, ids }) => handle(r, ids),
    onError: (e) => toast.error(distError(e, 'Approve nahi hua')),
  });
  const reject = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) => phase2Api.rejectReturns(ids, reason),
    onSuccess: (r) => { toast.success(`${r.rejected} reject`); setRejecting(null); setPicked(new Set()); qc.invalidateQueries({ queryKey: KEY }); },
    onError: (e) => toast.error(distError(e, 'Reject nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInField() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canCollect) { e.preventDefault(); setCreating(true); }
      else if (/^[1-3]$/.test(e.key)) setTab(TABS[Number(e.key) - 1].id);
      else if ((e.key === 'a' || e.key === 'A') && canApprove && picked.size && tab === 'PENDING') { e.preventDefault(); approve.mutate({ ids: [...picked] }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCollect, canApprove, picked, tab, approve]);

  const allOn = rows.length > 0 && rows.every((r) => picked.has(r.id));

  return (
    <PageShell>
      <PageHero
        back="/distribution" backLabel="Distribution"
        title="Market returns"
        chip={<><Undo2 /> Retailer se wapsi</>}
        meta="Expiry, kharab ya na bika maal — approve par khata credit, theek maal shelf par, kharab maal write-off"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => void q.refetch()} title="Refresh" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>
          {canCollect && <button type="button" onClick={() => setCreating(true)} title="New return (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">New return</span></button>}
        </>}
        stats={[
          { label: 'Approve baqi', value: String(totals.PENDING?.count ?? 0), hint: money(totals.PENDING?.value ?? 0) },
          { label: 'Approved', value: String(totals.APPROVED?.count ?? 0), hint: `credit ${money(totals.APPROVED?.credited ?? 0)}` },
        ]}
      />

      <ViewTabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: totals[t.id]?.count ?? null }))}
        right={<span className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 lg:inline-flex">{canCollect && <><Kbd>N</Kbd> naya · </>}<Kbd>1</Kbd>-<Kbd>3</Kbd> tabs{canApprove && <> · <Kbd>A</Kbd> approve</>}</span>} />

      <section className="relative rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          : !rows.length ? <Empty icon={<Undo2 className="h-5 w-5" />} text={tab === 'PENDING' ? 'Koi return approve ke liye baqi nahi.' : 'Is tab me kuch nahi.'} />
            : <>
              <div className="overflow-x-auto">
                <Table minWidth="54rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr>
                      {tab === 'PENDING' && canApprove && <Th className="w-10 px-4 py-2"><Checkbox aria-label="Sab" checked={allOn} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></Th>}
                      <Th className="px-4 py-2">Return</Th>
                      <Th className="px-3 py-2">Customer</Th>
                      <Th className="px-3 py-2">Route · Kis ne liya</Th>
                      <Th className="px-3 py-2 text-right">Items</Th>
                      <Th className="px-3 py-2 text-right">Value</Th>
                      <Th className="px-3 py-2 text-right">Credit</Th>
                      <Th className="px-4 py-2">Halat</Th>
                    </Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <Tr key={r.id} onClick={() => setOpen(r.id)} className={cn('cursor-pointer hover:bg-slate-50/80', picked.has(r.id) && 'bg-brand-50/40')}>
                        {tab === 'PENDING' && canApprove && <Td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox aria-label={r.number} checked={picked.has(r.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} />
                        </Td>}
                        <Td className="px-4 py-2"><div className="font-semibold text-slate-900">{r.number}</div><div className="whitespace-nowrap text-[0.75rem] text-slate-500">{dayTime(r.collectedAt)}</div></Td>
                        <Td className="max-w-[14rem] px-3 py-2"><div className="truncate font-medium text-slate-900">{partyName(r.customer)}</div><div className="truncate text-[0.75rem] text-slate-500">{partySub(r.customer)}</div></Td>
                        <Td className="px-3 py-2"><div className="text-slate-800">{r.routeName ?? '—'}</div><div className="text-[0.75rem] text-slate-500">{r.collectedByName ?? ''}</div></Td>
                        <Td className="px-3 py-2 text-right tabular-nums">{r.itemCount}</Td>
                        <Td className="px-3 py-2 text-right font-semibold tabular-nums">{money(r.totalValue)}</Td>
                        <Td className="px-3 py-2 text-right tabular-nums">{r.status === 'APPROVED' ? money(r.creditedAmount) : '—'}</Td>
                        <Td className="px-4 py-2"><Pill tone={STATUS_TONE[r.status]}>{TABS.find((t) => t.id === r.status)?.label}</Pill></Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
              {total > 50 && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-600">
                  <span>{(page - 1) * 50 + 1}–{Math.min(page * 50, total)} / {total}</span>
                  <span className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                    <Button size="sm" variant="secondary" disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>Next</Button>
                  </span>
                </div>
              )}
              {picked.size > 0 && (
                <BulkBar>
                  <span className="mr-auto text-[0.8125rem]">{picked.size} chune</span>
                  <Button size="sm" variant="secondary" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setRejecting([...picked])}>Reject</Button>
                  <Button size="sm" loading={approve.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => approve.mutate({ ids: [...picked] })}>Approve</Button>
                </BulkBar>
              )}
            </>}
      </section>

      {open && <ReturnDetail id={open} canApprove={canApprove} onClose={() => setOpen(null)}
        onApprove={(id) => approve.mutate({ ids: [id] })} onReject={(id) => setRejecting([id])} busy={approve.isPending} />}
      {creating && <NewReturnModal canApprove={canApprove} onClose={() => setCreating(false)} />}
      {pinFor && <PinModal onClose={() => setPinFor(null)} busy={approve.isPending}
        onSubmit={(pin) => { const ids = pinFor; setPinFor(null); approve.mutate({ ids, pin }); }} />}
      {rejecting && <RejectModal count={rejecting.length} busy={reject.isPending} onClose={() => setRejecting(null)} onSubmit={(reason) => reject.mutate({ ids: rejecting, reason })} />}
    </PageShell>
  );
}

function ReturnDetail({ id, canApprove, busy, onClose, onApprove, onReject }: {
  id: string; canApprove: boolean; busy: boolean; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  const money = useMoney();
  const q = useQuery({ queryKey: [...KEY, 'one', id], queryFn: () => phase2Api.marketReturn(id) });
  const r = q.data;
  return (
    <Modal open onClose={onClose} size="xl" title={r ? `${r.number} · ${partyName(r.customer)}` : 'Market return'} description={r ? `${dayTime(r.collectedAt)} · ${r.collectedByName ?? ''}${r.shopName ? ` · ${r.shopName}` : ''}` : undefined}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {r?.status === 'PENDING' && canApprove && <>
          <Button variant="secondary" onClick={() => { onReject(r.id); onClose(); }}>Reject</Button>
          <Button loading={busy} onClick={() => { onApprove(r.id); onClose(); }}>Approve — khata credit</Button>
        </>}
      </>}>
      {!r ? <Skeleton className="h-40 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Halat"><Pill tone={STATUS_TONE[r.status]}>{TABS.find((t) => t.id === r.status)?.label}</Pill></Fact>
            <Fact label="Value">{money(r.totalValue)}</Fact>
            <Fact label="Khata credit">{r.status === 'APPROVED' ? money(r.creditedAmount) : '—'}</Fact>
            <Fact label="Khata abhi">{rs(r.customer?.balance ?? 0)}</Fact>
          </div>
          {r.rejectReason && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">Reject: {r.rejectReason}</p>}
          {r.note && <p className="text-[0.8125rem] text-slate-600">Note: {r.note}</p>}
          <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200/80">
            <Table minWidth="48rem" className="[&_table]:text-[0.8125rem]">
              <THead className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <Tr><Th className="px-3 py-2">Item</Th><Th className="px-2 py-2">Halat</Th><Th className="px-2 py-2 text-right">Quantity</Th><Th className="px-2 py-2 text-right">Rate</Th>
                  <Th className="px-2 py-2 text-right">Value</Th><Th className="px-2 py-2">Claim</Th><Th className="px-3 py-2 text-right">Invoice se mila</Th></Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {r.items.map((i) => (
                  <Tr key={i.id}>
                    <Td className="px-3 py-2"><div className="font-medium text-slate-900">{i.productName}</div>
                      <div className="text-[0.6875rem] text-slate-500">{[i.reason, i.batchNo && `Batch ${i.batchNo}`, i.expiryDate && `Exp ${i.expiryDate.slice(0, 10)}`].filter(Boolean).join(' · ')}</div></Td>
                    <Td className="px-2 py-2"><Pill tone={CONDITION_TONE[i.condition]}>{RETURN_CONDITION_LABEL[i.condition]}</Pill></Td>
                    <Td className="px-2 py-2 text-right tabular-nums">{trim(i.qty)} {i.unitName ?? i.baseUnit}{i.conversionRate > 1 && <div className="text-[0.6875rem] text-slate-500">{trim(i.baseQty)} {i.baseUnit}</div>}</Td>
                    <Td className="px-2 py-2 text-right tabular-nums">{rs(i.rate * i.conversionRate)}</Td>
                    <Td className="px-2 py-2 text-right font-semibold tabular-nums">{money(i.value)}</Td>
                    <Td className="px-2 py-2">{i.claimable ? <span className="text-[0.75rem]"><Pill tone="violet">Claim</Pill> <span className="text-slate-500">{i.supplierName ?? 'principal nahi'}</span></span> : <span className="text-slate-400">—</span>}</Td>
                    <Td className="px-3 py-2 text-right tabular-nums">{r.status === 'APPROVED' ? `${trim(i.matchedQty)} / ${trim(i.baseQty)}` : '—'}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          {r.saleReturns.length > 0 && (
            <div className="text-[0.8125rem] text-slate-600">
              <div className="mb-1 font-semibold text-slate-800">Invoices par wapsi</div>
              <ul className="space-y-0.5">{r.saleReturns.map((s) => <li key={s.id}>{s.returnNumber} · bill {s.saleNumber} · {rs(s.refundAmount)}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

interface Line { key: string; productId: string; variantId: string | null; unitId: string; qty: string; condition: ReturnCondition; reason: string; rate: string; label: string }

function NewReturnModal({ canApprove, onClose }: { canApprove: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const catalog = useCatalog();
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [approveNow, setApproveNow] = useState(false);
  const [pin, setPin] = useState('');
  const set = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const payload: MarketReturnLine[] = useMemo(() => lines.filter((l) => Number(l.qty) > 0).map((l) => ({
    productId: l.productId, variantId: l.variantId, unitId: l.unitId || null, qty: Number(l.qty), condition: l.condition,
    ...(l.reason.trim() && { reason: l.reason.trim() }), ...(canApprove && l.rate !== '' && Number(l.rate) >= 0 && { rate: Number(l.rate) }),
  })), [lines, canApprove]);
  const sig = JSON.stringify([customer?.id, payload]);
  const preview = useQuery({
    queryKey: [...KEY, 'preview', sig],
    queryFn: () => phase2Api.previewReturn({ customerId: customer!.id, items: payload }),
    enabled: !!customer && payload.length > 0,
    placeholderData: keepPreviousData,
  });
  const save = useMutation({
    mutationFn: () => {
      if (!customer) throw new Error('Customer chunein');
      if (!payload.length) throw new Error('Kam se kam ek item aur quantity likhein');
      return phase2Api.createReturn({ customerId: customer.id, items: payload, note: note.trim() || undefined, ...(approveNow && { approve: true, ...(pin && { managerPin: pin }) }) });
    },
    onSuccess: (r) => { toast.success(`${r.marketReturn.number} ${r.marketReturn.status === 'APPROVED' ? 'approve — khata credit' : 'save — approve baqi'}`); qc.invalidateQueries({ queryKey: KEY }); onClose(); },
    onError: (e) => toast.error(distError(e, 'Return save nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="xl" title="New market return" description="Retailer se wapas aaya maal. Rate customer ki pichli Invoice se lagta hai."
      footer={<>
        <span className="mr-auto text-[0.8125rem] text-slate-600">{payload.length} items · <b className="text-slate-900">{rs(preview.data?.total ?? 0)}</b></span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} disabled={!customer || !payload.length} onClick={() => save.mutate()}>{approveNow ? 'Save and approve' : 'Save'}</Button>
      </>}>
      <div className="space-y-3">
        <CustomerSearch value={customer} onPick={setCustomer} autoFocus />
        <ItemSearch options={catalog.options} loading={catalog.isLoading}
          onPick={(o) => setLines((ls) => [...ls, { key: newKey(), productId: o.productId, variantId: o.variantId, unitId: defaultPack(o.product, o.variantId), qty: '', condition: 'EXPIRED', reason: '', rate: '', label: o.label }])} />
        {!lines.length ? <p className="py-4 text-center text-[0.8125rem] text-slate-500">Upar se item dhoond kar line banayein</p>
          : <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200/80">
            {lines.map((l) => {
              const pv = preview.data?.lines.find((x) => x.productId === l.productId && (x.variantId ?? null) === l.variantId);
              return (
                <li key={l.key} className="space-y-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-900">{l.label}</span>
                    {pv && <span className="text-[0.75rem] tabular-nums text-slate-600">{rs(pv.value)}</span>}
                    <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className={cn('grid gap-2', canApprove ? 'grid-cols-2 sm:grid-cols-[7rem_6rem_9rem_minmax(0,1fr)_6rem]' : 'grid-cols-2 sm:grid-cols-[7rem_6rem_9rem_minmax(0,1fr)]')}>
                    <PackSelect product={catalog.byId.get(l.productId)} variantId={l.variantId} value={l.unitId} onChange={(v) => set(l.key, { unitId: v })} />
                    <input type="number" min={0} step="any" value={l.qty} autoFocus onChange={(e) => set(l.key, { qty: e.target.value })} aria-label="Quantity" placeholder="Qty"
                      className="h-9 rounded-lg border border-slate-200 px-2 text-right text-[0.875rem] tabular-nums outline-none focus:border-brand-500" />
                    <select value={l.condition} aria-label="Halat" onChange={(e) => set(l.key, { condition: e.target.value as ReturnCondition })}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] outline-none focus:border-brand-500">
                      {(Object.keys(RETURN_CONDITION_LABEL) as ReturnCondition[]).map((c) => <option key={c} value={c}>{RETURN_CONDITION_LABEL[c]}</option>)}
                    </select>
                    <input value={l.reason} onChange={(e) => set(l.key, { reason: e.target.value })} placeholder="Wajah (zaroori nahi)" aria-label="Wajah"
                      className="h-9 rounded-lg border border-slate-200 px-2 text-[0.8125rem] outline-none focus:border-brand-500" />
                    {canApprove && <input type="number" min={0} step="any" value={l.rate} onChange={(e) => set(l.key, { rate: e.target.value })} aria-label="Rate per pack"
                      placeholder={pv ? trim(pv.rate * (catalog.byId.get(l.productId)?.units.find((u) => u.id === l.unitId)?.conversionRate ?? 1)) : 'Rate'}
                      className="h-9 rounded-lg border border-slate-200 px-2 text-right text-[0.8125rem] tabular-nums outline-none focus:border-brand-500" />}
                  </div>
                  {pv?.claimable && <p className="text-[0.6875rem] text-violet-700">Company (principal) se claim hoga</p>}
                </li>
              );
            })}
          </ul>}
        <Input size="sm" label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Zaroori nahi" />
        {canApprove && (
          <div className="flex flex-wrap items-end gap-3">
            <Checkbox label="Abhi approve karein" description="Maal godown aa gaya ho to — khata foran credit" checked={approveNow} onChange={(e) => setApproveNow(e.target.checked)} />
            {approveNow && <Input size="sm" type="password" label="Owner PIN (agar mange)" value={pin} onChange={(e) => setPin(e.target.value)} className="w-40" />}
          </div>
        )}
      </div>
    </Modal>
  );
}

function PinModal({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title="Owner PIN chahiye" description="Settings me wapsi par PIN mangta hai. PIN likh kar dobara approve karein."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!pin} onClick={() => onSubmit(pin)}>Approve</Button></>}>
      <Input type="password" autoFocus label="PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && pin) onSubmit(pin); }} />
    </Modal>
  );
}

function RejectModal({ count, busy, onClose, onSubmit }: { count: number; busy: boolean; onClose: () => void; onSubmit: (reason?: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title={`${count} return reject karein`} description="Khata aur stock par kuch nahi hoga."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={() => onSubmit(reason.trim() || undefined)}>Reject</Button></>}>
      <Input autoFocus label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Maal godown nahi pohncha" />
    </Modal>
  );
}
