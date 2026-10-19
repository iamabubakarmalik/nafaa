/**
 * Add or edit a salon service on one page: name and category, rate (and a
 * discount rate), the shop's own cost, time with gaps before and after,
 * who it is for, stylist commission and how it shows at the counter.
 *
 * Keys: Ctrl+Enter or Ctrl+S save · Esc back.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Percent, Scissors, Sparkles, Wallet } from 'lucide-react';
import { HeroBack } from '@core/components/HeroBack';
import { Button, Card, Checkbox, Input, Kbd, PageHero, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { salonServicesApi, type SalonServiceInput, type ServiceCategory } from '../api/services.api';
import { CardTitle } from '../components/ui';
import { CATEGORIES, SALON_KEYS, apiError, minutes, opt } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

interface Draft {
  name: string; code: string; category: ServiceCategory; description: string; price: string; discountPrice: string; costPrice: string;
  durationMinutes: string; bufferBefore: string; bufferAfter: string; forMen: boolean; forWomen: boolean; forKids: boolean;
  commissionPct: string; commissionFixed: string; isPopular: boolean; isFeatured: boolean; isActive: boolean; displayOrder: string;
}
const EMPTY: Draft = {
  name: '', code: '', category: 'HAIR_CUT', description: '', price: '', discountPrice: '', costPrice: '', durationMinutes: '30', bufferBefore: '0', bufferAfter: '0',
  forMen: true, forWomen: true, forKids: false, commissionPct: '', commissionFixed: '', isPopular: false, isFeatured: false, isActive: true, displayOrder: '0',
};
const TIMES = [15, 30, 45, 60, 90, 120, 180];
const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function SalonServiceWizardPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useSalonCan();
  const lock = useRef(false);
  const [d, setD] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const q = useQuery({ queryKey: [SALON_KEYS.services, 'one', id], queryFn: () => salonServicesApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const s = q.data;
    if (!s) return;
    const str = (v?: number | null) => (v == null ? '' : String(v));
    setD({
      name: s.name, code: s.code ?? '', category: s.category, description: s.description ?? '', price: String(s.price), discountPrice: str(s.discountPrice), costPrice: str(s.costPrice),
      durationMinutes: String(s.durationMinutes), bufferBefore: String(s.bufferBefore ?? 0), bufferAfter: String(s.bufferAfter ?? 0),
      forMen: s.forMen, forWomen: s.forWomen, forKids: s.forKids, commissionPct: s.commissionPct ? String(s.commissionPct) : '', commissionFixed: s.commissionFixed ? String(s.commissionFixed) : '',
      isPopular: s.isPopular, isFeatured: s.isFeatured, isActive: s.isActive, displayOrder: String(s.displayOrder ?? 0),
    });
  }, [q.data]);

  const price = Number(d.price);
  const disc = num(d.discountPrice);
  const costP = num(d.costPrice);
  const pct = num(d.commissionPct);
  const errors = {
    name: d.name.trim().length < 2 ? 'Service ka naam likhein' : undefined,
    price: d.price === '' || !(price >= 0) ? 'Rate likhein' : undefined,
    discountPrice: disc != null && (disc < 0 || disc >= price) ? 'Discount rate asal rate se kam ho' : undefined,
    costPrice: costP != null && costP < 0 ? 'Cost sahi likhein' : undefined,
    durationMinutes: !(Number(d.durationMinutes) >= 5) ? 'Kam az kam 5 minute' : undefined,
    commissionPct: pct != null && (pct < 0 || pct > 100) ? '0 se 100 tak' : undefined,
    forWho: !d.forMen && !d.forWomen && !d.forKids ? 'Kam az kam ek chunein' : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: () => {
      const body: SalonServiceInput = {
        name: d.name.trim(), code: opt(d.code), category: d.category, description: opt(d.description), price,
        discountPrice: disc ?? null, costPrice: costP ?? null, durationMinutes: Number(d.durationMinutes), bufferBefore: Number(d.bufferBefore) || 0, bufferAfter: Number(d.bufferAfter) || 0,
        forMen: d.forMen, forWomen: d.forWomen, forKids: d.forKids, commissionPct: pct ?? 0, commissionFixed: num(d.commissionFixed) ?? 0,
        isPopular: d.isPopular, isFeatured: d.isFeatured, isActive: d.isActive, displayOrder: Number(d.displayOrder) || 0,
      };
      return editing ? salonServicesApi.update(id!, body) : salonServicesApi.create(body);
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: [SALON_KEYS.services] });
      qc.invalidateQueries({ queryKey: ['products-for-pos'] });
      toast.success(editing ? `${s.name} save ho gayi` : `${s.name} ban gayi — ab counter aur booking me hai`);
      navigate(`/salon-services/${s.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => {
    setTried(true);
    if (invalid) { toast.error(Object.values(errors).find(Boolean)!); return; }
    if (lock.current || save.isPending) return;
    lock.current = true; save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && q.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  const charged = disc ?? price;
  const profit = (Number.isFinite(charged) ? charged : 0) - (costP ?? 0) - (Number.isFinite(charged) ? (charged * (pct ?? 0)) / 100 : 0) - (num(d.commissionFixed) ?? 0);

  return (
    <PageShell>
      <PageHero
        title={<HeroBack to="/salon/services" label="Services">{editing ? `${q.data?.name ?? 'Service'} — badlein` : 'Nayi service'}</HeroBack>}
        meta="Rate, waqt aur commission — counter aur booking yahin se lete hain"
        actions={<span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>}
        stats={[
          { label: 'Customer dega', value: formatPKR(Number.isFinite(charged) ? charged : 0) },
          { label: 'Waqt', value: minutes(Number(d.durationMinutes) || 0) },
          { label: 'Dukaan ko bachega', value: formatPKR(profit), hint: 'Cost aur commission ke baad' },
        ]}
      />
      {!can.catalog && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Service badalne ke liye "Products edit" ki permission chahiye. Aap sirf dekh sakte hain.</p>}

      <fieldset disabled={!can.catalog} className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<CardTitle icon={Scissors}>Service</CardTitle>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Naam" required value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Hair cut (gents)" maxLength={120} error={err('name')} hint="Bill aur booking par yahi chhapta hai" />
              <Select label="Category" value={d.category} onChange={(e) => set('category', e.target.value as ServiceCategory)} options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} hint="Counter par isi se groups bante hain" />
              <Input label="Code" value={d.code} onChange={(e) => set('code', e.target.value)} placeholder="HC1" maxLength={40} hint="Marzi hai — jaldi dhoondne ke liye" />
              <Input label="Tarteeb" inputMode="numeric" value={d.displayOrder} onChange={(e) => set('displayOrder', e.target.value.replace(/\D/g, ''))} hint="Chhota number counter par pehle" />
            </div>
            <Textarea wrapperClassName="mt-3" label="Tafseel" value={d.description} onChange={(e) => set('description', e.target.value)} rows={2} maxLength={2000} placeholder="Wash + cut + blow dry" hint="Marzi hai" />
          </Card>

          <Card className="rounded-2xl" title={<CardTitle icon={Wallet}>Rate aur Cost</CardTitle>}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Rate" required inputMode="decimal" value={d.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} placeholder="800" error={err('price')} hint="Rate list ka rate" />
              <Input label="Discount rate" inputMode="decimal" value={d.discountPrice} onChange={(e) => set('discountPrice', e.target.value.replace(/[^\d.]/g, ''))} placeholder="—" error={err('discountPrice')} hint="Ho to counter yahi lagata hai" />
              <Input label="Dukaan ki Cost" inputMode="decimal" value={d.costPrice} onChange={(e) => set('costPrice', e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" error={err('costPrice')} hint="Bijli, towel waghera. Colour jaisi cheezein bill par 'Istemal' me alag" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<CardTitle icon={Clock}>Waqt</CardTitle>}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {TIMES.map((t) => (
                  <button key={t} type="button" onClick={() => set('durationMinutes', String(t))}
                    className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', Number(d.durationMinutes) === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{minutes(t)}</button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Kitne minute" required inputMode="numeric" value={d.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value.replace(/\D/g, ''))} error={err('durationMinutes')} hint="Booking ka khatam hone ka time isi se" />
                <Input label="Pehle tayyari (min)" inputMode="numeric" value={d.bufferBefore} onChange={(e) => set('bufferBefore', e.target.value.replace(/\D/g, ''))} hint="Chair saaf, saman" />
                <Input label="Baad me (min)" inputMode="numeric" value={d.bufferAfter} onChange={(e) => set('bufferAfter', e.target.value.replace(/\D/g, ''))} hint="Agli booking se pehle gap" />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<CardTitle icon={Percent}>Stylist commission</CardTitle>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Commission %" inputMode="decimal" value={d.commissionPct} onChange={(e) => set('commissionPct', e.target.value.replace(/[^\d.]/g, ''))} placeholder="—" error={err('commissionPct')} />
              <Input label="Ya fixed Rs" inputMode="decimal" value={d.commissionFixed} onChange={(e) => set('commissionFixed', e.target.value.replace(/[^\d.]/g, ''))} placeholder="—" />
            </div>
            <p className="mt-2 text-[0.75rem] text-slate-500">Khali chhorein to har stylist ka apna rate lagta hai (Staff page). Package session par list rate par commission banti hai.</p>
          </Card>

          <Card className="rounded-2xl" title={<CardTitle icon={Sparkles}>Kis ke liye aur counter</CardTitle>}>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4">
                <Checkbox label="Mard" checked={d.forMen} onChange={(e) => set('forMen', e.target.checked)} />
                <Checkbox label="Khawateen" checked={d.forWomen} onChange={(e) => set('forWomen', e.target.checked)} />
                <Checkbox label="Bachay" checked={d.forKids} onChange={(e) => set('forKids', e.target.checked)} />
              </div>
              {tried && errors.forWho && <p className="text-[0.75rem] text-rose-600">{errors.forWho}</p>}
              <Switch label="Popular" description="Counter par sitara aur upar" checked={d.isPopular} onChange={(e) => set('isPopular', e.target.checked)} />
              <Switch label="Khaas (featured)" description="Rate list me sab se pehle" checked={d.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
              <Switch label="Chalu" description="Band ho to counter aur booking me nahi aati, history rehti hai" checked={d.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Wapas</Button>
            <Button fullWidth size="lg" loading={save.isPending} onClick={submit}>{editing ? 'Save karein' : 'Service banayein'}</Button>
          </div>
        </div>
      </fieldset>
    </PageShell>
  );
}
