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
import { BusinessModelsCard } from './BusinessModelsCard';
import { t as tr } from '@core/i18n';

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
  { key: 'variants', label: tr('Product Variants'), description: tr('Multiple variants per product'), icon: Layers, color: 'violet', group: tr('Core Inventory') },
  { key: 'variantImages', label: tr('Variant Images'), description: tr('Separate image per variant'), icon: Package2, color: 'pink', group: tr('Core Inventory') },
  { key: 'lengthWidthCalc', label: tr('Length × Width Calc'), description: tr('sqft / sqm calculator'), icon: Ruler, color: 'emerald', group: tr('Core Inventory') },
  { key: 'weightBased', label: tr('Weight-Based Pricing'), description: tr('kg / gram decimal pricing'), icon: Package2, color: 'amber', group: tr('Core Inventory') },
  { key: 'multiUnit', label: tr('Multi-Unit Purchase'), description: tr('Buy carton, sell pieces'), icon: Layers, color: 'emerald', group: tr('Core Inventory') },
  { key: 'sizeMatrix', label: tr('Size × Color Matrix'), description: tr('Clothing size/color grid'), icon: Grid3x3, color: 'pink', group: tr('Core Inventory') },
  { key: 'bulkPricing', label: tr('Bulk Pricing'), description: tr('Tier-based pricing'), icon: Package2, color: 'blue', group: tr('Core Inventory') },
  { key: 'combo', label: tr('Combo Deals'), description: tr('Combo/bundle deals'), icon: Package2, color: 'orange', group: tr('Core Inventory') },
  { key: 'quickKeys', label: tr('Quick Keys'), description: tr('POS quick access F1–F12'), icon: Grid3x3, color: 'cyan', group: tr('Core Inventory') },

  // ═══ Tracking ═══
  { key: 'imei', label: tr('IMEI Tracking'), description: tr('Track individual IMEI numbers'), icon: ScanLine, color: 'blue', group: tr('Tracking') },
  { key: 'serialNumber', label: tr('Serial Number'), description: tr('Serial-based tracking'), icon: ScanLine, color: 'indigo', group: tr('Tracking') },
  { key: 'expiry', label: tr('Expiry Tracking'), description: tr('Track expiry dates'), icon: Calendar, color: 'rose', group: tr('Tracking') },
  { key: 'batches', label: tr('Batch Numbers'), description: tr('Batch-wise inventory'), icon: FileCheck, color: 'orange', group: tr('Tracking') },
  { key: 'warranty', label: tr('Warranty Tracking'), description: tr('Track warranty periods'), icon: ShieldCheck, color: 'teal', group: tr('Tracking') },

  // ═══ Payment & Financial ═══
  { key: 'emi', label: tr('EMI / Installments'), description: tr('Offer EMI plans'), icon: Briefcase, color: 'indigo', group: tr('Payment') },
  { key: 'layaway', label: tr('Layaway'), description: tr('Pay in installments before delivery'), icon: Briefcase, color: 'blue', group: tr('Payment') },
  { key: 'membership', label: tr('Memberships'), description: tr('Membership plans'), icon: Users, color: 'purple', group: tr('Payment') },
  { key: 'packages', label: tr('Prepaid Packages'), description: tr('Prepaid service packages'), icon: Package2, color: 'pink', group: tr('Payment') },
  { key: 'credit', label: tr('Credit / Khata'), description: tr('Customer credit accounts'), icon: CreditCard, color: 'amber', group: tr('Payment') },

  // ═══ Operations ═══
  { key: 'services', label: tr('Service Items'), description: tr('Non-stock service items'), icon: SettingsIcon, color: 'cyan', group: tr('Operations') },
  { key: 'tables', label: tr('Table Management'), description: tr('Restaurant floor plan'), icon: Utensils, color: 'red', group: tr('Operations') },
  { key: 'appointments', label: tr('Appointments'), description: tr('Booking system'), icon: CalendarClock, color: 'purple', group: tr('Operations') },
  { key: 'kitchenPrinter', label: tr('Kitchen Printer'), description: tr('Auto-print kitchen tickets'), icon: ChefHat, color: 'amber', group: tr('Operations') },
  { key: 'rooms', label: tr('Room Bookings'), description: tr('Hotel room management'), icon: Home, color: 'teal', group: tr('Operations') },
  { key: 'routes', label: tr('Delivery Routes'), description: tr('Milk/dairy routes'), icon: Truck, color: 'blue', group: tr('Operations') },
  { key: 'delivery', label: tr('Delivery Tracking'), description: tr('Order delivery tracking'), icon: Truck, color: 'emerald', group: tr('Operations') },

  // ═══ Customer Records ═══
  { key: 'prescriptionRequired', label: tr('Prescription Required'), description: tr('Pharmacy compliance'), icon: FileCheck, color: 'rose', group: tr('Customer Records') },
  { key: 'measurements', label: tr('Custom Measurements'), description: tr('Tailoring measurements'), icon: Ruler, color: 'pink', group: tr('Customer Records') },
  { key: 'vehicleTracking', label: tr('Vehicle Tracking'), description: tr('Customer vehicle registry'), icon: Truck, color: 'indigo', group: tr('Customer Records') },
  { key: 'patientRecords', label: tr('Patient Records'), description: tr('Medical records / EMR'), icon: FileCheck, color: 'blue', group: tr('Customer Records') },

  // ═══ Meat & Butchery ═══
  { key: 'slaughterLog', label: tr('Halal Slaughter Log'), description: tr('Meat shop compliance'), icon: Beef, color: 'red', group: tr('Meat & Butchery') },
  { key: 'qurbani', label: tr('Qurbani Bookings'), description: tr('Eid Qurbani orders'), icon: Beef, color: 'green', group: tr('Meat & Butchery') },

  // ═══ Dairy & Agri ═══
  { key: 'qualityTests', label: tr('Quality Tests'), description: tr('Milk fat / quality tests'), icon: FileCheck, color: 'emerald', group: tr('Dairy & Agri') },
  { key: 'farmerAccounts', label: tr('Farmer Accounts'), description: tr('Farmer khata + supply'), icon: Users, color: 'green', group: tr('Dairy & Agri') },
  { key: 'subscriptions', label: tr('Subscriptions'), description: tr('Recurring subscriptions'), icon: Calendar, color: 'blue', group: tr('Dairy & Agri') },
  { key: 'cropAdvisory', label: tr('Crop Advisory'), description: tr('Farmer crop guidance'), icon: FileCheck, color: 'green', group: tr('Dairy & Agri') },
  { key: 'seasonalPlans', label: tr('Seasonal Plans'), description: tr('Kharif / Rabi calendars'), icon: Calendar, color: 'amber', group: tr('Dairy & Agri') },
  { key: 'govtSubsidy', label: tr('Govt Subsidies'), description: tr('Subsidy tracking'), icon: FileCheck, color: 'emerald', group: tr('Dairy & Agri') },

  // ═══ Jewelry ═══
  { key: 'hallmark', label: tr('Hallmark Tracking'), description: tr('Gold hallmark certification'), icon: Award, color: 'amber', group: tr('Jewelry') },
  { key: 'purityTracking', label: tr('Purity Tracking'), description: tr('22K / 24K purity levels'), icon: Award, color: 'amber', group: tr('Jewelry') },
  { key: 'liveMetalRates', label: tr('Live Metal Rates'), description: tr('Live gold / silver rates'), icon: Radio, color: 'amber', group: tr('Jewelry') },

  // ═══ Service Business ═══
  { key: 'amc', label: tr('AMC Contracts'), description: tr('Annual maintenance contracts'), icon: FileCheck, color: 'blue', group: tr('Service Business') },
  { key: 'technicianDispatch', label: tr('Technician Dispatch'), description: tr('Service technician assignment'), icon: Wrench, color: 'orange', group: tr('Service Business') },
  { key: 'repairs', label: tr('Repair Services'), description: tr('Repair tickets & tracking'), icon: Wrench, color: 'indigo', group: tr('Service Business') },
  { key: 'quotations', label: tr('Quotations'), description: tr('Detailed quotes'), icon: FileCheck, color: 'indigo', group: tr('Service Business') },

  // ═══ Bookstore & Retail ═══
  { key: 'bookRentals', label: tr('Book Rentals'), description: tr('Bookstore rentals'), icon: Package2, color: 'purple', group: tr('Bookstore & Retail') },
  { key: 'schoolLists', label: tr('School Book Lists'), description: tr('Grade-wise book packages'), icon: FileCheck, color: 'indigo', group: tr('Bookstore & Retail') },
  { key: 'compatibilityMatrix', label: tr('Compatibility Matrix'), description: tr('Parts compatibility (auto)'), icon: Grid3x3, color: 'blue', group: tr('Bookstore & Retail') },
  { key: 'reservations', label: tr('Reservations'), description: tr('Reserve items for customers'), icon: CalendarClock, color: 'purple', group: tr('Bookstore & Retail') },
  { key: 'usedItemsTrade', label: tr('Trade-in / Used Items'), description: tr('Accept used items'), icon: PackageOpen, color: 'orange', group: tr('Bookstore & Retail') },
  { key: 'bulkOrders', label: tr('Bulk Orders'), description: tr('Team / wholesale bulk orders'), icon: Package2, color: 'blue', group: tr('Bookstore & Retail') },

  // ═══ Garments & Tailoring ═══
  { key: 'tailoring', label: tr('Tailoring Orders'), description: tr('Custom stitching orders'), icon: Ruler, color: 'pink', group: tr('Garments & Tailoring') },
  { key: 'alterations', label: tr('Alterations'), description: tr('Garment alterations'), icon: Ruler, color: 'pink', group: tr('Garments & Tailoring') },

  // ═══ Bakery & Food ═══
  { key: 'productionPlanning', label: tr('Production Planning'), description: tr('Daily production schedules'), icon: ChefHat, color: 'amber', group: tr('Bakery & Food') },
  { key: 'ingredientTracking', label: tr('Ingredient Tracking'), description: tr('Recipe & ingredient inventory'), icon: MilkOff, color: 'orange', group: tr('Bakery & Food') },
  { key: 'customCakes', label: tr('Custom Cake Orders'), description: tr('Birthday / wedding cakes'), icon: Cake, color: 'pink', group: tr('Bakery & Food') },

  // ═══ Gym & Fitness ═══
  { key: 'bodyMeasurements', label: tr('Body Measurements'), description: tr('Gym body composition'), icon: Ruler, color: 'emerald', group: tr('Gym & Fitness') },
  { key: 'workoutTracking', label: tr('Workout Tracking'), description: tr('Member workout logs'), icon: Trophy, color: 'blue', group: tr('Gym & Fitness') },
  { key: 'dietPlans', label: tr('Diet Plans'), description: tr('Nutrition plans'), icon: MilkOff, color: 'emerald', group: tr('Gym & Fitness') },
  { key: 'classSchedule', label: tr('Class Schedule'), description: tr('Fitness class calendar'), icon: CalendarClock, color: 'purple', group: tr('Gym & Fitness') },

  // ═══ Clinic & Healthcare ═══
  { key: 'labTests', label: tr('Lab Tests'), description: tr('Clinical lab orders'), icon: FileCheck, color: 'rose', group: tr('Clinic & Healthcare') },
  { key: 'vaccinations', label: tr('Vaccinations'), description: tr('Vaccination schedules'), icon: ShieldCheck, color: 'teal', group: tr('Clinic & Healthcare') },
  { key: 'dentalCharts', label: tr('Dental Charts'), description: tr('Dental clinic charts'), icon: FileCheck, color: 'blue', group: tr('Clinic & Healthcare') },
  { key: 'antenatal', label: tr('Antenatal Care'), description: tr('Pregnancy tracking'), icon: Users, color: 'pink', group: tr('Clinic & Healthcare') },
  { key: 'physioSessions', label: tr('Physio Sessions'), description: tr('Physiotherapy sessions'), icon: Users, color: 'teal', group: tr('Clinic & Healthcare') },
  { key: 'drugInteractions', label: tr('Drug Interactions'), description: tr('Rx drug conflict check'), icon: AlertCircle, color: 'rose', group: tr('Clinic & Healthcare') },

  // ═══ Carpet & Flooring ═══
  { key: 'carpetRolls', label: tr('Carpet Rolls'), description: tr('Original roll tracking'), icon: Package2, color: 'amber', group: tr('Carpet & Flooring') },
  { key: 'cutPieces', label: tr('Cut Pieces'), description: tr('Track cut pieces'), icon: Ruler, color: 'amber', group: tr('Carpet & Flooring') },

  // ═══ Construction & Projects ═══
  { key: 'projectTracking', label: tr('Project Tracking'), description: tr('Construction / hardware projects'), icon: FileCheck, color: 'blue', group: tr('Construction & Projects') },
];

const FEATURE_GROUPS = [
  tr('Core Inventory'), tr('Tracking'), tr('Payment'), tr('Operations'), tr('Customer Records'),
  tr('Meat & Butchery'), tr('Dairy & Agri'), tr('Jewelry'), tr('Service Business'),
  tr('Bookstore & Retail'), tr('Garments & Tailoring'), tr('Bakery & Food'),
  tr('Gym & Fitness'), tr('Clinic & Healthcare'), tr('Carpet & Flooring'), tr('Construction & Projects'),
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
      toast.success(tr('Feature save ho gaya'));
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Save nahi hua')),
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
      toast.success(tr('Business type badal gaya — features naye type ke hisaab se lag gaye'));
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || tr('Type nahi badla')),
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

      <BusinessModelsCard />

      <SectionCard title={tr('Aap ka business type')} desc={tr('Is se tay hota hai ke menu, product form aur POS me kya kya aata hai')} icon={Store} color="violet"
        action={
          <Button size="sm" variant={showTypeSelector ? 'secondary' : 'primary'} onClick={() => setShowTypeSelector((v) => !v)}
            leftIcon={showTypeSelector ? <X className="h-4 w-4" /> : <SettingsIcon className="h-4 w-4" />}>
            {showTypeSelector ? tr('Band karein') : tr('Type badlein')}
          </Button>
        }>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-4xl leading-none">{config.template?.emoji || '🏬'}</div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.75rem] font-medium text-slate-500">{tr('Abhi ka business type')}</p>
            <h3 className="text-xl font-semibold leading-tight text-slate-900">{config.template?.label || config.businessType}</h3>
            {config.template?.labelUrdu && <p className="mt-0.5 text-sm text-slate-500" dir="rtl">{config.template.labelUrdu}</p>}
            {config.template?.description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{config.template.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>{tr('Unit: {{defaultUnit}}', { defaultUnit: config.defaultUnit })}</Badge>
              <Badge className="tabular-nums">{tr('{{enabledCount}} / {{count}} features chalu', { enabledCount, count: FEATURE_META.length })}</Badge>
              {config.currency && <Badge>{config.currency}</Badge>}
            </div>
          </div>
        </div>

        {showTypeSelector && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Alert tone="warning" title={tr('Type badalne se kya hoga?')} icon={<AlertCircle className="h-4 w-4" />}>
              {tr('Features is type ke hisaab se dobara set ho jayenge. Aap ka')}{' '} <strong>{tr('purana data')}</strong> {' '}{tr('(products, Sales, customers) waise hi rahega.')}
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
                <Loader2 className="h-4 w-4 animate-spin" /> {' '}{tr('Business type badal raha hai…')}
              </p>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title={tr('Features')} desc={tr('Jo kaam aap ka store karta hai sirf wohi chalu rakhein — menu aur forms saaf rehte hain')} icon={Sparkles} color="violet"
        badge={<Badge size="xs" variant="success" className="tabular-nums">{tr('{{enabledCount}} / {{count}} chalu', { enabledCount, count: FEATURE_META.length })}</Badge>}>
        <div className="mb-4 space-y-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} aria-label={tr('Feature search')}
            placeholder={tr('Feature search karein (IMEI, expiry, warranty, tailoring…)')}
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={search ? (
              <IconButton label={tr('Search saaf karein')} size="sm" onClick={() => setSearch('')} className="-me-2 h-7 w-7">
                <X className="h-4 w-4" />
              </IconButton>
            ) : undefined} />
          <p className="text-xs text-slate-500">{tr('Card dabane se feature foran chalu ya band hota hai. Group chun kar sirf us ke features dekhein.')}</p>

          <div className="flex flex-wrap gap-1.5">
            <GroupChip label={tr('Sab')} count={`${FEATURE_META.length}`} on={activeGroup === null} onClick={() => setActiveGroup(null)} />
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
          <EmptyState icon={<Search className="h-6 w-6" />} title={tr('Kuch nahi mila')}
            description={search ? tr('"{{search}}" se koi feature nahi mila', { search }) : tr('Is group me koi feature nahi')}
            action={<Button size="sm" variant="secondary" onClick={() => { setSearch(''); setActiveGroup(null); }}>{tr('Filter hatayein')}</Button>} />
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
                        className={['flex items-start gap-3 rounded-lg border p-3 text-start shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-[0.99] disabled:opacity-60',
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
            <SectionCard title={tr('Mashwara: categories')} desc={tr('Is business type ke liye aam product categories')} icon={Grid3x3} color="emerald">
              <div className="flex flex-wrap gap-1.5">
                {config.template.suggestedCategories.map((cat) => <Badge key={cat}>{cat}</Badge>)}
              </div>
            </SectionCard>
          )}
          {config.template?.quickUnits && config.template.quickUnits.length > 0 && (
            <SectionCard title={tr('Quick units')} desc={tr('POS par jaldi chunne wale units')} icon={Ruler} color="blue">
              <div className="flex flex-wrap gap-1.5">
                {config.template.quickUnits.map((unit) => <Badge key={unit}>{unit}</Badge>)}
              </div>
            </SectionCard>
          )}
        </div>
      ) : null}

      {config.template?.highlights && config.template.highlights.length > 0 && (
        <SectionCard title={tr('Khaas baatein')} desc={tr('Is business type ke liye sab se kaam ke features')} icon={Zap} color="pink">
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
