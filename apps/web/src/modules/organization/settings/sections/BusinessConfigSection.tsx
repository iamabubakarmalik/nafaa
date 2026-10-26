/**
 * Business type and features: the industry the store runs as, switching to
 * another type, and every feature switch grouped by area. Feature changes
 * save at once; the data already in the store is never touched.
 */

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
import { Alert, Badge, Button, EmptyState, IconButton, Input, Skeleton } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { SectionCard } from '../components/SettingsBlocks';
import { SaveStatusBar } from './_SaveStatus';

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

/* ─── Feature colors (dark mode is automatic through the palette) ─── */
const colorClasses: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  violet:  { bg: 'bg-violet-100',   text: 'text-violet-700',   border: 'border-violet-400',   ring: 'ring-violet-200' },
  pink:    { bg: 'bg-pink-100',       text: 'text-pink-700',       border: 'border-pink-400',       ring: 'ring-pink-200' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-400', ring: 'ring-emerald-200' },
  amber:   { bg: 'bg-amber-100',     text: 'text-amber-700',     border: 'border-amber-400',     ring: 'ring-amber-200' },
  blue:    { bg: 'bg-blue-100',       text: 'text-blue-700',       border: 'border-blue-400',       ring: 'ring-blue-200' },
  rose:    { bg: 'bg-rose-100',       text: 'text-rose-700',       border: 'border-rose-400',       ring: 'ring-rose-200' },
  orange:  { bg: 'bg-orange-100',   text: 'text-orange-700',   border: 'border-orange-400',   ring: 'ring-orange-200' },
  teal:    { bg: 'bg-teal-100',       text: 'text-teal-700',       border: 'border-teal-400',       ring: 'ring-teal-200' },
  indigo:  { bg: 'bg-indigo-100',   text: 'text-indigo-700',   border: 'border-indigo-400',   ring: 'ring-indigo-200' },
  cyan:    { bg: 'bg-cyan-100',       text: 'text-cyan-700',       border: 'border-cyan-400',       ring: 'ring-cyan-200' },
  red:     { bg: 'bg-red-100',         text: 'text-red-700',         border: 'border-red-400',         ring: 'ring-red-200' },
  purple:  { bg: 'bg-purple-100',   text: 'text-purple-700',   border: 'border-purple-400',   ring: 'ring-purple-200' },
  green:   { bg: 'bg-green-100',     text: 'text-green-700',     border: 'border-green-400',     ring: 'ring-green-200' },
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
      toast.success('Feature save ho gaya');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
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
      toast.success('Business type badal gaya — features naye type ke hisaab se lag gaye');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Type nahi badla'),
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
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-36" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={updateFeaturesMutation.isPending || changeTypeMutation.isPending} dirty={false} />

      <SectionCard title="Aap ka business type" desc="Is se tay hota hai ke menu, product form aur POS me kya kya aata hai" icon={Store} color="violet"
        action={
          <Button size="sm" variant={showTypeSelector ? 'secondary' : 'primary'} onClick={() => setShowTypeSelector((v) => !v)}
            leftIcon={showTypeSelector ? <X className="h-4 w-4" /> : <SettingsIcon className="h-4 w-4" />}>
            {showTypeSelector ? 'Band karein' : 'Type badlein'}
          </Button>
        }>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-4xl leading-none">{config.template?.emoji || '🏬'}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.75rem] font-medium text-slate-500">Abhi ka business type</p>
            <h3 className="text-xl font-semibold leading-tight text-slate-900">{config.template?.label || config.businessType}</h3>
            {config.template?.labelUrdu && <p className="mt-0.5 text-sm text-slate-500" dir="rtl">{config.template.labelUrdu}</p>}
            {config.template?.description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{config.template.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>Unit: {config.defaultUnit}</Badge>
              <Badge className="tabular-nums">{enabledCount} / {FEATURE_META.length} features chalu</Badge>
              {config.currency && <Badge>{config.currency}</Badge>}
            </div>
          </div>
        </div>

        {showTypeSelector && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Alert tone="warning" title="Type badalne se kya hoga?" icon={<AlertCircle className="h-4 w-4" />}>
              Features is type ke hisaab se dobara set ho jayenge. Aap ka <strong>purana data</strong> (products, Sales, customers) waise hi rahega.
            </Alert>
            <div className="mt-4">
              <BusinessTypeSelector
                value={config.businessType}
                options={(options?.businessTypes as any) || []}
                onSelect={(t) => changeTypeMutation.mutate(t.value)}
              />
            </div>
            {changeTypeMutation.isPending && (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-700">
                <Loader2 className="h-4 w-4 animate-spin" /> Business type badal raha hai…
              </p>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Features" desc="Jo kaam aap ka store karta hai sirf wohi chalu rakhein — menu aur forms saaf rehte hain" icon={Sparkles} color="violet"
        badge={<Badge size="xs" variant="success" className="tabular-nums">{enabledCount} / {FEATURE_META.length} chalu</Badge>}>
        <div className="mb-4 space-y-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Feature search"
            placeholder="Feature search karein (IMEI, expiry, warranty, tailoring…)"
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={search ? (
              <IconButton label="Search saaf karein" size="sm" onClick={() => setSearch('')} className="-mr-2 h-7 w-7">
                <X className="h-4 w-4" />
              </IconButton>
            ) : undefined} />
          <p className="text-xs text-slate-500">Card dabane se feature foran chalu ya band hota hai. Group chun kar sirf us ke features dekhein.</p>

          <div className="flex flex-wrap gap-1.5">
            <GroupChip label="Sab" count={`${FEATURE_META.length}`} on={activeGroup === null} onClick={() => setActiveGroup(null)} />
            {FEATURE_GROUPS.map((group) => {
              const count = groupCounts[group];
              if (!count) return null;
              const on = activeGroup === group;
              return (
                <GroupChip key={group} label={group} count={`${count.enabled}/${count.total}`} on={on} lit={count.enabled > 0}
                  onClick={() => setActiveGroup(on ? null : group)} />
              );
            })}
          </div>
        </div>

        {Object.keys(groupedFeatures).length === 0 ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="Kuch nahi mila"
            description={search ? `"${search}" se koi feature nahi mila` : 'Is group me koi feature nahi'}
            action={<Button size="sm" variant="secondary" onClick={() => { setSearch(''); setActiveGroup(null); }}>Filter hatayein</Button>} />
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFeatures).map(([group, features]) => (
              <div key={group}>
                {!activeGroup && (
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">{group}</span>
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-[0.6875rem] font-semibold tabular-nums text-slate-500">{groupCounts[group]?.enabled}/{groupCounts[group]?.total}</span>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                  {features.map((f) => {
                    const Icon = f.icon;
                    const enabled = config.features?.[f.key] ?? DEFAULT_BUSINESS_FEATURES[f.key];
                    const cls = colorClasses[f.color] || colorClasses.violet;
                    return (
                      <button key={f.key} type="button" role="switch" aria-checked={!!enabled} onClick={() => toggleFeature(f.key)} disabled={updateFeaturesMutation.isPending}
                        className={['flex items-start gap-3 rounded-lg border p-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-[0.99] disabled:opacity-60',
                          enabled ? `${cls.border} bg-white ring-1 ${cls.ring}` : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'].join(' ')}>
                        <span className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', enabled ? `${cls.bg} ${cls.text}` : 'bg-slate-100 text-slate-500'].join(' ')}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{f.label}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-slate-500">{f.description}</span>
                        </span>
                        <span className={['mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', enabled ? 'bg-brand-600 text-brand-fg' : 'border border-slate-300'].join(' ')}>
                          {enabled && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {(config.template?.suggestedCategories?.length || config.template?.quickUnits?.length) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {config.template?.suggestedCategories && config.template.suggestedCategories.length > 0 && (
            <SectionCard title="Mashwara: categories" desc="Is business type ke liye aam product categories" icon={Grid3x3} color="emerald">
              <div className="flex flex-wrap gap-1.5">
                {config.template.suggestedCategories.map((cat) => <Badge key={cat}>{cat}</Badge>)}
              </div>
            </SectionCard>
          )}
          {config.template?.quickUnits && config.template.quickUnits.length > 0 && (
            <SectionCard title="Quick units" desc="POS par jaldi chunne wale units" icon={Ruler} color="blue">
              <div className="flex flex-wrap gap-1.5">
                {config.template.quickUnits.map((unit) => <Badge key={unit}>{unit}</Badge>)}
              </div>
            </SectionCard>
          )}
        </div>
      ) : null}

      {config.template?.highlights && config.template.highlights.length > 0 && (
        <SectionCard title="Khaas baatein" desc="Is business type ke liye sab se kaam ke features" icon={Zap} color="pink">
          <ul className="grid gap-2 sm:grid-cols-2">
            {config.template.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" strokeWidth={3} />
                <span className="text-xs leading-relaxed text-slate-700">{h}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function GroupChip({ label, count, on, lit, onClick }: { label: string; count: string; on: boolean; lit?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={['inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        on ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'].join(' ')}>
      {label}
      <span className={['rounded-full px-1.5 text-[0.6875rem] tabular-nums', on ? 'bg-white/20' : lit ? 'bg-success-50 text-success-700' : 'bg-white text-slate-500'].join(' ')}>{count}</span>
    </button>
  );
}
