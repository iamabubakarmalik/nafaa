/**
 * Marketplace publishing (/marketplace/settings): how the active branch
 * shows on the Nafaa marketplace — name, logo, address and contact,
 * delivery, payment methods and extra features — plus publish / unpublish.
 * Changes are kept as a draft and saved together; publishing saves first.
 * Editing needs "Settings badalna".
 *
 * Keys: Ctrl+S save · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BarChart3, CheckCircle2, Circle, CreditCard, EyeOff, GraduationCap, ImagePlus, Loader2, LocateFixed, Mail,
  MapPin, MessageCircle, Phone, Rocket, Save, Sparkles, Star, Store, Truck, Users,
} from 'lucide-react';
import {
  Button, Card, Input, KpiCard, KpiRow, PageHero, PageShell, Select, Skeleton, Switch, Textarea, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { AvatarUpload } from '@core/components/uploads';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { uploadsApi } from '@modules/organization/settings/api/uploads.api';
import { marketplaceSettingsApi, type MarketplaceProfile } from '../api/marketplace-settings.api';

type P = MarketplaceProfile;

/** Fields this page edits; a first save sends all of them so the stored profile matches what the page showed. */
const EDITABLE: Array<keyof P> = [
  'publicName', 'tagline', 'description', 'industry', 'logoUrl', 'coverUrl', 'city', 'area', 'address', 'lat', 'lng',
  'contactPhone', 'contactEmail', 'whatsappNumber', 'offersDelivery', 'offersPickup', 'deliveryFee', 'freeDeliveryAbove', 'minOrderAmount',
  'estimatedDeliveryMinutes', 'deliveryRadiusKm', 'acceptsCod', 'acceptsCard', 'acceptsJazzcash', 'acceptsEasypaisa', 'acceptsRaast',
  'acceptsWallet', 'bargainEnabled', 'bargainMinPercent', 'groupBuyEnabled', 'liveShopEnabled', 'auctionEnabled',
];

const INDUSTRIES: Array<[string, string]> = [
  ['GROCERY', 'Grocery / kiryana'], ['RESTAURANT', 'Restaurant'], ['BAKERY', 'Bakery'], ['PHARMACY', 'Pharmacy'], ['JEWELRY', 'Jewellery'],
  ['GARMENTS', 'Garments'], ['MOBILE', 'Mobile'], ['ELECTRONICS', 'Electronics'], ['HARDWARE', 'Hardware'], ['BOOKS', 'Books / stationery'],
  ['DAIRY', 'Dairy'], ['MEAT', 'Meat'], ['CARPET', 'Carpet'], ['SALON', 'Salon'], ['GYM', 'Gym'], ['HOTEL', 'Hotel'], ['CLINIC', 'Clinic'],
  ['AUTOPARTS', 'Auto parts'], ['AGRI', 'Agri'], ['SERVICES', 'Services'],
];
const CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad',
  'Sargodha', 'Bahawalpur', 'Sukkur', 'Larkana', 'Gujrat', 'Sahiwal', 'Okara', 'Abbottabad', 'Mardan',
];
const PAYMENTS: Array<{ key: keyof P; label: string; hint: string }> = [
  { key: 'acceptsCod', label: 'Cash on delivery', hint: 'Ghar par paise lein — Pakistan me sab se zyada chalta hai' },
  { key: 'acceptsJazzcash', label: 'JazzCash', hint: 'Mobile wallet' },
  { key: 'acceptsEasypaisa', label: 'Easypaisa', hint: 'Mobile wallet' },
  { key: 'acceptsCard', label: 'Debit / credit card', hint: 'Visa, MasterCard' },
  { key: 'acceptsRaast', label: 'Raast', hint: 'Bank se foran transfer' },
  { key: 'acceptsWallet', label: 'Nafaa wallet', hint: 'App ke andar ka balance' },
];
const LEVELS: Record<string, { label: string; next: string }> = {
  UNVERIFIED: { label: 'Abhi verify nahi', next: 'Logo, cover, pata aur phone poora karein aur 5 order mukammal karein' },
  BRONZE: { label: 'Bronze', next: '25+ order mukammal karein to Silver' },
  SILVER: { label: 'Silver', next: '100+ order ke baad Gold' },
  GOLD: { label: 'Gold', next: 'Thori aur growth par Platinum' },
  PLATINUM: { label: 'Platinum', next: 'Sab se ooncha darja' },
};

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^92/, '0');
const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
const shown = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export default function MarketplaceSettingsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const [draft, setDraft] = useState<Partial<P>>({});
  const [tried, setTried] = useState(false);

  const profileQ = useQuery({ queryKey: ['marketplace-profile'], queryFn: marketplaceSettingsApi.getProfile });
  const profile = profileQ.data;
  const m = { ...profile, ...draft } as P;
  const changed = Object.keys(draft).length;
  const set = <K extends keyof P>(k: K, v: P[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const errors = useMemo(() => {
    const e: Partial<Record<keyof P, string>> = {};
    if (!String(m.publicName ?? '').trim()) e.publicName = 'Dukaan ka naam likhein';
    if (m.contactPhone && !/^0\d{9,10}$/.test(digits(m.contactPhone))) e.contactPhone = 'Number theek nahi — misaal: 0300-1234567';
    if (m.whatsappNumber && !/^0\d{9,10}$/.test(digits(m.whatsappNumber))) e.whatsappNumber = 'Number theek nahi — misaal: 0300-1234567';
    if (m.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m.contactEmail).trim())) e.contactEmail = 'Email theek nahi';
    if (m.lat != null && !(Math.abs(Number(m.lat)) <= 90)) e.lat = 'Latitude -90 se 90 ke beech';
    if (m.lng != null && !(Math.abs(Number(m.lng)) <= 180)) e.lng = 'Longitude -180 se 180 ke beech';
    if (Number(m.deliveryFee) < 0 || Number.isNaN(Number(m.deliveryFee ?? 0))) e.deliveryFee = 'Fee 0 ya zyada';
    if (m.estimatedDeliveryMinutes != null && !(Number(m.estimatedDeliveryMinutes) > 0)) e.estimatedDeliveryMinutes = 'Minute 1 ya zyada';
    if (m.deliveryRadiusKm != null && !(Number(m.deliveryRadiusKm) > 0)) e.deliveryRadiusKm = 'Kilometer 1 ya zyada';
    if (m.bargainEnabled && m.bargainMinPercent != null && !(Number(m.bargainMinPercent) >= 50 && Number(m.bargainMinPercent) <= 95)) e.bargainMinPercent = '50 se 95 ke beech';
    return e;
  }, [m]);
  const err = (k: keyof P) => (tried || k in draft ? errors[k] : undefined);
  // Values stored before are not re-checked, so an old record can still be saved.
  const problems = (Object.entries(errors) as Array<[keyof P, string]>)
    .filter(([k]) => k === 'publicName' || k in draft || !profile?.slug).map(([, v]) => v);

  /** Draft as the API takes it; a profile not yet stored gets every field the page showed. */
  const body = () => {
    const base = (profile?.slug ? {} : Object.fromEntries(EDITABLE.filter((k) => m[k] !== undefined).map((k) => [k, m[k]]))) as Partial<P>;
    return { ...base, ...draft };
  };

  const save = useMutation({
    mutationFn: () => marketplaceSettingsApi.updateProfile(body()),
    onSuccess: () => {
      toast.success('Save ho gaya');
      setDraft({});
      setTried(false);
      qc.invalidateQueries({ queryKey: ['marketplace-profile'] });
    },
    onError: (e: any) => toast.error(apiMessage(e, 'Save nahi hua')),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (profile?.isListedOnMarketplace) return marketplaceSettingsApi.unpublishShop();
      if (changed || !profile?.slug) await marketplaceSettingsApi.updateProfile(body());
      return marketplaceSettingsApi.publishShop();
    },
    onSuccess: () => {
      toast.success(profile?.isListedOnMarketplace ? 'Dukaan marketplace se hata di' : 'Dukaan marketplace par live ho gayi');
      setDraft({});
      qc.invalidateQueries({ queryKey: ['marketplace-profile'] });
    },
    onError: (e: any) => toast.error(apiMessage(e, 'Nahi hua')),
  });

  const trySave = () => {
    if (!canEdit || save.isPending) return;
    setTried(true);
    if (!changed) { toast.info('Koi tabdeeli nahi'); return; }
    if (problems.length) { toast.error(problems[0]); return; }
    save.mutate();
  };
  const tryPublish = () => {
    if (!canEdit || publish.isPending) return;
    if (!profile?.isListedOnMarketplace) {
      setTried(true);
      if (problems.length) { toast.error(problems[0]); return; }
      if (!String(m.city ?? '').trim()) { toast.error('Publish se pehle shehar likhein'); return; }
    }
    publish.mutate();
  };

  const saveRef = useRef(trySave);
  saveRef.current = trySave;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && !isDialogOpen()) { e.preventDefault(); saveRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!changed) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [changed]);

  if (profileQ.isLoading) {
    return <PageShell><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  }
  if (profileQ.isError || !profile) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Marketplace ki details nahi khulin</p>
          <p className="mt-1 text-sm text-slate-500">{apiMessage(profileQ.error, 'Internet check karein aur dobara koshish karein')}</p>
          <Button className="mt-3" variant="secondary" onClick={() => profileQ.refetch()}>Dobara koshish</Button>
        </div>
      </PageShell>
    );
  }

  const live = profile.isListedOnMarketplace;
  const anyPayment = PAYMENTS.some((p) => !!m[p.key]);
  const ready: Array<{ ok: boolean; label: string }> = [
    { ok: !!String(m.publicName ?? '').trim(), label: 'Dukaan ka naam' },
    { ok: !!String(m.city ?? '').trim(), label: 'Shehar' },
    { ok: !!(m.contactPhone || m.whatsappNumber), label: 'Phone ya WhatsApp' },
    { ok: !!m.logoUrl, label: 'Logo' },
    { ok: !!(m.offersDelivery || m.offersPickup), label: 'Delivery ya pickup' },
    { ok: anyPayment, label: 'Kam se kam ek payment ka tareeqa' },
  ];
  const level = LEVELS[profile.verificationLevel || 'UNVERIFIED'] ?? LEVELS.UNVERIFIED;
  const minPct = Number(m.bargainMinPercent ?? 80);

  return (
    <PageShell>
      <PageHero
        title="Marketplace publishing"
        chip={live ? <><CheckCircle2 />Live hai</> : <><EyeOff />Abhi live nahi</>}
        meta={`${profile.publicName || 'Aap ki dukaan'} — Nafaa marketplace par aap ki dukaan kaise dikhe`}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && (
            <button type="button" onClick={tryPublish} disabled={publish.isPending} className={heroButton}>
              {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : live ? <EyeOff className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
              {live ? 'Marketplace se hatayein' : 'Publish karein'}
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={trySave} disabled={save.isPending || !changed} title="Save (Ctrl+S)" className={heroPrimaryButton}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {changed ? `Save (${changed})` : 'Save'}
            </button>
          )}
        </>}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Star} color="#d97706" label="Rating" value={profile.ratingCount ? Number(profile.ratingAverage ?? 0).toFixed(1) : '—'} hint={`${profile.ratingCount ?? 0} review`} />
        <KpiCard icon={Truck} color="#16a34a" label="Online order" value={String(profile.totalOrders ?? 0)} hint="ab tak" />
        <KpiCard icon={Users} color="#2563eb" label="Followers" value={String(profile.followerCount ?? 0)} hint="customers" />
        <KpiCard icon={BarChart3} color="#7c3aed" label="Darja" value={level.label} hint={level.next} />
      </KpiRow>

      {!canEdit && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Badalne ke liye "Settings badalna" ki permission chahiye. Aap sirf dekh sakte hain.</p>}

      <Card className="rounded-2xl" title={<T icon={live ? CheckCircle2 : Rocket}>{live ? 'Dukaan live hai' : 'Publish se pehle'}</T>}
        description={live ? 'Customers marketplace par aap ki dukaan dhoondh sakte hain. Har product alag se publish hota hai.' : 'Naam aur shehar zaroori hain; baqi cheezein customers ka bharosa barhati hain.'}>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ready.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-sm">
              {r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
              <span className={r.ok ? 'text-slate-800' : 'text-slate-500'}>{r.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      <fieldset disabled={!canEdit} className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Store}>Dukaan ki pehchan</T>}>
            <div className="space-y-3">
              <Input label="Dukaan ka naam" required value={shown(m.publicName)} onChange={(e) => set('publicName', e.target.value)} maxLength={80}
                placeholder="Misaal: Ahmad Kiryana Store" error={err('publicName')} hint="Marketplace par customers ko yahi naam dikhta hai" />
              <Input label="Tagline" value={shown(m.tagline)} onChange={(e) => set('tagline', e.target.value)} maxLength={120}
                placeholder="Taaza sabzi aur ghar ka saman — 30 minute me" hint="Ek line — search me naam ke neeche aati hai" />
              <Textarea label="Dukaan ke baare me" value={shown(m.description)} onChange={(e) => set('description', e.target.value)} rows={4} maxLength={1000}
                placeholder="Kab se hain, kya milta hai, kya khaas hai…" hint="Customers dukaan kholte hain to yeh parhte hain" />
              <Select label="Category" value={shown(m.industry) || 'GROCERY'} onChange={(e) => set('industry', e.target.value)}
                options={INDUSTRIES.map(([value, label]) => ({ value, label }))} hint="Isi category me aap ki dukaan nazar aayegi" />
              <div className="flex flex-wrap items-start gap-4">
                <div>
                  <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Logo</p>
                  <AvatarUpload value={m.logoUrl || null} onChange={(u) => set('logoUrl', u ?? '')} purpose="shop-logo" shape="square" size="md" fallbackText={m.publicName || 'N'} />
                  <p className="mt-1.5 text-xs text-slate-500">Chokor tasveer behtar</p>
                </div>
                <CoverUpload value={m.coverUrl || ''} onChange={(u) => set('coverUrl', u)} />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={MapPin}>Pata aur rabta</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Shehar" required list="mp-city-options" value={shown(m.city)} onChange={(e) => set('city', e.target.value)} maxLength={80}
                placeholder="Lahore" error={err('city')} hint="Publish ke liye zaroori — isi shehar ke customers ko dikhegi" />
              <Input label="Ilaqa" value={shown(m.area)} onChange={(e) => set('area', e.target.value)} maxLength={80} placeholder="Model Town, DHA…" hint="Qareeb ke customers ko pehle dikhane ke liye" />
              <Textarea label="Poora pata" value={shown(m.address)} onChange={(e) => set('address', e.target.value)} rows={2} maxLength={255} wrapperClassName="sm:col-span-2"
                placeholder="Shop #5, Main Boulevard, Model Town" hint="Rider ko dukaan dhoondhne me aasani ho" />
              <Input label="Latitude" inputMode="decimal" value={shown(m.lat)} onChange={(e) => set('lat', numOrNull(e.target.value) as P['lat'])} placeholder="31.5204" error={err('lat')} hint="Google Maps se, ya neeche button dabayein" />
              <Input label="Longitude" inputMode="decimal" value={shown(m.lng)} onChange={(e) => set('lng', numOrNull(e.target.value) as P['lng'])} placeholder="74.3587" error={err('lng')} hint="Delivery ka faasla isi se nikalta hai" />
              <div className="sm:col-span-2"><LocateButton onFound={(lat, lng) => setDraft((d) => ({ ...d, lat, lng }))} /></div>
              <Input label="Phone" inputMode="tel" value={shown(m.contactPhone)} onChange={(e) => set('contactPhone', e.target.value)} maxLength={20}
                leftIcon={<Phone className="h-4 w-4" />} placeholder="0300-1234567" error={err('contactPhone')} hint="Customers order ke baare me isi par call karenge" />
              <Input label="WhatsApp" inputMode="tel" value={shown(m.whatsappNumber)} onChange={(e) => set('whatsappNumber', e.target.value)} maxLength={20}
                leftIcon={<MessageCircle className="h-4 w-4" />} placeholder="0300-1234567" error={err('whatsappNumber')} hint="Khali ho to phone wala number hi dikhta hai" />
              <Input label="Email" type="email" value={shown(m.contactEmail)} onChange={(e) => set('contactEmail', e.target.value)} wrapperClassName="sm:col-span-2"
                leftIcon={<Mail className="h-4 w-4" />} placeholder="dukaan@gmail.com" error={err('contactEmail')} hint="Marzi hai — order ki khabar aur sawal ke liye" />
            </div>
            <datalist id="mp-city-options">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Truck}>Delivery</T>}>
            <div className="space-y-3">
              <Switch checked={!!m.offersDelivery} onChange={(e) => set('offersDelivery', e.target.checked)} label="Ghar tak delivery" description="Customer ke ghar maal bhejte hain" />
              <Switch checked={!!m.offersPickup} onChange={(e) => set('offersPickup', e.target.checked)} label="Dukaan se pickup" description="Customer khud aa kar le jaye" />
              {m.offersDelivery && (
                <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                  <Input label="Delivery fee (Rs)" inputMode="decimal" value={shown(m.deliveryFee)} onChange={(e) => set('deliveryFee', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                    error={err('deliveryFee')} className="text-right tabular-nums" hint="Har order par — 0 = muft delivery" />
                  <Input label="Is se upar muft (Rs)" inputMode="decimal" value={shown(m.freeDeliveryAbove)} onChange={(e) => set('freeDeliveryAbove', numOrNull(e.target.value.replace(/[^\d.]/g, '')))}
                    className="text-right tabular-nums" placeholder="Khali = hamesha fee" hint={m.freeDeliveryAbove ? `${formatPKR(Number(m.freeDeliveryAbove))} se bare order par fee nahi` : 'Marzi hai — bara order lene ka tareeqa'} />
                  <Input label="Kam se kam order (Rs)" inputMode="decimal" value={shown(m.minOrderAmount)} onChange={(e) => set('minOrderAmount', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                    className="text-right tabular-nums" hint="Is se chhota order nahi aayega — 0 = koi had nahi" />
                  <Input label="Delivery ka waqt (minute)" inputMode="numeric" value={shown(m.estimatedDeliveryMinutes ?? 30)} onChange={(e) => set('estimatedDeliveryMinutes', Number(e.target.value.replace(/\D/g, '')) || 0)}
                    error={err('estimatedDeliveryMinutes')} className="text-right tabular-nums" hint="Customer ko andaza dikhta hai" />
                  <Input label="Kitni door tak (km)" inputMode="decimal" value={shown(m.deliveryRadiusKm ?? 5)} onChange={(e) => set('deliveryRadiusKm', Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                    error={err('deliveryRadiusKm')} className="text-right tabular-nums" wrapperClassName="sm:col-span-2" hint="Is se door ke customers ko delivery nahi dikhegi" />
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={CreditCard}>Payment ke tareeqe</T>} description="Jitne zyada tareeqe, utne zyada order">
            <div className="space-y-3">
              {PAYMENTS.map((p) => (
                <Switch key={p.key} checked={!!m[p.key]} onChange={(e) => set(p.key, e.target.checked as never)} label={p.label} description={p.hint} />
              ))}
              {!anyPayment && <p className="flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />Koi tareeqa on nahi — customer order nahi de sakega</p>}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Sparkles}>Aur features</T>}>
            <div className="space-y-3">
              <Switch checked={!!m.bargainEnabled} onChange={(e) => set('bargainEnabled', e.target.checked)} label="Mol-bhaav (bargain)"
                description="Customer kam price ka offer bhej sakta hai — aap maanein, mana karein ya naya price dein" />
              {m.bargainEnabled && (
                <Input label="Kam se kam offer (price ka %)" inputMode="numeric" value={shown(m.bargainMinPercent ?? 80)} onChange={(e) => set('bargainMinPercent', Number(e.target.value.replace(/\D/g, '')) || 0)}
                  error={err('bargainMinPercent')} className="text-right tabular-nums" wrapperClassName="pl-0 sm:pl-6"
                  hint={`Misaal: ${minPct}% par Rs 1,000 wali cheez ka ${formatPKR((1000 * minPct) / 100)} se kam offer nahi aa sakta`} />
              )}
              <Switch checked={!!m.groupBuyEnabled} onChange={(e) => set('groupBuyEnabled', e.target.checked)} label="Group buy"
                description="Kai customers mil kar khareedein; tadaad poori ho to sab ko Discount" />
              <Switch checked={!!m.liveShopEnabled} onChange={(e) => set('liveShopEnabled', e.target.checked)} label={<Soon>Live shopping</Soon>} description="Video par live dikha kar bechna" />
              <Switch checked={!!m.auctionEnabled} onChange={(e) => set('auctionEnabled', e.target.checked)} label={<Soon>Neelami (auction)</Soon>} description="Sab se ooncha bid dene wala cheez le jaye" />
            </div>
          </Card>
        </div>
      </fieldset>

      {changed > 0 && canEdit && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
          {problems.length > 0 && tried
            ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{problems[0]}</p>
            : <p className="mr-auto text-[0.8125rem] text-slate-500">{changed} tabdeeli save nahi hui — Ctrl+S dabayein</p>}
          <Button variant="secondary" onClick={() => { setDraft({}); setTried(false); }}>Chhor dein</Button>
          <Button onClick={trySave} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>Save karein</Button>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Marketplace par dukaan" onClose={guide.close}
          steps={[
            { icon: Store, color: '#16a34a', title: 'Pehchan', text: 'Naam, tagline, logo aur cover lagayein — customer pehli nazar me yahi dekhta hai.' },
            { icon: MapPin, color: '#2563eb', title: 'Pata aur phone', text: 'Shehar zaroori hai. Location button dabayein to delivery ka faasla theek nikalta hai.' },
            { icon: Truck, color: '#d97706', title: 'Delivery aur payment', text: 'Fee, muft delivery ki had aur kam se kam order likhein. Cash on delivery on rakhein.' },
            { icon: Rocket, color: '#7c3aed', title: 'Publish', text: 'Publish dabane se tabdeeliyan save ho kar dukaan live ho jati hai. Phir har product alag se publish karein.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function apiMessage(e: any, fallback: string): string {
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
}

const T = ({ icon: Icon, children }: { icon: typeof Store; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

const Soon = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-2">{children}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-500">Jald aa raha hai</span></span>
);

/** Wide banner image: upload or remove, previewed at its real shape. */
function CoverUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Sirf tasveer (JPG, PNG, WebP)'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Tasveer 10 MB se chhoti honi chahiye'); return; }
    setBusy(true);
    try {
      const r = await uploadsApi.single({ file, name: file.name, type: file.type }, { purpose: 'shop-logo' });
      onChange(r.url);
    } catch (e: any) {
      toast.error(apiMessage(e, 'Tasveer upload nahi hui'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-w-[12rem] flex-1">
      <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Cover</p>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-brand-400 disabled:opacity-60">
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex items-center gap-1.5 text-[0.8125rem]"><ImagePlus className="h-4 w-4" />Tasveer chunein</span>}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin" /></span>}
      </button>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>Lambi tasveer (16:9) — dukaan ke safhe ke upar</span>
        {value && <button type="button" onClick={() => onChange('')} className="font-medium text-rose-600 hover:underline">Hatayein</button>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
    </div>
  );
}

/** Fills latitude/longitude from the device location. */
function LocateButton({ onFound }: { onFound: (lat: number, lng: number) => void }) {
  const [busy, setBusy] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) { toast.error('Is device par location nahi milti'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onFound(Number(p.coords.latitude.toFixed(6)), Number(p.coords.longitude.toFixed(6))); toast.success('Location lag gayi — save karein'); },
      () => { setBusy(false); toast.error('Location nahi mili — browser me ijazat dein ya Google Maps se likhein'); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };
  return (
    <Button type="button" variant="secondary" size="sm" onClick={locate} loading={busy} leftIcon={<LocateFixed className="h-4 w-4" />}>
      Dukaan me hain? Abhi ki location lagayein
    </Button>
  );
}
