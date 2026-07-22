import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Store, Sparkles, Check, AlertCircle, Settings as SettingsIcon,
  Layers, Ruler, ScanLine, Calendar, Package2, ShieldCheck,
  Briefcase, Utensils, CalendarClock, ChefHat, FileCheck, Grid3x3,
} from 'lucide-react';
import {
  businessConfigApi,
  DEFAULT_BUSINESS_FEATURES,
  type BusinessFeatures,
} from '@modules/organization/settings/api/business-config.api';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { BusinessTypeSelector } from '@modules/onboarding/components/BusinessTypeSelector';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { SectionCard } from '../components/UI';

interface FeatureMeta {
  key: keyof BusinessFeatures;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const FEATURE_META: FeatureMeta[] = [
  { key: 'variants', label: 'Product Variants', description: 'Multiple variants per product', icon: Layers, color: 'violet' },
  { key: 'variantImages', label: 'Variant Images', description: 'Separate image per variant', icon: Package2, color: 'pink' },
  { key: 'lengthWidthCalc', label: 'Length × Width Calc', description: 'sqft / sqm calculator', icon: Ruler, color: 'emerald' },
  { key: 'weightBased', label: 'Weight-Based Pricing', description: 'kg / gram decimal pricing', icon: Package2, color: 'amber' },
  { key: 'imei', label: 'IMEI / Serial', description: 'Track individual IMEI', icon: ScanLine, color: 'blue' },
  { key: 'expiry', label: 'Expiry Tracking', description: 'Track expiry dates', icon: Calendar, color: 'rose' },
  { key: 'batches', label: 'Batch Numbers', description: 'Batch-wise inventory', icon: FileCheck, color: 'orange' },
  { key: 'warranty', label: 'Warranty Tracking', description: 'Track warranty periods', icon: ShieldCheck, color: 'teal' },
  { key: 'emi', label: 'EMI / Installments', description: 'Offer EMI plans', icon: Briefcase, color: 'indigo' },
  { key: 'services', label: 'Service Items', description: 'Non-stock service items', icon: SettingsIcon, color: 'cyan' },
  { key: 'tables', label: 'Table Management', description: 'Restaurant floor plan', icon: Utensils, color: 'red' },
  { key: 'appointments', label: 'Appointments', description: 'Booking system', icon: CalendarClock, color: 'purple' },
  { key: 'kitchenPrinter', label: 'Kitchen Printer', description: 'Auto-print kitchen tickets', icon: ChefHat, color: 'amber' },
  { key: 'prescriptionRequired', label: 'Prescription Required', description: 'Pharmacy compliance', icon: FileCheck, color: 'rose' },
  { key: 'multiUnit', label: 'Multi-Unit Purchase', description: 'Buy carton, sell pieces', icon: Layers, color: 'emerald' },
  { key: 'sizeMatrix', label: 'Size × Color Matrix', description: 'Clothing size/color grid', icon: Grid3x3, color: 'pink' },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-400' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-400' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-400' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-400' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-400' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-400' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-400' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
};

export default function BusinessConfigSection() {
  const qc = useQueryClient();
  const updateTenant = useAuthStore((s) => s.updateTenant);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['business-config'],
    queryFn: businessConfigApi.get,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: options } = useQuery({
    queryKey: ['onboarding-options'],
    queryFn: onboardingApi.getOptions,
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: (features: Partial<BusinessFeatures>) =>
      businessConfigApi.updateFeatures(features),
    onSuccess: (result) => {
      if (!config) return;
      const nextConfig = {
        ...config,
        features: { ...DEFAULT_BUSINESS_FEATURES, ...result.features },
      };
      qc.setQueryData(['business-config'], nextConfig);
      updateTenant({ businessFeatures: nextConfig.features as any });
      qc.invalidateQueries({ queryKey: ['business-config'] });
      toast.success('Feature updated ✅');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update fail'),
  });

  const changeTypeMutation = useMutation({
    mutationFn: (businessType: string) => businessConfigApi.changeType(businessType),
    onSuccess: (nextConfig) => {
      qc.setQueryData(['business-config'], nextConfig);
      updateTenant({
        businessType: nextConfig.businessType,
        businessFeatures: nextConfig.features as any,
        defaultUnit: nextConfig.defaultUnit,
      });
      qc.invalidateQueries({ queryKey: ['business-config'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
      setShowTypeSelector(false);
      toast.success('Business type change ho gaya — features auto-configure ho gaye!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Change fail'),
  });

  const enabledCount = useMemo(() => {
    if (!config?.features) return 0;
    return Object.values(config.features).filter(Boolean).length;
  }, [config]);

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles className="h-8 w-8 text-violet-600 animate-pulse" />
      </div>
    );
  }

  const toggleFeature = (key: keyof BusinessFeatures) => {
    const current = config.features?.[key] ?? DEFAULT_BUSINESS_FEATURES[key];
    updateFeaturesMutation.mutate({ [key]: !current });
  };

  return (
    <div className="space-y-5">
      {/* Hero — Current business type */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{config.template?.emoji || '🏬'}</div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
                <Store className="h-3 w-3" />
                Current Business Type
              </div>
              <h2 className="mt-2 text-2xl font-black">
                {config.template?.label || config.businessType}
              </h2>
              {config.template?.labelUrdu && (
                <div className="text-sm text-white/80 mt-0.5 font-medium">
                  {config.template.labelUrdu}
                </div>
              )}
              <p className="text-sm text-white/80 mt-1 font-medium">
                {config.template?.description}
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 text-[10px] font-black">
                  Unit: {config.defaultUnit}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-black">
                  {enabledCount} features active
                </span>
                {config.currency && (
                  <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-[10px] font-black">
                    Currency: {config.currency}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowTypeSelector((v) => !v)}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur"
          >
            <SettingsIcon className="h-4 w-4" />
            {showTypeSelector ? 'Close' : 'Change Type'}
          </Button>
        </div>
      </div>

      {/* Type selector */}
      {showTypeSelector && (
        <SectionCard
          title="Change Business Type"
          desc="Naya industry select karein — features auto re-configure ho jayenge"
          icon={Store}
          color="violet"
        >
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 font-medium">
              <strong>Note:</strong> Business type change se feature preset update hoga, lekin aap ka existing data (products, sales, customers) safe rahega.
            </div>
          </div>
          <BusinessTypeSelector
            value={config.businessType}
            options={(options?.businessTypes as any) || []}
            onSelect={(t) => changeTypeMutation.mutate(t.value)}
          />
        </SectionCard>
      )}

      {/* Feature toggles */}
      <SectionCard
        title="Active Features"
        desc="Individual features ko on/off karein"
        icon={Sparkles}
        color="violet"
        action={
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black">
            {enabledCount} / {FEATURE_META.length}
          </span>
        }
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURE_META.map((f) => {
            const Icon = f.icon;
            const enabled = config.features?.[f.key] ?? DEFAULT_BUSINESS_FEATURES[f.key];
            const cls = colorClasses[f.color];
            return (
              <button
                key={f.key}
                onClick={() => toggleFeature(f.key)}
                disabled={updateFeaturesMutation.isPending}
                className={`text-left p-4 rounded-2xl border-2 transition ${
                  enabled
                    ? `${cls.border} ${cls.bg} shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cls.bg}`}>
                    <Icon className={`h-4 w-4 ${cls.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`font-black text-sm ${enabled ? cls.text : 'text-slate-900'}`}>
                        {f.label}
                      </div>
                      {enabled && (
                        <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <p className={`text-[11px] mt-1 font-medium ${enabled ? 'text-slate-700' : 'text-slate-500'}`}>
                      {f.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Suggested categories */}
      {config.template?.suggestedCategories && config.template.suggestedCategories.length > 0 && (
        <SectionCard
          title="Suggested Categories"
          desc="Aap ke business type ke liye recommended"
          icon={Sparkles}
          color="emerald"
        >
          <div className="flex flex-wrap gap-2">
            {config.template.suggestedCategories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-xs font-black text-emerald-700"
              >
                {cat}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Quick units */}
      {config.template?.quickUnits && config.template.quickUnits.length > 0 && (
        <SectionCard
          title="Quick Units"
          desc="POS mein quickly select karne ke liye"
          icon={Ruler}
          color="blue"
        >
          <div className="flex flex-wrap gap-2">
            {config.template.quickUnits.map((unit) => (
              <span
                key={unit}
                className="px-3 py-1.5 rounded-xl bg-blue-50 border-2 border-blue-200 text-xs font-black text-blue-700"
              >
                {unit}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Highlights */}
      {config.template?.highlights && config.template.highlights.length > 0 && (
        <SectionCard
          title="Key Highlights"
          desc="Aap ke business ke liye features ki jhalak"
          icon={Sparkles}
          color="pink"
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {config.template.highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
                <span className="text-xs text-slate-700 font-medium leading-relaxed">{h}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
