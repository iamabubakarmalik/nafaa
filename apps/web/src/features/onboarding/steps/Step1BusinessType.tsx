import { BusinessTypeSelector, type BusinessTypeCard } from '../components/BusinessTypeSelector';
import { CitySelector } from '../components/CitySelector';
import { STEP_CONFIG } from '../constants/step-config';

interface Props {
  data: { businessType: string; businessSize: string; city: string; province: string };
  onChange: (data: Partial<Props['data']>) => void;
  options: any;
  detectedCity?: string;
}

const FALLBACK_BUSINESS_SIZES = [
  { value: 'MICRO', label: 'Micro', desc: 'Ghar se, 1 person', icon: '🏠', staffRange: '1', monthlyRevenue: '< 100K' },
  { value: 'SMALL', label: 'Small', desc: '1-3 staff, 1 shop', icon: '🏪', staffRange: '1-3', monthlyRevenue: '100K - 500K' },
  { value: 'MEDIUM', label: 'Medium', desc: '4-15 staff, 1-3 shops', icon: '🏢', staffRange: '4-15', monthlyRevenue: '500K - 5M' },
  { value: 'LARGE', label: 'Large', desc: '15+ staff, multi-branch', icon: '🏬', staffRange: '15+', monthlyRevenue: '5M+' },
];

const FALLBACK_PROVINCES = [
  { value: 'PUNJAB', label: 'Punjab' },
  { value: 'SINDH', label: 'Sindh' },
  { value: 'KPK', label: 'Khyber Pakhtunkhwa' },
  { value: 'BALOCHISTAN', label: 'Balochistan' },
  { value: 'GB', label: 'Gilgit-Baltistan' },
  { value: 'AJK', label: 'Azad Jammu & Kashmir' },
  { value: 'ICT', label: 'Islamabad Capital Territory' },
];

const FALLBACK_CITIES = [
  { name: 'Karachi', province: 'SINDH', provinceLabel: 'Sindh', isMajor: true },
  { name: 'Lahore', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: true },
  { name: 'Islamabad', province: 'ICT', provinceLabel: 'Islamabad Capital Territory', isMajor: true },
  { name: 'Rawalpindi', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: true },
  { name: 'Faisalabad', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: true },
  { name: 'Multan', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: true },
  { name: 'Peshawar', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', isMajor: true },
  { name: 'Quetta', province: 'BALOCHISTAN', provinceLabel: 'Balochistan', isMajor: true },
  { name: 'Hyderabad', province: 'SINDH', provinceLabel: 'Sindh', isMajor: true },
  { name: 'Sialkot', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: true },
  { name: 'Gujranwala', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: true },
  { name: 'Bahawalpur', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: false },
  { name: 'Sargodha', province: 'PUNJAB', provinceLabel: 'Punjab', isMajor: false },
  { name: 'Sukkur', province: 'SINDH', provinceLabel: 'Sindh', isMajor: false },
  { name: 'Other', province: '', provinceLabel: '', isMajor: false },
];

// Normalize cities: some backends return string[], some return object[]
function normalizeCities(input: any): any[] {
  if (!Array.isArray(input) || input.length === 0) return FALLBACK_CITIES;
  return input.map((c) => (typeof c === 'string' ? { name: c, province: '', provinceLabel: '', isMajor: true } : c));
}

// Normalize provinces: some return string[], some object[]
function normalizeProvinces(input: any): any[] {
  if (!Array.isArray(input) || input.length === 0) return FALLBACK_PROVINCES;
  return input.map((p) => (typeof p === 'string' ? { value: p.toUpperCase().replace(/\s+/g, '_'), label: p } : p));
}

export function Step1BusinessType({ data, onChange, options, detectedCity }: Props) {
  const cfg = STEP_CONFIG[1];

  const businessSizes = options?.businessSizes?.length ? options.businessSizes : FALLBACK_BUSINESS_SIZES;
  const provinces = normalizeProvinces(options?.provinces);
  const cities = normalizeCities(options?.cities);
  const businessTypes = Array.isArray(options?.businessTypes) ? options.businessTypes : [];

  return (
    <div className="space-y-8">
      {/* Business Type */}
      <section>
        <SectionLabel required>Business Type</SectionLabel>
        <BusinessTypeSelector
          value={data.businessType}
          options={businessTypes}
          onChange={(t: BusinessTypeCard) => onChange({ businessType: t.value })}
          onSelect={(t: BusinessTypeCard) => onChange({ businessType: t.value })}
          showConfirmButton={false}
        />
      </section>

      {/* Business Size */}
      <section>
        <SectionLabel required>Business ka size</SectionLabel>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {businessSizes.map((bs: any) => {
            const active = data.businessSize === bs.value;
            return (
              <button
                key={bs.value}
                type="button"
                onClick={() => onChange({ businessSize: bs.value })}
                className={`text-left p-4 rounded-2xl border-2 transition ${
                  active
                    ? `${cfg.borderColor} bg-gradient-to-br from-white to-emerald-50 shadow-lg`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{bs.icon}</span>
                  <span className={`font-black ${active ? cfg.textColor : 'text-slate-900'}`}>
                    {bs.label}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-medium">{bs.desc}</div>
                {(bs.staffRange || bs.monthlyRevenue) && (
                  <div className="text-[10px] text-slate-400 mt-1">
                    {bs.staffRange && `Staff: ${bs.staffRange}`}
                    {bs.staffRange && bs.monthlyRevenue && ' · '}
                    {bs.monthlyRevenue && `Revenue: ${bs.monthlyRevenue}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* City */}
      <section>
        <SectionLabel required>Aap ka shahar</SectionLabel>
        <CitySelector
          cities={cities}
          value={data.city}
          detectedCity={detectedCity}
          onChange={(city, province) => onChange({ city, province })}
          color={cfg.textColor}
          borderColor={cfg.borderColor}
          bgColor={cfg.bgLight}
        />
      </section>

      {/* Province */}
      <section>
        <SectionLabel>Province (optional)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {provinces.map((p: any) => {
            const val = p.value || p;
            const label = p.label || p;
            const active = data.province === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChange({ province: active ? '' : val })}
                className={`px-4 h-10 rounded-xl border-2 text-xs font-bold transition ${
                  active
                    ? `bg-gradient-to-r ${cfg.gradientFrom} ${cfg.gradientTo} ${cfg.borderColor} text-white shadow`
                    : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1 text-sm font-black text-slate-800 mb-3">
      {children}
      {required && <span className="text-rose-600">*</span>}
    </label>
  );
}
