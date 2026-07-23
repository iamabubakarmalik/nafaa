import { MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
import type { MarketplaceProfile } from '../api/marketplace-settings.api';

const CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
  'Hyderabad', 'Sargodha', 'Bahawalpur', 'Sukkur', 'Larkana',
];

interface Props {
  s: MarketplaceProfile;
  set: <K extends keyof MarketplaceProfile>(key: K, value: MarketplaceProfile[K]) => void;
}

export default function LocationSection({ s, set }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="City" required>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={s.city || ''}
              onChange={(e) => set('city', e.target.value)}
              className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500 appearance-none"
            >
              <option value="">Select city...</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="Area / Sector">
          <input
            value={s.area || ''}
            onChange={(e) => set('area', e.target.value)}
            placeholder="Model Town, DHA, Gulberg..."
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
          />
        </Field>
      </div>

      <Field label="Full Address" hint="Rider ko dhoondhne mein aasan ho">
        <textarea
          value={s.address || ''}
          onChange={(e) => set('address', e.target.value)}
          rows={2}
          placeholder="Shop #5, Ground Floor, Main Boulevard, Model Town, Lahore"
          className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 resize-none"
        />
      </Field>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Latitude" hint="Google Maps se copy karein">
          <input
            type="number"
            step="0.000001"
            value={s.lat ?? ''}
            onChange={(e) => set('lat', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="31.5204"
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
          />
        </Field>
        <Field label="Longitude">
          <input
            type="number"
            step="0.000001"
            value={s.lng ?? ''}
            onChange={(e) => set('lng', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="74.3587"
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
          />
        </Field>
      </div>

      <div className="pt-4 border-t-2 border-slate-100">
        <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-emerald-600" />
          Contact Information
        </h4>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Contact Phone">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={s.contactPhone || ''}
                onChange={(e) => set('contactPhone', e.target.value)}
                placeholder="03001234567"
                className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </Field>

          <Field label="WhatsApp Number">
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              <input
                value={s.whatsappNumber || ''}
                onChange={(e) => set('whatsappNumber', e.target.value)}
                placeholder="03001234567"
                className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Contact Email" hint="Order updates aur inquiries ke liye">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={s.contactEmail || ''}
                onChange={(e) => set('contactEmail', e.target.value)}
                placeholder="shop@example.com"
                className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </Field>
        </div>
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
