/**
 * One load sheet: the pick list in cartons and pieces, scheme free goods
 * kept apart, the invoices in route order, the van details, and the cash
 * once settled. Open sheets can take or drop orders, be dispatched or
 * cancelled; printing gives the sheet alone or with every invoice.
 *
 * Keys: P print · D dispatch · S settle.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Gift, Pencil, Plus, Printer, Send, Trash2, Truck, Wallet } from 'lucide-react';
import {
  Button, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Skeleton, Kbd,
  confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { DIST_KEY, distError, distributionApi, type LoadSheetDetail } from '../api/distribution.api';
import { DistributionGate } from '../components/DistributionGate';
import { useDeliveryStaff, useMoney } from '../hooks/useDistribution';
import { LoadSheetModal } from '../components/LoadSheetModal';
import { Empty, Fact, Panel, Pill } from '../components/parts';
import { dayTime, dayYearLabel, ORDER_STATUS, OUTCOME, partyName, partySub, rs, SHEET_STATUS, trim } from '../lib/meta';
import { printLoadSheet } from '../print/distPrint';

export default function LoadSheetDetailPage() {
  return <DistributionGate><Detail /></DistributionGate>;
}

function Detail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const money = useMoney();
  const canLoad = usePermission(PERMISSIONS.DISTRIBUTION_LOADSHEETS_MANAGE);
  const canSettle = usePermission(PERMISSIONS.DISTRIBUTION_SETTLE);
  const q = useQuery({ queryKey: [DIST_KEY, 'sheet', id], queryFn: () => distributionApi.loadSheet(id) });
  const s = q.data;
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [printing, setPrinting] = useState(false);

  const done = (r: LoadSheetDetail, msg: string) => { toast.success(msg); qc.setQueryData([DIST_KEY, 'sheet', id], r); qc.invalidateQueries({ queryKey: [DIST_KEY] }); };
  const dispatch = useMutation({ mutationFn: () => distributionApi.dispatch(id), onSuccess: (r) => done(r, `${r.number} — gaari nikal gayi`), onError: (e) => toast.error(distError(e)) });
  const cancel = useMutation({ mutationFn: () => distributionApi.cancelSheet(id), onSuccess: (r) => done(r, `${r.number} cancel — orders wapas Invoiced`), onError: (e) => toast.error(distError(e)) });
  const remove = useMutation({ mutationFn: (orderId: string) => distributionApi.removeFromSheet(id, orderId), onSuccess: (r) => done(r, 'Order sheet se hat gaya'), onError: (e) => toast.error(distError(e)) });

  const print = async (withInvoices: boolean) => {
    setPrinting(true);
    try { printLoadSheet(await distributionApi.printLoadSheet(id, withInvoices), withInvoices); } catch (e) { toast.error(distError(e, 'Print nahi hua')); } finally { setPrinting(false); }
  };
  const askDispatch = async () => {
    if (!s || s.status !== 'OPEN') return;
    if (await confirmDialog({ title: `${s.number} dispatch karein?`, text: 'Is ke baad orders na jor sakenge na hata sakenge. Wapsi par Settle karein.', yes: 'Dispatch' })) dispatch.mutate();
  };
  const askCancel = async () => {
    if (await confirmDialog({ title: `${s?.number} cancel karein?`, text: 'Sheet ke sab orders wapas Invoiced ho jayenge — Invoice nahi mitti.', danger: true, yes: 'Cancel karein' })) cancel.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !s) return;
      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); void print(false); }
      else if (k === 'd' && canLoad && s.status === 'OPEN') { e.preventDefault(); void askDispatch(); }
      else if (k === 's' && canSettle && (s.status === 'OPEN' || s.status === 'DISPATCHED')) navigate(`/distribution/load-sheets/${id}/settle`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!s) {
    return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></PageShell>;
  }
  const st = SHEET_STATUS[s.status];
  const open = s.status === 'OPEN';
  const active = open || s.status === 'DISPATCHED';

  return (
    <PageShell>
      <PageHero
        back="/distribution/load-sheets" backLabel="Load sheets"
        title={s.number}
        chip={<><Truck /> {st.label}</>}
        meta={`${dayYearLabel(s.date)} · ${s.routeName ?? 'Mili juli'} · ${s.shopName ?? ''}`}
        busy={q.isFetching}
        actions={<>
          <button type="button" disabled={printing} onClick={() => void print(false)} title="Print (P)" className={heroButton}><Printer className="h-4 w-4" /><span className="hidden sm:inline">Print</span></button>
          <button type="button" disabled={printing} onClick={() => void print(true)} className={heroButton}><Printer className="h-4 w-4" /><span className="hidden sm:inline">Invoices ke saath</span></button>
          {canLoad && open && <button type="button" onClick={() => void askDispatch()} title="Dispatch (D)" className={heroButton}><Send className="h-4 w-4" /><span className="hidden sm:inline">Dispatch</span></button>}
          {canSettle && active && <Link to={`/distribution/load-sheets/${id}/settle`} title="Settle (S)" className={heroPrimaryButton}><Wallet className="h-4 w-4" /><span className="hidden sm:inline">Settle</span></Link>}
        </>}
        stats={[
          { label: 'Invoices', value: String(s.invoiceCount) },
          { label: 'Value', value: money(s.totalValue) },
          { label: 'Maal', value: `${s.goodsTotals.packs} carton`, hint: `${trim(s.goodsTotals.baseQty)} pcs kul` },
        ]}
      />

      {s.status === 'SETTLED' && (
        <KpiRow cols={4}>
          <KpiCard icon={Wallet} color="#2563eb" label="Expected cash" value={rs(s.expectedCash)} hint={s.recoveryCash ? `Recovery ${rs(s.recoveryCash)} shamil` : 'Invoices ka cash'} />
          <KpiCard icon={Wallet} color="#16a34a" label="Jama hua" value={rs(s.handedIn ?? 0)} hint={s.settledAt ? `${dayTime(s.settledAt)} · ${s.settledByName ?? ''}` : undefined} />
          <KpiCard icon={Wallet} color={s.shortAmount > 0 ? '#e11d48' : '#16a34a'} label={s.shortAmount > 0 ? 'Kam' : s.shortAmount < 0 ? 'Zyada' : 'Farq'} value={rs(Math.abs(s.shortAmount))} hint={s.shortAmount ? 'Delivery wale se hisaab' : 'Poora'} />
          <KpiCard icon={Truck} color="#d97706" label="Wapas aaya" value={rs(s.returnsValue)} hint="Khata se kam ho gaya" />
        </KpiRow>
      )}

      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-4 lg:col-span-2">
          <Panel flush title="Maal (pick list)" sub={`${s.goodsTotals.lines} products · ${s.goodsTotals.packs} carton/pack · ${trim(s.goodsTotals.baseQty)} pcs`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[0.8125rem]">
                <thead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                  <tr className="border-b border-slate-100"><th className="px-4 py-2 sm:px-5">Product</th><th className="px-3 py-2 text-right">Carton</th><th className="px-3 py-2 text-right">Pcs</th><th className="px-3 py-2 text-right">Kul</th><th className="px-4 py-2 text-right sm:px-5">Value</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.goods.map((g) => (
                    <tr key={`${g.productId}-${g.variantId}`}>
                      <td className="px-4 py-2 sm:px-5">
                        <div className="font-semibold text-slate-900">{g.name}{g.variantName ? ` · ${g.variantName}` : ''}</div>
                        {g.packSize && g.packSize > 1 && <div className="text-[0.6875rem] text-slate-500">1 {g.packName} = {trim(g.packSize)} {g.baseUnit}</div>}
                      </td>
                      <td className="px-3 py-2 text-right text-[0.9375rem] font-bold tabular-nums text-slate-900">{g.packs || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-right text-[0.9375rem] font-bold tabular-nums text-slate-900">{g.loose ? trim(g.loose) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{trim(g.baseQty)} {g.baseUnit}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700 sm:px-5">{money(g.value ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-slate-200 font-semibold text-slate-900"><td className="px-4 py-2 sm:px-5">Kul</td><td className="px-3 py-2 text-right tabular-nums">{s.goodsTotals.packs}</td><td /><td className="px-3 py-2 text-right tabular-nums">{trim(s.goodsTotals.baseQty)}</td><td className="px-4 py-2 text-right tabular-nums sm:px-5">{money(s.goodsTotals.value)}</td></tr></tfoot>
              </table>
            </div>
          </Panel>

          {s.freeGoods.length > 0 && (
            <Panel title={<span className="inline-flex items-center gap-1.5"><Gift className="h-4 w-4 text-violet-600" />Free maal (scheme)</span>} sub="Alag rakhein — bill me qeemat nahi">
              <ul className="divide-y divide-slate-100">
                {s.freeGoods.map((g) => (
                  <li key={`${g.productId}-${g.variantId}`} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                    <span className="font-semibold text-slate-900">{g.name}</span>
                    <span className="font-bold tabular-nums text-violet-700">{g.text}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel flush title="Invoices" sub="Route ki tarteeb me" right={canLoad && open && <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Order jorein</Button>}>
            {!s.orders.length ? <Empty text="Is sheet par koi invoice nahi." /> : (
              <ul className="divide-y divide-slate-100">
                {s.orders.map((o, i) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span className="w-5 shrink-0 text-[0.75rem] text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{partyName(o.customer)}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{o.saleNumber} · {o.orderNumber}{partySub(o.customer) ? ` · ${partySub(o.customer)}` : ''}</span>
                    </span>
                    {o.deliveryStatus ? <Pill tone={OUTCOME[o.deliveryStatus].tone}>{OUTCOME[o.deliveryStatus].label}</Pill> : <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>}
                    <span className="w-24 text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.total)}
                      {o.returnsValue > 0 && <span className="block text-[0.6875rem] font-normal text-rose-600">−{rs(o.returnsValue)}</span>}
                    </span>
                    {canLoad && open && (
                      <button type="button" aria-label="Sheet se hatayein" disabled={remove.isPending} onClick={() => remove.mutate(o.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Gaari" right={canLoad && active && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>Badlein</Button>}>
            <div className="grid grid-cols-2 gap-3">
              <Fact label="Delivery">{s.deliveryUserName ?? '—'}</Fact>
              <Fact label="Driver">{s.driverName ?? '—'}</Fact>
              <Fact label="Gaari no.">{s.vehicleNo ?? '—'}</Fact>
              <Fact label="Godown">{s.shopName ?? '—'}</Fact>
              <Fact label="Banayi">{s.createdByName ?? '—'}</Fact>
              <Fact label="Dispatch">{s.dispatchedAt ? dayTime(s.dispatchedAt) : '—'}</Fact>
            </div>
            {s.note && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{s.note}</p>}
          </Panel>
          {active && (
            <Panel title="Aage kya" sub={open ? 'Maal load karein, phir dispatch' : 'Gaari wapas aaye to settle karein'}>
              <ol className="space-y-2 text-[0.8125rem] text-slate-600">
                <Step done={!open} n={1}>Print nikal kar godown se maal load karein</Step>
                <Step done={!open} n={2}>Dispatch — gaari nikal gayi</Step>
                <Step n={3}>Wapsi par har invoice: deliver, kuch wapas ya sab wapas, aur cash</Step>
              </ol>
              {canLoad && open && (
                <button type="button" onClick={() => void askCancel()} className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-rose-600 hover:underline"><Ban className="h-4 w-4" />Sheet cancel karein</button>
              )}
            </Panel>
          )}
          <p className="hidden items-center justify-center gap-1.5 text-[0.75rem] text-slate-400 lg:flex"><Kbd>P</Kbd> print{canLoad && open && <> · <Kbd>D</Kbd> dispatch</>}{canSettle && active && <> · <Kbd>S</Kbd> settle</>}</p>
        </div>
      </div>

      {editing && <VanModal sheet={s} onClose={() => setEditing(false)} onSaved={(r) => done(r, 'Gaari ki details save')} />}
      {adding && <LoadSheetModal addTo={s.id} onClose={() => setAdding(false)} />}
    </PageShell>
  );
}

function Step({ n, done, children }: { n: number; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold', done ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500')}>{done ? '✓' : n}</span>
      <span className={cn(done && 'text-slate-400 line-through')}>{children}</span>
    </li>
  );
}

function VanModal({ sheet, onClose, onSaved }: { sheet: LoadSheetDetail; onClose: () => void; onSaved: (r: LoadSheetDetail) => void }) {
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const [deliveryUserId, setDeliveryUserId] = useState(sheet.deliveryUserId ?? '');
  const [driverName, setDriverName] = useState(sheet.driverName ?? '');
  const [vehicleNo, setVehicleNo] = useState(sheet.vehicleNo ?? '');
  const [note, setNote] = useState(sheet.note ?? '');
  const users = useDeliveryStaff([{ id: sheet.deliveryUserId, name: sheet.deliveryUserName }, ...(routesQ.data ?? []).map((r) => ({ id: r.deliveryUserId, name: r.deliveryUserName }))]).list;
  const save = useMutation({
    mutationFn: () => distributionApi.updateLoadSheet(sheet.id, { deliveryUserId: deliveryUserId || null, driverName: driverName.trim(), vehicleNo: vehicleNo.trim(), note: note.trim() }),
    onSuccess: (r) => { onSaved(r); onClose(); },
    onError: (e) => toast.error(distError(e)),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Gaari ki details"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <Select label="Delivery wala" value={deliveryUserId} onChange={(e) => setDeliveryUserId(e.target.value)}
          options={[{ value: '', label: 'Koi nahi' }, ...users.map((u) => ({ value: u.id, label: u.label }))]} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          <Input label="Gaari no." value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} />
        </div>
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
