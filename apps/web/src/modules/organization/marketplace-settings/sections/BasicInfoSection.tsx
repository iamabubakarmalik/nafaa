import { Store, Tag, FileText } from 'lucide-react';
import type { MarketplaceProfile } from '../api/marketplace-settings.api';

const INDUSTRIES = [
  'GROCERY', 'RESTAURANT', 'BAKERY', 'PHARMACY', 'JEWELRY',
  'GARMENTS', 'MOBILE', 'ELECTRONICS', 'HARDWARE', 'BOOKS',
  'DAIRY', 'MEAT', 'CARPET', 'SALON', 'GYM', 'HOTEL', 'CLINIC',
  'AUTOPARTS', 'AGRI', 'SERVICES',
];

interface Props {
  s: MarketplaceProfile;
  set: <K extends keyof MarketplaceProfile>(key: K, value: MarketplaceProfile[K]) => void;
}

export default function BasicInfoSection({ s, set }: Props) {
  return (
    <div className="space-y-6">
      <Field label="Public Shop Name" required hint="Ye naam customers ko marketplace pe dikhega">
        <div className="relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={s.publicName || ''}
            onChange={(e) => set('publicName', e.target.value)}
            placeholder="e.g. Ahmad Carpets"
            className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </Field>

      <Field label="Tagline" hint="Ek chhota description — search results mein dikhta hai">
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={s.tagline || ''}
            onChange={(e) => set('tagline', e.target.value)}
            placeholder="Best quality Persian carpets in Lahore"
            className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </Field>

      <Field label="Description" hint="Apni shop, quality aur services ke baare mein detail se likhein">
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <textarea
            value={s.description || ''}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
            placeholder="Hamari shop 20 saal se best quality carpets bech rahi hai..."
            className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </Field>

      <Field label="Category / Industry" required>
        <select
          value={s.industry || 'GROCERY'}
          onChange={(e) => set('industry', e.target.value)}
          className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500"
        >
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </Field>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Logo URL" hint="Square image best (200x200)">
          <input
            value={s.logoUrl || ''}
            onChange={(e) => set('logoUrl', e.target.value)}
            placeholder="https://..."
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
          />
          {s.logoUrl && (
            <img src={s.logoUrl} alt="" className="mt-2 h-16 w-16 rounded-xl object-cover border-2 border-slate-200" />
          )}
        </Field>
        <Field label="Cover Image URL" hint="Wide banner (16:9)">
          <input
            value={s.coverUrl || ''}
            onChange={(e) => set('coverUrl', e.target.value)}
            placeholder="https://..."
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
          />
          {s.coverUrl && (
            <img src={s.coverUrl} alt="" className="mt-2 h-16 w-full rounded-xl object-cover border-2 border-slate-200" />
          )}
        </Field>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: any) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700 mb-1.5 block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1 font-medium">{hint}</p>}
    </div>
  );
}
