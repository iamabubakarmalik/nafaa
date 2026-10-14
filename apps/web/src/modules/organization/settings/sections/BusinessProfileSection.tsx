/**
 * Store details: logo and banner, the store's name and legal name, contact
 * numbers and address. These print on every bill and invoice; a preview on
 * the side shows the bill header as it will look. Changes save by themselves.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Globe, Image as ImageIcon, Mail, MapPin, MessageCircle, Phone, Receipt, Store } from 'lucide-react';
import { Alert, Field, SectionCard, TextInput } from '../components/UI';
import { SyncedBadge } from '../components/SyncedBadge';
import LogoUploader from '../components/LogoUploader';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BusinessProfileSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <SaveStatusBar saving={saving} dirty={dirty} />
        <SectionCard title="Logo aur banner" desc="Logo har bill, invoice aur online store par dikhta hai" icon={ImageIcon} color="emerald">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Store logo" hint="Chokor (square) tasveer, 512×512 behtar hai. Saaf background wala PNG sab se acha chhapta hai.">
              <LogoUploader value={draft.logoUrl} onChange={(url) => set('logoUrl', url)} purpose="logo" size={104} shape="square" label="Logo" />
            </Field>
            <Field label="Banner" hint="Chaura banner (1200×400) — online store aur bari screens ke upar. Zaroori nahi.">
              <LogoUploader value={draft.bannerUrl} onChange={(url) => set('bannerUrl', url)} purpose="banner" size={72} shape="wide" label="Banner" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Business ki pehchaan" desc="Naam jo customer bill par parhta hai, aur kaghazi naam" icon={Store} color="blue">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store ka naam" required badge={<SyncedBadge />} hint="Bill ke upar sab se bara yahi likha jata hai.">
              <TextInput value={draft.shopName} onChange={(v) => set('shopName', v)} placeholder="Ahmad Bakery" maxLength={80} />
            </Field>
            <Field label="Legal naam" hint="FBR ya trade license wala naam — A4 invoice par chhapta hai.">
              <TextInput value={draft.legalName} onChange={(v) => set('legalName', v)} placeholder="Ahmad Foods (Pvt) Ltd" maxLength={200} />
            </Field>
            <Field label="Business type" hint="Badalne ke liye 'Business type' page kholein.">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><TextInput value={draft.businessType} onChange={() => undefined} disabled /></div>
                <Link to="/settings/business-type" className="shrink-0 rounded-lg px-2.5 py-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">Badlein</Link>
              </div>
            </Field>
            <Field label="Kab shuru hua" hint="Zaroori nahi. Store ki saalgirah aur profile ke liye.">
              <TextInput type="date" value={draft.establishedDate?.slice(0, 10) || ''} onChange={(v) => set('establishedDate', v || null)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Contact" desc="Customer aap se kaise rabta kare — bill aur WhatsApp par jata hai" icon={Phone} color="violet">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" badge={<SyncedBadge />} hint="Bill par chhapta hai. Misaal: 0300 1234567">
              <TextInput value={draft.shopPhone} onChange={(v) => set('shopPhone', v)} placeholder="0300 1234567" maxLength={30} prefix={<Phone className="h-4 w-4" />} />
            </Field>
            <Field label="WhatsApp number" hint="Customer ko bill aur rozana report isi number se khulti hai.">
              <TextInput value={draft.shopWhatsapp} onChange={(v) => set('shopWhatsapp', v)} placeholder="0300 1234567" maxLength={30} prefix={<MessageCircle className="h-4 w-4" />} />
            </Field>
            <EmailField value={draft.shopEmail ?? ''} onSave={(v) => set('shopEmail', v)} />
            <Field label="Website" hint="Website ya Facebook page ka link — A4 invoice par chhapta hai.">
              <TextInput value={draft.shopWebsite} onChange={(v) => set('shopWebsite', v)} placeholder="https://meristore.pk" prefix={<Globe className="h-4 w-4" />} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Pata" desc="Store ka poora address — bill, invoice aur delivery ke liye" icon={MapPin} color="amber">
          <div className="space-y-4">
            <Field label="Gali / bazaar" badge={<SyncedBadge />} hint="Dukaan number, bazaar aur ilaqa. Misaal: Shop 12, Main Bazaar, Anarkali">
              <TextInput value={draft.shopAddress} onChange={(v) => set('shopAddress', v)} placeholder="Shop 12, Main Bazaar, Anarkali" maxLength={500} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Shehar" hint="Misaal: Lahore">
                <TextInput value={draft.shopCity} onChange={(v) => set('shopCity', v)} placeholder="Lahore" maxLength={100} />
              </Field>
              <Field label="Province" hint="Punjab, Sindh, KP, Balochistan…">
                <TextInput value={draft.shopProvince} onChange={(v) => set('shopProvince', v)} placeholder="Punjab" maxLength={100} />
              </Field>
              <Field label="Postal code" hint="Zaroori nahi">
                <TextInput value={draft.shopPostalCode} onChange={(v) => set('shopPostalCode', v)} placeholder="54000" maxLength={20} />
              </Field>
            </div>
          </div>
        </SectionCard>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
        <BillHeaderPreview s={draft} />
        <Alert tone="blue" icon={Building2}>
          Yeh details naye bills par lagti hain. Purane bill waise hi rehte hain jaise bane the.
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
    <Field label="Email" error={bad ? 'Email sahi likhein, jaise store@gmail.com' : undefined}
      hint="Rozana report aur zaroori khabrein is email par aati hain.">
      <TextInput type="email" value={text} placeholder="store@gmail.com" prefix={<Mail className="h-4 w-4" />} error={bad ? 'bad' : undefined}
        onChange={(v) => { setText(v); if (EMAIL.test(v.trim())) onSave(v.trim()); }} />
    </Field>
  );
}

function BillHeaderPreview({ s }: { s: TenantSettings }) {
  const place = [s.shopAddress, s.shopCity].filter(Boolean).join(', ');
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-700"><Receipt className="h-4 w-4" /> Bill par aisa dikhega</p>
      <div className="rounded-xl bg-white px-4 py-5 text-center font-mono text-[0.75rem] leading-relaxed text-slate-800 shadow-sm">
        {s.logoUrl
          ? <img src={s.logoUrl} alt="" className="mx-auto mb-2 h-14 w-14 rounded-lg object-contain" />
          : <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[0.625rem] text-slate-400">Logo</div>}
        <p className="text-[0.9375rem] font-bold uppercase tracking-wide">{s.shopName || 'Store ka naam'}</p>
        {s.legalName && <p className="text-slate-500">{s.legalName}</p>}
        <p className="mt-1 text-slate-600">{place || 'Pata yahan aayega'}</p>
        {(s.shopPhone || s.shopWhatsapp) && <p className="text-slate-600">{[s.shopPhone, s.shopWhatsapp && s.shopWhatsapp !== s.shopPhone ? `WA ${s.shopWhatsapp}` : ''].filter(Boolean).join(' · ')}</p>}
        {s.shopWebsite && <p className="truncate text-slate-500">{s.shopWebsite}</p>}
        <div className="my-3 border-t border-dashed border-slate-300" />
        <p className="text-slate-400">Bill NF-10234 · {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</p>
      </div>
    </div>
  );
}
