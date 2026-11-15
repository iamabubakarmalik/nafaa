/**
 * Market shop profile: what customers see on the shop page and how the shop
 * takes orders. Name and story, logo / cover / gallery, contact, address and
 * map point, Market section (gate) and sub-categories, opening hours and
 * holidays, delivery rules and payments. Edits stay in a draft until saved
 * (Ctrl+S); publish / unpublish from the header.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Clock, CreditCard, EyeOff, Image as ImageIcon, LocateFixed, Mail, MapPin, MessageCircle, Phone, Rocket, Save, Store, Tags, Truck,
} from 'lucide-react';
import {
  Alert, Badge, Button, Input, Kbd, PageHero, PageShell, Skeleton, Switch, Textarea, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { Field, NumberInput, SectionCard, Toggle } from '@modules/organization/settings/components/SettingsBlocks';
import { errorText, marketApi, type MarketGate, type MarketProfile, type WorkingHours } from '../api/market.api';
import { gateLabel, isGate, num, pickLabel, shopGate, useMarketConfig, useMarketProfile } from '../hooks/useMarket';
import { ImageList, ImageSlot } from '../components/ImageFields';
import { HoursEditor } from '../components/HoursEditor';
import { GuideButton, TONE } from '../components/parts';

type P = MarketProfile;

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^92/, '0');
const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export default function MarketProfilePage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const profileQ = useMarketProfile();
  const configQ = useMarketConfig();
  const profile = profileQ.data;
  const config = configQ.data;
  const [draft, setDraft] = useState<Partial<P>>({});
  const [tried, setTried] = useState(false);
  const m = { ...profile, ...draft } as P;
  const changed = Object.keys(draft).length;
  const set = <K extends keyof P>(k: K, v: P[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const live = !!profile?.isListedOnMarketplace;

  const autoGate = shopGate(profile ? { ...profile, gate: null } : undefined);
  const gate: MarketGate | null = isGate(m.gate) ? m.gate : autoGate;
  const gateDef = config?.gates.find((g) => g.id === gate);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof P, string>> = {};
    if (!String(m.publicName ?? '').trim()) e.publicName = t('Dukaan ka naam likhein');
    if (!String(m.city ?? '').trim()) e.city = t('Shehar likhein');
    if (m.contactPhone && !/^0\d{9,10}$/.test(digits(m.contactPhone))) e.contactPhone = t('Number theek nahi — misaal: 0300-1234567');
    if (m.whatsappNumber && !/^0\d{9,10}$/.test(digits(m.whatsappNumber))) e.whatsappNumber = t('Number theek nahi — misaal: 0300-1234567');
    if (m.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m.contactEmail).trim())) e.contactEmail = t('Email theek nahi');
    if (m.lat != null && !(Math.abs(Number(m.lat)) <= 90)) e.lat = t('Latitude -90 se 90 ke beech');
    if (m.lng != null && !(Math.abs(Number(m.lng)) <= 180)) e.lng = t('Longitude -180 se 180 ke beech');
    return e;
  }, [m]);
  const err = (k: keyof P) => (tried || k in draft ? errors[k] : undefined);
  const problems = (Object.entries(errors) as Array<[keyof P, string]>).filter(([k]) => tried || k in draft).map(([, v]) => v);

  const save = useMutation({
    mutationFn: () => marketApi.profile.update(draft),
    onSuccess: () => {
      toast.success(t('Save ho gaya'));
      setDraft({});
      setTried(false);
      qc.invalidateQueries({ queryKey: ['market'] });
    },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (live) return marketApi.profile.unpublish();
      if (changed) await marketApi.profile.update(draft);
      return marketApi.profile.publish();
    },
    onSuccess: () => {
      toast.success(live ? t('Dukaan Market se hata di') : t('Dukaan Market par live ho gayi'));
      setDraft({});
      qc.invalidateQueries({ queryKey: ['market'] });
    },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  const trySave = () => {
    if (!canEdit || save.isPending) return;
    setTried(true);
    if (!changed) { toast.info(t('Koi tabdeeli nahi')); return; }
    const all = Object.values(errors);
    if (all.length) { toast.error(all[0]!); return; }
    save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !isDialogOpen()) { e.preventDefault(); trySave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!changed) return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [changed]);

  const locate = () => {
    if (!navigator.geolocation) { toast.error(t('Is device par location nahi milti')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { set('lat', Number(pos.coords.latitude.toFixed(6))); set('lng', Number(pos.coords.longitude.toFixed(6))); toast.success(t('Location lag gayi — save karein')); },
      () => toast.error(t('Location nahi mili — browser me ijazat dein ya Google Maps se likhein')),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const subCats = m.subCategories ?? [];
  const toggleSub = (id: string) => set('subCategories', subCats.includes(id) ? subCats.filter((x) => x !== id) : [...subCats, id]);
  const filled = profile ? [m.logoUrl, m.coverUrl, m.description, m.address, m.lat, m.workingHours, m.contactPhone || m.whatsappNumber].filter((x) => x != null && x !== '').length : 0;

  if (profileQ.isLoading) {
    return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  }

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Dukaan profile')}
        chip={<><Store /> {t('Market par aap ki dukaan')}</>}
        meta={live ? <Badge size="sm" variant="success" dot>{t('Live')}</Badge> : <Badge size="sm" variant="warning" dot>{t('Abhi live nahi')}</Badge>}
        busy={profileQ.isFetching}
        actions={<>
          <GuideButton onClick={guide.open} />
          {canEdit && (
            <button type="button" onClick={() => publish.mutate()} disabled={publish.isPending} className={heroButton}>
              {live ? <><EyeOff className="h-4 w-4" /> {t('Unpublish')}</> : <><Rocket className="h-4 w-4" /> {t('Publish')}</>}
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={trySave} disabled={save.isPending || !changed} className={heroPrimaryButton}>
              <Save className="h-4 w-4" /> {t('Save')}
            </button>
          )}
        </>}
        stats={[
          { label: t('Profile'), value: `${filled}/7`, hint: t('cheezein bhari hui') },
          { label: t('Rating'), value: profile?.ratingAverage ? Number(profile.ratingAverage).toFixed(1) : '—', hint: t('{{count}} reviews', { count: profile?.ratingCount ?? 0 }) },
          { label: t('Orders'), value: profile?.totalOrders ?? 0 },
          { label: t('Followers'), value: profile?.followerCount ?? 0 },
        ]}
      />

      {!canEdit && <Alert tone="info">{t('Aap sirf dekh sakte hain. Badalne ke liye Settings edit ki ijazat chahiye.')}</Alert>}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={t('Dukaan ki pehchan')} desc={t('Naam aur do lafz jo customer pehle parhta hai')} icon={Store} color="emerald">
          <div className="space-y-3">
            <Input label={t('Dukaan ka naam')} value={m.publicName ?? ''} error={err('publicName')} disabled={!canEdit} onChange={(e) => set('publicName', e.target.value)} />
            {profile?.slug && (
              <p className="text-[0.75rem] text-slate-500">{t('Dukaan ka link')}: <span className="dir-ltr font-medium text-slate-700">market.nafaa.pk/{profile.slug}</span></p>
            )}
            <Input label={t('Tagline')} placeholder={t('Masalan: Taaza doodh, 30 minute me')} value={m.tagline ?? ''} maxLength={80} disabled={!canEdit} onChange={(e) => set('tagline', e.target.value)} />
            <Textarea label={t('Dukaan ke baare me')} rows={4} value={m.description ?? ''} maxLength={1000} disabled={!canEdit} onChange={(e) => set('description', e.target.value)} />
          </div>
        </SectionCard>

        <SectionCard title={t('Tasveerein')} desc={t('Achi tasveer se zyada order aate hain')} icon={ImageIcon} color="pink">
          <div className="flex flex-wrap gap-4">
            <ImageSlot label={t('Logo')} value={m.logoUrl} onChange={(u) => set('logoUrl', u)} hint={t('Chokor')} disabled={!canEdit} />
            <ImageSlot label={t('Cover')} aspect="wide" value={m.coverUrl} onChange={(u) => set('coverUrl', u)} hint={t('Lambi tasveer (16:9)')} disabled={!canEdit} />
          </div>
          <div className="mt-4">
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{t('Gallery')}</p>
            <ImageList values={m.galleryUrls ?? []} onChange={(v) => set('galleryUrls', v)} max={10} purpose="product-gallery" disabled={!canEdit} />
          </div>
        </SectionCard>

        <SectionCard title={t('Rabta')} desc={t('Customer aap tak kaise pohanche')} icon={Phone} color="blue">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('Phone')} inputMode="tel" leftIcon={<Phone className="h-4 w-4" />} value={m.contactPhone ?? ''} error={err('contactPhone')} disabled={!canEdit} onChange={(e) => set('contactPhone', e.target.value)} />
            <Input label={t('WhatsApp')} inputMode="tel" leftIcon={<MessageCircle className="h-4 w-4" />} value={m.whatsappNumber ?? ''} error={err('whatsappNumber')} disabled={!canEdit} onChange={(e) => set('whatsappNumber', e.target.value)} />
            <Input label={t('Email')} type="email" leftIcon={<Mail className="h-4 w-4" />} value={m.contactEmail ?? ''} error={err('contactEmail')} disabled={!canEdit} onChange={(e) => set('contactEmail', e.target.value)} wrapperClassName="sm:col-span-2" />
          </div>
        </SectionCard>

        <SectionCard title={t('Pata aur map')} desc={t('Delivery ka faasla isi jagah se nikalta hai')} icon={MapPin} color="orange">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('Shehar')} value={m.city ?? ''} error={err('city')} disabled={!canEdit} onChange={(e) => set('city', e.target.value)} />
            <Input label={t('Ilaqa')} value={m.area ?? ''} disabled={!canEdit} onChange={(e) => set('area', e.target.value)} />
            <Input label={t('Poora pata')} value={m.address ?? ''} disabled={!canEdit} onChange={(e) => set('address', e.target.value)} wrapperClassName="sm:col-span-2" />
            <Input label={t('Latitude')} inputMode="decimal" value={m.lat ?? ''} error={err('lat')} disabled={!canEdit} onChange={(e) => set('lat', numOrNull(e.target.value))} />
            <Input label={t('Longitude')} inputMode="decimal" value={m.lng ?? ''} error={err('lng')} disabled={!canEdit} onChange={(e) => set('lng', numOrNull(e.target.value))} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canEdit && <Button type="button" variant="secondary" size="sm" onClick={locate} leftIcon={<LocateFixed className="h-4 w-4" />}>{t('Dukaan me hain? Abhi ki location lagayein')}</Button>}
            {m.lat != null && m.lng != null && (
              <a href={`https://www.google.com/maps?q=${m.lat},${m.lng}`} target="_blank" rel="noopener noreferrer" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Map par dekhein')}</a>
            )}
          </div>
        </SectionCard>

        <SectionCard title={t('Market section')} desc={t('Customer aap ki dukaan kis darwaze me dhoondega')} icon={Tags} color="violet" id="gate">
          {!config && !configQ.isLoading && <Alert tone="warning">{t('Market sections abhi load nahi huay. Thori der baad dobara kholein.')}</Alert>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('Market section')}>
            {(config?.gates ?? []).map((g) => {
              const active = gate === g.id;
              return (
                <button key={g.id} type="button" role="radio" aria-checked={active} disabled={!canEdit}
                  onClick={() => { set('gate', g.id === autoGate && !profile?.gate ? null : g.id); set('subCategories', []); }}
                  className={cn('rounded-xl p-3 text-start ring-1 transition disabled:opacity-70', active ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {pickLabel(g.label)}
                    {g.id === autoGate && <Badge size="xs" variant="default">{t('Aap ke business ke mutabiq')}</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">{pickLabel(g.tagline)}</span>
                </button>
              );
            })}
          </div>
          {gateDef && gateDef.filters.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{t('Kya bechte hain? (ek ya zyada)')}</p>
              <div className="flex flex-wrap gap-1.5">
                {gateDef.filters.map((f) => {
                  const on = subCats.includes(f.id);
                  return (
                    <button key={f.id} type="button" disabled={!canEdit} aria-pressed={on} onClick={() => toggleSub(f.id)}
                      className={cn('rounded-full px-3 py-1 text-[0.8125rem] font-medium ring-1 transition', on ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                      {pickLabel(f.label)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {gate && <p className="mt-3 text-[0.75rem] text-slate-500">{t('Is section ke order ke switches Market settings me hain.')} <Link to="/market/settings" className="font-semibold text-brand-700 hover:underline">{gateLabel(gate, config)}</Link></p>}
        </SectionCard>

        <SectionCard title={t('Auqaat aur chhuttiyan')} desc={t('Band waqt me naye order nahi aate')} icon={Clock} color="amber">
          <HoursEditor
            hours={(m.workingHours ?? {}) as WorkingHours}
            onChange={(h) => set('workingHours', h)}
            holidays={(m.holidayDates ?? []).map((d) => String(d).slice(0, 10))}
            onHolidays={(d) => set('holidayDates', d)}
            disabled={!canEdit}
          />
        </SectionCard>

        <SectionCard title={t('Delivery')} desc={t('Kitni door tak, kitni fee aur kitni der me')} icon={Truck} color="cyan">
          <Toggle checked={!!m.offersDelivery} onChange={(v) => set('offersDelivery', v)} disabled={!canEdit} label={t('Ghar tak delivery')} desc={t('Aap ke rider ya courier se')} />
          <Toggle checked={!!m.offersPickup} onChange={(v) => set('offersPickup', v)} disabled={!canEdit} label={t('Dukaan se pickup')} desc={t('Customer khud aa kar le jaye')} />
          <Toggle checked={!!m.offersDineIn} onChange={(v) => set('offersDineIn', v)} disabled={!canEdit} label={t('Dine-in')} desc={t('Customer aa kar wahin khaye (restaurant)')} />
          {m.offersDelivery && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label={t('Kitni door tak')} hint={t('Dukaan se kilometer')}>
                <NumberInput value={num(m.deliveryRadiusKm ?? 5)} onChange={(v) => set('deliveryRadiusKm', v)} min={1} max={100} suffix="km" disabled={!canEdit} />
              </Field>
              <Field label={t('Delivery fee')}>
                <NumberInput value={num(m.deliveryFee)} onChange={(v) => set('deliveryFee', v)} min={0} step={10} prefix="Rs" disabled={!canEdit} />
              </Field>
              <Field label={t('Itne ke order par delivery free')} hint={t('0 = hamesha fee')}>
                <NumberInput value={num(m.freeDeliveryAbove)} onChange={(v) => set('freeDeliveryAbove', v || null)} min={0} step={100} prefix="Rs" disabled={!canEdit} />
              </Field>
              <Field label={t('Andaza waqt')} hint={t('Order se delivery tak')}>
                <NumberInput value={num(m.estimatedDeliveryMinutes ?? 30)} onChange={(v) => set('estimatedDeliveryMinutes', v)} min={5} max={4320} step={5} suffix={t('min')} disabled={!canEdit} />
              </Field>
            </div>
          )}
          <div className="mt-3 sm:max-w-xs">
            <Field label={t('Kam se kam order')} hint={t('0 = koi had nahi')}>
              <NumberInput value={num(m.minOrderAmount)} onChange={(v) => set('minOrderAmount', v)} min={0} step={50} prefix="Rs" disabled={!canEdit} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title={t('Payment')} desc={t('Customer kaise paise dega')} icon={CreditCard} color="indigo">
          <Toggle checked={m.acceptsCod !== false} onChange={(v) => set('acceptsCod', v)} disabled={!canEdit} label={t('Cash on delivery')} desc={t('Saman milne par paise — Pakistan me sab se zyada chalta hai')} />
          <div className="mt-2 space-y-2">
            {[t('JazzCash'), t('Easypaisa'), t('Debit / credit card')].map((name) => (
              <div key={name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <Switch size="sm" checked={false} disabled label={name} onChange={() => undefined} />
                <Badge size="xs" variant="info">{t('Jald aa raha hai')}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {canEdit && changed > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200">
          <p className="text-[0.8125rem] text-slate-600">
            {t('{{count}} tabdeeliyan save nahi huin', { count: changed })}
            {problems.length > 0 && <span className="ms-2 font-medium text-rose-600">{problems[0]}</span>}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setDraft({}); setTried(false); }}>{t('Chhor dein')}</Button>
            <Button size="sm" onClick={trySave} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>{t('Save')} <Kbd className="ms-1 hidden sm:inline-flex">Ctrl S</Kbd></Button>
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Dukaan profile')} onClose={guide.close}
          flow={[
            { label: t('Profile bharein'), icon: Store, color: TONE.blue },
            { label: t('Save'), hint: 'Ctrl S', icon: Save, color: TONE.green },
            { label: t('Publish'), icon: Rocket, color: TONE.violet },
            { label: t('Market par dikhe'), icon: MapPin, color: TONE.amber },
          ]}
          steps={[
            { icon: ImageIcon, color: TONE.pink, title: t('Logo aur cover'), text: t('Saaf logo aur dukaan ki achi tasveer lagayein. Gallery me andar ki tasveerein.') },
            { icon: MapPin, color: TONE.orange, title: t('Map par jagah'), text: t('Dukaan me khare ho kar "Abhi ki location" dabayein. Delivery ka faasla isi se nikalta hai.') },
            { icon: Tags, color: TONE.violet, title: t('Market section'), text: t('Aap ke business ke hisaab se section khud chuna gaya hai. Chahein to badal dein.') },
            { icon: Clock, color: TONE.amber, title: t('Auqaat'), text: t('Har din ke khulne aur band hone ka waqt. Band waqt me naye order nahi aate.') },
            { icon: Truck, color: TONE.cyan, title: t('Delivery'), text: t('Kitni door tak, fee, free delivery ki had aur kam se kam order.') },
          ]}
          tips={[t('Tabdeeli ke baad Save zaroor karein. Ctrl+S se bhi save hota hai.')]}
          shortcuts={[['Ctrl S', t('save')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
