/**
 * New or edited home delivery customer: who, where, how much milk morning
 * and evening, how often, at what rate, and an advance at sign-up (goes on
 * the khata; needs "Khata manage"). Ctrl+S saves, G opens the guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, CalendarDays, GraduationCap, MapPin, Milk, UserRound, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR } from '@core/lib/format';
import { dairyCustomersApi, type CustomerInput, type DeliveryFrequency } from '../api/customers.api';
import { routesApi } from '../api/routes.api';
import { useSaveKey } from '../hooks/usePageKeys';
import { DAIRY_KEYS, FREQUENCY, PAY_METHODS, dayKey, errorText, numIn, phoneOk, cnicOk } from '../lib/meta';

interface Draft {
  name: string; phone: string; cnic: string; address: string; area: string; landmark: string; routeId: string;
  deliveryFrequency: DeliveryFrequency; morningQuantity: string; eveningQuantity: string; customRate: string;
  containerType: string; startDate: string; notes: string; advancePayment: string; advanceMethod: string;
}
const blank: Draft = {
  name: '', phone: '', cnic: '', address: '', area: '', landmark: '', routeId: '', deliveryFrequency: 'DAILY',
  morningQuantity: '1', eveningQuantity: '0', customRate: '', containerType: '', startDate: dayKey(), notes: '', advancePayment: '', advanceMethod: 'CASH',
};
const QUICK = [0, 0.5, 1, 1.5, 2, 3];

export default function DairyCustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canKhata = usePermission(PERMISSIONS.KHATA_MANAGE);
  const [d, setD] = useState<Draft>(blank);
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const existing = useQuery({ queryKey: [DAIRY_KEYS.customer, id], queryFn: () => dairyCustomersApi.getOne(id!), enabled: editing });
  const routesQ = useQuery({ queryKey: [DAIRY_KEYS.routes, 'active'], queryFn: () => routesApi.all({ active: true }), staleTime: 5 * 60_000 });
  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setD({
      name: c.name, phone: c.phone ?? '', cnic: c.cnic ?? '', address: c.address ?? '', area: c.area ?? '', landmark: c.landmark ?? '', routeId: c.routeId ?? '',
      deliveryFrequency: c.deliveryFrequency, morningQuantity: String(c.morningQuantity), eveningQuantity: String(c.eveningQuantity),
      customRate: c.customRate != null ? String(c.customRate) : '', containerType: c.containerType ?? '', startDate: c.startDate?.slice(0, 10) ?? dayKey(),
      notes: c.notes ?? '', advancePayment: '', advanceMethod: 'CASH',
    });
  }, [existing.data]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!d.name.trim()) e.name = 'Naam likhein';
    if (!phoneOk(d.phone)) e.phone = 'Phone 10 se 15 hindse';
    if (!cnicOk(d.cnic)) e.cnic = 'CNIC 13 hindse (12345-1234567-1)';
    const m = numIn(d.morningQuantity) ?? 0;
    const ev = numIn(d.eveningQuantity) ?? 0;
    if (m < 0 || m > 500) e.morningQuantity = '0 se 500 liter';
    if (ev < 0 || ev > 500) e.eveningQuantity = '0 se 500 liter';
    if (d.deliveryFrequency !== 'ON_DEMAND' && m <= 0 && ev <= 0) e.morningQuantity = 'Subah ya shaam ki quantity likhein (ya "Jab maange" chunein)';
    if (d.customRate && !((numIn(d.customRate) ?? -1) >= 0)) e.customRate = 'Rate theek likhein';
    if (d.advancePayment && !((numIn(d.advancePayment) ?? -1) >= 0)) e.advancePayment = 'Amount theek likhein';
    return e;
  }, [d]);
  const problems = Object.values(errors);

  const save = useMutation({
    mutationFn: () => {
      const body: Partial<CustomerInput> = {
        name: d.name.trim(), phone: d.phone.trim() || undefined, cnic: d.cnic.trim() || undefined, address: d.address.trim() || undefined,
        area: d.area.trim() || undefined, landmark: d.landmark.trim() || undefined, routeId: d.routeId || undefined,
        deliveryFrequency: d.deliveryFrequency, morningQuantity: numIn(d.morningQuantity) ?? 0, eveningQuantity: numIn(d.eveningQuantity) ?? 0,
        containerType: d.containerType.trim() || undefined, startDate: d.startDate || undefined, notes: d.notes.trim() || undefined,
        customRate: d.customRate ? numIn(d.customRate) : editing ? null : undefined,
        ...(!editing && numIn(d.advancePayment) ? { advancePayment: numIn(d.advancePayment)!, advanceMethod: d.advanceMethod } : {}),
      };
      return dairyCustomersApi.save(id, body);
    },
    onSuccess: (c) => {
      [DAIRY_KEYS.customers, DAIRY_KEYS.customer, DAIRY_KEYS.routes, 'dairy-customers-dash', 'dairy-dashboard', 'customers', 'khata'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? 'Customer save' : `${c.name} jur gaye — ${c.customerNumber}`);
      navigate(`/dairy/customers/${c.id}`);
    },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    setTouched(true);
    if (problems.length) { toast.error(problems[0]); return; }
    save.mutate();
  };
  useSaveKey(submit);

  if (editing && existing.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editing && !existing.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Customer nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/dairy/customers')}>Customers par wapas</Button></div></PageShell>;

  const err = (k: string) => (touched ? errors[k] : undefined);
  const daily = (numIn(d.morningQuantity) ?? 0) + (numIn(d.eveningQuantity) ?? 0);
  const rate = numIn(d.customRate);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Customer form" onClose={guide.close}
          steps={[
            { icon: Milk, color: '#0ea5e9', title: 'Roz ki quantity', text: 'Subah aur shaam kitna doodh jata hai. Roz ki delivery list isi se banti hai; kisi din kam zyada ho to Delivery page par badlein.' },
            { icon: Wallet, color: '#16a34a', title: 'Rate', text: 'Khali chhor dein to dukaan ka delivery rate lagta hai. Is customer ka alag rate ho to yahan likhein.' },
            { icon: CalendarDays, color: '#d97706', title: 'Advance', text: 'Shuru me liya advance khate me jama hota hai aur har delivery us me se katti hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]} />
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${existing.data?.name} — badlein` : 'Naya doodh customer'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — khata aur pichli delivery waisi rahengi' : 'Naam, pata, roz ki quantity aur rate'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Customer</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Naam *" autoFocus value={d.name} onChange={(e) => set({ name: e.target.value })} error={err('name')} placeholder="Jaise: Aslam sahib" />
              <Input label="Phone" inputMode="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} error={err('phone')} placeholder="0300 1234567" hint="Isi phone ka khata pehle se ho to wahi jurta hai" />
              <Input label="CNIC (marzi)" value={d.cnic} onChange={(e) => set({ cnic: e.target.value })} error={err('cnic')} />
              <Input label="Bartan (marzi)" value={d.containerType} onChange={(e) => set({ containerType: e.target.value })} placeholder="Apna dabba, bottle, thaili" />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={MapPin}>Pata aur route</T>}>
            <div className="space-y-3">
              <Input label="Pata" value={d.address} onChange={(e) => set({ address: e.target.value })} placeholder="Ghar number, gali" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Area / mohalla" value={d.area} onChange={(e) => set({ area: e.target.value })} />
                <Input label="Nishani" value={d.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder="Masjid ke saath" />
              </div>
              <Select label="Route" value={d.routeId} onChange={(e) => set({ routeId: e.target.value })}
                options={[{ value: '', label: 'Bina route' }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: `${r.name}${r.areaName ? ` — ${r.areaName}` : ''}` }))]}
                hint="Rider ki list route ke hisaab se banti hai — Routes page par naya route banayein" />
            </div>
          </Card>
          <Card className="rounded-2xl" title="Note">
            <Textarea rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ghanti mat bajayein, darwaze par rakh dein…" />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Milk}>Roz ka doodh</T>} description={daily > 0 ? `Roz ${daily} liter${rate ? ` · takreeban ${formatPKR(daily * rate * 30)} mahina` : ''}` : undefined}>
            <div className="space-y-3">
              <div>
                <Input label="Subah (liter)" inputMode="decimal" value={d.morningQuantity} onChange={(e) => set({ morningQuantity: e.target.value })} error={err('morningQuantity')} />
                <div className="mt-1.5 flex flex-wrap gap-1">{QUICK.map((v) => <QuickChip key={v} on={numIn(d.morningQuantity) === v} onClick={() => set({ morningQuantity: String(v) })}>{v}</QuickChip>)}</div>
              </div>
              <div>
                <Input label="Shaam (liter)" inputMode="decimal" value={d.eveningQuantity} onChange={(e) => set({ eveningQuantity: e.target.value })} error={err('eveningQuantity')} />
                <div className="mt-1.5 flex flex-wrap gap-1">{QUICK.map((v) => <QuickChip key={v} on={numIn(d.eveningQuantity) === v} onClick={() => set({ eveningQuantity: String(v) })}>{v}</QuickChip>)}</div>
              </div>
              <Select label="Kab" value={d.deliveryFrequency} onChange={(e) => set({ deliveryFrequency: e.target.value as DeliveryFrequency })}
                options={Object.entries(FREQUENCY).map(([value, f]) => ({ value, label: f.label }))} hint={FREQUENCY[d.deliveryFrequency]?.hint} />
              <Input label="Rate (marzi)" inputMode="decimal" value={d.customRate} onChange={(e) => set({ customRate: e.target.value })} error={err('customRate')} hint="Khali = dukaan ka delivery rate" />
              <Input label="Kab se" type="date" value={d.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </div>
          </Card>
          {!editing && (
            <Card className="rounded-2xl" title={<T icon={Wallet}>Advance (marzi)</T>} description={canKhata ? 'Khate me jama hota hai; cash ho to khule drawer me' : 'Advance lene ke liye "Khata manage" ki permission chahiye'}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Amount (Rs)" inputMode="decimal" disabled={!canKhata} value={d.advancePayment} onChange={(e) => set({ advancePayment: e.target.value })} error={err('advancePayment')} />
                <Select label="Kaise" disabled={!canKhata} value={d.advanceMethod} onChange={(e) => set({ advanceMethod: e.target.value })} options={PAY_METHODS} />
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {touched && problems.length > 0
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{editing ? 'Save karein' : 'Customer roz ki delivery list me aa jayega'}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : 'Customer jorein'}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
const QuickChip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: number }) => (
  <button type="button" onClick={onClick} className={cn('h-7 rounded-md px-2 text-[0.75rem] font-semibold ring-1', on ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50')}>{children} L</button>
);
