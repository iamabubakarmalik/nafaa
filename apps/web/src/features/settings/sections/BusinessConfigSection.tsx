import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Store, Sparkles, Check, AlertCircle, Settings as SettingsIcon,
  Layers, Ruler, ScanLine, Calendar, Package2, ShieldCheck,
  Briefcase, Utensils, CalendarClock, ChefHat, FileCheck, Grid3x3,
} from 'lucide-react';
import { businessConfigApi, type BusinessFeatures } from '@/api/business-config.api';
import { onboardingApi } from '@/api/onboarding.api';
import { BusinessTypeSelector } from '@/features/onboarding/components/BusinessTypeSelector';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';

interface FeatureMeta {
  key: keyof BusinessFeatures;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const DEFAULT_FEATURES: BusinessFeatures = {
  variants: true,
  variantImages: false,
  lengthWidthCalc: false,
  weightBased: false,
  imei: false,
  expiry: false,
  batches: false,
  warranty: false,
  emi: false,
  services: false,
  tables: false,
  appointments: false,
  kitchenPrinter: false,
  prescriptionRequired: false,
  multiUnit: false,
  sizeMatrix: false,
};

const FEATURE_META: FeatureMeta[] = [
  { key: 'variants', label: 'Product Variants', description: 'Multiple variants per product', icon: Layers, color: 'violet' },
  { key: 'variantImages', label: 'Variant Images', description: 'Separate image per variant', icon: Package2, color: 'pink' },
  { key: 'lengthWidthCalc', label: 'Length × Width Calculator', description: 'sqft / sqm calculator in POS', icon: Ruler, color: 'emerald' },
  { key: 'weightBased', label: 'Weight-Based Pricing', description: 'kg / gram decimal pricing', icon: Package2, color: 'amber' },
  { key: 'imei', label: 'IMEI / Serial Tracking', description: 'Track individual IMEI for mobiles', icon: ScanLine, color: 'blue' },
  { key: 'expiry', label: 'Expiry Tracking', description: 'Track expiry dates', icon: Calendar, color: 'rose' },
  { key: 'batches', label: 'Batch Numbers', description: 'Batch-wise inventory', icon: FileCheck, color: 'orange' },
  { key: 'warranty', label: 'Warranty Tracking', description: 'Track warranty periods', icon: ShieldCheck, color: 'teal' },
  { key: 'emi', label: 'EMI / Installments', description: 'Offer EMI plans', icon: Briefcase, color: 'indigo' },
  { key: 'services', label: 'Service Items', description: 'Non-stock service items', icon: SettingsIcon, color: 'cyan' },
  { key: 'tables', label: 'Table Management', description: 'Floor plan for restaurants', icon: Utensils, color: 'red' },
  { key: 'appointments', label: 'Appointments', description: 'Booking system', icon: CalendarClock, color: 'purple' },
  { key: 'kitchenPrinter', label: 'Kitchen Printer', description: 'Auto-print kitchen tickets', icon: ChefHat, color: 'amber' },
  { key: 'prescriptionRequired', label: 'Prescription Required', description: 'Pharmacy compliance', icon: FileCheck, color: 'rose' },
  { key: 'multiUnit', label: 'Multi-Unit Purchase', description: 'Buy carton, sell pieces', icon: Layers, color: 'emerald' },
  { key: 'sizeMatrix', label: 'Size × Color Matrix', description: 'Clothing size/color grid', icon: Grid3x3, color: 'pink' },
];

const colorClasses: Record<string, { bg: string; text: string }> = {
  violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-700' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700' },
  rose: { bg: 'bg-rose-100', text: 'text-rose-700' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  red: { bg: 'bg-red-100', text: 'text-red-700' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function BusinessConfigSection() {
  const queryClient = useQueryClient();
  const updateTenant = useAuthStore((s) => s.updateTenant);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const { data: configRaw, isLoading } = useQuery({
    queryKey: ['business-config'],
    queryFn: businessConfigApi.get,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: options } = useQuery({
    queryKey: ['onboarding-options'],
    queryFn: onboardingApi.getOptions,
  });

  const config = useMemo(() => {
    if (!configRaw) return null;
    return {
      ...configRaw,
      features: {
        ...DEFAULT_FEATURES,
        ...(configRaw.features || {}),
      },
    };
  }, [configRaw]);

  const updateFeaturesMutation = useMutation({
    mutationFn: (features: Partial<BusinessFeatures>) =>
      businessConfigApi.updateFeatures(features),
    onSuccess: (result) => {
      if (!config) return;

      const nextConfig = {
        ...config,
        features: {
          ...DEFAULT_FEATURES,
          ...(result?.features || {}),
        },
      };

      queryClient.setQueryData(['business-config'], nextConfig);
      updateTenant({
        businessFeatures: nextConfig.features as any,
      });

      queryClient.invalidateQueries({ queryKey: ['business-config'] });
      toast.success('Feature updated');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to update');
    },
  });

  const changeTypeMutation = useMutation({
    mutationFn: (businessType: string) =>
      businessConfigApi.changeType(businessType),
    onSuccess: (nextConfig) => {
      queryClient.setQueryData(['business-config'], nextConfig);
      updateTenant({
        businessType: nextConfig.businessType,
        businessFeatures: nextConfig.features as any,
        defaultUnit: nextConfig.defaultUnit,
      });
      queryClient.invalidateQueries({ queryKey: ['business-config'] });
      setShowTypeSelector(false);
      toast.success('Business type updated — features auto-configured!');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to change type');
    },
  });

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-20">
        <Sparkles className="h-8 w-8 text-violet-600 animate-pulse" />
      </div>
    );
  }

  const toggleFeature = (key: keyof BusinessFeatures) => {
    const current = config.features?.[key] ?? DEFAULT_FEATURES[key];
    updateFeaturesMutation.mutate({ [key]: !current });
  };

  const enabledCount = Object.values(config.features || DEFAULT_FEATURES).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{config.template?.emoji || '🏬'}</div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Store className="h-3 w-3" />
                Current Business Type
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">
                {config.template?.label || config.businessType}
              </h2>
              <p className="text-sm text-white/80 mt-0.5">
                {config.template?.description || 'Business configuration'}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
                  Default unit: {config.defaultUnit}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">
                  {enabledCount} features active
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowTypeSelector((v) => !v)}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            variant="secondary"
          >
            <SettingsIcon className="h-4 w-4" />
            Change Type
          </Button>
        </div>
      </div>

      {showTypeSelector && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3 mb-5">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <strong>Note:</strong> Business type change se feature preset update ho ga, lekin aap ka data safe rahega.
            </div>
          </div>

          <BusinessTypeSelector
            value={config.businessType}
            options={(options?.businessTypes as any) || []}
            onSelect={(t) => changeTypeMutation.mutate(t.value)}
            confirmText={changeTypeMutation.isPending ? 'Applying...' : 'Apply & Re-configure'}
            loading={changeTypeMutation.isPending}
          />
        </div>
      )}

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Active Features</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual features ko yahan se on/off karein
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            {enabledCount} of {FEATURE_META.length} enabled
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURE_META.map((f) => {
            const Icon = f.icon;
            const enabled = config.features?.[f.key] ?? DEFAULT_FEATURES[f.key];
            const cls = colorClasses[f.color];

            return (
              <button
                key={f.key}
                onClick={() => toggleFeature(f.key)}
                disabled={updateFeaturesMutation.isPending}
                className={`text-left p-4 rounded-2xl border-2 transition ${
                  enabled
                    ? `${cls.bg} border-slate-300 shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cls.bg}`}>
                    <Icon className={`h-4 w-4 ${cls.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`font-bold text-sm ${enabled ? cls.text : 'text-slate-900'}`}>
                        {f.label}
                      </div>
                      {enabled && (
                        <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className={`text-[11px] mt-1 ${enabled ? 'text-slate-700' : 'text-slate-500'}`}>
                      {f.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
