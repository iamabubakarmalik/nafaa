/**
 * New field visit, built for one thumb outside a shop: pick a lead or type a
 * new shop, GPS is taken automatically, optional photo (shrunk on the phone),
 * interest, demo, follow-up and a note.
 *
 * Saving sends the visit straight away. If there is no internet it is kept
 * on the phone (with its photo) and sent later by the outbox; the server
 * saves it once thanks to the clientId.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Camera, CheckCircle2, CloudOff, Crosshair, Flame, ImagePlus, Loader2, MapPin, Plus, Presentation, RefreshCw, Search, Snowflake, Store, Sun, Trash2, X,
} from 'lucide-react';
import { Alert, Badge, Button, Input, PageHero, PageShell, Segmented, Switch, Textarea, confirmDialog } from '@/design-system/components';
import { errorText, isNetworkError } from '@/api/client';
import { partnerApi } from '@/api/partner.api';
import type { Interest, Lead, VisitInput, VisitResult } from '@/api/types';
import { useAuthStore } from '@/store/auth.store';
import { SHOP_CATEGORIES } from '@/lib/constants';
import { STAGE, VISIT_FLAG } from '@/lib/labels';
import { dateInputToIso, todayInput } from '@/lib/format';
import { isMobile, normalizePhone, prettyPhone } from '@/lib/phone';
import { cn } from '@/lib/cn';
import { ChoiceGrid } from '@/ui/ChoiceGrid';
import { compressPhoto } from '@/offline/image';
import { UploadError, newClientId, sendVisit, useOutbox } from '@/offline/outbox';
import { useGeo } from './useGeo';

type Mode = 'new' | 'existing';

interface ShopForm { shopName: string; ownerName: string; phone: string; category: string; city: string; address: string }

const addDaysInput = (n: number) => new Date(Date.now() + 5 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
const FOLLOW_CHIPS = [{ label: 'Kal', days: 1 }, { label: '3 din', days: 3 }, { label: '1 hafta', days: 7 }, { label: '2 hafte', days: 14 }];

function Block({ n, title, hint, children, action }: { n: number; title: string; hint?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.8125rem] font-bold text-white">{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-7 text-slate-900">{title}</h2>
          {hint && <p className="text-[0.8125rem] text-slate-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LeadPicker({ selected, onSelect }: { selected: Lead | null; onSelect: (l: Lead | null) => void }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const id = setTimeout(() => setDebounced(term.trim()), 300); return () => clearTimeout(id); }, [term]);
  const online = useOutbox((s) => s.online);
  const q = useQuery({ queryKey: ['leads', 'pick', debounced], queryFn: () => partnerApi.leads({ search: debounced, limit: 8 }), enabled: !selected && online });

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-200">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100"><Store className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{selected.shopName}</p>
          <p className="truncate text-[0.8125rem] text-slate-600">{[selected.ownerName, prettyPhone(selected.phone)].filter(Boolean).join(' · ')}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onSelect(null)}>Badlein</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      <Input size="lg" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Dukaan, malik ya number se dhoondein" leftIcon={<Search className="h-4 w-4" />} aria-label="Lead dhoondein" />
      {!online ? (
        <Alert tone="warning">Internet nahi hai, is liye purani leads nahi dhoond sakte. "Nayi dukaan" me number likhein: agar ye lead pehle se aap ki hai to visit usi me jur jayega.</Alert>
      ) : q.isPending ? (
        <div className="flex items-center gap-2 px-1 py-3 text-[0.875rem] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Dhoond rahe hain…</div>
      ) : q.isError ? (
        <Alert tone="danger">{errorText(q.error)}</Alert>
      ) : q.data.items.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-[0.875rem] text-slate-500">{debounced ? 'Koi lead nahi mili' : 'Abhi koi lead nahi. "Nayi dukaan" chunein.'}</p>
      ) : (
        <ul className="space-y-1.5">
          {q.data.items.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => onSelect(l)} className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-start ring-1 ring-slate-200/70 transition active:scale-[0.99] hover:bg-slate-100">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{l.shopName}</p>
                  <p className="truncate text-[0.8125rem] text-slate-500">{[l.ownerName, prettyPhone(l.phone), l.city].filter(Boolean).join(' · ')}</p>
                </div>
                <Badge size="sm" variant={STAGE[l.stage].badge}>{STAGE[l.stage].label}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GeoCard({ geo, onRetry }: { geo: ReturnType<typeof useGeo>['state']; onRetry: () => void }) {
  if (geo.status === 'ok') {
    const weak = geo.accuracy > 200;
    return (
      <div className={cn('flex items-center gap-3 rounded-2xl p-3 ring-1', weak ? 'bg-amber-50 ring-amber-200' : 'bg-success-50 ring-success-200')}>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white', weak ? 'text-amber-600' : 'text-success-600')}>
          {geo.refining ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('font-semibold', weak ? 'text-amber-900' : 'text-success-900')}>{weak ? 'Location kamzor hai' : 'Location mil gayi'}</p>
          <p className="text-[0.8125rem] text-slate-600">±{geo.accuracy} meter{geo.refining ? ' · behtar kar rahe hain…' : ''}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRetry} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Dobara</Button>
      </div>
    );
  }
  if (geo.status === 'error') {
    return (
      <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-rose-900">Location nahi mili</p>
            <p className="text-[0.8125rem] text-rose-800">{geo.message}</p>
            <p className="mt-1 text-[0.8125rem] text-rose-800">Location ke baghair bhi save ho sakta hai, lekin Nafaa ise check ke liye mark karega.</p>
          </div>
        </div>
        <Button className="mt-2.5" fullWidth variant="secondary" onClick={onRetry} leftIcon={<Crosshair className="h-4 w-4" />}>Dobara location lein</Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600"><Loader2 className="h-5 w-5 animate-spin" /></span>
      <div><p className="font-semibold text-slate-900">Location le rahe hain…</p><p className="text-[0.8125rem] text-slate-500">Phone ka GPS on rakhein</p></div>
    </div>
  );
}

function PhotoPicker({ photo, onChange }: { photo: Blob | null; onChange: (b: Blob | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await compressPhoto(file)); } catch { toast.error('Ye photo nahi khul saki. Dobara lein.'); } finally { setBusy(false); }
  };

  return (
    <div>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      {url ? (
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <img src={url} alt="Dukaan ki photo" className="max-h-72 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2.5">
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[0.75rem] font-medium text-white">{Math.round((photo?.size ?? 0) / 1024)} KB</span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => input.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/90 px-3 text-[0.8125rem] font-semibold text-slate-800"><Camera className="h-4 w-4" />Badlein</button>
              <button type="button" onClick={() => onChange(null)} aria-label="Photo hatayein" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-600 transition active:scale-[0.99] hover:border-brand-400 hover:bg-brand-50/50">
          {busy ? <Loader2 className="h-7 w-7 animate-spin text-brand-600" /> : <ImagePlus className="h-7 w-7 text-brand-600" />}
          <span className="text-[0.9375rem] font-semibold">{busy ? 'Photo tayyar ho rahi hai…' : 'Dukaan ki photo lein'}</span>
          <span className="text-[0.75rem] text-slate-500">Board ya counter saaf nazar aaye</span>
        </button>
      )}
    </div>
  );
}

type Done = { kind: 'sent'; result: VisitResult } | { kind: 'queued'; label: string };

export default function NewVisitPage() {
  const me = useAuthStore((s) => s.me);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const addToOutbox = useOutbox((s) => s.add);
  const { state: geo, start: startGeo } = useGeo();

  const [mode, setMode] = useState<Mode>(params.get('lead') ? 'existing' : 'new');
  const [lead, setLead] = useState<Lead | null>(null);
  const [shop, setShop] = useState<ShopForm>({ shopName: '', ownerName: '', phone: '', category: '', city: me?.city ?? '', address: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ShopForm, string>>>({});
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [interest, setInterest] = useState<Interest | ''>('');
  const [demo, setDemo] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => { startGeo(); }, [startGeo]);

  // Opened from a lead page ("Naya Visit" there): load that lead.
  const leadParam = params.get('lead');
  const preset = useQuery({ queryKey: ['lead', leadParam], queryFn: () => partnerApi.lead(leadParam!), enabled: !!leadParam });
  useEffect(() => { if (preset.data) setLead(preset.data); }, [preset.data]);

  const setField = <K extends keyof ShopForm>(k: K, v: ShopForm[K]) => { setShop((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: undefined })); };

  const reset = () => {
    setLead(null); setShop({ shopName: '', ownerName: '', phone: '', category: '', city: me?.city ?? '', address: '' });
    setPhoto(null); setInterest(''); setDemo(false); setFollowUp(''); setNote(''); setError(''); setDone(null);
    startGeo();
    window.scrollTo({ top: 0 });
  };

  const save = async () => {
    setError('');
    if (mode === 'existing' && !lead) { setError('Lead chunein, ya "Nayi dukaan" likhein'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (mode === 'new') {
      const e: typeof errors = {};
      if (shop.shopName.trim().length < 2) e.shopName = 'Dukaan ka naam likhein';
      if (!isMobile(shop.phone)) e.phone = 'Mobile number 03xx xxxxxxx shakal me likhein';
      setErrors(e);
      if (Object.keys(e).length) { document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    }
    if (geo.status !== 'ok') {
      const ok = await confirmDialog({ title: 'Location ke baghair save karein?', text: 'Is visit par "Location nahi thi" ka nishan lagega aur Nafaa ise check karega.', yes: 'Haan, save karein' });
      if (!ok) return;
    }

    const body: VisitInput = {
      clientId: newClientId(),
      visitedAt: new Date().toISOString(),
      ...(mode === 'existing' && lead ? { leadId: lead.id } : {
        lead: {
          shopName: shop.shopName.trim(), phone: normalizePhone(shop.phone), ownerName: shop.ownerName.trim() || undefined,
          category: shop.category || undefined, city: shop.city.trim() || undefined, address: shop.address.trim() || undefined,
        },
      }),
      ...(geo.status === 'ok' ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : {}),
      ...(interest ? { interest } : {}),
      ...(followUp ? { followUpAt: dateInputToIso(followUp) } : {}),
      ...(demo ? { stage: 'DEMO' as const } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    const label = mode === 'existing' && lead ? lead.shopName : shop.shopName.trim();
    const queue = async () => {
      await addToOutbox({ clientId: body.clientId, body, photo, label, createdAt: new Date().toISOString(), attempts: 0 });
      setDone({ kind: 'queued', label });
    };

    setSaving(true);
    try {
      if (!navigator.onLine) { await queue(); return; }
      let result: VisitResult;
      try {
        result = await sendVisit({ body, photo });
      } catch (e) {
        if (e instanceof UploadError && !e.network) {
          const ok = await confirmDialog({ title: 'Photo upload nahi hui', text: 'Visit photo ke baghair save kar dein?', yes: 'Haan, save karein' });
          if (!ok) return;
          result = await sendVisit({ body, photo: null });
        } else throw e;
      }
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['leads'] });
      void qc.invalidateQueries({ queryKey: ['lead', result.lead.id] });
      setDone({ kind: 'sent', result });
    } catch (e) {
      if (isNetworkError(e) || (e instanceof UploadError && e.network)) await queue();
      else { setError(errorText(e)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    const flags = done.kind === 'sent' ? (done.result.flags ?? []) : [];
    return (
      <PageShell>
        <section className="mx-auto w-full max-w-xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/80">
          {done.kind === 'sent' ? (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-success-50 text-success-600 ring-1 ring-success-200"><CheckCircle2 className="h-8 w-8" /></span>
              <h1 className="mt-4 text-xl font-bold text-slate-900">Visit save ho gaya</h1>
              <p className="mt-1 text-[0.9375rem] text-slate-500">{done.result.lead.shopName}{done.result.duplicate ? ' (ye visit pehle hi save tha)' : ''}</p>
              {flags.length > 0 && (
                <Alert tone="warning" className="mt-4 text-start" title="Nafaa is visit ko check karega">
                  {flags.map((f) => VISIT_FLAG[f] ?? f).join(' · ')}
                </Alert>
              )}
            </>
          ) : (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 ring-1 ring-amber-200"><CloudOff className="h-8 w-8" /></span>
              <h1 className="mt-4 text-xl font-bold text-slate-900">Bheja nahi gaya</h1>
              <p className="mx-auto mt-1 max-w-sm text-[0.9375rem] text-slate-500">{done.label}: visit phone me save hai. Internet aate hi khud chala jayega.</p>
            </>
          )}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button size="xl" onClick={reset} leftIcon={<Plus className="h-5 w-5" />}>Ek aur Visit</Button>
            {done.kind === 'sent'
              ? <Button size="xl" variant="secondary" onClick={() => navigate(`/leads/${done.result.lead.id}`)}>Lead dekhein</Button>
              : <Button size="xl" variant="secondary" onClick={() => navigate('/')}>Dashboard</Button>}
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero title="Naya Visit" subtitle="Dukaan par hi bharein; location khud lag jati hai" back="/" />
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <Block n={1} title="Kis dukaan par hain?">
        <Segmented<Mode> label="Dukaan" value={mode} onChange={(v) => { setMode(v); setError(''); }} className="mb-3 flex w-full rounded-xl p-1 [&>button]:h-11 [&>button]:flex-1 [&>button]:justify-center [&>button]:rounded-lg [&>button]:text-[0.9375rem]"
          items={[{ value: 'new', label: 'Nayi dukaan' }, { value: 'existing', label: 'Pehle se lead' }]} />
        {mode === 'existing' ? <LeadPicker selected={lead} onSelect={setLead} /> : (
          <div className="space-y-3.5">
            <Input label="Dukaan ka naam" size="lg" value={shop.shopName} onChange={(e) => setField('shopName', e.target.value)} error={errors.shopName} placeholder="Madina General Store" required />
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label="Malik ka naam" size="lg" value={shop.ownerName} onChange={(e) => setField('ownerName', e.target.value)} placeholder="Zaroori nahi" autoComplete="off" />
              <Input label="Mobile number" size="lg" value={shop.phone} onChange={(e) => setField('phone', e.target.value)} error={errors.phone} placeholder="03xx xxxxxxx" inputMode="tel" autoComplete="off" required />
            </div>
            <div>
              <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Dukaan ki qisam</p>
              <div className="flex flex-wrap gap-2">
                {SHOP_CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => setField('category', shop.category === c ? '' : c)} aria-pressed={shop.category === c}
                    className={cn('h-10 rounded-full px-3.5 text-[0.875rem] font-semibold ring-1 transition active:scale-95',
                      shop.category === c ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input label="Shehar" size="lg" value={shop.city} onChange={(e) => setField('city', e.target.value)} />
              <Input label="Pata / market" size="lg" value={shop.address} onChange={(e) => setField('address', e.target.value)} placeholder="Zaroori nahi" />
            </div>
          </div>
        )}
      </Block>

      <div className="space-y-4">
      <Block n={2} title="Location">
        <GeoCard geo={geo} onRetry={startGeo} />
      </Block>

      <Block n={3} title="Photo" hint="Zaroori nahi, lekin visit pakka hota hai">
        <PhotoPicker photo={photo} onChange={setPhoto} />
      </Block>

      <Block n={4} title="Dukaandar ki dilchaspi">
        <ChoiceGrid<Interest> label="Dilchaspi" value={interest} onChange={(v) => setInterest(interest === v ? '' : v)} cols={3} compact
          items={[
            { value: 'HOT', label: 'Hot', icon: <Flame className="h-5 w-5" />, tone: '#e11d48' },
            { value: 'WARM', label: 'Warm', icon: <Sun className="h-5 w-5" />, tone: '#d97706' },
            { value: 'COLD', label: 'Cold', icon: <Snowflake className="h-5 w-5" />, tone: '#2563eb' },
          ]} />
        <div className="mt-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
          <Switch checked={demo} onChange={(e) => setDemo(e.target.checked)} label={<span className="flex items-center gap-2"><Presentation className="h-4 w-4 text-blue-600" />Demo diya?</span>} description="Dukaandar ko Nafaa chala kar dikhaya" />
        </div>
      </Block>

      <Block n={5} title="Follow-up aur note">
        <div className="mb-2 flex flex-wrap gap-2">
          {FOLLOW_CHIPS.map((c) => {
            const v = addDaysInput(c.days);
            return (
              <button key={c.days} type="button" onClick={() => setFollowUp(followUp === v ? '' : v)} aria-pressed={followUp === v}
                className={cn('h-10 rounded-full px-3.5 text-[0.875rem] font-semibold ring-1 transition', followUp === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-end gap-2">
          <Input label="Follow-up ki tareekh" size="lg" type="date" min={todayInput()} value={followUp} onChange={(e) => setFollowUp(e.target.value)} wrapperClassName="flex-1" />
          {followUp && <Button size="lg" variant="ghost" onClick={() => setFollowUp('')} aria-label="Tareekh hatayein"><X className="h-4 w-4" /></Button>}
        </div>
        <Textarea wrapperClassName="mt-3" label="Note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kya baat hui? Kab dobara aana hai?" maxLength={1000} />
      </Block>
      </div>
      </div>

      <div className="sticky bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-20 lg:bottom-4">
        <Button size="xl" fullWidth loading={saving} onClick={() => void save()} leftIcon={<CheckCircle2 className="h-5 w-5" />} className="h-14 rounded-2xl text-[1.0625rem] shadow-lg shadow-brand-600/25">
          Visit save karein
        </Button>
      </div>
      <p className="text-center text-[0.8125rem] text-slate-500">Internet na ho to bhi save hoga. <Link to="/leads" className="font-semibold text-brand-700">Meri leads</Link></p>
    </PageShell>
  );
}
