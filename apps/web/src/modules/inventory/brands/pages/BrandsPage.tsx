/**
 * Brands setup page: the shared taxonomy page with logo, website and the
 * dealer / after-sales details electronics and appliance shops need.
 */

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useIndustryPresets } from '@industries/_shared/presets/useIndustryPresets';
import { cn } from '@core/lib/cn';
import { Checkbox, Input, Textarea } from '@/design-system/components';
import { TaxonomyPage, type Draft } from '../../taxonomy/TaxonomyPage';

const TEXT = ['description', 'logoUrl', 'website', 'countryOfOrigin', 'dealerCode', 'supportPhone', 'supportEmail', 'warrantyPolicy', 'serviceCenter'] as const;
const FLAGS = ['isActive', 'isFeatured', 'authorizedDealer', 'installationIncluded', 'demoIncluded'] as const;

const payload = (d: Draft) => ({
  name: d.name,
  ...Object.fromEntries(TEXT.filter((k) => d[k] != null).map((k) => [k, String(d[k]).trim()])),
  ...Object.fromEntries(FLAGS.filter((k) => d[k] != null).map((k) => [k, !!d[k]])),
});

function Text({ label, k, d, set, placeholder, hint, type = 'text' }: { label: string; k: string; d: Draft; set: (k: string, v: unknown) => void; placeholder?: string; hint?: string; type?: string }) {
  return <Input label={label} type={type} value={String(d[k] ?? '')} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} hint={hint} maxLength={300} />;
}

function Flag({ label, description, k, d, set }: { label: string; description?: string; k: string; d: Draft; set: (k: string, v: unknown) => void }) {
  return <Checkbox label={label} description={description} checked={!!d[k]} onChange={(e) => set(k, e.target.checked)} />;
}

function BrandFields({ d, set }: { d: Draft; set: (k: string, v: unknown) => void }) {
  const [more, setMore] = useState(!!(d.dealerCode || d.supportPhone || d.warrantyPolicy || d.serviceCenter || d.authorizedDealer));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Text label="Logo ka link" k="logoUrl" d={d} set={set} placeholder="https://…/logo.png" hint="Brand list aur bill par dikhta hai" type="url" />
        <Text label="Website" k="website" d={d} set={set} placeholder="https://…" type="url" />
      </div>
      <Textarea label="Details" rows={2} value={String(d.description ?? '')} onChange={(e) => set('description', e.target.value)} maxLength={500} />
      <Flag label="Khaas brand" description="List mein upar dikhega" k="isFeatured" d={d} set={set} />
      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more}
        className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-100 hover:bg-slate-100">
        <Sparkles className="h-4 w-4 text-brand-600" /> <span className="flex-1">Dealer, warranty aur service</span>
        <ChevronDown className={cn('h-4 w-4 transition', more && 'rotate-180')} />
      </button>
      {more && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label="Mulk" k="countryOfOrigin" d={d} set={set} placeholder="Japan, China…" />
            <Text label="Dealer code" k="dealerCode" d={d} set={set} hint="Company ki taraf se mila code" />
            <Text label="Support phone" k="supportPhone" d={d} set={set} type="tel" placeholder="0800-…" />
            <Text label="Support email" k="supportEmail" d={d} set={set} type="email" />
          </div>
          <Text label="Service center" k="serviceCenter" d={d} set={set} placeholder="Pata ya naam" hint="Warranty claim par customer ko yahi batayein" />
          <Textarea label="Warranty ki shartein" rows={2} value={String(d.warrantyPolicy ?? '')} onChange={(e) => set('warrantyPolicy', e.target.value)} maxLength={1000} />
          <div className="grid gap-2 sm:grid-cols-3">
            <Flag label="Authorized dealer" k="authorizedDealer" d={d} set={set} />
            <Flag label="Installation shamil" k="installationIncluded" d={d} set={set} />
            <Flag label="Demo shamil" k="demoIncluded" d={d} set={set} />
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
