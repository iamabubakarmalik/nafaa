/**
 * First-run setup: five short steps (business, first branch, products,
 * receipt, staff) and a finish screen. Every step except Business can be
 * skipped, and progress is saved on the server after each step, so the owner
 * can stop and continue later on any device.
 *
 * The API and its eight saved steps are unchanged; see
 * constants/wizard-steps.ts for how the screens map onto them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Clock, PartyPopper, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { Logo } from '@core/components/brand/Logo';
import { isDialogOpen } from '@core/lib/shortcuts';
import { Alert, Button, Kbd, Modal, Skeleton } from '@/design-system/components';
import { ThemeToggle } from '@modules/auth/components/ThemeToggle';
import { LanguageSwitch } from '@core/i18n/components/LanguagePicker';
import { clearSignupIndustry, readSignupIndustry } from '@modules/auth/lib/industry-choices';
import { clearSignupModels, DEFAULT_MODELS, readSignupModels, cleanModels } from '@core/lib/business-models';
import { onboardingApi, type OnboardingOptions, type OnboardingProgress } from '../api/onboarding.api';
import { useOnboardingOptions, useOnboardingProgress } from '../hooks/useOnboarding';
import { useOnboardingTimer } from '../hooks/useOnboardingTimer';
import {
  WIZARD_STEPS, isStepDone, nextPosition, previousPosition, rememberAfterSetup, resumePosition, takeAfterSetup,
  type WizardPosition, type WizardStepId,
} from '../constants/wizard-steps';
import { WizardBar, WizardRail } from '../components/WizardRail';
import { BusinessStep, cleanPhone, readCities, validateBusiness, type BusinessErrors, type BusinessForm } from '../steps/BusinessStep';
import { BranchStep, validateBranch, type BranchErrors, type BranchForm } from '../steps/BranchStep';
import { ProductsStep, filledProducts, validateProducts, type ProductsErrors, type ProductsForm } from '../steps/ProductsStep';
import { ReceiptStep, validateReceipt, type ReceiptErrors, type ReceiptForm } from '../steps/ReceiptStep';
import { StaffStep, filledMembers, validateStaff, type StaffErrors, type StaffForm } from '../steps/StaffStep';
import { FinishStep, type FinishForm } from '../steps/FinishStep';
import { t as tr } from '@core/i18n';

const DEFAULT_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const IMPORT_PATH = '/products/bulk-import';

const hasErrors = (e: object) => Object.keys(e).length > 0;

function apiMessage(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  const flat = Array.isArray(msg) ? msg[0] : msg;
  return typeof flat === 'string' ? flat : '';
}

function errorText(err: unknown): string {
  const e = err as { response?: { status?: number } };
  if (!e?.response) return tr('Server tak nahi pohanch sake. Internet check karke dobara try karein.');
  if ((e.response.status ?? 0) >= 500) return tr('Server me masla aa gaya. Thori der baad dobara try karein.');
  return apiMessage(err) || tr('Save nahi hua. Dobara koshish karein.');
}

export default function OnboardingPage() {
  const queryClient = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);
  const updateTenant = useAuthStore((s) => s.updateTenant);

  const optionsQuery = useOnboardingOptions();
  const progressQuery = useOnboardingProgress();
  const options = optionsQuery.data;
  const progress = progressQuery.data;
  useOnboardingTimer(!!progress && !progress.isCompleted);

  const [position, setPosition] = useState<WizardPosition | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const finishingRef = useRef(false);
  const hydratedRef = useRef(false);

  const [business, setBusiness] = useState<BusinessForm>({ businessModels: DEFAULT_MODELS, businessType: '', businessSize: 'SMALL', city: '', whatsappNumber: '' });
  const [branch, setBranch] = useState<BranchForm>({
    shopAddress: '', shopArea: '', shopLandmark: '', openTime: '09:00', closeTime: '22:00', workingDays: DEFAULT_DAYS, taxNumber: '',
  });
  const [products, setProducts] = useState<ProductsForm>({ mode: null, products: [], categories: [] });
  const [receipt, setReceipt] = useState<ReceiptForm>({
    receiptTemplate: '', paymentMethods: ['CASH'], enableTax: false, taxRate: '', lowStockThreshold: '10',
  });
  const [staff, setStaff] = useState<StaffForm>({ members: [] });
  const [finish, setFinish] = useState<FinishForm>({ wantsTutorial: true, subscribedToTips: true });

  const [businessErrors, setBusinessErrors] = useState<BusinessErrors>({});
  const [branchErrors, setBranchErrors] = useState<BranchErrors>({});
  const [productsErrors, setProductsErrors] = useState<ProductsErrors>({});
  const [receiptErrors, setReceiptErrors] = useState<ReceiptErrors>({});
  const [staffErrors, setStaffErrors] = useState<StaffErrors>({});

  // Completed (here or on another device): leave. Otherwise fill the forms once from the server.
  useEffect(() => {
    if (!progress) return;
    if (progress.isCompleted) {
      if (!finishingRef.current) window.location.replace('/dashboard');
      return;
    }
    if (hydratedRef.current || !options) return;
    hydratedRef.current = true;
    hydrate(progress, options);
    setPosition(resumePosition(progress));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, options]);

  const hydrate = (p: OnboardingProgress, o: OnboardingOptions) => {
    const allowed = new Set(o.businessTypes.map((b) => b.value));
    const pick = [p.businessType, readSignupIndustry(), tenant?.businessType].find((t): t is string => !!t && allowed.has(t)) ?? '';
    const savedModels = cleanModels(tenant?.businessModels);
    setBusiness({
      businessModels: readSignupModels() ?? (savedModels.length ? savedModels : DEFAULT_MODELS),
      businessType: pick,
      businessSize: p.businessSize || 'SMALL',
      city: p.city || p.detectedCity || '',
      whatsappNumber: p.whatsappNumber || '',
    });
    setBranch({
      shopAddress: p.shopAddress || '',
      shopArea: p.shopArea || '',
      shopLandmark: p.shopLandmark || '',
      openTime: p.openTime || '09:00',
      closeTime: p.closeTime || '22:00',
      workingDays: p.workingDays?.length ? p.workingDays : DEFAULT_DAYS,
      taxNumber: p.taxNumber || '',
    });
    setReceipt({
      receiptTemplate: p.receiptTemplate || '',
      paymentMethods: p.paymentMethods?.length ? p.paymentMethods : ['CASH'],
      enableTax: !!p.enableTax,
      taxRate: p.enableTax && p.taxRate ? String(p.taxRate) : '',
      lowStockThreshold: String(p.lowStockThreshold ?? 10),
    });
    setFinish({ wantsTutorial: p.wantsTutorial ?? true, subscribedToTips: p.subscribedToTips ?? true });
  };

  const template = options?.businessTemplates?.[business.businessType || progress?.businessType || 'GENERAL'];
  const receiptTemplate = receipt.receiptTemplate || template?.receiptSize || 'THERMAL_58MM';
  const suggestedCategories: string[] = template?.suggestedCategories ?? [];
  // The API lets only the owner add staff.
  const isOwner = user?.role === 'OWNER';

  const go = useCallback((next: WizardPosition) => {
    setPosition(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const finishAndLeave = () => {
    toast.success(tr('Mubarak ho! Aap ki dukaan tayyar hai'));
    window.location.replace(takeAfterSetup());
  };

  /** Runs one save, stores the fresh progress and moves on. */
  const run = async (work: () => Promise<OnboardingProgress | undefined>, next?: WizardPosition) => {
    setBusy(true);
    try {
      const result = await work();
      if (result) queryClient.setQueryData(['onboarding'], result);
      if (result?.isCompleted) {
        finishAndLeave();
        return;
      }
      if (next) go(next);
    } catch (err) {
      if (/already completed/i.test(apiMessage(err))) {
        window.location.replace(takeAfterSetup());
        return;
      }
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  // ─── Per-step save ─────────────────────────────────────────────

  const saveBusiness = () => {
    const errors = validateBusiness(business);
    setBusinessErrors(errors);
    if (hasErrors(errors) || !options) return;
    const city = business.city.trim();
    const known = readCities(options).find((c) => c.name.toLowerCase() === city.toLowerCase());
    const phone = cleanPhone(business.whatsappNumber);
    void run(async () => {
      await onboardingApi.step1({
        businessModels: business.businessModels,
        businessType: business.businessType,
        businessSize: business.businessSize,
        city: known?.name ?? city,
        province: known?.province || undefined,
      });
      const result = await onboardingApi.step2(phone ? { whatsappNumber: phone } : {});
      updateTenant({ businessType: business.businessType, businessModels: business.businessModels });
      clearSignupIndustry();
      clearSignupModels();
      void queryClient.invalidateQueries({ queryKey: ['business-config'] });
      return result;
    }, nextPosition('business'));
  };

  const saveBranch = (skip = false) => {
    if (skip) {
      void run(async () => (progress && isStepDone('branch', progress) ? undefined : onboardingApi.step3({})), nextPosition('branch'));
      return;
    }
    const errors = validateBranch(branch);
    setBranchErrors(errors);
    if (hasErrors(errors)) return;
    const opt = (v: string) => v.trim() || undefined;
    void run(() => onboardingApi.step3({
      shopAddress: opt(branch.shopAddress),
      shopArea: opt(branch.shopArea),
      shopLandmark: opt(branch.shopLandmark),
      openTime: branch.openTime || undefined,
      closeTime: branch.closeTime || undefined,
      workingDays: branch.workingDays,
      taxNumber: opt(branch.taxNumber),
    }), nextPosition('branch'));
  };

  const saveProducts = (skip = false) => {
    if (!progress) return;
    const alreadyDone = isStepDone('products', progress);
    if (skip) {
      rememberAfterSetup(null);
      void run(async () => (alreadyDone ? undefined : onboardingApi.skip(6)), nextPosition('products'));
      return;
    }
    const errors = validateProducts(products);
    setProductsErrors(errors);
    if (hasErrors(errors)) return;

    const saved = progress.enabledCategories ?? [];
    const newCategories = products.categories.filter((c) => !saved.includes(c));
    void run(async () => {
      let result: OnboardingProgress | undefined;
      if (newCategories.length) result = await onboardingApi.step4({ enabledCategories: [...saved, ...newCategories] });

      if (products.mode === 'sample' && !progress.usedSampleData) {
        result = await onboardingApi.step6({ useSampleData: true, products: [] });
        toast.success(tr('{{value}} misaal wale products add ho gaye', { value: result.productsAddedCount || 0 }));
      } else if (products.mode === 'manual') {
        result = await onboardingApi.step6({
          products: filledProducts(products).map((p) => ({ name: p.name.trim(), price: Number(p.price), stock: Number(p.stock) || 0 })),
        });
        toast.success(tr('{{value}} products add ho gaye', { value: result.productsAddedCount || 0 }));
      } else if (!alreadyDone) {
        result = await onboardingApi.skip(6);
      }
      rememberAfterSetup(products.mode === 'import' ? IMPORT_PATH : null);
      // Saved rows are cleared so going back and continuing again does not add them twice.
      setProducts({ mode: products.mode === 'import' ? 'import' : null, products: [], categories: [] });
      return result;
    }, nextPosition('products'));
  };

  const saveReceipt = (skip = false) => {
    if (skip) {
      // Skipping saves the defaults once; a saved choice is left as it is.
      const done = progress && isStepDone('receipt', progress);
      void run(async () => (done ? undefined : onboardingApi.step4({ receiptTemplate, paymentMethods: ['CASH'] })), nextPosition('receipt'));
      return;
    }
    const errors = validateReceipt(receipt);
    setReceiptErrors(errors);
    if (hasErrors(errors)) return;
    void run(() => onboardingApi.step4({
      receiptTemplate,
      paymentMethods: receipt.paymentMethods,
      enableTax: receipt.enableTax,
      taxRate: receipt.enableTax ? Number(receipt.taxRate) : 0,
      lowStockThreshold: Number(receipt.lowStockThreshold),
    }), nextPosition('receipt'));
  };

  const saveStaff = (skip = false) => {
    if (!progress) return;
    const alreadyDone = isStepDone('staff', progress);
    const members = filledMembers(staff);
    if (skip || !isOwner || members.length === 0) {
      void run(async () => (alreadyDone ? undefined : onboardingApi.skip(7)), 'finish');
      return;
    }
    const errors = validateStaff(staff);
    setStaffErrors(errors);
    if (hasErrors(errors)) return;
    void run(async () => {
      const result = await onboardingApi.step7({
        teamMembers: members.map((m) => ({ fullName: m.fullName.trim(), email: m.email.trim().toLowerCase(), password: m.password, role: m.role })),
      });
      const added = result.teamMembersAdded ?? 0;
      if (added < members.length) {
        toast.warning(tr('{{added}} staff add hue. {{value}} email pehle se kisi account me hain — unhein doosra email dein.', { added, value: members.length - added }));
      } else {
        toast.success(tr('{{added}} staff add ho gaye', { added }));
      }
      setStaff({ members: [] });
      return result;
    }, 'finish');
  };

  const saveFinish = () => {
    finishingRef.current = true;
    void run(() => onboardingApi.step8(finish));
  };

  const exitForNow = async () => {
    finishingRef.current = true;
    setBusy(true);
    try {
      await onboardingApi.complete();
    } catch {
      // Leave anyway; OnboardingGate brings the owner back if the API did not save it.
    }
    window.location.replace('/dashboard');
  };

  const primary = () => {
    if (busy || !position) return;
    if (position === 'business') saveBusiness();
    else if (position === 'branch') saveBranch();
    else if (position === 'products') saveProducts();
    else if (position === 'receipt') saveReceipt();
    else if (position === 'staff') saveStaff();
    else saveFinish();
  };

  const skip = () => {
    if (busy || !position) return;
    if (position === 'branch') saveBranch(true);
    else if (position === 'products') saveProducts(true);
    else if (position === 'receipt') saveReceipt(true);
    else if (position === 'staff') saveStaff(true);
  };

  const back = position ? previousPosition(position) : null;

  // Ctrl/Cmd + Enter saves and continues, also while typing in a field.
  const primaryRef = useRef(primary);
  primaryRef.current = primary;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || isDialogOpen()) return;
      e.preventDefault();
      primaryRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const step = useMemo(() => WIZARD_STEPS.find((s) => s.id === position) ?? null, [position]);

  // ─── Render ────────────────────────────────────────────────────

  const loadFailed = optionsQuery.isError || progressQuery.isError;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Logo size={30} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{tr('Dukaan setup')}</div>
            {tenant?.name && <div className="truncate text-xs text-slate-500">{tenant.name}</div>}
          </div>
          <LanguageSwitch className="hidden w-[13rem] md:flex" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button variant="ghost" size="sm" onClick={() => setConfirmExit(true)} disabled={busy || !progress}>
            {tr('Baad me karunga')}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 lg:py-10">
        {progress && position ? <WizardRail current={position} progress={progress} onJump={go} /> : <div className="hidden lg:block" />}

        <main className="min-w-0">
          {loadFailed ? (
            <Alert
              tone="danger"
              title={tr('Setup load nahi hua')}
              action={(
                <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => { void optionsQuery.refetch(); void progressQuery.refetch(); }}>
                  {tr('Dobara')}
                </Button>
              )}
            >
              {tr('Internet check karein aur dobara try karein.')}
            </Alert>
          ) : !progress || !options || !position ? (
            <LoadingCard />
          ) : (
            <>
              <WizardBar current={position} />

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-start gap-4 border-b border-slate-200 p-5 sm:p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                    {step ? <step.icon className="h-5 w-5" aria-hidden /> : <PartyPopper className="h-5 w-5" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">{step ? step.title : tr('Sab tayyar hai!')}</h1>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {step ? step.description : tr('Ek nazar dekh lein. Jo chhor diya woh baad me Settings se ho jayega.')}
                    </p>
                  </div>
                  {step && (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> {' '}{tr('~{{minutes}} min', { minutes: step.minutes })}
                    </span>
                  )}
                </header>

                <div className="p-5 sm:p-6">
                  {position === 'business' && (
                    <BusinessStep
                      value={business}
                      onChange={(patch) => setBusiness((v) => ({ ...v, ...patch }))}
                      errors={businessErrors}
                      options={options}
                      detectedCity={progress.detectedCity}
                    />
                  )}
                  {position === 'branch' && (
                    <BranchStep
                      value={branch}
                      onChange={(patch) => setBranch((v) => ({ ...v, ...patch }))}
                      errors={branchErrors}
                      options={options}
                      branchName={user?.assignedShop?.name || tenant?.name || 'Main branch'}
                    />
                  )}
                  {position === 'products' && (
                    <ProductsStep
                      value={products}
                      onChange={(patch) => setProducts((v) => ({ ...v, ...patch }))}
                      errors={productsErrors}
                      suggestedCategories={suggestedCategories}
                      addedCount={isStepDone('products', progress) ? progress.productsAddedCount : 0}
                      savedCategories={progress.enabledCategories ?? []}
                    />
                  )}
                  {position === 'receipt' && (
                    <ReceiptStep
                      value={{ ...receipt, receiptTemplate }}
                      onChange={(patch) => setReceipt((v) => ({ ...v, ...patch }))}
                      errors={receiptErrors}
                      options={options}
                      shopName={tenant?.name ?? ''}
                      address={branch.shopAddress}
                    />
                  )}
                  {position === 'staff' && (
                    <StaffStep
                      value={staff}
                      onChange={(patch) => setStaff((v) => ({ ...v, ...patch }))}
                      errors={staffErrors}
                      addedCount={isStepDone('staff', progress) ? progress.teamMembersAdded : 0}
                      isOwner={isOwner}
                    />
                  )}
                  {position === 'finish' && (
                    <FinishStep value={finish} onChange={(patch) => setFinish((v) => ({ ...v, ...patch }))} progress={progress} onJump={go} />
                  )}
                </div>

                <footer className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-slate-200 bg-white p-4 sm:px-6">
                  {back && (
                    <Button variant="secondary" size="lg" onClick={() => go(back)} disabled={busy} leftIcon={<ArrowLeft className="h-4 w-4 rtl-flip" />} aria-label={tr('Wapas')}>
                      <span className="hidden sm:inline">{tr('Wapas')}</span>
                    </Button>
                  )}
                  <span className="hidden flex-1 items-center gap-1.5 text-xs text-slate-500 md:flex">
                    <Kbd>Ctrl</Kbd><Kbd>Enter</Kbd> {' '}{tr('aage')}
                  </span>
                  <span className="flex-1 md:hidden" />
                  {step?.skippable && (
                    <Button variant="ghost" size="lg" onClick={skip} disabled={busy}>
                      {tr('Skip')}
                    </Button>
                  )}
                  <Button
                    size="lg"
                    onClick={primary}
                    loading={busy}
                    rightIcon={position === 'finish' ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 rtl-flip" />}
                  >
                    {position === 'finish' ? tr('Start') : tr('Next')}
                  </Button>
                </footer>
              </section>
            </>
          )}
        </main>
      </div>

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        size="sm"
        title={tr('Setup baad me karein?')}
        description={tr('Aap seedha dashboard par chale jayenge. Jo abhi save nahi hua woh baad me Settings se kar sakte hain.')}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmExit(false)}>{tr('Setup jaari rakhein')}</Button>
            <Button onClick={() => void exitForNow()} loading={busy}>{tr('Dashboard par jayein')}</Button>
          </>
        )}
      >
        <p className="text-sm text-slate-600">
          {tr('Business type, bill ka size aur staff — sab Settings me mil jayega. Setup ka ye page dobara nahi aayega.')}
        </p>
      </Modal>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-busy="true" aria-label={tr('Setup load ho raha hai')}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-11 w-11" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="mt-6 h-10 w-full" />
    </div>
  );
}
