/**
 * One delivery customer: balance from the khata, payment, pause for a few
 * days, close or reopen, the last two months of deliveries day by day and
 * the monthly bills.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, CalendarDays, FileText, GraduationCap, MapPin, Milk, PauseCircle, Pencil, Phone, PlayCircle, Truck, Wallet, XCircle } from 'lucide-react';
import { Button, Card, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { dairyCustomersApi } from '../api/customers.api';
import { monthlyBillsApi } from '../api/monthly-bills.api';
import { Empty, MoneyModal, Pill, ReasonModal } from '../components/ui';
import { CUSTOMER_STATUS, DELIVERY_STATUS, FREQUENCY, MONEY_KEYS, dayKey, errorText, liters, monthLabel, shiftDay, shortDate } from '../lib/meta';

type Tab = 'deliveries' | 'bills';

export default function DairyCustomerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canKhata = usePermission(PERMISSIONS.KHATA_MANAGE);
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const [tab, setTab] = useState<Tab>('deliveries');
  const [modal, setModal] = useState<'pay' | 'pause' | 'close' | null>(null);

  const q = useQuery({ queryKey: ['dairy-customer', id], queryFn: () => dairyCustomersApi.getOne(id) });
  const c = q.data;
  const refresh = () => MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const done = (msg: string) => () => { refresh(); setModal(null); toast.success(msg); };
  const fail = (fallback: string) => (e: unknown) => toast.error(errorText(e, fallback));

  const pay = useMutation({ mutationFn: (v: { amount: number; paymentMethod: string; reference?: string; notes?: string }) => dairyCustomersApi.payment(id, v), onSuccess: done('Payment khate me jama'), onError: fail('Payment save nahi hui') });
  const resume = useMutation({ mutationFn: () => dairyCustomersApi.resume(id), onSuccess: done('Delivery dobara chalu'), onError: fail('Nahi hua') });
  const close = useMutation({ mutationFn: (reason: string) => dairyCustomersApi.close(id, reason || undefined), onSuccess: done('Khata band — roz ki list se hat gaye'), onError: fail('Band nahi hua') });
  const reopen = useMutation({ mutationFn: () => dairyCustomersApi.reopen(id), onSuccess: done('Khata dobara chalu'), onError: fail('Nahi hua') });
  const lastMonth = useMemo(() => { const d = new Date(); d.setDate(0); return { month: d.getMonth() + 1, year: d.getFullYear() }; }, []);
  const makeBill = useMutation({
    mutationFn: (p: { month: number; year: number }) => monthlyBillsApi.make({ dairyCustomerId: id, ...p }),
    onSuccess: (b) => { refresh(); toast.success(b.refreshed ? `Bill ${b.billNumber} naye hisaab se theek` : `Bill ${b.billNumber} ban gaya`); navigate(`/dairy/bills?bill=${b.id}`); },
    onError: fail('Bill nahi bana'),
  });

  const days = useMemo(() => {
    const map = new Map<string, { morning?: number; evening?: number; amount: number; skipped: boolean }>();
    for (const d of c?.recentDeliveries ?? []) {
      if (d.status === 'CANCELLED' || d.status === 'SCHEDULED') continue;
      const k = dayKey(new Date(d.deliveryDate));
      const row = map.get(k) ?? { amount: 0, skipped: false };
      if (d.status === 'DELIVERED') {
        if (d.slot === 'EVENING') row.evening = (row.evening ?? 0) + d.deliveredQty; else row.morning = (row.morning ?? 0) + d.deliveredQty;
        row.amount += d.totalAmount;
      } else row.skipped = true;
      map.set(k, row);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [c?.recentDeliveries]);

  if (q.isLoading) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></PageShell>;
  if (!c) return <PageShell><Empty icon={Milk} title="Customer nahi mila" action={<Button variant="secondary" onClick={() => navigate('/dairy/customers')}>Customers par wapas</Button>} /></PageShell>;

  const st = CUSTOMER_STATUS[c.status];
  const owe = c.currentBalance;
  const month = days.filter(([k]) => k >= shiftDay(dayKey(), -29));
  const monthLiters = month.reduce((s, [, r]) => s + (r.morning ?? 0) + (r.evening ?? 0), 0);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Customer ka hisaab" onClose={guide.close}
          steps={[
            { icon: Wallet, color: '#16a34a', title: 'Payment', text: 'Paise mile to "Payment lein" — khate me jama hote hain aur purane bill pehle saaf hote hain.' },
            { icon: PauseCircle, color: '#d97706', title: 'Kuch din ruk', text: 'Customer bahar gaya ho to "Rokein" se tareekh tak delivery band karein; tareekh guzarte hi khud chalu ho jati hai.' },
            { icon: FileText, color: '#7c3aed', title: 'Mahine ka bill', text: '"Pichle mahine ka bill" se poore mahine ki delivery ka statement banta hai — print ya WhatsApp karein.' },
          ]} />
      )}

      <PageHero title={<HeroBack to="/dairy/customers" label="Customers">{c.name}</HeroBack>} chip={<>{c.customerNumber}</>}
        meta={[c.phone, c.address, c.area, c.route?.name].filter(Boolean).join(' · ') || 'Ghar delivery customer'}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {c.customerId && <Link to={`/customers/${c.customerId}`} className={heroButton}><BookOpen className="h-4 w-4" />Khata</Link>}
          {canEdit && <Link to={`/dairy/customers/${c.id}/edit`} className={heroButton}><Pencil className="h-4 w-4" />Badlein</Link>}
          {canKhata && <button type="button" onClick={() => makeBill.mutate(lastMonth)} disabled={makeBill.isPending} className={heroButton}><FileText className="h-4 w-4" />{monthLabel(lastMonth.month, lastMonth.year)} ka bill</button>}
          {canKhata && c.status !== 'CLOSED' && <button type="button" onClick={() => setModal('pay')} className={heroPrimaryButton}><Wallet className="h-4 w-4" />Payment lein</button>}
        </>}
        stats={[
          { label: owe >= 0 ? 'Baqi' : 'Advance', value: money(Math.abs(owe)), hint: c.khataLinked ? 'Khate se' : 'Khata pehli payment par jurega' },
          { label: '30 din ka doodh', value: liters(monthLiters) },
          { label: 'Aakhri payment', value: c.lastPaymentDate ? shortDate(c.lastPaymentDate) : '—' },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={Milk} color="#0ea5e9" label="Roz" value={`${c.morningQuantity} + ${c.eveningQuantity} L`} hint={FREQUENCY[c.deliveryFrequency]?.label} />
        <KpiCard icon={Wallet} color="#2563eb" label="Rate" value={c.customRate ? money(c.customRate) : 'Dukaan ka'} hint="Ek liter" />
        <KpiCard icon={Truck} color="#16a34a" label="Kul delivery" value={c.totalDeliveries} hint={`${c.missedDeliveries} naga`} />
        <KpiCard icon={CalendarDays} color="#64748b" label="Status" value={<Pill tone={st?.tone ?? ''}>{st?.label}</Pill>} hint={c.status === 'SUSPENDED' && c.pausedTo ? `${shortDate(c.pausedTo)} tak` : `Kab se ${shortDate(c.startDate)}`} />
      </KpiRow>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {c.status === 'ACTIVE' && <Button variant="secondary" leftIcon={<PauseCircle className="h-4 w-4" />} onClick={() => setModal('pause')}>Kuch din rokein</Button>}
          {c.status === 'SUSPENDED' && <Button variant="secondary" leftIcon={<PlayCircle className="h-4 w-4" />} loading={resume.isPending} onClick={() => resume.mutate()}>Dobara chalu</Button>}
          {c.status !== 'CLOSED' ? <Button variant="critical" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setModal('close')}>Khata band</Button>
            : <Button variant="secondary" leftIcon={<PlayCircle className="h-4 w-4" />} loading={reopen.isPending} onClick={() => reopen.mutate()}>Khata dobara kholein</Button>}
          {c.phone && <a href={`tel:${c.phone}`} className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"><Phone className="h-4 w-4" />Call</a>}
          {c.address && <span className="inline-flex h-10 items-center gap-2 px-2 text-[0.8125rem] text-slate-500"><MapPin className="h-4 w-4" />{[c.address, c.landmark].filter(Boolean).join(' — ')}</span>}
        </div>
      )}

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'deliveries', label: 'Delivery (2 mahine)', icon: Truck, count: days.length }, { id: 'bills', label: 'Mahine ke bill', icon: FileText, count: c.bills?.length ?? 0 }]} />

      {tab === 'deliveries' ? (
        <Card className="rounded-3xl" flush>
          {days.length === 0 ? <Empty icon={Truck} title="Abhi koi delivery nahi" text="Delivery page par roz ki list banti hai." /> : (
            <ul className="divide-y divide-slate-100">
              {days.map(([k, r]) => (
                <li key={k} className="grid grid-cols-[7rem_1fr_1fr_auto] items-center gap-2 px-5 py-2.5 text-[0.875rem]">
                  <span className="font-medium text-slate-800">{shortDate(`${k}T12:00:00`)}</span>
                  <span className="tabular-nums text-slate-700">{r.morning != null ? `Subah ${liters(r.morning)}` : <span className="text-slate-400">—</span>}</span>
                  <span className="tabular-nums text-slate-700">{r.evening != null ? `Shaam ${liters(r.evening)}` : <span className="text-slate-400">—</span>}</span>
                  <span className={cn('text-right tabular-nums', r.amount ? 'font-semibold text-slate-900' : 'text-slate-500')}>{r.amount ? money(r.amount) : r.skipped ? 'Naga' : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card className="rounded-3xl" flush>
          {!c.bills?.length ? <Empty icon={FileText} title="Abhi koi bill nahi" text="Mahine ke aakhir me bill banayein — upar wala button ya Mahine ke bill page." /> : (
            <ul className="divide-y divide-slate-100">
              {c.bills.map((b) => (
                <li key={b.id}>
                  <Link to={`/dairy/bills?bill=${b.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <span><span className="font-semibold text-slate-900">{monthLabel(b.month, b.year)}</span> <span className="font-mono text-[0.75rem] text-slate-400">{b.billNumber}</span>
                      <span className="block text-[0.75rem] text-slate-500">{liters(b.totalLiters)} · {b.totalDeliveries} delivery</span></span>
                    <span className="tabular-nums font-semibold text-slate-900">{money(b.totalAmount)}</span>
                    <Pill tone={b.isPaid ? DELIVERY_STATUS.DELIVERED.tone : DELIVERY_STATUS.SCHEDULED.tone}>{b.isPaid ? 'Ada' : `${money(b.remainingAmount)} baqi`}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {modal === 'pay' && <MoneyModal title={`${c.name} se payment`} description={owe > 0 ? `Baqi ${money(owe)}` : 'Advance jama hoga'} due={owe > 0 ? owe : undefined} withNote busy={pay.isPending} cta="Jama karein"
        hint="Khate me jama — purane bill pehle saaf hote hain" onSubmit={(v) => pay.mutate(v)} onClose={() => setModal(null)} />}
      {modal === 'pause' && <PauseModal id={id} name={c.name} onClose={() => setModal(null)} onDone={done('Delivery roki gayi — in dino ki list me nahi aayenge')} />}
      {modal === 'close' && <ReasonModal title={`${c.name} ka khata band`} danger cta="Band karein" busy={close.isPending}
        description={owe > 0.01 ? `Pehle ${money(owe)} ka hisaab saaf karein` : 'Roz ki list se hat jayenge; hisaab aur purane bill rehte hain'}
        presets={['Ghar chhor diya', 'Doodh band kar diya', 'Kahin aur se lete hain']} onSubmit={(v) => close.mutate(v.reason)} onClose={() => setModal(null)} />}
    </PageShell>
  );
}

function PauseModal({ id, name, onClose, onDone }: { id: string; name: string; onClose: () => void; onDone: () => void }) {
  const [from, setFrom] = useState(shiftDay(dayKey(), 1));
  const [to, setTo] = useState(shiftDay(dayKey(), 7));
  const [reason, setReason] = useState('');
  const m = useMutation({ mutationFn: () => dairyCustomersApi.pause(id, { pausedFrom: from, pausedTo: to, reason: reason.trim() || undefined }), onSuccess: onDone, onError: (e) => toast.error(errorText(e, 'Nahi hua')) });
  const bad = !from || !to || to < from;
  return (
    <Modal open onClose={onClose} size="sm" title={`${name} — delivery rokein`} description="In dino ki list me nahi aayenge; aakhri din ke baad khud chalu"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={m.isPending} disabled={bad} onClick={() => m.mutate()}>Rokein</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Kab se" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Kab tak" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} error={bad ? '"Kab tak" baad ki tareekh ho' : undefined} />
        </div>
        <div className="flex flex-wrap gap-1.5">{[3, 7, 15, 30].map((n) => <button key={n} type="button" onClick={() => setTo(shiftDay(from, n - 1))} className="h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ring-slate-200 hover:bg-slate-50">{n} din</button>)}</div>
        <Input label="Wajah (marzi)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Gaon gaye hain" />
      </div>
    </Modal>
  );
}
