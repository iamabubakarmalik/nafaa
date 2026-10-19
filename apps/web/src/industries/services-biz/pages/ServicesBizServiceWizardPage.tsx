/**
 * Service form (new and edit): name and trade, how it is charged (fixed,
 * per hour, per visit or by quote), visit and work charges with a range,
 * extra charges for emergency, night, weekend and out of city, time,
 * warranty and how it shows on the job form and counter.
 *
 * Keys: Ctrl+S save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Clock, GraduationCap, Receipt, Save, ShieldCheck, Tag } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Select, Skeleton, Switch, Textarea, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { catalogApi, type ChargeType, type ServiceCatalogItem, type ServiceInput } from '../api/catalog.api';
import { CATALOG_KEY, CATEGORIES, TRADES, apiError, categoryOf, digits, money, tradeOf } from '../components/meta';

const CHARGE: Array<{ value: ChargeType; label: string; hint: string }> = [
  { value: 'FIXED', label: 'Pakka rate', hint: 'Har dafa ek hi rate' },
  { value: 'PER_VISIT', label: 'Har visit', hint: 'Har dafa jaane ka rate' },
  { value: 'HOURLY', label: 'Ghante ka', hint: 'Jitne ghante, utna' },
  { value: 'QUOTE_BASED', label: 'Dekh kar batayenge', hint: 'Pehle quote, phir kaam' },
];
interface Draft {
  name: string; code: string; description: string; category: string; businessType: string; chargeType: ChargeType;
  visit: string; base: string; hourly: string; min: string; max: string; emergency: string; night: string; weekend: string; outCity: string;
  duration: string; warrantyDays: string; warrantyTerms: string; isEmergency: boolean; requiresQuote: boolean; requiresAdvance: boolean; advancePct: string;
  isPopular: boolean; isActive: boolean;
}
const EMPTY: Draft = {
  name: '', code: '', description: '', category: 'REPAIR', businessType: '', chargeType: 'FIXED', visit: '', base: '', hourly: '', min: '', max: '',
  emergency: '', night: '', weekend: '', outCity: '', duration: '60', warrantyDays: '', warrantyTerms: '', isEmergency: false, requiresQuote: false,
  requiresAdvance: false, advancePct: '', isPopular: false, isActive: true,
};
const s = (v?: number | null) => (v ? String(v) : '');
const fromService = (x: ServiceCatalogItem): Draft => ({
  name: x.name, code: x.code ?? '', description: x.description ?? '', category: x.category, businessType: x.businessType ?? '', chargeType: x.chargeType,
  visit: s(x.visitCharge), base: s(x.baseCharge), hourly: s(x.hourlyRate), min: s(x.minCharge), max: s(x.maxCharge), emergency: s(x.emergencyCharge),
  night: s(x.nightCharge), weekend: s(x.weekendCharge), outCity: s(x.outOfCityCharge), duration: String(x.estimatedDurationMin || 60),
  warrantyDays: s(x.warrantyDays), warrantyTerms: x.warrantyTerms ?? '', isEmergency: x.isEmergency, requiresQuote: x.requiresQuote,
  requiresAdvance: x.requiresAdvance, advancePct: s(x.advancePct), isPopular: x.isPopular || x.isFeatured, isActive: x.isActive,
});
const n = (v: string) => Number(v) || 0;

export default function ServicesBizServiceWizardPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [f, setF] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const lock = useRef(false);
  const set = (patch: Partial<Draft>) => setF((x) => ({ ...x, ...patch }));

  const svcQ = useQuery({ queryKey: [CATALOG_KEY, 'one', id], queryFn: () => catalogApi.getOne(id!), enabled: editing });
  useEffect(() => { if (svcQ.data) setF(fromService(svcQ.data)); }, [svcQ.data]);

  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    if (!f.name.trim()) out.name = 'Service ka naam likhein';
    if (f.chargeType === 'FIXED' && !n(f.base) && !n(f.visit)) out.base = 'Rate likhein (ya "Dekh kar batayenge" chunein)';
    if (f.chargeType === 'HOURLY' && !n(f.hourly)) out.hourly = 'Ghante ka rate likhein';
    if (f.chargeType === 'PER_VISIT' && !n(f.visit)) out.visit = 'Visit ka rate likhein';
    if (n(f.max) > 0 && n(f.max) < n(f.min)) out.max = 'Zyada se zyada, kam se kam se chhota nahi ho sakta';
    if (!(n(f.duration) > 0)) out.duration = 'Andaazan kitne minute';
    if (f.requiresAdvance && !(n(f.advancePct) > 0 && n(f.advancePct) <= 100)) out.advancePct = '1 se 100 % likhein';
    return out;
  }, [f]);
  const err = (k: string) => (touched ? problems[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const body: ServiceInput = {
        name: f.name.trim(), code: f.code.trim() || undefined, description: f.description.trim() || undefined, category: f.category as ServiceInput['category'],
        businessType: (f.businessType || undefined) as ServiceInput['businessType'], chargeType: f.chargeType,
        visitCharge: n(f.visit), baseCharge: f.chargeType === 'HOURLY' ? 0 : n(f.base), hourlyRate: f.chargeType === 'HOURLY' ? n(f.hourly) : 0,
        minCharge: n(f.min), maxCharge: n(f.max) || undefined, emergencyCharge: n(f.emergency), nightCharge: n(f.night), weekendCharge: n(f.weekend), outOfCityCharge: n(f.outCity),
        estimatedDurationMin: n(f.duration), warrantyDays: n(f.warrantyDays), warrantyTerms: f.warrantyTerms.trim() || undefined,
        isEmergency: f.isEmergency, requiresQuote: f.requiresQuote || f.chargeType === 'QUOTE_BASED', requiresAdvance: f.requiresAdvance, advancePct: f.requiresAdvance ? n(f.advancePct) : 0,
        isPopular: f.isPopular, isActive: f.isActive,
      };
      return editing ? catalogApi.update(id!, body) : catalogApi.create(body);
    },
    onSuccess: (svc) => {
      [CATALOG_KEY, 'products-catalog', 'products-for-pos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? `${svc.name} save ho gayi` : `${svc.name} rate list me aa gayi — counter par bhi`);
      navigate(`/services-biz-services/${svc.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
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
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && svcQ.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  const counter = n(f.base) || n(f.visit) || n(f.hourly);

  return (
    <PageShell>
      <PageHero
        title={editing ? `Service badlein — ${svcQ.data?.name ?? ''}` : 'Nayi service'}
        chip={<><Tag /> Rate list</>}
        meta="Job form aur counter dono isi rate se bharte hain"
        actions={<>
          <button type="button" onClick={() => navigate(-1)} title="Wapas (Esc)" className={heroIconButton}><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={submit} disabled={save.isPending} className={heroPrimaryButton}><Save className="h-4 w-4" />{save.isPending ? 'Save ho raha…' : 'Save'}</button>
        </>}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title="Service">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Naam" required value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus placeholder="AC general service" error={err('name')} wrapperClassName="sm:col-span-2" />
              <Select label="Kis tarah ka kaam" value={f.category} onChange={(e) => set({ category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: categoryOf(c) }))} />
              <Select label="Hunar" value={f.businessType} onChange={(e) => set({ businessType: e.target.value })} placeholder="Koi bhi" options={TRADES.map((t) => ({ value: t, label: tradeOf(t) }))} hint="Isi hunar wale technician pehle dikhte hain" />
              <Input label="Code" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="AC-GS" hint="Marzi hai — counter par dhoondne ke liye" />
              <Input label="Andaazan waqt (minute)" inputMode="numeric" value={f.duration} onChange={(e) => set({ duration: digits(e.target.value).slice(0, 4) })} error={err('duration')} leftIcon={<Clock className="h-4 w-4" />} />
              <Textarea label="Tafseel" rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Filter safai, gas check, drain pipe" wrapperClassName="sm:col-span-2" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-brand-600" />Rate</span>}>
            <div className="space-y-3">
              <div role="radiogroup" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {CHARGE.map((c) => (
                  <button key={c.value} type="button" role="radio" aria-checked={f.chargeType === c.value} onClick={() => set({ chargeType: c.value })}
                    className={cn('rounded-xl px-2 py-2 text-left ring-1', f.chargeType === c.value ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                    <span className="block text-[0.8125rem] font-semibold text-slate-900">{c.label}</span>
                    <span className="block text-[0.6875rem] text-slate-500">{c.hint}</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <M label="Visit charge" value={f.visit} onChange={(v) => set({ visit: v })} error={err('visit')} hint="Ghar / site jaane ka" />
                {f.chargeType === 'HOURLY'
                  ? <M label="Ghante ka rate" value={f.hourly} onChange={(v) => set({ hourly: v })} error={err('hourly')} />
                  : <M label="Kaam ka rate" value={f.base} onChange={(v) => set({ base: v })} error={err('base')} hint={f.chargeType === 'QUOTE_BASED' ? 'Andaza — job par badal sakte hain' : undefined} />}
                <div className="grid grid-cols-2 gap-2">
                  <M label="Kam se kam" value={f.min} onChange={(v) => set({ min: v })} />
                  <M label="Zyada se zyada" value={f.max} onChange={(v) => set({ max: v })} error={err('max')} />
                </div>
              </div>
              <p className="text-[0.75rem] font-medium text-slate-500">Extra charge (marzi hai)</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <M label="Emergency" value={f.emergency} onChange={(v) => set({ emergency: v })} />
                <M label="Raat" value={f.night} onChange={(v) => set({ night: v })} />
                <M label="Chhutti ka din" value={f.weekend} onChange={(v) => set({ weekend: v })} />
                <M label="Shehar se bahar" value={f.outCity} onChange={(v) => set({ outCity: v })} />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Warranty</span>}>
            <div className="space-y-3">
              <Input label="Kaam ki warranty (din)" inputMode="numeric" value={f.warrantyDays} onChange={(e) => set({ warrantyDays: digits(e.target.value).slice(0, 4) })} placeholder="30" hint="Bill ke din se ginti — 0 matlab koi nahi" />
              <Input label="Shartein" value={f.warrantyTerms} onChange={(e) => set({ warrantyTerms: e.target.value })} placeholder="Sirf kaam ki warranty, parts company ki" />
            </div>
          </Card>
          <Card className="rounded-2xl" title="Kaise dikhe">
            <div className="space-y-3">
              <Switch checked={f.isPopular} onChange={(e) => set({ isPopular: e.target.checked })} label="Popular" description="Job form me upar chip ki tarah" />
              <Switch checked={f.isEmergency} onChange={(e) => set({ isEmergency: e.target.checked })} label="Emergency kaam" description="Job 'Foran' ban kar aati hai" />
              <Switch checked={f.requiresQuote} onChange={(e) => set({ requiresQuote: e.target.checked })} label="Pehle quote dein" description="Kharcha dekh kar batana hota hai" />
              <Switch checked={f.requiresAdvance} onChange={(e) => set({ requiresAdvance: e.target.checked })} label="Advance lena hai" />
              {f.requiresAdvance && <Input label="Advance %" inputMode="decimal" value={f.advancePct} onChange={(e) => set({ advancePct: money(e.target.value) })} error={err('advancePct')} />}
              <Switch checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} label="Chaalu" description="Band service job aur counter par nahi aati" />
            </div>
          </Card>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">Counter (POS) par qeemat: <strong className="tabular-nums text-slate-900">{formatPKR(counter)}</strong> — bina stock ke service line.</div>
          <div className="flex items-center justify-between gap-3">
            <span className="hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save · <Kbd>Esc</Kbd> wapas</span>
            <Button onClick={submit} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>Save</Button>
          </div>
        </div>
      </div>
      {guide.isOpen && (
        <PageGuide title="Service — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Tag, color: '#2563eb', title: 'Naam aur hunar', text: 'Customer jo kehta hai wahi naam likhein: "AC gas refill", "Geyser fitting". Hunar se sahi technician pehle aata hai.' },
            { icon: Receipt, color: '#16a34a', title: 'Rate', text: 'Visit charge ghar jaane ka, kaam ka rate asal kaam ka. Pakka na ho to "Dekh kar batayenge" — job par andaza likhein.' },
            { icon: ShieldCheck, color: '#0891b2', title: 'Warranty', text: 'Jitne din ki warranty dete hain likhein — bill par chhapti hai aur Warranty register me aati hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function M({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  return <Input label={label} inputMode="decimal" value={value} onChange={(e) => onChange(money(e.target.value))} placeholder="0" error={error} hint={hint} className="text-right tabular-nums" />;
}
