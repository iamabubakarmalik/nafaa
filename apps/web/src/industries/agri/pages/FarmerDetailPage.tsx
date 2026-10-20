/**
 * One farmer: the khata season by season (udhaar given, money received,
 * what carried over), every khata entry, the bulk orders, and the land and
 * crops. Money is taken here ("Wasool") and lands on the customer khata.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Ban, BookOpen, Boxes, Edit3, EyeOff, Landmark, Leaf, Link2, MapPin, MessageCircle, Phone, RotateCcw, Sprout, Wallet } from 'lucide-react';
import { Button, Card, KpiCard, KpiRow, Modal, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { farmersApi } from '../api/farmers.api';
import { PayModal } from '../components/PayModal';
import { ORDER_STATUS, PAY_METHODS, errorText, seasonLabel, shortDate } from '../lib/meta';

const ENTRY: Record<string, string> = {
  SALE_CREDIT: 'Udhaar bill', PAYMENT_RECEIVED: 'Wasooli', ADJUSTMENT: 'Adjustment', OPENING_BALANCE: 'Purana baqi', REFUND: 'Wapsi', LOYALTY_REDEEMED: 'Points',
};
const methodLabel = (m?: string | null) => PAY_METHODS.find((x) => x.value === m)?.label ?? (m ? m : '');

export default function FarmerDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const shop = useAuthStore((s) => s.tenant?.name) ?? 'hamari dukaan';
  const canManage = usePermission(PERMISSIONS.AGRI_FARMERS_MANAGE);
  const canCollect = usePermission(PERMISSIONS.KHATA_MANAGE);
  const canKhata = usePermission(PERMISSIONS.KHATA_VIEW);
  const canOrders = usePermission(PERMISSIONS.AGRI_ORDERS_VIEW);
  const [pay, setPay] = useState(false);
  const [hide, setHide] = useState(false);

  const farmerQ = useQuery({ queryKey: ['agri-farmer', id], queryFn: () => farmersApi.getOne(id) });
  const khataQ = useQuery({ queryKey: ['agri-farmer', id, 'khata'], queryFn: () => farmersApi.khata(id), enabled: canKhata && !!farmerQ.data?.customerId });
  const ordersQ = useQuery({ queryKey: ['agri-bulk-orders', 'farmer', id], queryFn: () => bulkOrdersApi.page({ farmerId: id, limit: 10 }), enabled: canOrders });
  const f = farmerQ.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['agri-farmer'] }); qc.invalidateQueries({ queryKey: ['agri-farmers'] }); qc.invalidateQueries({ queryKey: ['customers'] }); };

  const collect = useMutation({
    mutationFn: (v: { amount: number; method: string; note: string }) => farmersApi.payment(id, { amount: v.amount, paymentMethod: v.method, note: v.note || undefined }),
    onSuccess: (_, v) => { refresh(); toast.success(`${money(v.amount)} wasool — khate me likh diya`); setPay(false); },
    onError: (e) => toast.error(errorText(e, 'Wasooli nahi hui')),
  });
  const link = useMutation({
    mutationFn: () => farmersApi.linkCustomer(id),
    onSuccess: () => { refresh(); toast.success('Khata jur gaya'); },
    onError: (e) => toast.error(errorText(e, 'Khata nahi jura')),
  });
  const reactivate = useMutation({
    mutationFn: () => farmersApi.reactivate(id),
    onSuccess: () => { refresh(); toast.success('Udhaar dobara chalu'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const remove = useMutation({
    mutationFn: () => farmersApi.remove(id),
    onSuccess: () => { refresh(); toast.success('Farmer list se hat gaya — khata aur bill mehfooz'); navigate('/agri/farmers'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  if (farmerQ.isLoading) return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></PageShell>;
  if (!f) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye farmer nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/agri/farmers')}>Farmers par wapas</Button></div></PageShell>;

  const stopped = f.status === 'SUSPENDED' || f.status === 'CLOSED';
  const seasons = khataQ.data?.seasons ?? [];
  const entries = khataQ.data?.entries ?? [];
  const wa = `https://wa.me/${f.phone.replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(`Assalam o alaikum ${f.fullName} sahab, ${shop} se. Aap ke khate me ${money(f.currentBalance)} baqi hain. Shukriya`)}`;
  const statement = (): PrintDoc => ({
    title: `Khata — ${f.fullName}`, subtitle: [f.farmerNumber, f.village, f.phone].filter(Boolean).join(' · '),
    meta: [['Baqi', money(f.currentBalance)], ['Wasooli ka waqt', money(f.dueNow)]],
    sections: [
      { kind: 'table', title: 'Season', columns: [{ label: 'Season' }, { label: 'Udhaar', align: 'right' }, { label: 'Wasool', align: 'right' }, { label: 'Aakhir me', align: 'right' }], rows: seasons.map((s) => [s.label, money(s.udhaar), money(s.received), money(s.closing)]) },
      { kind: 'table', title: 'Entries', columns: [{ label: 'Date' }, { label: 'Kya' }, { label: 'Amount', align: 'right' }, { label: 'Baqi', align: 'right', wideOnly: true }], rows: entries.slice(0, 80).map((e) => [shortDate(e.createdAt), ENTRY[e.type] ?? e.type, money(e.amount), money(e.balanceAfter)]) },
    ],
  });

  return (
    <PageShell>
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <button type="button" onClick={() => navigate('/agri/farmers')} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{f.fullName}{stopped && <span className="ml-2 rounded-full bg-rose-500/90 px-2 py-0.5 align-middle text-[0.6875rem] font-semibold">Udhaar roka hua</span>}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.8125rem] text-white/75">
              <span>{f.farmerNumber}</span><span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{f.phone}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[f.village, f.tehsil, f.district].filter(Boolean).join(', ') || '—'}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {canCollect && f.khataLinked && f.currentBalance > 0 && <button type="button" onClick={() => setPay(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-bold text-brand-800"><Wallet className="h-4 w-4" />Wasool</button>}
            {f.currentBalance > 0 && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {canKhata && khataQ.data && <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={statement} label="Statement" /></span>}
            {canOrders && <Link to={`/agri/bulk-orders/new?farmer=${f.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><Boxes className="h-4 w-4" />Bulk order</Link>}
            {canManage && <Link to={`/agri/farmers/${f.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><Edit3 className="h-4 w-4" />Badlein</Link>}
          </div>
        </div>
      </div>

      {!f.khataLinked && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4" /><span className="text-[0.875rem] font-medium">Ye farmer kisi customer khate se nahi jura — POS ka udhaar yahan nahi dikhta</span>
          {canManage && <Button size="sm" className="ml-auto" loading={link.isPending} onClick={() => link.mutate()} leftIcon={<Link2 className="h-4 w-4" />}>Khata jorein</Button>}
        </div>
      )}
      {(f.dueNow ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-rose-900 ring-1 ring-rose-200">
          <AlertTriangle className="h-4 w-4" /><span className="text-[0.875rem] font-medium">{money(f.dueNow)} pichle season ka baqi hai — katai guzar chuki, wasooli ka waqt hai</span>
        </div>
      )}

      <KpiRow cols={4}>
        <KpiCard icon={Wallet} color="#2563eb" label="Udhaar" value={money(f.currentBalance)} hint={(f.advance ?? 0) > 0 ? `Advance ${money(f.advance)}` : f.currentSeasonLabel} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Wasooli ka waqt" value={money(f.dueNow)} hint="Katai guzar gayi" />
        <KpiCard icon={Ban} color="#d97706" label="Udhaar ki had" value={f.creditLimit > 0 ? money(f.creditLimit) : 'Koi had nahi'} hint={f.overLimit ? 'Had se upar' : undefined} />
        <KpiCard icon={Sprout} color="#65a30d" label="Zameen" value={f.landAreaAcres ? `${f.landAreaAcres} acre` : '—'} hint={f.primaryCrops.slice(0, 3).join(', ') || undefined} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" flush title="Season ka khata" description="Rabi (Oct–Mar) 31 May tak, Kharif (Apr–Sep) 15 Dec tak wapas">
            {!canKhata ? <p className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">Khata dekhne ki permission nahi</p>
              : khataQ.isLoading ? <div className="p-4"><Skeleton className="h-24 rounded-xl" /></div>
                : seasons.length === 0 ? <p className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">Abhi khate me koi entry nahi — POS par farmer chun kar udhaar bill banayein</p> : (
                  <Table>
                    <THead><Tr><Th>Season</Th><Th align="right">Udhaar diya</Th><Th align="right">Wasool hua</Th><Th align="right">Aakhir me baqi</Th><Th>Wapsi</Th></Tr></THead>
                    <TBody>{seasons.map((s) => (
                      <Tr key={s.key}>
                        <Td className="font-semibold text-slate-900">{s.label}</Td>
                        <Td align="right">{money(s.udhaar)}</Td>
                        <Td align="right" className="text-emerald-700">{money(s.received)}</Td>
                        <Td align="right" className="font-semibold">{money(s.closing)}</Td>
                        <Td className="text-[0.75rem] text-slate-500">{shortDate(s.recoveryBy)}</Td>
                      </Tr>
                    ))}</TBody>
                  </Table>
                )}
          </Card>
          {canKhata && entries.length > 0 && (
            <Card className="rounded-2xl" flush title="Khate ki entries" description={f.customerId ? <Link to={`/customers/${f.customerId}`} className="font-semibold text-brand-700 hover:underline">Poora khata customer page par →</Link> : undefined}>
              <Table minWidth="40rem">
                <THead><Tr><Th>Date</Th><Th>Kya</Th><Th>Note</Th><Th align="right">Amount</Th><Th align="right">Baqi</Th></Tr></THead>
                <TBody>{entries.slice(0, 50).map((e) => (
                  <Tr key={e.id}>
                    <Td className="text-[0.8125rem]">{shortDate(e.createdAt)}</Td>
                    <Td className="text-[0.8125rem]">{ENTRY[e.type] ?? e.type}{e.paymentMethod ? <span className="text-slate-500"> · {methodLabel(e.paymentMethod)}</span> : null}</Td>
                    <Td className="max-w-[16rem] truncate text-[0.75rem] text-slate-500">{[e.reference, e.note].filter(Boolean).join(' · ')}</Td>
                    <Td align="right" className={cn('font-semibold', e.amount < 0 ? 'text-emerald-700' : 'text-slate-900')}>{money(e.amount)}</Td>
                    <Td align="right">{money(e.balanceAfter)}</Td>
                  </Tr>
                ))}</TBody>
              </Table>
            </Card>
          )}
          {canOrders && (
            <Card className="rounded-2xl" flush title="Bulk orders" description={<Link to={`/agri/bulk-orders?farmer=${f.id}`} className="font-semibold text-brand-700 hover:underline">Sab dekhein →</Link>}>
              {(ordersQ.data?.items ?? []).length === 0 ? <p className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">Koi bulk order nahi</p> : (
                <ul className="divide-y divide-slate-100">{ordersQ.data!.items.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-5 py-2.5 text-[0.8125rem]">
                    <span className="font-semibold text-slate-900">{o.orderNumber}</span>
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', ORDER_STATUS[o.status].tone)}>{ORDER_STATUS[o.status].label}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-500">{[seasonLabel(o.season), o.cropTarget, shortDate(o.orderDate)].filter((x) => x && x !== '—').join(' · ')}</span>
                    <span className="font-semibold tabular-nums">{money(o.total)}</span>
                  </li>
                ))}</ul>
              )}
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card className="rounded-2xl" title="Farmer">
            <dl className="space-y-2 text-[0.875rem]">
              {([
                ['Walid', f.fatherName], ['CNIC', f.cnic], ['Doosra phone', f.altPhone], ['Pata', f.address],
                ['Zameen kis ki', f.landOwnership], ['Paani', f.waterSource], ['Mitti', f.soilType],
                ['Abhi laga hai', [f.currentCrop, f.currentSeason ? seasonLabel(f.currentSeason) : ''].filter(Boolean).join(' · ')],
                ['Kaam', f.farmingType.join(', ')], ['Aakhri khareed', f.lastPurchaseAt ? shortDate(f.lastPurchaseAt) : ''], ['Aakhri payment', f.lastPaymentAt ? shortDate(f.lastPaymentAt) : ''],
              ] as Array<[string, string | undefined | null]>).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-900">{v}</dd></div>
              ))}
            </dl>
            {f.notes && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{f.notes}</p>}
            {stopped && f.suspensionReason && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">Roka: {f.suspensionReason}</p>}
          </Card>
          <Card className="rounded-2xl" title="Aur">
            <div className="flex flex-col gap-2">
              {f.customerId && <Link to={`/customers/${f.customerId}`} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[0.875rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><BookOpen className="h-4 w-4" />Customer khata</Link>}
              <Link to={`/agri/advisory?farmer=${f.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[0.875rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Leaf className="h-4 w-4" />Fasal ka mashwara</Link>
              <Link to={`/agri/subsidy?farmer=${f.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[0.875rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Landmark className="h-4 w-4" />Subsidy claims</Link>
              {canManage && stopped && <Button variant="secondary" loading={reactivate.isPending} onClick={() => reactivate.mutate()} leftIcon={<RotateCcw className="h-4 w-4" />}>Udhaar dobara chalu</Button>}
              {canManage && <Button variant="ghost" onClick={() => setHide(true)} leftIcon={<EyeOff className="h-4 w-4" />}>List se hatayein</Button>}
            </div>
          </Card>
        </div>
      </div>

      {pay && (
        <PayModal title={`${f.fullName} se wasooli`} description="Customer khate me likha jayega — day book aur drawer me aata hai" max={f.currentBalance}
          suggest={[f.dueNow ?? 0, f.currentBalance]} busy={collect.isPending} onClose={() => setPay(false)} onPay={(v) => collect.mutate(v)} />
      )}
      {hide && (
        <Modal open onClose={() => setHide(false)} size="sm" title={`${f.fullName} ko list se hatayein?`}
          description={f.currentBalance > 0 ? `Is par ${money(f.currentBalance)} udhaar hai. Farmer list se hatega, magar khata, bill aur udhaar customer page par rahenge.` : 'Farmer list se hatega. Khata aur bill mehfooz rahenge.'}
          footer={<><Button variant="secondary" onClick={() => setHide(false)}>Wapas</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Hatayein</Button></>}>
          <p className="text-[0.8125rem] text-slate-600">Wapas laana ho to isi phone se naya farmer banayein — purana khata jur jayega.</p>
        </Modal>
      )}
    </PageShell>
  );
}
