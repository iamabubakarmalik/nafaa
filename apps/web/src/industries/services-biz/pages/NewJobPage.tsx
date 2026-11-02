/**
 * Job card form, for a new job and for changing one that is not billed:
 * the customer (found by phone), the service from the rate list or typed,
 * the item worked on, where the work is done and when, who does it, the
 * estimate, warranty and any advance taken now. Parts are added on the job
 * itself as they are used.
 *
 * Keys: Ctrl+S / Ctrl+Enter save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Box, CalendarClock, ClipboardList, GraduationCap, MapPin, Receipt, ShieldCheck, UserRound, Wallet, Wrench } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Select, Skeleton, Switch, Textarea, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { catalogApi } from '../api/catalog.api';
import { jobsApi, type JobCreateInput, type JobDetail, type LocationType, type Priority } from '../api/jobs.api';
import { techniciansApi } from '../api/technicians.api';
import { printJobCard } from '../components/slips';
import {
  CATALOG_KEY, CATEGORIES, JOB_KEY, LOCATIONS, MONEY_KEYS, PRIORITIES, TECH_KEY, apiError, atHour, categoryOf, digits, isOnSite, localInput, locationOf,
  money, priorityOf,
} from '../components/meta';
import { t as tr } from '@core/i18n';

interface Draft {
  customerId: string; name: string; phone: string; altPhone: string;
  serviceId: string; serviceName: string; category: string; problem: string; priority: Priority;
  brand: string; model: string; serial: string; underWarranty: boolean;
  location: LocationType; address: string; area: string; city: string; landmark: string;
  start: string; end: string; technicianId: string;
  visit: string; labour: string; transport: string; emergency: string; discount: string;
  warrantyDays: string; warrantyTerms: string; advance: string; method: PaymentMethod; techNotes: string; notes: string;
}
const EMPTY: Draft = {
  customerId: '', name: '', phone: '', altPhone: '', serviceId: '', serviceName: '', category: 'REPAIR', problem: '', priority: 'NORMAL',
  brand: '', model: '', serial: '', underWarranty: false, location: 'IN_SHOP', address: '', area: '', city: '', landmark: '',
  start: '', end: '', technicianId: '', visit: '', labour: '', transport: '', emergency: '', discount: '',
  warrantyDays: '', warrantyTerms: '', advance: '', method: 'CASH', techNotes: '', notes: '',
};
const n = (v: string) => Number(v) || 0;
const str = (v?: number | null) => (v ? String(v) : '');
const fromJob = (j: JobDetail): Draft => ({
  customerId: j.customerId ?? '', name: j.customerName ?? '', phone: j.customerPhone ?? '', altPhone: j.customerAltPhone ?? '',
  serviceId: j.serviceId ?? '', serviceName: j.serviceName, category: j.category, problem: j.problemDescription === j.serviceName ? '' : j.problemDescription, priority: j.priority,
  brand: j.brand ?? '', model: j.modelNumber ?? '', serial: j.serialNumber ?? '', underWarranty: j.underWarranty,
  location: j.locationType, address: j.serviceAddress ?? '', area: j.area ?? '', city: j.city ?? '', landmark: j.landmark ?? '',
  start: j.scheduledStart ? localInput(new Date(j.scheduledStart)) : '', end: j.scheduledEnd ? localInput(new Date(j.scheduledEnd)) : '', technicianId: j.primaryTechnicianId ?? '',
  visit: str(j.visitCharge), labour: str(j.labourCharge), transport: str(j.transportCharge), emergency: str(j.emergencyCharge), discount: str(j.discountAmount),
  warrantyDays: str(j.jobWarrantyDays), warrantyTerms: j.jobWarrantyTerms ?? '', advance: '', method: 'CASH', techNotes: j.technicianNotes ?? '', notes: j.internalNotes ?? '',
});

export default function NewJobPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const canTakeMoney = usePermission(PERMISSIONS.POS_USE);
  const guide = usePageGuide();
  useReceiptSetup();
  const [params] = useSearchParams();
  const [f, setF] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [print, setPrint] = useState(!editing);
  const [phoneQuery, setPhoneQuery] = useState('');
  const lock = useRef(false);
  const set = (patch: Partial<Draft>) => setF((x) => ({ ...x, ...patch }));

  const jobQ = useQuery({ queryKey: [JOB_KEY, 'one', id], queryFn: () => jobsApi.getOne(id!), enabled: editing });
  useEffect(() => { if (jobQ.data) setF(fromJob(jobQ.data)); }, [jobQ.data]);
  const svcQ = useQuery({ queryKey: [CATALOG_KEY, 'active'], queryFn: () => catalogApi.list({ active: true }), staleTime: 5 * 60_000 });
  const techQ = useQuery({ queryKey: [TECH_KEY], queryFn: () => techniciansApi.list(), staleTime: 5 * 60_000 });

  // A service preset from the rate list (?service=).
  useEffect(() => {
    const sid = params.get('service');
    const svc = sid ? svcQ.data?.find((s) => s.id === sid) : undefined;
    if (svc && !editing && !f.serviceId) pickService(svc.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svcQ.data]);

  useEffect(() => { const t = setTimeout(() => setPhoneQuery(f.customerId ? '' : digits(f.phone)), 300); return () => clearTimeout(t); }, [f.phone, f.customerId]);
  const lookQ = useQuery({ queryKey: ['customers', 'lookup', phoneQuery], queryFn: () => customersApi.list({ search: phoneQuery, limit: 5, scope: 'all' }), enabled: phoneQuery.length >= 7, staleTime: 30_000 });
  const match = lookQ.data?.items?.find((c) => digits(c.phone ?? '').endsWith(phoneQuery.slice(-10)));

  function pickService(sid: string) {
    const s = svcQ.data?.find((x) => x.id === sid);
    if (!s) { set({ serviceId: '' }); return; }
    set({
      serviceId: s.id, serviceName: s.name, category: s.category,
      visit: str(s.visitCharge), labour: str(s.baseCharge || s.hourlyRate), emergency: f.priority === 'EMERGENCY' ? str(s.emergencyCharge) : f.emergency,
      warrantyDays: str(s.warrantyDays), warrantyTerms: s.warrantyTerms ?? f.warrantyTerms,
      ...(s.isEmergency && { priority: 'URGENT' as Priority }),
    });
  }

  const partsCharge = jobQ.data?.partsCharge ?? 0;
  const gross = n(f.visit) + n(f.labour) + n(f.transport) + n(f.emergency) + partsCharge;
  const total = Math.max(gross - n(f.discount), 0);
  const svc = svcQ.data?.find((s) => s.id === f.serviceId);
  const onSite = isOnSite(f.location);

  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    if (!f.customerId && !f.name.trim() && !f.phone.trim()) out.name = tr('Customer ka naam ya phone likhein');
    if (f.phone && digits(f.phone).length < 10) out.phone = tr('Phone number poora likhein (03xx…)');
    if (!f.serviceId && !f.serviceName.trim()) out.service = tr('Service chunein ya kaam ka naam likhein');
    if (onSite && !f.address.trim() && !f.area.trim()) out.address = tr('Ghar / site ka pata likhein');
    if (!editing && f.start && new Date(f.start).getTime() < Date.now() - 30 * 60_000) out.start = tr('Ye waqt guzar chuka hai');
    if (f.start && f.end && new Date(f.end) < new Date(f.start)) out.end = tr('Khatam ka waqt shuru se pehle nahi ho sakta');
    if (n(f.discount) > gross + 0.001) out.discount = tr('Discount {{formatPKR}} se zyada nahi ho sakta', { formatPKR: formatPKR(gross) });
    if (svc?.maxCharge && n(f.labour) > svc.maxCharge) out.labour = tr('Rate list me zyada se zyada {{formatPKR}} hai', { formatPKR: formatPKR(svc.maxCharge) });
    if (n(f.advance) > 0 && total > 0 && n(f.advance) > total) out.advance = tr('Advance andaze ({{formatPKR}}) se zyada hai', { formatPKR: formatPKR(total) });
    if (n(f.advance) > 0 && !f.name.trim() && !f.customerId) out.advance = tr('Advance ke liye customer ka naam likhein');
    return out;
  }, [f, gross, total, onSite, editing, svc]);
  const err = (k: string) => (touched ? problems[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const opt = (v: string) => v.trim() || undefined;
      const details = {
        customerId: f.customerId || match?.id || undefined, customerName: opt(f.name), customerPhone: opt(f.phone), customerAltPhone: opt(f.altPhone),
        serviceId: f.serviceId || undefined, serviceName: opt(f.serviceName), category: f.category, priority: f.priority, problemDescription: opt(f.problem),
        brand: opt(f.brand), modelNumber: opt(f.model), serialNumber: opt(f.serial), underWarranty: f.underWarranty,
        locationType: f.location, serviceAddress: onSite ? opt(f.address) : undefined, area: onSite ? opt(f.area) : undefined, city: onSite ? opt(f.city) : undefined, landmark: onSite ? opt(f.landmark) : undefined,
        scheduledStart: f.start ? new Date(f.start).toISOString() : undefined, scheduledEnd: f.end ? new Date(f.end).toISOString() : undefined,
        visitCharge: n(f.visit), labourCharge: n(f.labour), transportCharge: n(f.transport), emergencyCharge: n(f.emergency), discountAmount: n(f.discount),
        jobWarrantyDays: n(f.warrantyDays), jobWarrantyTerms: opt(f.warrantyTerms), technicianNotes: opt(f.techNotes), internalNotes: opt(f.notes),
      };
      if (editing) return jobsApi.update(id!, details);
      const body: JobCreateInput = {
        ...details, shopId: shopId || undefined, primaryTechnicianId: f.technicianId || undefined, amcId: params.get('amc') || undefined,
        ...(n(f.advance) > 0 && { advancePaid: n(f.advance), advanceMethod: f.method }),
      };
      return jobsApi.create(body);
    },
    onSuccess: (job) => {
      [JOB_KEY, ...(n(f.advance) > 0 ? MONEY_KEYS : [])].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? tr('{{jobNumber}} save ho gaya', { jobNumber: job.jobNumber }) : tr('{{jobNumber}} ban gaya', { jobNumber: job.jobNumber }));
      if (print) printJobCard(job, shopName);
      navigate(`/services-biz/jobs/${job.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiError(e, editing ? tr('Save nahi hua') : tr('Job nahi bana'))),
    onSettled: () => { lock.current = false; },
  });

  const submit = () => {
    setTouched(true);
    const first = Object.values(problems)[0];
    if (first) { toast.error(first); return; }
    if (lock.current) return;
    lock.current = true;
    save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && jobQ.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;

  const popular = (svcQ.data ?? []).filter((s) => s.isPopular || s.isFeatured).slice(0, 8);

  return (
    <PageShell>
      <PageHero
        title={editing ? tr('Job badlein — {{value}}', { value: jobQ.data?.jobNumber ?? '' }) : tr('Naya job card')}
        chip={<><ClipboardList /> {editing ? tr('Badlein') : tr('Kaam lein')}</>}
        meta={editing ? tr('Bill banne tak sab kuch badal sakta hai') : tr('Customer, kaam, kahan aur kab — parts kaam ke dauran job par jorein')}
        actions={<>
          <button type="button" onClick={() => navigate(-1)} title={tr('Wapas (Esc)')} className={heroIconButton}><ArrowLeft className="h-4 w-4 rtl-flip" /></button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={submit} disabled={save.isPending} className={heroPrimaryButton}><ClipboardList className="h-4 w-4" />{save.isPending ? tr('Save ho raha…') : editing ? tr('Save') : tr('Job banayein')}</button>
        </>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>{tr('Customer')}</T>} description={tr('Phone likhte hi purana customer mil jata hai — udhaar aur advance usi ke khata me')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={tr('Phone')} inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value, customerId: '' })} placeholder="03001234567" autoFocus={!editing} error={err('phone')}
                hint={match ? tr('Purana customer: {{name}}{{value}}', { name: match.name, value: Number(match.balance) > 0 ? tr(' · {{formatPKR}} udhaar', { formatPKR: formatPKR(Number(match.balance)) }) : '' }) : tr('WhatsApp par khabar isi par jayegi')} />
              <Input label={tr('Naam')} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={match?.name ?? tr('Bilal Ahmad')} error={err('name')} />
              <Input label={tr('Doosra phone')} inputMode="tel" value={f.altPhone} onChange={(e) => set({ altPhone: e.target.value })} hint={tr('Marzi hai')} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wrench}>{tr('Kaam')}</T>}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label={tr('Rate list se service')} value={f.serviceId} onChange={(e) => pickService(e.target.value)} placeholder={tr('Chunein ya neeche likhein')}
                  options={(svcQ.data ?? []).map((s) => ({ value: s.id, label: s.name }))} hint={svc ? tr('{{category}} · {{estimatedDurationMin}} min', { category: categoryOf(svc.category), estimatedDurationMin: svc.estimatedDurationMin }) : svcQ.data && !svcQ.data.length ? tr('Service Catalog me rate list banayein') : undefined} />
                <Input label={tr('Kaam ka naam')} value={f.serviceName} onChange={(e) => set({ serviceName: e.target.value })} placeholder={tr('AC gas refill')} error={err('service')} />
              </div>
              {popular.length > 0 && !f.serviceId && (
                <div className="flex flex-wrap gap-1">
                  {popular.map((s) => <button key={s.id} type="button" onClick={() => pickService(s.id)} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{s.name}</button>)}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label={tr('Kis tarah ka kaam')} value={f.category} onChange={(e) => set({ category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: categoryOf(c) }))} />
                <Select label={tr('Jaldi')} value={f.priority} onChange={(e) => set({ priority: e.target.value as Priority })} options={PRIORITIES.map((p) => ({ value: p, label: priorityOf(p).label }))} />
              </div>
              <Textarea label={tr('Kharabi / kya karna hai')} rows={3} value={f.problem} onChange={(e) => set({ problem: e.target.value })} placeholder={tr('Customer ne kya bataya — thanda nahi karta, pani tapakta hai…')} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Box}>{tr('Cheez')}</T>} description={tr('Kis cheez par kaam hai — warranty aur agli dafa pehchan ke liye')}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label={tr('Brand')} value={f.brand} onChange={(e) => set({ brand: e.target.value })} placeholder={tr('Haier, Dawlance…')} />
                <Input label={tr('Model')} value={f.model} onChange={(e) => set({ model: e.target.value })} placeholder={tr('1.5 ton inverter')} />
                <Input label={tr('Serial number')} value={f.serial} onChange={(e) => set({ serial: e.target.value })} hint={tr('Marzi hai')} />
              </div>
              <Switch checked={f.underWarranty} onChange={(e) => set({ underWarranty: e.target.checked })} label={tr('Company warranty me hai')} description={tr('Sirf yaad ke liye — bill par asar nahi')} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={MapPin}>{tr('Kahan')}</T>}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {LOCATIONS.map((l) => (
                  <button key={l} type="button" onClick={() => set({ location: l })} aria-pressed={f.location === l}
                    className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', f.location === l ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{locationOf(l)}</button>
                ))}
              </div>
              {onSite && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label={tr('Pata')} value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder={tr('Ghar 12, Street 4')} error={err('address')} wrapperClassName="sm:col-span-2" />
                  <Input label={tr('Area')} value={f.area} onChange={(e) => set({ area: e.target.value })} placeholder={tr('DHA Phase 5')} />
                  <Input label={tr('Shehar')} value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder={tr('Lahore')} />
                  <Input label={tr('Nishani')} value={f.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder={tr('Masjid ke saath')} hint={tr('Technician ko dhoondne me aasani')} wrapperClassName="sm:col-span-2" />
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={CalendarClock}>{tr('Kab aur kaun')}</T>}>
            <div className="space-y-3">
              <div>
                <Input label={onSite ? tr('Visit ka waqt') : tr('Kab tayyar karna hai')} type="datetime-local" value={f.start} onChange={(e) => set({ start: e.target.value })} error={err('start')}
                  hint={tr('Is waqt ke baad job “Late” me aati hai')} />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {([[tr('Aaj shaam'), atHour(0, 17)], [tr('Kal subah'), atHour(1, 10)], [tr('Kal shaam'), atHour(1, 17)], [tr('Parson'), atHour(2, 12)]] as Array<[string, Date]>).map(([label, d]) => (
                    <button key={label} type="button" onClick={() => set({ start: localInput(d) })} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{label}</button>
                  ))}
                </div>
              </div>
              <Input label={tr('Kaam khatam hone ka waqt')} type="datetime-local" value={f.end} onChange={(e) => set({ end: e.target.value })} error={err('end')} hint={tr('Marzi hai')} />
              {!editing && (
                <Select label={tr('Technician')} value={f.technicianId} onChange={(e) => set({ technicianId: e.target.value })} placeholder={tr('Baad me')}
                  options={(techQ.data ?? []).map((t) => ({ value: t.staffId, label: `${t.staff?.fullName ?? 'Technician'}${t.openJobs ? ` (${t.openJobs} haath me)` : ''}` }))}
                  hint={techQ.data && !techQ.data.length ? tr('Technicians page par staff ko technician banayein') : tr('Job par baad me bhi laga sakte hain')} />
              )}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Receipt}>{tr('Andaza')}</T>} description={tr('Rate list se khud bharta hai — kaam ke baad badal sakte hain')}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Money label={tr('Visit charge')} value={f.visit} onChange={(v) => set({ visit: v })} />
                <Money label={tr('Kaam (labour)')} value={f.labour} onChange={(v) => set({ labour: v })} error={err('labour')} />
                <Money label={tr('Transport')} value={f.transport} onChange={(v) => set({ transport: v })} />
                <Money label={tr('Emergency charge')} value={f.emergency} onChange={(v) => set({ emergency: v })} />
                <Money label={tr('Discount')} value={f.discount} onChange={(v) => set({ discount: v })} error={err('discount')} />
              </div>
              {partsCharge > 0 && <p className="text-[0.8125rem] text-slate-600">{tr('Parts (job par jore hue): {{partsCharge}}', { partsCharge: formatPKR(partsCharge) })}</p>}
              <p className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900"><span>{tr('Kul andaza')}</span><span className="tabular-nums">{formatPKR(total)}</span></p>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={ShieldCheck}>{tr('Kaam ki warranty')}</T>}>
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Input label={tr('Din')} inputMode="numeric" value={f.warrantyDays} onChange={(e) => set({ warrantyDays: digits(e.target.value).slice(0, 4) })} placeholder="30" hint={tr('Bill ke din se')} />
              <Input label={tr('Shartein')} value={f.warrantyTerms} onChange={(e) => set({ warrantyTerms: e.target.value })} placeholder={tr('Sirf kaam ki warranty, parts company ki')} />
            </div>
          </Card>

          {!editing && canTakeMoney && (
            <Card className="rounded-2xl" title={<T icon={Wallet}>{tr('Advance')}</T>} description={tr('Abhi mila paisa customer ke khata me jama hota hai aur bill me katta hai')}>
              <div className="space-y-3">
                <Money label={tr('Advance (Rs)')} value={f.advance} onChange={(v) => set({ advance: v })} error={err('advance')} hint={n(f.advance) ? formatPKR(n(f.advance)) : tr('Khali chhorein agar kuch nahi mila')} />
                {n(f.advance) > 0 && <PaymentMethodPicker value={f.method} onChange={(method) => set({ method })} />}
              </div>
            </Card>
          )}

          <Card className="rounded-2xl">
            <div className="space-y-3">
              <Textarea label={tr('Technician ke liye note')} rows={2} value={f.techNotes} onChange={(e) => set({ techNotes: e.target.value })} placeholder={tr('Seerhi saath le jayein')} hint={tr('Parchi par nahi chhapta')} />
              <Textarea label={tr('Andar ka note')} rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={tr('Sirf staff ke liye')} />
              <Switch checked={print} onChange={(e) => setPrint(e.target.checked)} label={tr('Save ke baad parchi print karein')} />
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <span className="hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> {' '}{tr('save ·')}{' '} <Kbd>Esc</Kbd> {' '}{tr('wapas')}</span>
            <Button onClick={submit} loading={save.isPending} leftIcon={<ClipboardList className="h-4 w-4" />}>{editing ? tr('Save') : tr('Job banayein')}</Button>
          </div>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide title={editing ? tr('Job badlein') : tr('Naya job — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: tr('Customer'), text: tr('Phone likhein — purana customer khud mil jata hai. Naya ho to naam bhi likhein; udhaar ya advance par khata khud ban jata hai.') },
            { icon: Wrench, color: '#7c3aed', title: tr('Kaam'), text: tr('Rate list se service chunein — charges aur warranty khud bhar jate hain. List me na ho to kaam ka naam khud likhein.') },
            { icon: MapPin, color: '#0891b2', title: tr('Kahan'), text: tr('"Dukaan par" (saman aaya) ya "Customer ke ghar" (technician jayega). Ghar ka pata aur nishani likhein.') },
            { icon: Wallet, color: '#16a34a', title: tr('Advance'), text: tr('Advance customer ke khata me jama hota hai aur bill banate waqt khud kat jata hai.') },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function T({ icon: Icon, children }: { icon: typeof Wrench; children: string }) {
  return <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
}

function Money({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: ReactNode }) {
  return <Input label={label} inputMode="decimal" value={value} onChange={(e) => onChange(money(e.target.value))} placeholder="0" error={error} hint={hint} className="text-end tabular-nums" />;
}
