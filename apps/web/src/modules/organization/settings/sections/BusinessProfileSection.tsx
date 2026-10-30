/**
 * Store details: logo and banner, the store's name and legal name, contact
 * numbers and address. These print on every bill and invoice; a preview on
 * the side shows the bill header as it will look. Changes save by themselves.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Globe, Image as ImageIcon, Mail, MapPin, MessageCircle, Phone, Receipt, Store } from 'lucide-react';
import { Field, SectionCard } from '../components/SettingsBlocks';
import { Alert, Input } from '@/design-system/components';
import { SyncedBadge } from '../components/SyncedBadge';
import LogoUploader from '../components/LogoUploader';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';
import { t } from '@core/i18n';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BusinessProfileSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <SaveStatusBar saving={saving} dirty={dirty} />
        <SectionCard title={t('Logo aur banner')} desc={t('Logo har bill, invoice aur online store par dikhta hai')} icon={ImageIcon} color="emerald">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label={t('Store logo')} hint={t('Chokor (square) tasveer, 512×512 behtar hai. Saaf background wala PNG sab se acha chhapta hai.')}>
              <LogoUploader value={draft.logoUrl} onChange={(url) => set('logoUrl', url)} purpose="logo" size={104} shape="square" label={t('Logo')} />
            </Field>
            <Field label={t('Banner')} hint={t('Chaura banner (1200×400) — online store aur bari screens ke upar. Zaroori nahi.')}>
              <LogoUploader value={draft.bannerUrl} onChange={(url) => set('bannerUrl', url)} purpose="banner" size={72} shape="wide" label={t('Banner')} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title={t('Business ki pehchaan')} desc={t('Naam jo customer bill par parhta hai, aur kaghazi naam')} icon={Store} color="blue">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={<span className="inline-flex items-center gap-1.5">{t('Store ka naam')}<SyncedBadge /></span>} required hint={t('Bill ke upar sab se bara yahi likha jata hai.')} value={draft.shopName ?? ''} onChange={(e) => set('shopName', e.target.value)} placeholder={t('Ahmad Bakery')} maxLength={80} />
            <Input label={t('Legal naam')} hint={t('FBR ya trade license wala naam — A4 invoice par chhapta hai.')} value={draft.legalName ?? ''} onChange={(e) => set('legalName', e.target.value)} placeholder={t('Ahmad Foods (Pvt) Ltd')} maxLength={200} />
            <Field label={t('Business type')} hint={t('Badalne ke liye \'Business type\' page kholein.')}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><Input value={draft.businessType ?? ''} readOnly disabled aria-label={t('Business type')} /></div>
                <Link to="/settings/business-type" className="shrink-0 rounded-lg px-2.5 py-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">{t('Badlein')}</Link>
              </div>
            </Field>
            <Input label={t('Kab shuru hua')} hint={t('Zaroori nahi. Store ki saalgirah aur profile ke liye.')} type="date" value={draft.establishedDate?.slice(0, 10) || ''} onChange={(e) => set('establishedDate', e.target.value || null)} />
          </div>
        </SectionCard>

        <SectionCard title={t('Contact')} desc={t('Customer aap se kaise rabta kare — bill aur WhatsApp par jata hai')} icon={Phone} color="violet">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={<span className="inline-flex items-center gap-1.5">{t('Phone')}<SyncedBadge /></span>} hint={t('Bill par chhapta hai. Misaal: 0300 1234567')} value={draft.shopPhone ?? ''} onChange={(e) => set('shopPhone', e.target.value)} placeholder="0300 1234567" maxLength={30} leftIcon={<Phone className="h-4 w-4" />} />
            <Input label={t('WhatsApp number')} hint={t('Customer ko bill aur rozana report isi number se khulti hai.')} value={draft.shopWhatsapp ?? ''} onChange={(e) => set('shopWhatsapp', e.target.value)} placeholder="0300 1234567" maxLength={30} leftIcon={<MessageCircle className="h-4 w-4" />} />
            <EmailField value={draft.shopEmail ?? ''} onSave={(v) => set('shopEmail', v)} />
            <Input label={t('Website')} hint={t('Website ya Facebook page ka link — A4 invoice par chhapta hai.')} value={draft.shopWebsite ?? ''} onChange={(e) => set('shopWebsite', e.target.value)} placeholder="https://meristore.pk" leftIcon={<Globe className="h-4 w-4" />} />
          </div>
        </SectionCard>

        <SectionCard title={t('Pata')} desc={t('Store ka poora address — bill, invoice aur delivery ke liye')} icon={MapPin} color="amber">
          <div className="space-y-4">
            <Input label={<span className="inline-flex items-center gap-1.5">{t('Gali / bazaar')}<SyncedBadge /></span>} hint={t('Dukaan number, bazaar aur ilaqa. Misaal: Shop 12, Main Bazaar, Anarkali')} value={draft.shopAddress ?? ''} onChange={(e) => set('shopAddress', e.target.value)} placeholder={t('Shop 12, Main Bazaar, Anarkali')} maxLength={500} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label={t('Shehar')} hint={t('Misaal: Lahore')} value={draft.shopCity ?? ''} onChange={(e) => set('shopCity', e.target.value)} placeholder={t('Lahore')} maxLength={100} />
              <Input label={t('Province')} hint={t('Punjab, Sindh, KP, Balochistan…')} value={draft.shopProvince ?? ''} onChange={(e) => set('shopProvince', e.target.value)} placeholder={t('Punjab')} maxLength={100} />
              <Input label={t('Postal code')} hint={t('Zaroori nahi')} value={draft.shopPostalCode ?? ''} onChange={(e) => set('shopPostalCode', e.target.value)} placeholder="54000" maxLength={20} />
            </div>
          </div>
        </SectionCard>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
        <BillHeaderPreview s={draft} />
        <Alert className="mt-3" tone="info" icon={<Building2 className="h-4 w-4" />}>
          {t('Yeh details naye bills par lagti hain. Purane bill waise hi rehte hain jaise bane the.')}
        </Alert>
      </aside>
    </div>
  );
}

/** Email saves only once it looks like an address, so half-typed text never reaches the server. */
function EmailField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const bad = !!text && !EMAIL.test(text.trim());
  return (
    <Input label={t('Email')} error={bad ? t('Email sahi likhein, jaise store@gmail.com') : undefined} hint={t('Rozana report aur zaroori khabrein is email par aati hain.')} type="email" value={text ?? ''} placeholder="store@gmail.com" leftIcon={<Mail className="h-4 w-4" />} onChange={(e) => { const v = e.target.value; setText(v); if (EMAIL.test(v.trim())) onSave(v.trim()); }} />
  );
}

function BillHeaderPreview({ s }: { s: TenantSettings }) {
  const place = [s.shopAddress, s.shopCity].filter(Boolean).join(', ');
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-700"><Receipt className="h-4 w-4" /> {' '}{t('Bill par aisa dikhega')}</p>
      <div className="rounded-xl bg-white px-4 py-5 text-center font-mono text-[0.75rem] leading-relaxed text-slate-800 shadow-sm">
        {s.logoUrl
          ? <img src={s.logoUrl} alt="" className="mx-auto mb-2 h-14 w-14 rounded-lg object-contain" />
          : <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[0.625rem] text-slate-400">{t('Logo')}</div>}
        <p className="text-[0.9375rem] font-bold uppercase tracking-wide">{s.shopName || t('Store ka naam')}</p>
        {s.legalName && <p className="text-slate-500">{s.legalName}</p>}
        <p className="mt-1 text-slate-600">{place || t('Pata yahan aayega')}</p>
        {(s.shopPhone || s.shopWhatsapp) && <p className="text-slate-600">{[s.shopPhone, s.shopWhatsapp && s.shopWhatsapp !== s.shopPhone ? `WA ${s.shopWhatsapp}` : ''].filter(Boolean).join(' · ')}</p>}
        {s.shopWebsite && <p className="truncate text-slate-500">{s.shopWebsite}</p>}
        <div className="my-3 border-t border-dashed border-slate-300" />
        <p className="text-slate-400">{t('Bill NF-10234 · {{value}}', { value: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()) })}</p>
      </div>
    </div>
  );
}
