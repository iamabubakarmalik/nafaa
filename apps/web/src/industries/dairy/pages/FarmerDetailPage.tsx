/**
 * One gawala: what the shop owes, the last 60 collection slips (pay one,
 * cancel a wrong one), cash paid from the drawer, and a printable
 * statement for the weekly or monthly settlement.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Droplets, GraduationCap, Milk, Pencil, Phone, Plus, Wallet } from 'lucide-react';
import { Button, Card, KpiCard, KpiRow, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { farmersApi } from '../api/farmers.api';
import { farmerSuppliesApi, isCancelledSupply, type FarmerSupply } from '../api/farmer-supplies.api';
import { FarmerFormModal } from '../components/FarmerFormModal';
import { Empty, MoneyModal, Pill, ReasonModal } from '../components/ui';
import { CYCLE, MONEY_KEYS, QUALITY, dateTime, errorText, liters, qty, shortDate, slotLabel } from '../lib/meta';

type Tab = 'slips' | 'paid';

export default function FarmerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { cost: money } = useMasked();
  const canPay = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const [tab, setTab] = useState<Tab>('slips');
  const [modal, setModal] = useState<'pay' | 'edit' | null>(null);
  const [cancelling, setCancelling] = useState<FarmerSupply | null>(null);

  const q = useQuery({ queryKey: ['dairy-farmer', id], queryFn: () => farmersApi.getOne(id) });
  const f = q.data;
  const refresh = () => MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const pay = useMutation({
    mutationFn: (v: { amount: number; paymentMethod: string; reference?: string; notes?: string }) => farmersApi.payment(id, v),
    onSuccess: () => { refresh(); setModal(null); toast.success('Payment likh di'); },
    onError: (e) => toast.error(errorText(e, 'Payment save nahi hui')),
  });
  const paySlip = useMutation({
    mutationFn: (s: FarmerSupply) => farmerSuppliesApi.pay(s.id, 'CASH'),
    onSuccess: () => { refresh(); toast.success('Parchi ada — cash drawer se nikla'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const cancel = useMutation({
    mutationFn: ({ s, reason }: { s: FarmerSupply; reason: string }) => farmerSuppliesApi.cancel(s.id, reason || undefined),
    onSuccess: () => { refresh(); setCancelling(null); toast.success('Entry cancel — doodh stock se aur paise hisaab se nikal gaye'); },
    onError: (e) => toast.error(errorText(e, 'Cancel nahi hui')),
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></PageShell>;
  if (!f) return <PageShell><Empty icon={Milk} title="Gawala nahi mila" action={<Button variant="secondary" onClick={() => navigate('/dairy/farmers')}>Gawale par wapas</Button>} /></PageShell>;

  const slips = f.recentSupplies ?? [];
  const live = slips.filter((s) => !isCancelledSupply(s));
  const unpaid = live.filter((s) => !s.isPaid && s.totalAmount > 0);
  const printDoc = (): PrintDoc => ({
    title: `Gawala hisaab — ${f.name}`, subtitle: `${f.farmerNumber}${f.village ? ` · ${f.village}` : ''}`,
    meta: [['Rate', `${f.ratePerLiter}/L`], ['Dena hai', money(f.currentBalance)]],
    sections: [
      {
        kind: 'table', title: 'Baqi parchiyan',
        columns: [{ label: 'Tareekh' }, { label: 'Waqt' }, { label: 'Liter' }, { label: 'Fat', wideOnly: true }, { label: 'Amount', align: 'right' }],
        rows: unpaid.map((s) => [shortDate(s.supplyDate), slotLabel(s.slot), qty(s.quantity), s.fatContent ? `${s.fatContent}%` : '', money(s.totalAmount)]),
        footer: ['Kul', '', qty(unpaid.reduce((t, s) => t + s.quantity, 0)), '', money(unpaid.reduce((t, s) => t + s.totalAmount, 0))],
      },
      { kind: 'rows', rows: [{ label: 'Kul dena hai (khate ke mutabiq)', value: money(f.currentBalance), strong: true }] },
    ],
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Gawale ka hisaab" onClose={guide.close}
          steps={[
            { icon: Wallet, color: '#d97706', title: 'Payment', text: '"Payment dein" se hafte ya mahine ka hisaab ada karein — purani parchiyan pehle ada hoti hain.' },
            { icon: Ban, color: '#e11d48', title: 'Ghalat entry', text: 'Ghalat parchi cancel karein — doodh stock se aur paise gawale ke hisaab se nikal jate hain. Ada parchi cancel nahi hoti.' },
            { icon: Droplets, color: '#0ea5e9', title: 'Fat', text: 'Har parchi par fat likhein to bonus khud lagta hai aur ausat fat yahan dikhta hai.' },
          ]} />
      )}

      <PageHero title={<HeroBack to="/dairy/farmers" label="Gawale">{f.name}</HeroBack>} chip={<>{f.farmerNumber}</>}
        meta={[f.phone, f.village, `${CYCLE[f.paymentCycle] ?? ''} payment`].filter(Boolean).join(' · ')}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Hisaab print" /></span>
          {f.phone && <a href={`tel:${f.phone}`} className={heroButton}><Phone className="h-4 w-4" />Call</a>}
          {canPay && <button type="button" onClick={() => setModal('edit')} className={heroButton}><Pencil className="h-4 w-4" />Badlein</button>}
          {canBuy && <Link to={`/dairy/supplies?farmer=${f.id}`} className={heroButton}><Plus className="h-4 w-4" />Doodh ki entry</Link>}
          {canPay && f.currentBalance > 0.009 && <button type="button" onClick={() => setModal('pay')} className={heroPrimaryButton}><Wallet className="h-4 w-4" />Payment dein</button>}
        </>}
        stats={[
          { label: 'Dena hai', value: money(Math.max(f.currentBalance, 0)) },
          { label: 'Kul doodh', value: liters(f.totalSupplied) },
          { label: 'Ab tak diya', value: money(f.totalPaid) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={Milk} color="#0ea5e9" label="Rate" value={`${money(f.ratePerLiter)}/L`} hint={f.fatBonusRate ? `Fat bonus ${money(f.fatBonusRate)}` : 'Fat bonus nahi'} />
        <KpiCard icon={Droplets} color="#7c3aed" label="Ausat fat" value={f.avgFatContent ? `${f.avgFatContent}%` : '—'} hint={f.avgSnfContent ? `SNF ${f.avgSnfContent}%` : undefined} />
        <KpiCard icon={Wallet} color="#e11d48" label="Baqi parchiyan" value={unpaid.length} hint={money(unpaid.reduce((t, s) => t + s.totalAmount, 0))} />
        <KpiCard icon={CheckCircle2} color="#16a34a" label="Aakhri payment" value={f.lastPaymentDate ? shortDate(f.lastPaymentDate) : '—'} />
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'slips', label: 'Parchiyan', icon: Milk, count: slips.length }, { id: 'paid', label: 'Cash payment', icon: Wallet, count: f.cashPayments?.length ?? 0 }]} />

      {tab === 'slips' ? (
        <Card className="rounded-3xl" flush>
          {slips.length === 0 ? <Empty icon={Milk} title="Abhi koi parchi nahi" text="Doodh ki entry page par subah / shaam ka doodh likhein." /> : (
            <ul className="divide-y divide-slate-100">
              {slips.map((s) => {
                const off = isCancelledSupply(s);
                return (
                  <li key={s.id} className="grid gap-2 px-5 py-3 text-[0.875rem] sm:grid-cols-[8rem_1fr_8rem_auto] sm:items-center">
                    <span className="font-medium text-slate-800">{shortDate(s.supplyDate)} · {slotLabel(s.slot)}</span>
                    <span className="text-slate-700">{off ? <span className="text-slate-400 line-through">{s.notes?.replace('CANCELLED:', '').trim()}</span> : <>{liters(s.quantity)} @ {money(s.ratePerLiter)}{s.fatContent ? ` · fat ${s.fatContent}%` : ''}{s.fatBonus ? ` · bonus ${money(s.fatBonus)}` : ''}{s.otherAdjustment ? ` · ${s.otherAdjustment > 0 ? '+' : ''}${money(s.otherAdjustment)}` : ''}</>}
                      {s.quality && !off && <Pill tone={QUALITY[s.quality]?.tone ?? ''} className="ml-2">{QUALITY[s.quality]?.label}</Pill>}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{off ? 'Cancel' : money(s.totalAmount)}</span>
                    <span className="flex justify-end gap-1.5">
                      {!off && (s.isPaid ? <Pill tone="bg-success-50 text-success-700 ring-success-200">Ada</Pill> : s.totalAmount > 0 && (
                        <>
                          {canPay && <Button size="xs" variant="secondary" loading={paySlip.isPending && paySlip.variables?.id === s.id} onClick={() => paySlip.mutate(s)}>Cash ada</Button>}
                          {canBuy && <Button size="xs" variant="ghost" onClick={() => setCancelling(s)}><Ban className="h-3.5 w-3.5" /></Button>}
                        </>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <Card className="rounded-3xl" flush description="Drawer se diya cash. Bank ya JazzCash payment gawale ke hisaab me hai magar yahan list nahi hoti.">
          {!f.cashPayments?.length ? <Empty icon={Wallet} title="Abhi koi cash payment nahi" /> : (
            <ul className="divide-y divide-slate-100">
              {f.cashPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[0.875rem]">
                  <span className="min-w-0"><span className="font-medium text-slate-800">{dateTime(p.createdAt)}</span><span className="block truncate text-[0.75rem] text-slate-500">{p.reason}</span></span>
                  <span className="font-semibold tabular-nums text-slate-900">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {modal === 'pay' && <MoneyModal title={`${f.name} ko payment`} description={`Dena hai ${money(f.currentBalance)}`} due={f.currentBalance} withNote busy={pay.isPending} cta="Payment dein"
        hint="Cash ho to khule drawer se nikalta hai" onSubmit={(v) => pay.mutate(v)} onClose={() => setModal(null)} />}
      {modal === 'edit' && <FarmerFormModal farmer={f} onClose={() => setModal(null)} />}
      {cancelling && <ReasonModal title="Parchi cancel" danger cta="Cancel karein" busy={cancel.isPending}
        description={`${liters(cancelling.quantity)} — ${money(cancelling.totalAmount)}. Doodh stock se nikal jayega.`}
        presets={['Ghalat quantity', 'Ghalat gawala', 'Do dafa likha']} onSubmit={(v) => cancel.mutate({ s: cancelling, reason: v.reason })} onClose={() => setCancelling(null)} />}
    </PageShell>
  );
}
