import {
  Wrench, Image as ImageIcon, Eye, Star, TrendingUp, Zap, Sparkles,
  ArrowRight, AlertTriangle, Info, X, Briefcase, Package, Settings,
  Monitor, Home, Truck, Shield, Award, PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import type { ServicesBizBasic } from '../../hooks/useServicesBizWizard';

const CATEGORIES = [
  { value: 'INSTALLATION', label: 'Installation', emoji: '🔧' },
  { value: 'REPAIR', label: 'Repair', emoji: '🛠️' },
  { value: 'MAINTENANCE', label: 'Maintenance', emoji: '⚙️' },
  { value: 'INSPECTION', label: 'Inspection', emoji: '🔍' },
  { value: 'CLEANING_SERVICE', label: 'Cleaning', emoji: '🧹' },
  { value: 'UPGRADE', label: 'Upgrade', emoji: '⬆️' },
  { value: 'REPLACEMENT', label: 'Replacement', emoji: '🔄' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic', emoji: '📊' },
  { value: 'EMERGENCY', label: 'Emergency', emoji: '🚨' },
  { value: 'CONSULTATION', label: 'Consultation', emoji: '💬' },
  { value: 'AMC_VISIT', label: 'AMC Visit', emoji: '🛡️' },
  { value: 'WARRANTY_CLAIM', label: 'Warranty', emoji: '🎫' },
  { value: 'OTHER_SERVICE', label: 'Other', emoji: '⭐' },
];

const BUSINESS_TYPES = [
  { value: 'ELECTRICIAN', label: 'Electrician', emoji: '⚡' },
  { value: 'PLUMBER', label: 'Plumber', emoji: '🔧' },
  { value: 'AC_TECHNICIAN', label: 'AC Technician', emoji: '❄️' },
  { value: 'APPLIANCE_REPAIR', label: 'Appliance', emoji: '📺' },
  { value: 'MOBILE_REPAIR', label: 'Mobile Repair', emoji: '📱' },
  { value: 'COMPUTER_REPAIR', label: 'Computer Repair', emoji: '💻' },
  { value: 'IT_SERVICES', label: 'IT Services', emoji: '🖥️' },
  { value: 'CLEANING', label: 'Cleaning', emoji: '🧹' },
  { value: 'PEST_CONTROL', label: 'Pest Control', emoji: '🐜' },
  { value: 'CARPENTRY', label: 'Carpentry', emoji: '🪚' },
  { value: 'PAINTING', label: 'Painting', emoji: '🎨' },
  { value: 'MASONRY', label: 'Masonry', emoji: '🧱' },
  { value: 'WELDING', label: 'Welding', emoji: '🔩' },
  { value: 'GLASS_WORK', label: 'Glass Work', emoji: '🪟' },
  { value: 'CCTV_INSTALLATION', label: 'CCTV', emoji: '📹' },
  { value: 'SOLAR_INSTALLATION', label: 'Solar', emoji: '☀️' },
  { value: 'GENERATOR_SERVICE', label: 'Generator', emoji: '⚙️' },
  { value: 'UPS_SERVICE', label: 'UPS', emoji: '🔋' },
  { value: 'WATER_TANK_CLEANING', label: 'Water Tank', emoji: '💧' },
  { value: 'HOME_MAINTENANCE', label: 'Home Maint.', emoji: '🏠' },
  { value: 'OFFICE_MAINTENANCE', label: 'Office Maint.', emoji: '🏢' },
  { value: 'AUTOMOBILE_MECHANIC', label: 'Auto Mechanic', emoji: '🚗' },
  { value: 'MOTORCYCLE_MECHANIC', label: 'Bike Mechanic', emoji: '🏍️' },
  { value: 'MOVERS_PACKERS', label: 'Movers', emoji: '📦' },
  { value: 'INTERIOR_DESIGN', label: 'Interior Design', emoji: '🛋️' },
  { value: 'LANDSCAPING', label: 'Landscaping', emoji: '🌳' },
  { value: 'HVAC', label: 'HVAC', emoji: '🌬️' },
  { value: 'ELEVATOR_MAINTENANCE', label: 'Elevator', emoji: '🛗' },
  { value: 'FIRE_SAFETY', label: 'Fire Safety', emoji: '🚨' },
  { value: 'SECURITY_SYSTEMS', label: 'Security', emoji: '🔒' },
  { value: 'OTHER', label: 'Other', emoji: '🛠️' },
];

interface Props {
  basic: ServicesBizBasic;
  onChange: (patch: Partial<ServicesBizBasic>) => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}

export function ServicesBizWizardStep1Basic({ basic, onChange, onNext, validation }: Props) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Briefcase} title="Service Identity" desc="What service are you offering?" />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Service Name *
            </label>
            <input
              autoFocus
              value={basic.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. AC Gas Refill, CCTV Installation, Pipe Repair"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Service Code (optional)
            </label>
            <input
              value={basic.code}
              onChange={(e) => onChange({ code: e.target.value })}
              placeholder="Auto if empty (e.g. SVC-001)"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Detailed service description customer will see..."
          />
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Settings} title="Service Category *" desc="What type of service is this?" />

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {CATEGORIES.map((c) => {
            const active = basic.category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange({ category: c.value })}
                className={[
                  'group px-2 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                  active
                    ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 shadow-md ring-2 ring-cyan-200'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-cyan-300 hover:shadow-sm',
                ].join(' ')}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{c.emoji}</span>
                <span className={[
                  'text-[10px] font-extrabold text-center leading-tight',
                  active ? 'text-cyan-800' : 'text-slate-700 dark:text-slate-300',
                ].join(' ')}>
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Package} title="Business Type" desc="Which trade does this belong to?" />

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto">
          <button
            type="button"
            onClick={() => onChange({ businessType: '' })}
            className={[
              'px-2 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
              !basic.businessType
                ? 'border-slate-800 bg-slate-100 dark:bg-neutral-700 shadow-md'
                : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-400',
            ].join(' ')}
          >
            <span className="text-2xl">🌐</span>
            <span className="text-[10px] font-extrabold">General</span>
          </button>
          {BUSINESS_TYPES.map((b) => {
            const active = basic.businessType === b.value;
            return (
              <button
                key={b.value}
                type="button"
                onClick={() => onChange({ businessType: b.value })}
                className={[
                  'group px-2 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                  active
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 shadow-md ring-2 ring-blue-200'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-300',
                ].join(' ')}
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{b.emoji}</span>
                <span className={[
                  'text-[10px] font-extrabold text-center leading-tight',
                  active ? 'text-blue-800' : 'text-slate-700 dark:text-slate-300',
                ].join(' ')}>
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={ImageIcon} title="Service Images" desc="Show what the service looks like" />
        <UploadDropzone
          purpose="product-image"
          maxFiles={10}
          onUploaded={(records) => {
            const urls = records.map((r) => r.url);
            const primary = basic.imageUrl || urls[0] || '';
            const rest = urls.filter((u) => u !== primary);
            onChange({
              imageUrl: primary,
              imageUrls: [...basic.imageUrls, ...rest],
            });
          }}
          hint="Before/after photos, work samples — all in one"
        />

        {(basic.imageUrl || basic.imageUrls.length > 0) && (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {basic.imageUrl && (
              <div className="group relative aspect-square rounded-xl overflow-hidden border-2 border-cyan-500 ring-2 ring-cyan-200">
                <img src={basic.imageUrl} alt="Primary" className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-cyan-600 text-white text-[9px] font-extrabold">
                  PRIMARY
                </div>
                <button
                  onClick={() => onChange({ imageUrl: basic.imageUrls[0] || '', imageUrls: basic.imageUrls.slice(1) })}
                  className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {basic.imageUrls.map((url, idx) => (
              <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-neutral-700">
                <img src={url} alt={'Image ' + (idx + 1)} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                  <button
                    onClick={() => onChange({
                      imageUrl: url,
                      imageUrls: [basic.imageUrl, ...basic.imageUrls.filter((_, i) => i !== idx)].filter(Boolean),
                    })}
                    className="text-white text-[10px] font-extrabold px-2 py-1 bg-cyan-600 hover:bg-cyan-700 rounded"
                  >
                    Set Primary
                  </button>
                  <button
                    onClick={() => onChange({ imageUrls: basic.imageUrls.filter((_, i) => i !== idx) })}
                    className="text-white p-1 bg-rose-600 hover:bg-rose-700 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Award} title="Marketing & Visibility" desc="Badges customers will see" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <FlagCard active={basic.isActive} onToggle={(v: any) => onChange({ isActive: v })} icon={Eye} label="Active" desc="Visible everywhere" tone="emerald" />
          <FlagCard active={basic.isFeatured} onToggle={(v: any) => onChange({ isFeatured: v })} icon={Star} label="Featured" desc="Show at top" tone="amber" />
          <FlagCard active={basic.isPopular} onToggle={(v: any) => onChange({ isPopular: v })} icon={TrendingUp} label="Popular" desc="High demand" tone="red" />
          <FlagCard active={basic.isEmergency} onToggle={(v: any) => onChange({ isEmergency: v })} icon={Zap} label="Emergency" desc="24/7 available" tone="rose" />
          <FlagCard active={basic.isRemoteAvailable} onToggle={(v: any) => onChange({ isRemoteAvailable: v })} icon={Monitor} label="Remote OK" desc="Can do online" tone="blue" />
        </div>
      </section>

      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Aage badhne se pehle ye theek karein:</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {validation.errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-2 border-cyan-200 dark:border-cyan-800 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-cyan-700 shrink-0" />
          <div className="text-sm text-cyan-900 dark:text-cyan-200">
            <div className="font-extrabold">Step 1 ready?</div>
            <div className="text-[11px] text-cyan-700 font-semibold">Next: pricing & charges</div>
          </div>
        </div>
        <Button
          onClick={onNext}
          disabled={!validation.valid}
          className="bg-gradient-to-r from-cyan-600 to-blue-700 shadow-md"
        >
          Next: Pricing <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function FlagCard({ active, onToggle, icon: Icon, label, desc, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 border-emerald-500',
    amber: 'from-amber-500 to-orange-500 border-amber-500',
    red: 'from-red-500 to-rose-600 border-red-500',
    rose: 'from-rose-500 to-pink-600 border-rose-500',
    blue: 'from-blue-500 to-cyan-600 border-blue-500',
  };
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={[
        'p-3 rounded-xl border-2 text-left transition-all',
        active ? 'bg-gradient-to-br ' + tones[tone] + ' text-white shadow-md' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Icon className={'h-4 w-4 ' + (active ? 'text-white' : 'text-slate-500')} />
        <div className={'font-extrabold text-sm ' + (active ? 'text-white' : 'text-slate-900 dark:text-white')}>{label}</div>
      </div>
      <div className={'text-[10px] font-semibold mt-0.5 ' + (active ? 'text-white/80' : 'text-slate-500')}>{desc}</div>
    </button>
  );
}
