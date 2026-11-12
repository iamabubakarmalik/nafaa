/**
 * Website settings: name and logo, contact and social links, languages,
 * WhatsApp button, password ("coming soon") page, Google text for the
 * home page, ad tracking codes (Meta, Google, TikTok), which products show
 * and the newsletter box. One Save for the whole page.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, GraduationCap, KeyRound, Languages, MessageCircle, Save, Search, Share2, Store } from 'lucide-react';
import { Button, Card, Input, PageShell, Select, Skeleton, Switch, Textarea, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type StoreSettings } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { ImageField } from '../components/ImageField';
import { SK, useStoreFull } from '../lib/hooks';

export default function PreferencesPage() {
  return (
    <PageShell>
      <StoreGate title={t('Website settings')}>{(ctx) => <Preferences ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

function Preferences({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const full = useStoreFull(id);
  const [name, setName] = useState('');
  const [s, setS] = useState<StoreSettings | null>(null);
  const [password, setPassword] = useState('');
  useEffect(() => { if (full.data) { setS(full.data.settings); setName(full.data.name); } }, [full.data]);
  useEffect(() => { if (s && location.hash === '#password') document.getElementById('password')?.scrollIntoView({ behavior: 'smooth' }); }, [s]);
  const dirty = !!s && (JSON.stringify(s) !== JSON.stringify(full.data?.settings) || name !== full.data?.name || !!password);
  const save = useMutation({
    mutationFn: () => storesApi.update(id, { name: name.trim(), settings: s!, ...(password ? { password } : {}) }),
    onSuccess: (r) => {
      qc.setQueryData(SK.full(id), r);
      setPassword('');
      void qc.invalidateQueries({ queryKey: SK.list });
      void qc.invalidateQueries({ queryKey: SK.home(id) });
      toast.success(t('Save ho gaya'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const removePassword = useMutation({
    mutationFn: () => storesApi.update(id, { password: null }),
    onSuccess: (r) => { qc.setQueryData(SK.full(id), r); toast.success(t('Password hata diya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const up = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS((x) => (x ? { ...x, [k]: v } : x));
  const tracking = s ? Object.values(s.tracking).filter(Boolean).length : 0;
  const social = s ? Object.values(s.social).filter(Boolean).length : 0;

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Website settings')} loading={full.isLoading}
        meta={t('Naam, logo, rabta, zubaan, password aur ads ke codes.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
        </>}
        stats={[
          { label: t('Zubaanein'), value: s ? s.languages.enabled.map((l) => (l === 'en' ? 'English' : 'اردو')).join(' + ') : '—' },
          { label: t('Social links'), value: String(social) },
          { label: t('Tracking codes'), value: String(tracking) },
          { label: t('Password'), value: full.data?.hasPassword ? t('Bana hua') : t('Nahi') },
        ]} />

      {!s ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title={t('Naam aur logo')}>
            <div className="space-y-4">
              <Input label={t('Website ka naam')} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
              <Input label={t('Chhoti line (tagline)')} value={s.tagline ?? ''} maxLength={120} onChange={(e) => up('tagline', e.target.value || null)} placeholder={t('Misal: Asli lawn, ghar baithay')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField label={t('Logo')} square value={s.logoUrl} onChange={(v) => up('logoUrl', v)} />
                <ImageField label={t('Browser tab ka nishan (favicon)')} square value={s.faviconUrl} onChange={(v) => up('faviconUrl', v)} hint={t('Chokor tasveer, 512×512')} />
              </div>
              <label className="block">
                <span className="mb-1 flex justify-between text-[0.8125rem] font-medium text-slate-700">{t('Logo ki chaurai')}<span className="tabular-nums text-slate-500">{s.logoWidth}px</span></span>
                <input type="range" min={60} max={300} step={10} value={s.logoWidth} onChange={(e) => up('logoWidth', Number(e.target.value))} className="w-full accent-brand-600" />
              </label>
            </div>
          </Card>

          <Card title={t('Rabta aur social')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('Phone')} value={s.contact.phone ?? ''} onChange={(e) => up('contact', { ...s.contact, phone: e.target.value || null })} />
              <Input label="WhatsApp" value={s.contact.whatsapp ?? ''} onChange={(e) => up('contact', { ...s.contact, whatsapp: e.target.value || null })} />
              <Input label={t('Email')} value={s.contact.email ?? ''} onChange={(e) => up('contact', { ...s.contact, email: e.target.value || null })} />
              <Input label={t('Waqt')} value={s.contact.hours ?? ''} placeholder={t('11 se 8, Itwar band')} onChange={(e) => up('contact', { ...s.contact, hours: e.target.value || null })} />
              <Input label={t('Address')} value={s.contact.address ?? ''} wrapperClassName="sm:col-span-2" onChange={(e) => up('contact', { ...s.contact, address: e.target.value || null })} />
              {(['facebook', 'instagram', 'tiktok', 'youtube', 'x'] as const).map((k) => (
                <Input key={k} label={k === 'x' ? 'X (Twitter)' : k[0].toUpperCase() + k.slice(1)} value={s.social[k] ?? ''} placeholder="https://..."
                  onChange={(e) => up('social', { ...s.social, [k]: e.target.value || undefined })} />
              ))}
            </div>
          </Card>

          <Card title={t('Zubaan aur qeemat')}>
            <div className="space-y-4">
              <Switch label={t('Urdu bhi (customer badal sake)')} description={t('English hamesha chalu hai. Urdu me page daayein se baayein.')}
                checked={s.languages.enabled.includes('ur')}
                onChange={(e) => up('languages', { default: e.target.checked ? s.languages.default : 'en', enabled: e.target.checked ? ['en', 'ur'] : ['en'] })} />
              {s.languages.enabled.includes('ur') && (
                <Select label={t('Pehle kaun si zubaan')} value={s.languages.default} onChange={(e) => up('languages', { ...s.languages, default: e.target.value as 'en' | 'ur' })}
                  options={[{ value: 'en', label: 'English' }, { value: 'ur', label: 'اردو' }]} />
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label={t('Qeemat aise likhein')} value={s.currencyDisplay.symbol} onChange={(e) => up('currencyDisplay', { ...s.currencyDisplay, symbol: e.target.value as StoreSettings['currencyDisplay']['symbol'] })}
                  options={[{ value: 'Rs', label: 'Rs 1,500' }, { value: 'PKR', label: 'PKR 1,500' }, { value: '₨', label: '₨ 1,500' }]} />
                <Select label={t('Paisay')} value={String(s.currencyDisplay.decimals)} onChange={(e) => up('currencyDisplay', { ...s.currencyDisplay, decimals: Number(e.target.value) as 0 | 2 })}
                  options={[{ value: '0', label: '1,500' }, { value: '2', label: '1,500.00' }]} />
              </div>
            </div>
          </Card>

          <Card title={t('Products aur WhatsApp')}>
            <div className="space-y-4">
              <Select label={t('Kaun se products dikhen')} value={s.catalogMode} onChange={(e) => up('catalogMode', e.target.value as StoreSettings['catalogMode'])}
                options={[{ value: 'ALL', label: t('Sab (jab tak main chhupaun nahi)') }, { value: 'CHOSEN', label: t('Sirf jo main chunoon') }]} />
              <Switch label={t('Khatam stock wale bhi dikhayein ("Sold out")')} checked={s.showOutOfStock} onChange={(e) => up('showOutOfStock', e.target.checked)} />
              <Switch label={t('WhatsApp ka gol button har page par')} checked={s.whatsappButton.enabled} onChange={(e) => up('whatsappButton', { ...s.whatsappButton, enabled: e.target.checked })} />
              {s.whatsappButton.enabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label={t('WhatsApp number')} value={s.whatsappButton.number ?? ''} placeholder="03001234567" onChange={(e) => up('whatsappButton', { ...s.whatsappButton, number: e.target.value || null })} />
                  <Select label={t('Kis kone me')} value={s.whatsappButton.position} onChange={(e) => up('whatsappButton', { ...s.whatsappButton, position: e.target.value as 'left' | 'right' })}
                    options={[{ value: 'right', label: t('Daayein') }, { value: 'left', label: t('Baayein') }]} />
                  <Input label={t('Pehla message')} value={s.whatsappButton.message ?? ''} wrapperClassName="sm:col-span-2" onChange={(e) => up('whatsappButton', { ...s.whatsappButton, message: e.target.value || null })} />
                </div>
              )}
              <Switch label={t('WhatsApp / email list ka dabba')} checked={s.newsletter.enabled} onChange={(e) => up('newsletter', { ...s.newsletter, enabled: e.target.checked })} />
              {s.newsletter.enabled && (
                <Select value={s.newsletter.mode} onChange={(e) => up('newsletter', { ...s.newsletter, mode: e.target.value as StoreSettings['newsletter']['mode'] })} aria-label={t('Kya maangein')}
                  options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'email', label: t('Email') }, { value: 'both', label: t('Dono') }]} />
              )}
            </div>
          </Card>

          <Card title={t('Password page ("Jald aa rahe hain")')}>
            <div id="password" className="space-y-3">
              <p className="text-[0.8125rem] text-slate-600">{t('Website tayyar ho rahi ho to password laga dein. Sirf jinhein password diya, wo andar aa sakte hain.')}</p>
              <Input type="text" label={full.data?.hasPassword ? t('Naya password (khali = purana)') : t('Password')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              <label className="block">
                <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">{t('Customers ke liye message')}</span>
                <Textarea rows={2} value={s.password.message ?? ''} onChange={(e) => up('password', { message: e.target.value || null })} placeholder={t('Hum jald aa rahe hain! Eid se pehle.')} />
              </label>
              {full.data?.hasPassword && <Button size="sm" variant="ghost" loading={removePassword.isPending} onClick={() => removePassword.mutate()}>{t('Password hatayein')}</Button>}
              <p className="text-[0.75rem] text-slate-500">{t('Password lagane ya hatane ke liye Website home par "Website ki halat" dekhein.')}</p>
            </div>
          </Card>

          <Card title={t('Google')}>
            <div className="space-y-3">
              <Input label={t('Home page ka Google title')} value={s.seo.title ?? ''} maxLength={70} onChange={(e) => up('seo', { ...s.seo, title: e.target.value || null })} placeholder={name} />
              <label className="block">
                <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">{t('Google tafseel')}</span>
                <Textarea rows={2} maxLength={160} value={s.seo.description ?? ''} onChange={(e) => up('seo', { ...s.seo, description: e.target.value || null })} />
              </label>
              <ImageField label={t('Share karne par tasveer (Facebook, WhatsApp)')} value={s.seo.ogImageUrl} onChange={(v) => up('seo', { ...s.seo, ogImageUrl: v })} />
              <Switch label={t('Google se chhupayein')} description={t('Sirf jab website abhi tayyar na ho')} checked={s.seo.noindex} onChange={(e) => up('seo', { ...s.seo, noindex: e.target.checked })} />
            </div>
          </Card>

          <Card title={t('Ads ke tracking codes')} description={t('Ad account se ID copy karke yahan chipkayein. Website khud laga degi.')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Meta (Facebook) Pixel ID" value={s.tracking.metaPixelId ?? ''} placeholder="123456789012345" onChange={(e) => up('tracking', { ...s.tracking, metaPixelId: e.target.value.trim() || null })} />
              <Input label="Google Analytics 4" value={s.tracking.ga4Id ?? ''} placeholder="G-XXXXXXX" onChange={(e) => up('tracking', { ...s.tracking, ga4Id: e.target.value.trim() || null })} />
              <Input label="Google Ads ID" value={s.tracking.googleAdsId ?? ''} placeholder="AW-XXXXXXX" onChange={(e) => up('tracking', { ...s.tracking, googleAdsId: e.target.value.trim() || null })} />
              <Input label={t('Google Ads label')} value={s.tracking.googleAdsLabel ?? ''} onChange={(e) => up('tracking', { ...s.tracking, googleAdsLabel: e.target.value.trim() || null })} />
              <Input label="TikTok Pixel ID" value={s.tracking.tiktokPixelId ?? ''} onChange={(e) => up('tracking', { ...s.tracking, tiktokPixelId: e.target.value.trim() || null })} />
            </div>
          </Card>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Website settings — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Naam aur logo'), hint: t('Upar header me'), icon: Store, color: '#2563eb' },
            { label: t('Rabta'), hint: t('Footer aur contact page'), icon: Share2, color: '#7c3aed' },
            { label: t('Tracking'), hint: t('Ads ka hisaab'), icon: BarChart3, color: '#ea580c' },
          ]}
          steps={[
            { icon: Languages, color: '#0d9488', title: t('Urdu'), text: t('Urdu chalu karein to customer upar se zubaan badal sakta hai. Theme editor me har text ka Urdu likhein.') },
            { icon: KeyRound, color: '#7c3aed', title: t('Password'), text: t('Tayyari ke dauran password lagayein. Live karte waqt Website home se hata dein.') },
            { icon: MessageCircle, color: '#16a34a', title: 'WhatsApp', text: t('Gol button se customer seedha aap ko WhatsApp karta hai.') },
            { icon: Search, color: '#2563eb', title: t('Google'), text: t('Home page ka title aur tafseel. Products aur pages ke apne alag hain.') },
          ]} />
      )}
    </>
  );
}
