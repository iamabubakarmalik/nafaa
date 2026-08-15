import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Store, Sparkles, Check, AlertCircle, Settings as SettingsIcon,
  Layers, Ruler, ScanLine, Calendar, Package2, ShieldCheck,
  Briefcase, Utensils, CalendarClock, ChefHat, FileCheck, Grid3x3,
  PackageOpen, CreditCard, Trophy, Wrench, Users, Truck, Beef,
  MilkOff, Award, Radio, Cake, Home, Search, X, Loader2, Zap,
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
import { SectionCard, Alert } from '../components/UI';

interface FeatureMeta {
  key: keyof BusinessFeatures;
  label: string;
  description: string;
  icon: any;
  color: string;
  group: string;
}

const FEATURE_META: FeatureMeta[] = [
  // ═══ Core Inventory ═══
  { key: 'variants', label: 'Product Variants', description: 'Multiple variants per product', icon: Layers, color: 'violet', group: 'Core Inventory' },
  { key: 'variantImages', label: 'Variant Images', description: 'Separate image per variant', icon: Package2, color: 'pink', group: 'Core Inventory' },
  { key: 'lengthWidthCalc', label: 'Length × Width Calc', description: 'sqft / sqm calculator', icon: Ruler, color: 'emerald', group: 'Core Inventory' },
  { key: 'weightBased', label: 'Weight-Based Pricing', description: 'kg / gram decimal pricing', icon: Package2, color: 'amber', group: 'Core Inventory' },
  { key: 'multiUnit', label: 'Multi-Unit Purchase', description: 'Buy carton, sell pieces', icon: Layers, color: 'emerald', group: 'Core Inventory' },
  { key: 'sizeMatrix', label: 'Size × Color Matrix', description: 'Clothing size/color grid', icon: Grid3x3, color: 'pink', group: 'Core Inventory' },
  { key: 'bulkPricing', label: 'Bulk Pricing', description: 'Tier-based pricing', icon: Package2, color: 'blue', group: 'Core Inventory' },
  { key: 'combo', label: 'Combo Deals', description: 'Combo/bundle deals', icon: Package2, color: 'orange', group: 'Core Inventory' },
  { key: 'quickKeys', label: 'Quick Keys', description: 'POS quick access F1–F12', icon: Grid3x3, color: 'cyan', group: 'Core Inventory' },

  // ═══ Tracking ═══
  { key: 'imei', label: 'IMEI Tracking', description: 'Track individual IMEI numbers', icon: ScanLine, color: 'blue', group: 'Tracking' },
  { key: 'serialNumber', label: 'Serial Number', description: 'Serial-based tracking', icon: ScanLine, color: 'indigo', group: 'Tracking' },
  { key: 'expiry', label: 'Expiry Tracking', description: 'Track expiry dates', icon: Calendar, color: 'rose', group: 'Tracking' },
  { key: 'batches', label: 'Batch Numbers', description: 'Batch-wise inventory', icon: FileCheck, color: 'orange', group: 'Tracking' },
  { key: 'warranty', label: 'Warranty Tracking', description: 'Track warranty periods', icon: ShieldCheck, color: 'teal', group: 'Tracking' },

  // ═══ Payment & Financial ═══
  { key: 'emi', label: 'EMI / Installments', description: 'Offer EMI plans', icon: Briefcase, color: 'indigo', group: 'Payment' },
  { key: 'layaway', label: 'Layaway', description: 'Pay in installments before delivery', icon: Briefcase, color: 'blue', group: 'Payment' },
  { key: 'membership', label: 'Memberships', description: 'Membership plans', icon: Users, color: 'purple', group: 'Payment' },
  { key: 'packages', label: 'Prepaid Packages', description: 'Prepaid service packages', icon: Package2, color: 'pink', group: 'Payment' },
  { key: 'credit', label: 'Credit / Khata', description: 'Customer credit accounts', icon: CreditCard, color: 'amber', group: 'Payment' },

  // ═══ Operations ═══
  { key: 'services', label: 'Service Items', description: 'Non-stock service items', icon: SettingsIcon, color: 'cyan', group: 'Operations' },
  { key: 'tables', label: 'Table Management', description: 'Restaurant floor plan', icon: Utensils, color: 'red', group: 'Operations' },
  { key: 'appointments', label: 'Appointments', description: 'Booking system', icon: CalendarClock, color: 'purple', group: 'Operations' },
  { key: 'kitchenPrinter', label: 'Kitchen Printer', description: 'Auto-print kitchen tickets', icon: ChefHat, color: 'amber', group: 'Operations' },
  { key: 'rooms', label: 'Room Bookings', description: 'Hotel room management', icon: Home, color: 'teal', group: 'Operations' },
  { key: 'routes', label: 'Delivery Routes', description: 'Milk/dairy routes', icon: Truck, color: 'blue', group: 'Operations' },
  { key: 'delivery', label: 'Delivery Tracking', description: 'Order delivery tracking', icon: Truck, color: 'emerald', group: 'Operations' },

  // ═══ Customer Records ═══
  { key: 'prescriptionRequired', label: 'Prescription Required', description: 'Pharmacy compliance', icon: FileCheck, color: 'rose', group: 'Customer Records' },
  { key: 'measurements', label: 'Custom Measurements', description: 'Tailoring measurements', icon: Ruler, color: 'pink', group: 'Customer Records' },
  { key: 'vehicleTracking', label: 'Vehicle Tracking', description: 'Customer vehicle registry', icon: Truck, color: 'indigo', group: 'Customer Records' },
  { key: 'patientRecords', label: 'Patient Records', description: 'Medical records / EMR', icon: FileCheck, color: 'blue', group: 'Customer Records' },

  // ═══ Meat & Butchery ═══
  { key: 'slaughterLog', label: 'Halal Slaughter Log', description: 'Meat shop compliance', icon: Beef, color: 'red', group: 'Meat & Butchery' },
  { key: 'qurbani', label: 'Qurbani Bookings', description: 'Eid Qurbani orders', icon: Beef, color: 'green', group: 'Meat & Butchery' },

  // ═══ Dairy & Agri ═══
  { key: 'qualityTests', label: 'Quality Tests', description: 'Milk fat / quality tests', icon: FileCheck, color: 'emerald', group: 'Dairy & Agri' },
  { key: 'farmerAccounts', label: 'Farmer Accounts', description: 'Farmer khata + supply', icon: Users, color: 'green', group: 'Dairy & Agri' },
  { key: 'subscriptions', label: 'Subscriptions', description: 'Recurring subscriptions', icon: Calendar, color: 'blue', group: 'Dairy & Agri' },
  { key: 'cropAdvisory', label: 'Crop Advisory', description: 'Farmer crop guidance', icon: FileCheck, color: 'green', group: 'Dairy & Agri' },
  { key: 'seasonalPlans', label: 'Seasonal Plans', description: 'Kharif / Rabi calendars', icon: Calendar, color: 'amber', group: 'Dairy & Agri' },
  { key: 'govtSubsidy', label: 'Govt Subsidies', description: 'Subsidy tracking', icon: FileCheck, color: 'emerald', group: 'Dairy & Agri' },

  // ═══ Jewelry ═══
  { key: 'hallmark', label: 'Hallmark Tracking', description: 'Gold hallmark certification', icon: Award, color: 'amber', group: 'Jewelry' },
  { key: 'purityTracking', label: 'Purity Tracking', description: '22K / 24K purity levels', icon: Award, color: 'amber', group: 'Jewelry' },
  { key: 'liveMetalRates', label: 'Live Metal Rates', description: 'Live gold / silver rates', icon: Radio, color: 'amber', group: 'Jewelry' },

  // ═══ Service Business ═══
  { key: 'amc', label: 'AMC Contracts', description: 'Annual maintenance contracts', icon: FileCheck, color: 'blue', group: 'Service Business' },
  { key: 'technicianDispatch', label: 'Technician Dispatch', description: 'Service technician assignment', icon: Wrench, color: 'orange', group: 'Service Business' },
  { key: 'repairs', label: 'Repair Services', description: 'Repair tickets & tracking', icon: Wrench, color: 'indigo', group: 'Service Business' },
  { key: 'quotations', label: 'Quotations', description: 'Detailed quotes', icon: FileCheck, color: 'indigo', group: 'Service Business' },

  // ═══ Bookstore & Retail ═══
  { key: 'bookRentals', label: 'Book Rentals', description: 'Bookstore rentals', icon: Package2, color: 'purple', group: 'Bookstore & Retail' },
  { key: 'schoolLists', label: 'School Book Lists', description: 'Grade-wise book packages', icon: FileCheck, color: 'indigo', group: 'Bookstore & Retail' },
  { key: 'compatibilityMatrix', label: 'Compatibility Matrix', description: 'Parts compatibility (auto)', icon: Grid3x3, color: 'blue', group: 'Bookstore & Retail' },
  { key: 'reservations', label: 'Reservations', description: 'Reserve items for customers', icon: CalendarClock, color: 'purple', group: 'Bookstore & Retail' },
  { key: 'usedItemsTrade', label: 'Trade-in / Used Items', description: 'Accept used items', icon: PackageOpen, color: 'orange', group: 'Bookstore & Retail' },
  { key: 'bulkOrders', label: 'Bulk Orders', description: 'Team / wholesale bulk orders', icon: Package2, color: 'blue', group: 'Bookstore & Retail' },

  // ═══ Garments & Tailoring ═══
  { key: 'tailoring', label: 'Tailoring Orders', description: 'Custom stitching orders', icon: Ruler, color: 'pink', group: 'Garments & Tailoring' },
  { key: 'alterations', label: 'Alterations', description: 'Garment alterations', icon: Ruler, color: 'pink', group: 'Garments & Tailoring' },

  // ═══ Bakery & Food ═══
  { key: 'productionPlanning', label: 'Production Planning', description: 'Daily production schedules', icon: ChefHat, color: 'amber', group: 'Bakery & Food' },
  { key: 'ingredientTracking', label: 'Ingredient Tracking', description: 'Recipe & ingredient inventory', icon: MilkOff, color: 'orange', group: 'Bakery & Food' },
  { key: 'customCakes', label: 'Custom Cake Orders', description: 'Birthday / wedding cakes', icon: Cake, color: 'pink', group: 'Bakery & Food' },

  // ═══ Gym & Fitness ═══
  { key: 'bodyMeasurements', label: 'Body Measurements', description: 'Gym body composition', icon: Ruler, color: 'emerald', group: 'Gym & Fitness' },
  { key: 'workoutTracking', label: 'Workout Tracking', description: 'Member workout logs', icon: Trophy, color: 'blue', group: 'Gym & Fitness' },
  { key: 'dietPlans', label: 'Diet Plans', description: 'Nutrition plans', icon: MilkOff, color: 'emerald', group: 'Gym & Fitness' },
  { key: 'classSchedule', label: 'Class Schedule', description: 'Fitness class calendar', icon: CalendarClock, color: 'purple', group: 'Gym & Fitness' },

  // ═══ Clinic & Healthcare ═══
  { key: 'labTests', label: 'Lab Tests', description: 'Clinical lab orders', icon: FileCheck, color: 'rose', group: 'Clinic & Healthcare' },
  { key: 'vaccinations', label: 'Vaccinations', description: 'Vaccination schedules', icon: ShieldCheck, color: 'teal', group: 'Clinic & Healthcare' },
  { key: 'dentalCharts', label: 'Dental Charts', description: 'Dental clinic charts', icon: FileCheck, color: 'blue', group: 'Clinic & Healthcare' },
  { key: 'antenatal', label: 'Antenatal Care', description: 'Pregnancy tracking', icon: Users, color: 'pink', group: 'Clinic & Healthcare' },
  { key: 'physioSessions', label: 'Physio Sessions', description: 'Physiotherapy sessions', icon: Users, color: 'teal', group: 'Clinic & Healthcare' },
  { key: 'drugInteractions', label: 'Drug Interactions', description: 'Rx drug conflict check', icon: AlertCircle, color: 'rose', group: 'Clinic & Healthcare' },

  // ═══ Carpet & Flooring ═══
  { key: 'carpetRolls', label: 'Carpet Rolls', description: 'Original roll tracking', icon: Package2, color: 'amber', group: 'Carpet & Flooring' },
  { key: 'cutPieces', label: 'Cut Pieces', description: 'Track cut pieces', icon: Ruler, color: 'amber', group: 'Carpet & Flooring' },

  // ═══ Construction & Projects ═══
  { key: 'projectTracking', label: 'Project Tracking', description: 'Construction / hardware projects', icon: FileCheck, color: 'blue', group: 'Construction & Projects' },
];

const FEATURE_GROUPS = [
  'Core Inventory', 'Tracking', 'Payment', 'Operations', 'Customer Records',
  'Meat & Butchery', 'Dairy & Agri', 'Jewelry', 'Service Business',
  'Bookstore & Retail', 'Garments & Tailoring', 'Bakery & Food',
  'Gym & Fitness', 'Clinic & Healthcare', 'Carpet & Flooring', 'Construction & Projects',
];

/* ─── Color map (light + dark) ─── */
const colorClasses: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  violet:  { bg: 'bg-violet-100 dark:bg-violet-500/20',   text: 'text-violet-700 dark:text-violet-300',   border: 'border-violet-400 dark:border-violet-500/60',   ring: 'ring-violet-200 dark:ring-violet-500/30' },
  pink:    { bg: 'bg-pink-100 dark:bg-pink-500/20',       text: 'text-pink-700 dark:text-pink-300',       border: 'border-pink-400 dark:border-pink-500/60',       ring: 'ring-pink-200 dark:ring-pink-500/30' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-500/60', ring: 'ring-emerald-200 dark:ring-emerald-500/30' },
  amber:   { bg: 'bg-amber-100 dark:bg-amber-500/20',     text: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-400 dark:border-amber-500/60',     ring: 'ring-amber-200 dark:ring-amber-500/30' },
  blue:    { bg: 'bg-blue-100 dark:bg-blue-500/20',       text: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-400 dark:border-blue-500/60',       ring: 'ring-blue-200 dark:ring-blue-500/30' },
  rose:    { bg: 'bg-rose-100 dark:bg-rose-500/20',       text: 'text-rose-700 dark:text-rose-300',       border: 'border-rose-400 dark:border-rose-500/60',       ring: 'ring-rose-200 dark:ring-rose-500/30' },
  orange:  { bg: 'bg-orange-100 dark:bg-orange-500/20',   text: 'text-orange-700 dark:text-orange-300',   border: 'border-orange-400 dark:border-orange-500/60',   ring: 'ring-orange-200 dark:ring-orange-500/30' },
  teal:    { bg: 'bg-teal-100 dark:bg-teal-500/20',       text: 'text-teal-700 dark:text-teal-300',       border: 'border-teal-400 dark:border-teal-500/60',       ring: 'ring-teal-200 dark:ring-teal-500/30' },
  indigo:  { bg: 'bg-indigo-100 dark:bg-indigo-500/20',   text: 'text-indigo-700 dark:text-indigo-300',   border: 'border-indigo-400 dark:border-indigo-500/60',   ring: 'ring-indigo-200 dark:ring-indigo-500/30' },
  cyan:    { bg: 'bg-cyan-100 dark:bg-cyan-500/20',       text: 'text-cyan-700 dark:text-cyan-300',       border: 'border-cyan-400 dark:border-cyan-500/60',       ring: 'ring-cyan-200 dark:ring-cyan-500/30' },
  red:     { bg: 'bg-red-100 dark:bg-red-500/20',         text: 'text-red-700 dark:text-red-300',         border: 'border-red-400 dark:border-red-500/60',         ring: 'ring-red-200 dark:ring-red-500/30' },
  purple:  { bg: 'bg-purple-100 dark:bg-purple-500/20',   text: 'text-purple-700 dark:text-purple-300',   border: 'border-purple-400 dark:border-purple-500/60',   ring: 'ring-purple-200 dark:ring-purple-500/30' },
  green:   { bg: 'bg-green-100 dark:bg-green-500/20',     text: 'text-green-700 dark:text-green-300',     border: 'border-green-400 dark:border-green-500/60',     ring: 'ring-green-200 dark:ring-green-500/30' },
};

export function BusinessConfigSection() {
  const qc = useQueryClient();
  const updateTenant = useAuthStore((s) => s.updateTenant);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

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
      toast.success('Business type change ho gaya — features auto-configure ho gaye! ✨');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Change fail'),
  });

  const enabledCount = useMemo(() => {
    if (!config?.features) return 0;
    return Object.values(config.features).filter(Boolean).length;
  }, [config]);

  // Filter features by search + active group
  const filteredFeatures = useMemo(() => {
    let list = FEATURE_META;
    if (activeGroup) list = list.filter((f) => f.group === activeGroup);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.group.toLowerCase().includes(q) ||
          String(f.key).toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, activeGroup]);

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, FeatureMeta[]> = {};
    for (const f of filteredFeatures) {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    }
    return groups;
  }, [filteredFeatures]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, { enabled: number; total: number }> = {};
    for (const f of FEATURE_META) {
      if (!counts[f.group]) counts[f.group] = { enabled: 0, total: 0 };
      counts[f.group].total++;
      const enabled = config?.features?.[f.key] ?? DEFAULT_BUSINESS_FEATURES[f.key];
      if (enabled) counts[f.group].enabled++;
    }
    return counts;
  }, [config]);

  const toggleFeature = (key: keyof BusinessFeatures) => {
    const current = config?.features?.[key] ?? DEFAULT_BUSINESS_FEATURES[key];
    updateFeaturesMutation.mutate({ [key]: !current });
  };

  if (isLoading || !config) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-10 w-10 text-violet-600 dark:text-violet-400 animate-spin" />
        <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">Business config load ho rahi hai...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ═══ HERO — Current business type ═══ */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 dark:from-slate-950 dark:via-violet-950 dark:to-fuchsia-900 text-white p-5 shadow-2xl">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="text-5xl sm:text-6xl leading-none shrink-0">{config.template?.emoji || '🏬'}</div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold border border-white/25 uppercase tracking-widest">
                <Store className="h-3 w-3" />
                Current Business Type
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight">
                {config.template?.label || config.businessType}
              </h2>
              {config.template?.labelUrdu && (
                <div className="text-sm text-white/80 mt-0.5 font-semibold" dir="rtl">
                  {config.template.labelUrdu}
                </div>
              )}
              <p className="text-xs sm:text-sm text-white/85 mt-1.5 font-semibold leading-relaxed">
                {config.template?.description}
              </p>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 text-[10px] font-extrabold border border-emerald-400/30">
                  Unit: {config.defaultUnit}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-extrabold border border-white/20">
                  {enabledCount} / {FEATURE_META.length} features
                </span>
                {config.currency && (
                  <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 text-[10px] font-extrabold border border-amber-400/30">
                    {config.currency}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowTypeSelector((v) => !v)}
            className="bg-white/15 hover:bg-white/25 text-white border-2 border-white/20 backdrop-blur font-extrabold shrink-0"
          >
            <SettingsIcon className="h-4 w-4" />
            {showTypeSelector ? 'Close' : 'Change Type'}
          </Button>
        </div>
      </div>

      {/* ═══ Type selector ═══ */}
      {showTypeSelector && (
        <SectionCard
          title="Change Business Type"
          desc="Naya industry select karo — features auto re-configure ho jayenge"
          icon={Store}
          color="violet"
        >
          <Alert tone="amber" icon={AlertCircle} title="Kya hoga?">
            Business type change se feature preset update hoga, lekin aap ka <strong>existing data</strong> (products, sales, customers) safe rahega.
            Sirf feature toggles adjust hongi.
          </Alert>

          <div className="mt-4">
            <BusinessTypeSelector
              value={config.businessType}
              options={(options?.businessTypes as any) || []}
              onSelect={(t) => changeTypeMutation.mutate(t.value)}
            />
          </div>

          {changeTypeMutation.isPending && (
            <div className="mt-3 flex items-center gap-2 text-xs font-extrabold text-violet-700 dark:text-violet-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Business type update ho raha hai...
            </div>
          )}
        </SectionCard>
      )}

      {/* ═══ Feature toggles ═══ */}
      <SectionCard
        title="Active Features"
        desc="Individual features on/off karo — jo cheez zaroorat ho, sirf wohi enable"
        icon={Sparkles}
        color="violet"
        action={
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold tabular-nums">
            {enabledCount} / {FEATURE_META.length}
          </span>
        }
      >
        {/* Search */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features (IMEI, expiry, warranty, tailoring...)"
              className="h-11 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Group tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveGroup(null)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-extrabold transition inline-flex items-center gap-1.5 active:scale-95',
                activeGroup === null
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              All
              <span className={[
                'px-1.5 py-0.5 rounded-md text-[10px] tabular-nums',
                activeGroup === null ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700',
              ].join(' ')}>
                {FEATURE_META.length}
              </span>
            </button>
            {FEATURE_GROUPS.map((group) => {
              const count = groupCounts[group];
              if (!count) return null;
              const active = activeGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(active ? null : group)}
                  className={[
                    'px-3 py-1.5 rounded-xl text-xs font-extrabold transition inline-flex items-center gap-1.5 active:scale-95',
                    active
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700',
                  ].join(' ')}
                >
                  {group}
                  <span className={[
                    'px-1.5 py-0.5 rounded-md text-[10px] tabular-nums',
                    active
                      ? 'bg-white/25'
                      : count.enabled > 0
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700',
                  ].join(' ')}>
                    {count.enabled}/{count.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature grid */}
        {Object.keys(groupedFeatures).length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
            <Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <div className="font-extrabold text-slate-900 dark:text-white">Kuch nahi mila</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              "{search}" ke liye koi feature nahi
            </div>
            <button
              onClick={() => { setSearch(''); setActiveGroup(null); }}
              className="mt-3 text-xs font-extrabold text-violet-600 dark:text-violet-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFeatures).map(([group, features]) => (
              <div key={group}>
                {!activeGroup && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400">
                      {group}
                    </div>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className={[
                      'text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums',
                      groupCounts[group]?.enabled > 0
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                    ].join(' ')}>
                      {groupCounts[group]?.enabled}/{groupCounts[group]?.total}
                    </span>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {features.map((f) => {
                    const Icon = f.icon;
                    const enabled = config.features?.[f.key] ?? DEFAULT_BUSINESS_FEATURES[f.key];
                    const cls = colorClasses[f.color] || colorClasses.violet;
                    return (
                      <button
                        key={f.key}
                        onClick={() => toggleFeature(f.key)}
                        disabled={updateFeaturesMutation.isPending}
                        className={[
                          'text-left p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] disabled:opacity-60 relative overflow-hidden group',
                          enabled
                            ? `${cls.border} ${cls.bg} shadow-md ring-2 ${cls.ring}`
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm',
                        ].join(' ')}
                      >
                        {enabled && (
                          <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-current opacity-10 blur-xl pointer-events-none" />
                        )}
                        <div className="relative flex items-start gap-3">
                          <div className={[
                            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                            enabled ? cls.bg : 'bg-slate-100 dark:bg-slate-700',
                          ].join(' ')}>
                            <Icon className={[
                              'h-4 w-4',
                              enabled ? cls.text : 'text-slate-500 dark:text-slate-400',
                            ].join(' ')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className={[
                                'font-extrabold text-sm truncate',
                                enabled ? cls.text : 'text-slate-900 dark:text-white',
                              ].join(' ')}>
                                {f.label}
                              </div>
                              {enabled && (
                                <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <p className={[
                              'text-[11px] mt-1 font-semibold leading-snug line-clamp-2',
                              enabled ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400',
                            ].join(' ')}>
                              {f.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {updateFeaturesMutation.isPending && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border-2 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold">
            <Loader2 className="h-3 w-3 animate-spin" /> Feature update ho raha hai...
          </div>
        )}
      </SectionCard>

      {/* ═══ Suggested categories ═══ */}
      {config.template?.suggestedCategories && config.template.suggestedCategories.length > 0 && (
        <SectionCard
          title="Suggested Categories"
          desc="Aap ke business type ke liye recommended product categories"
          icon={Grid3x3}
          color="emerald"
        >
          <div className="flex flex-wrap gap-2">
            {config.template.suggestedCategories.map((cat) => (
              <span
                key={cat}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border-2 border-emerald-200 dark:border-emerald-500/30 text-xs font-extrabold text-emerald-700 dark:text-emerald-300"
              >
                {cat}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ═══ Quick units ═══ */}
      {config.template?.quickUnits && config.template.quickUnits.length > 0 && (
        <SectionCard
          title="Quick Units"
          desc="POS me jaldi select karne ke liye pre-configured units"
          icon={Ruler}
          color="blue"
        >
          <div className="flex flex-wrap gap-2">
            {config.template.quickUnits.map((unit) => (
              <span
                key={unit}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 border-2 border-blue-200 dark:border-blue-500/30 text-xs font-extrabold text-blue-700 dark:text-blue-300"
              >
                {unit}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ═══ Highlights ═══ */}
      {config.template?.highlights && config.template.highlights.length > 0 && (
        <SectionCard
          title="Key Highlights"
          desc="Aap ke business ke liye best features"
          icon={Zap}
          color="pink"
        >
          <div className="grid sm:grid-cols-2 gap-2">
            {config.template.highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-100 dark:border-slate-700"
              >
                <div className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </div>
                <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">{h}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// Default export bhi (safety)
export default BusinessConfigSection;
