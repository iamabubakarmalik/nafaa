/**
 * Brands setup page: the shared taxonomy page with logo, website and the
 * dealer / after-sales details electronics and appliance shops need.
 */

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useIndustryPresets } from '@industries/_shared/presets/useIndustryPresets';
import { cn } from '@core/lib/cn';
import { TaxonomyPage, type Draft } from '../../taxonomy/TaxonomyPage';

const TEXT = ['description', 'logoUrl', 'website', 'countryOfOrigin', 'dealerCode', 'supportPhone', 'supportEmail', 'warrantyPolicy', 'serviceCenter'] as const;
const FLAGS = ['isActive', 'isFeatured', 'authorizedDealer', 'installationIncluded', 'demoIncluded'] as const;

const payload = (d: Draft) => ({
  name: d.name,
  ...Object.fromEntries(TEXT.filter((k) => d[k] != null).map((k) => [k, String(d[k]).trim()])),
  ...Object.fromEntries(FLAGS.filter((k) => d[k] != null).map((k) => [k, !!d[k]])),
});

const input = 'h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

function Text({ label, k, d, set, placeholder, type = 'text' }: { label: string; k: string; d: Draft; set: (k: string, v: unknown) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.8125rem] font-semibold text-slate-800">{label}</span>
      <input type={type} value={d[k] ?? ''} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className={input} />
    </label>
  );
}

function Check({ label, k, d, set }: { label: string; k: string; d: Draft; set: (k: string, v: unknown) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={!!d[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-brand-600" /> {label}
    </label>
  );
}

function BrandFields({ d, set }: { d: Draft; set: (k: string, v: unknown) => void }) {
  const [more, setMore] = useState(!!(d.dealerCode || d.supportPhone || d.warrantyPolicy || d.serviceCenter || d.authorizedDealer));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Text label="Logo ka link" k="logoUrl" d={d} set={set} placeholder="https://…/logo.png" />
        <Text label="Website" k="website" d={d} set={set} placeholder="https://…" />
      </div>
      <label className="block">
        <span className="mb-1 block text-[0.8125rem] font-semibold text-slate-800">Details</span>
        <textarea value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500" />
      </label>
      <Check label="Khaas brand (list me upar)" k="isFeatured" d={d} set={set} />
      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more}
        className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800">
        <Sparkles className="h-4 w-4 text-brand-600" /> <span className="flex-1">Dealer, warranty aur service</span>
        <ChevronDown className={cn('h-4 w-4 transition', more && 'rotate-180')} />
      </button>
      {more && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label="Mulk" k="countryOfOrigin" d={d} set={set} placeholder="Japan, China…" />
            <Text label="Dealer code" k="dealerCode" d={d} set={set} />
            <Text label="Support phone" k="supportPhone" d={d} set={set} type="tel" />
            <Text label="Support email" k="supportEmail" d={d} set={set} type="email" />
          </div>
          <Text label="Service center" k="serviceCenter" d={d} set={set} placeholder="Pata ya naam" />
          <label className="block">
            <span className="mb-1 block text-[0.8125rem] font-semibold text-slate-800">Warranty ki shartein</span>
            <textarea value={d.warrantyPolicy ?? ''} onChange={(e) => set('warrantyPolicy', e.target.value)} rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500" />
          </label>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Check label="Authorized dealer" k="authorizedDealer" d={d} set={set} />
            <Check label="Installation shamil" k="installationIncluded" d={d} set={set} />
            <Check label="Demo shamil" k="demoIncluded" d={d} set={set} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandsPage() {
  const presets = useIndustryPresets();
  return (
    <TaxonomyPage config={{
      kind: 'brand', title: 'Brands', one: 'brand', icon: Sparkles,
      productParam: 'brandId', canSwitchOff: true,
      presets: presets.brands, refreshKeys: ['brands', 'brand'], toPayload: payload,
      extraFields: (d, set) => <BrandFields d={d} set={set} />,
      industry: { name: presets.industryName, emoji: presets.industryEmoji },
      guide: [
        { title: 'Brand kya hai', body: 'Banane wali company — Nestle, Samsung, Lux. Product ke saath brand lagayein.' },
        { title: 'Sale brand ke hisaab se', body: 'Period chunein — har brand ki sale, profit aur stock ki qeemat dikhti hai. Kis company ka maal zyada chalta hai, yahin pata chalta hai.' },
        { title: 'Dealer aur warranty', body: 'Electronics aur appliances ke liye: support phone, warranty ki shartein aur service center — bill aur warranty claim me kaam aate hain.' },
        { title: 'Milana', body: 'Ek hi brand do naam se ban gaya ho ("Nestle", "Nestlé") to "Doosri me milayein".' },
      ],
    }} />
  );
}
