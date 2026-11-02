/**
 * New or edited home delivery customer: who, where, how much milk morning
 * and evening, how often, at what rate, and an advance at sign-up (goes on
 * the khata; needs "Khata manage"). Ctrl+S saves, G opens the guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarDays, GraduationCap, MapPin, Milk, UserRound, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Select, Skeleton, Textarea, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR } from '@core/lib/format';
import { dairyCustomersApi, type CustomerInput, type DeliveryFrequency } from '../api/customers.api';
import { routesApi } from '../api/routes.api';
import { useSaveKey } from '../hooks/usePageKeys';
import { DAIRY_KEYS, FREQUENCY, PAY_METHODS, dayKey, errorText, numIn, phoneOk, cnicOk } from '../lib/meta';
import { t } from '@core/i18n';

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
    if (!d.name.trim()) e.name = t('Naam likhein');
    if (!phoneOk(d.phone)) e.phone = t('Phone 10 se 15 hindse');
    if (!cnicOk(d.cnic)) e.cnic = t('CNIC 13 hindse (12345-1234567-1)');
    const m = numIn(d.morningQuantity) ?? 0;
    const ev = numIn(d.eveningQuantity) ?? 0;
    if (m < 0 || m > 500) e.morningQuantity = t('0 se 500 liter');
    if (ev < 0 || ev > 500) e.eveningQuantity = t('0 se 500 liter');
    if (d.deliveryFrequency !== 'ON_DEMAND' && m <= 0 && ev <= 0) e.morningQuantity = t('Subah ya shaam ki quantity likhein (ya "Jab maange" chunein)');
    if (d.customRate && !((numIn(d.customRate) ?? -1) >= 0)) e.customRate = t('Rate theek likhein');
    if (d.advancePayment && !((numIn(d.advancePayment) ?? -1) >= 0)) e.advancePayment = t('Amount theek likhein');
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
      toast.success(editing ? t('Customer save') : t('{{name}} jur gaye — {{customerNumber}}', { name: c.name, customerNumber: c.customerNumber }));
      navigate(`/dairy/customers/${c.id}`);
    },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    setTouched(true);
    if (problems.length) { toast.error(problems[0]); return; }
    save.mutate();
  };
  useSaveKey(submit);

  if (editing && existing.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editing && !existing.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">{t('Customer nahi mila')}</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/dairy/customers')}>{t('Customers par wapas')}</Button></div></PageShell>;

  const err = (k: string) => (touched ? errors[k] : undefined);
  const daily = (numIn(d.morningQuantity) ?? 0) + (numIn(d.eveningQuantity) ?? 0);
  const rate = numIn(d.customRate);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Customer form')} onClose={guide.close}
          steps={[
            { icon: Milk, color: '#0ea5e9', title: t('Roz ki quantity'), text: t('Subah aur shaam kitna doodh jata hai. Roz ki delivery list isi se banti hai; kisi din kam zyada ho to Delivery page par badlein.') },
            { icon: Wallet, color: '#16a34a', title: t('Rate'), text: t('Khali chhor dein to dukaan ka delivery rate lagta hai. Is customer ka alag rate ho to yahan likhein.') },
            { icon: CalendarDays, color: '#d97706', title: t('Advance'), text: t('Shuru me liya advance khate me jama hota hai aur har delivery us me se katti hai.') },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]} />
      )}

      <PageHero
        title={editing ? t('{{name}} — badlein', { name: existing.data?.name }) : t('Naya doodh customer')}
        subtitle={editing ? t('Jo badalna hai badlein — khata aur pichli delivery waisi rahengi') : t('Naam, pata, roz ki quantity aur rate')}
        back={() => navigate(-1)}
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> {' '}{t('save')}</span>}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} aria-label={t('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>{t('Customer')}</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('Naam *')} autoFocus value={d.name} onChange={(e) => set({ name: e.target.value })} error={err('name')} placeholder={t('Jaise: Aslam sahib')} />
              <Input label={t('Phone')} inputMode="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} error={err('phone')} placeholder="0300 1234567" hint={t('Isi phone ka khata pehle se ho to wahi jurta hai')} />
              <Input label={t('CNIC (marzi)')} value={d.cnic} onChange={(e) => set({ cnic: e.target.value })} error={err('cnic')} />
              <Input label={t('Bartan (marzi)')} value={d.containerType} onChange={(e) => set({ containerType: e.target.value })} placeholder={t('Apna dabba, bottle, thaili')} />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={MapPin}>{t('Pata aur route')}</T>}>
            <div className="space-y-3">
              <Input label={t('Pata')} value={d.address} onChange={(e) => set({ address: e.target.value })} placeholder={t('Ghar number, gali')} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label={t('Area / mohalla')} value={d.area} onChange={(e) => set({ area: e.target.value })} />
                <Input label={t('Nishani')} value={d.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder={t('Masjid ke saath')} />
              </div>
              <Select label={t('Route')} value={d.routeId} onChange={(e) => set({ routeId: e.target.value })}
                options={[{ value: '', label: t('Bina route') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: `${r.name}${r.areaName ? ` — ${r.areaName}` : ''}` }))]}
                hint={t('Rider ki list route ke hisaab se banti hai — Routes page par naya route banayein')} />
            </div>
          </Card>
          <Card className="rounded-2xl" title={t('Note')}>
            <Textarea rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={t('Ghanti mat bajayein, darwaze par rakh dein…')} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Milk}>{t('Roz ka doodh')}</T>} description={daily > 0 ? t('Roz {{daily}} liter{{value}}', { daily, value: rate ? t(' · takreeban {{formatPKR}} mahina', { formatPKR: formatPKR(daily * rate * 30) }) : '' }) : undefined}>
            <div className="space-y-3">
              <div>
                <Input label={t('Subah (liter)')} inputMode="decimal" value={d.morningQuantity} onChange={(e) => set({ morningQuantity: e.target.value })} error={err('morningQuantity')} />
                <div className="mt-1.5 flex flex-wrap gap-1">{QUICK.map((v) => <QuickChip key={v} on={numIn(d.morningQuantity) === v} onClick={() => set({ morningQuantity: String(v) })}>{v}</QuickChip>)}</div>
              </div>
              <div>
                <Input label={t('Shaam (liter)')} inputMode="decimal" value={d.eveningQuantity} onChange={(e) => set({ eveningQuantity: e.target.value })} error={err('eveningQuantity')} />
                <div className="mt-1.5 flex flex-wrap gap-1">{QUICK.map((v) => <QuickChip key={v} on={numIn(d.eveningQuantity) === v} onClick={() => set({ eveningQuantity: String(v) })}>{v}</QuickChip>)}</div>
              </div>
              <Select label={t('Kab')} value={d.deliveryFrequency} onChange={(e) => set({ deliveryFrequency: e.target.value as DeliveryFrequency })}
                options={Object.entries(FREQUENCY).map(([value, f]) => ({ value, label: f.label }))} hint={FREQUENCY[d.deliveryFrequency]?.hint} />
              <Input label={t('Rate (marzi)')} inputMode="decimal" value={d.customRate} onChange={(e) => set({ customRate: e.target.value })} error={err('customRate')} hint={t('Khali = dukaan ka delivery rate')} />
              <Input label={t('Kab se')} type="date" value={d.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </div>
          </Card>
          {!editing && (
            <Card className="rounded-2xl" title={<T icon={Wallet}>{t('Advance (marzi)')}</T>} description={canKhata ? t('Khate me jama hota hai; cash ho to khule drawer me') : t('Advance lene ke liye "Khata manage" ki permission chahiye')}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label={t('Amount (Rs)')} inputMode="decimal" disabled={!canKhata} value={d.advancePayment} onChange={(e) => set({ advancePayment: e.target.value })} error={err('advancePayment')} />
                <Select label={t('Kaise')} disabled={!canKhata} value={d.advanceMethod} onChange={(e) => set({ advanceMethod: e.target.value })} options={PAY_METHODS} />
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {touched && problems.length > 0
          ? <p className="me-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="me-auto text-[0.8125rem] text-slate-500">{editing ? t('Save karein') : t('Customer roz ki delivery list me aa jayega')}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>{t('Rehne dein')}</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? t('Save karein') : t('Customer jorein')}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
const QuickChip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: number }) => (
  <button type="button" onClick={onClick} className={cn('h-7 rounded-md px-2 text-[0.75rem] font-semibold ring-1', on ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50')}>{t('{{children}} L', { children })}</button>
);
