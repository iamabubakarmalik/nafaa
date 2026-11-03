/**
 * First-run setup: five short steps and a finish screen (same flow and API
 * as the web OnboardingPage). Only Business is required; progress is saved
 * on the server after each step, so the owner can continue on any device.
 */

import { ArrowLeft, ArrowRight, Check, Clock, PartyPopper, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { apiErrorMessage, serverMessage } from '@/core/api/errors';
import { cleanModels, DEFAULT_MODELS } from '@/core/business-models';
import { haptic } from '@/core/device/haptics';
import { LanguageSwitch } from '@/core/i18n/components/LanguagePicker';
import {
  Badge, Button, confirm, EmptyState, Icon, IconButton, Logo, ProgressBar, SkeletonRows, Text, toast, useLayout, useTheme,
} from '@/design';
import { clearSignupPicks, readSignupPicks } from '@/modules/auth/lib/industry-choices';
import { markOnboarded } from '@/modules/shell/AuthGate';
import { onboardingApi, type OnboardingOptions, type OnboardingProgress } from '../lib/api';
import { STEPS, isStepDone, nextPosition, previousPosition, resumePosition, type Position, type StepId } from '../lib/steps';
import { BusinessStep, cleanPhone, readCities, validateBusiness, type BusinessErrors, type BusinessForm } from '../steps/BusinessStep';
import { BranchStep, validateBranch, type BranchErrors, type BranchForm } from '../steps/BranchStep';
import { ProductsStep, filledProducts, validateProducts, type ProductsErrors, type ProductsForm } from '../steps/ProductsStep';
import { ReceiptStep, validateReceipt, type ReceiptErrors, type ReceiptForm } from '../steps/ReceiptStep';
import { StaffStep, filledMembers, validateStaff, type StaffErrors, type StaffForm } from '../steps/StaffStep';
import { FinishStep, type FinishForm } from '../steps/FinishStep';

const DEFAULT_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const IMPORT_PATH = '/products/bulk-import';
const hasErrors = (e: object) => Object.keys(e).length > 0;

export function OnboardingScreen() {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);
  const updateTenant = useAuthStore((s) => s.updateTenant);
  const scroll = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);

  const optionsQ = useQuery({ queryKey: ['onboarding', 'options'], queryFn: onboardingApi.options, staleTime: 30 * 60_000 });
  const progressQ = useQuery({ queryKey: ['onboarding'], queryFn: onboardingApi.progress });
  const options = optionsQ.data;
  const progress = progressQ.data;

  const [position, setPosition] = useState<Position | null>(null);
  const [busy, setBusy] = useState(false);
  const afterSetup = useRef<string>('/');
  const hydrated = useRef(false);
  const startedAt = useRef(Date.now());

  const [business, setBusiness] = useState<BusinessForm>({ businessModels: DEFAULT_MODELS, businessType: '', businessSize: 'SMALL', city: '', whatsappNumber: '' });
  const [branch, setBranch] = useState<BranchForm>({ shopAddress: '', shopArea: '', shopLandmark: '', openTime: '09:00', closeTime: '22:00', workingDays: DEFAULT_DAYS, taxNumber: '' });
  const [products, setProducts] = useState<ProductsForm>({ mode: null, products: [], categories: [] });
  const [receipt, setReceipt] = useState<ReceiptForm>({ receiptTemplate: '', paymentMethods: ['CASH'], enableTax: false, taxRate: '', lowStockThreshold: '10' });
  const [staff, setStaff] = useState<StaffForm>({ members: [] });
  const [finish, setFinish] = useState<FinishForm>({ wantsTutorial: true, subscribedToTips: true });
  const [businessErrors, setBusinessErrors] = useState<BusinessErrors>({});
  const [branchErrors, setBranchErrors] = useState<BranchErrors>({});
  const [productsErrors, setProductsErrors] = useState<ProductsErrors>({});
  const [receiptErrors, setReceiptErrors] = useState<ReceiptErrors>({});
  const [staffErrors, setStaffErrors] = useState<StaffErrors>({});

  const leave = (path = afterSetup.current) => {
    markOnboarded(tenant?.id);
    void onboardingApi.recordTime(Math.round((Date.now() - startedAt.current) / 1000));
    qc.setQueryData(['onboarding'], (old: OnboardingProgress | undefined) => (old ? { ...old, isCompleted: true } : old));
    router.replace(path as never);
  };

  useEffect(() => {
    if (!progress) return;
    if (progress.isCompleted) return leave('/');
    if (hydrated.current || !options) return;
    hydrated.current = true;
    hydrate(progress, options);
    setPosition(resumePosition(progress));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, options]);

  const hydrate = (p: OnboardingProgress, o: OnboardingOptions) => {
    const allowed = new Set(o.businessTypes.map((b) => b.value));
    const picks = readSignupPicks();
    const pick = [p.businessType, picks.businessType, tenant?.businessType].find((x): x is string => !!x && allowed.has(x)) ?? '';
    const saved = cleanModels(tenant?.businessModels);
    setBusiness({
      businessModels: cleanModels(picks.models).length ? cleanModels(picks.models) : saved.length ? saved : DEFAULT_MODELS,
      businessType: pick, businessSize: p.businessSize || 'SMALL', city: p.city || p.detectedCity || '', whatsappNumber: p.whatsappNumber || '',
    });
    setBranch({
      shopAddress: p.shopAddress || '', shopArea: p.shopArea || '', shopLandmark: p.shopLandmark || '', openTime: p.openTime || '09:00',
      closeTime: p.closeTime || '22:00', workingDays: p.workingDays?.length ? p.workingDays : DEFAULT_DAYS, taxNumber: p.taxNumber || '',
    });
    setReceipt({
      receiptTemplate: p.receiptTemplate || '', paymentMethods: p.paymentMethods?.length ? p.paymentMethods : ['CASH'], enableTax: !!p.enableTax,
      taxRate: p.enableTax && p.taxRate ? String(p.taxRate) : '', lowStockThreshold: String(p.lowStockThreshold ?? 10),
    });
    setFinish({ wantsTutorial: p.wantsTutorial ?? true, subscribedToTips: p.subscribedToTips ?? true });
  };

  const template = options?.businessTemplates?.[business.businessType || progress?.businessType || 'GENERAL'];
  const receiptTemplate = receipt.receiptTemplate || template?.receiptSize || 'THERMAL_58MM';
  const isOwner = user?.role === 'OWNER';

  const go = (next: Position) => {
    setPosition(next);
    scroll.current?.scrollTo({ y: 0, animated: th.motion });
  };

  const run = async (work: () => Promise<OnboardingProgress | undefined>, next?: Position) => {
    setBusy(true);
    try {
      const result = await work();
      if (result) qc.setQueryData(['onboarding'], result);
      if (result?.isCompleted) {
        haptic('success');
        toast.success(t('Mubarak ho! Aap ki dukaan tayyar hai'));
        leave();
        return;
      }
      if (next) {
        haptic('tap');
        go(next);
      }
    } catch (err) {
      if (/already completed/i.test(serverMessage(err) ?? '')) return leave();
      toast.error(apiErrorMessage(err, t('Save nahi hua. Dobara koshish karein.')));
    } finally {
      setBusy(false);
    }
  };

  const saveBusiness = () => {
    const errors = validateBusiness(business);
    setBusinessErrors(errors);
    if (hasErrors(errors) || !options) return haptic('error');
    const city = business.city.trim();
    const known = readCities(options).find((c) => c.name.toLowerCase() === city.toLowerCase());
    const phone = cleanPhone(business.whatsappNumber);
    void run(async () => {
      await onboardingApi.step(1, { businessModels: business.businessModels, businessType: business.businessType, businessSize: business.businessSize, city: known?.name ?? city, province: known?.province || undefined });
      const result = await onboardingApi.step(2, phone ? { whatsappNumber: phone } : {});
      updateTenant({ businessType: business.businessType, businessModels: business.businessModels });
      clearSignupPicks();
      void qc.invalidateQueries({ queryKey: ['business-config'] });
      return result;
    }, nextPosition('business'));
  };

  const saveBranch = (skip = false) => {
    if (skip) return void run(async () => (progress && isStepDone('branch', progress) ? undefined : onboardingApi.step(3, {})), nextPosition('branch'));
    const errors = validateBranch(branch);
    setBranchErrors(errors);
    if (hasErrors(errors)) return haptic('error');
    const opt = (v: string) => v.trim() || undefined;
    void run(() => onboardingApi.step(3, {
      shopAddress: opt(branch.shopAddress), shopArea: opt(branch.shopArea), shopLandmark: opt(branch.shopLandmark),
      openTime: branch.openTime || undefined, closeTime: branch.closeTime || undefined, workingDays: branch.workingDays, taxNumber: opt(branch.taxNumber),
    }), nextPosition('branch'));
  };

  const saveProducts = (skip = false) => {
    if (!progress) return;
    const alreadyDone = isStepDone('products', progress);
    if (skip) {
      afterSetup.current = '/';
      return void run(async () => (alreadyDone ? undefined : onboardingApi.skip(6)), nextPosition('products'));
    }
    const errors = validateProducts(products);
    setProductsErrors(errors);
    if (hasErrors(errors)) return haptic('error');
    const saved = progress.enabledCategories ?? [];
    const newCategories = products.categories.filter((c) => !saved.includes(c));
    void run(async () => {
      let result: OnboardingProgress | undefined;
      if (newCategories.length) result = await onboardingApi.step(4, { enabledCategories: [...saved, ...newCategories] });
      if (products.mode === 'sample' && !progress.usedSampleData) {
        result = await onboardingApi.step(6, { useSampleData: true, products: [] });
        toast.success(t('{{value}} misaal wale products add ho gaye', { value: result.productsAddedCount || 0 }));
      } else if (products.mode === 'manual') {
        result = await onboardingApi.step(6, { products: filledProducts(products).map((p) => ({ name: p.name.trim(), price: Number(p.price), stock: Number(p.stock) || 0 })) });
        toast.success(t('{{value}} products add ho gaye', { value: result.productsAddedCount || 0 }));
      } else if (!alreadyDone) {
        result = await onboardingApi.skip(6);
      }
      afterSetup.current = products.mode === 'import' ? IMPORT_PATH : '/';
      setProducts({ mode: products.mode === 'import' ? 'import' : null, products: [], categories: [] });
      return result;
    }, nextPosition('products'));
  };

  const saveReceipt = (skip = false) => {
    if (skip) {
      const done = progress && isStepDone('receipt', progress);
      return void run(async () => (done ? undefined : onboardingApi.step(4, { receiptTemplate, paymentMethods: ['CASH'] })), nextPosition('receipt'));
    }
    const errors = validateReceipt(receipt);
    setReceiptErrors(errors);
    if (hasErrors(errors)) return haptic('error');
    void run(() => onboardingApi.step(4, {
      receiptTemplate, paymentMethods: receipt.paymentMethods, enableTax: receipt.enableTax,
      taxRate: receipt.enableTax ? Number(receipt.taxRate) : 0, lowStockThreshold: Number(receipt.lowStockThreshold),
    }), nextPosition('receipt'));
  };

  const saveStaff = (skip = false) => {
    if (!progress) return;
    const alreadyDone = isStepDone('staff', progress);
    const members = filledMembers(staff);
    if (skip || !isOwner || members.length === 0) return void run(async () => (alreadyDone ? undefined : onboardingApi.skip(7)), 'finish');
    const errors = validateStaff(staff);
    setStaffErrors(errors);
    if (hasErrors(errors)) return haptic('error');
    void run(async () => {
      const result = await onboardingApi.step(7, { teamMembers: members.map((m) => ({ fullName: m.fullName.trim(), email: m.email.trim().toLowerCase(), password: m.password, role: m.role })) });
      const added = result.teamMembersAdded ?? 0;
      if (added < members.length) toast.warning(t('{{added}} staff add hue. {{value}} email pehle se kisi account me hain — unhein doosra email dein.', { added, value: members.length - added }));
      else toast.success(t('{{added}} staff add ho gaye', { added }));
      setStaff({ members: [] });
      return result;
    }, 'finish');
  };

  const primary = () => {
    if (busy || !position) return;
    if (position === 'business') saveBusiness();
    else if (position === 'branch') saveBranch();
    else if (position === 'products') saveProducts();
    else if (position === 'receipt') saveReceipt();
    else if (position === 'staff') saveStaff();
    else void run(() => onboardingApi.step(8, finish));
  };

  const skip = () => {
    if (busy || !position) return;
    if (position === 'branch') saveBranch(true);
    else if (position === 'products') saveProducts(true);
    else if (position === 'receipt') saveReceipt(true);
    else if (position === 'staff') saveStaff(true);
  };

  const exitForNow = async () => {
    const ok = await confirm({
      title: t('Setup baad me karein?'),
      message: t('Business type, bill ka size aur staff — sab Settings me mil jayega. Setup ka ye page dobara nahi aayega.'),
      confirmLabel: t('Dashboard par jayein'),
      cancelLabel: t('Setup jaari rakhein'),
    });
    if (!ok) return;
    setBusy(true);
    await onboardingApi.complete().catch(() => undefined);
    leave('/');
  };

  const step = useMemo(() => STEPS.find((s) => s.id === position) ?? null, [position]);
  const index = position === 'finish' ? STEPS.length : STEPS.findIndex((s) => s.id === position);
  const pct = position ? (index + (position === 'finish' ? 0 : 0.5)) / STEPS.length : 0;
  const back = position ? previousPosition(position) : null;
  const businessDone = !!progress && isStepDone('business', progress);
  const loadFailed = optionsQ.isError || progressQ.isError;

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2) }}>
        <Logo size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="base" weight="bold" numberOfLines={1}>{t('Dukaan setup')}</Text>
          {tenant?.name && <Text size="xs" tone="muted" numberOfLines={1}>{tenant.name}</Text>}
        </View>
        {businessDone && <Button variant="ghost" size="sm" onPress={() => void exitForNow()} disabled={busy}>{t('Baad me karunga')}</Button>}
      </View>
      <View style={{ paddingHorizontal: th.space(4), gap: th.space(2), paddingBottom: th.space(2) }}>
        <View style={{ width: isTablet ? 320 : '100%' }}><LanguageSwitch /></View>
        {position && (
          <View style={{ gap: th.space(1.5) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text size="xs" weight="semibold" tone="secondary">{position === 'finish' ? t('Aakhri qadam') : t('Qadam {{value}} / {{count}}', { value: index + 1, count: STEPS.length })}</Text>
              <Text size="xs" weight="semibold" tone="muted" ltr>{`${Math.round(pct * 100)}%`}</Text>
            </View>
            <ProgressBar value={pct} />
          </View>
        )}
      </View>

      <KeyboardAwareScrollView
        ref={scroll as never}
        bottomOffset={110}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: th.space(4), paddingBottom: th.space(8), width: '100%', maxWidth: 760, alignSelf: 'center' }}
      >
        {loadFailed ? (
          <EmptyState icon={RefreshCw} tone="danger" title={t('Setup load nahi hua')} message={t('Internet check karein aur dobara try karein.')} action={<Button variant="secondary" icon={RefreshCw} onPress={() => { void optionsQ.refetch(); void progressQ.refetch(); }}>{t('Dobara')}</Button>} />
        ) : !progress || !options || !position ? (
          <SkeletonRows count={6} />
        ) : (
          <Animated.View key={position} entering={th.motion ? FadeIn.duration(220) : undefined} exiting={th.motion ? FadeOut.duration(120) : undefined} style={{ gap: th.space(5) }}>
            <View style={{ flexDirection: 'row', gap: th.space(3), alignItems: 'flex-start' }}>
              <View style={{ width: 48, height: 48, borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={step ? step.icon : PartyPopper} size={23} color={th.colors.brand.text} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexWrap: 'wrap' }}>
                  <Text size="2xl" weight="heavy">{step ? t(step.title) : t('Sab tayyar hai!')}</Text>
                  {step && !step.skippable && <Badge tone="brand">{t('Zaroori')}</Badge>}
                </View>
                <Text size="sm" tone="secondary">{step ? t(step.description) : t('Ek nazar dekh lein. Jo chhor diya woh baad me Settings se ho jayega.')}</Text>
                {step && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon icon={Clock} size={13} tone="muted" />
                    <Text size="xs" tone="muted">{t('~{{minutes}} min', { minutes: step.minutes })}</Text>
                  </View>
                )}
              </View>
            </View>

            {position === 'business' && <BusinessStep value={business} onChange={(p) => setBusiness((v) => ({ ...v, ...p }))} errors={businessErrors} options={options} detectedCity={progress.detectedCity} />}
            {position === 'branch' && <BranchStep value={branch} onChange={(p) => setBranch((v) => ({ ...v, ...p }))} errors={branchErrors} options={options} branchName={user?.assignedShop?.name || tenant?.name || t('Main branch')} />}
            {position === 'products' && <ProductsStep value={products} onChange={(p) => setProducts((v) => ({ ...v, ...p }))} errors={productsErrors} suggestedCategories={template?.suggestedCategories ?? []} addedCount={isStepDone('products', progress) ? progress.productsAddedCount : 0} savedCategories={progress.enabledCategories ?? []} />}
            {position === 'receipt' && <ReceiptStep value={{ ...receipt, receiptTemplate }} onChange={(p) => setReceipt((v) => ({ ...v, ...p }))} errors={receiptErrors} options={options} shopName={tenant?.name ?? ''} address={branch.shopAddress} />}
            {position === 'staff' && <StaffStep value={staff} onChange={(p) => setStaff((v) => ({ ...v, ...p }))} errors={staffErrors} addedCount={isStepDone('staff', progress) ? progress.teamMembersAdded : 0} isOwner={isOwner} />}
            {position === 'finish' && <FinishStep value={finish} onChange={(p) => setFinish((v) => ({ ...v, ...p }))} progress={progress} onJump={(id: StepId) => go(id)} />}
          </Animated.View>
        )}
      </KeyboardAwareScrollView>

      {position && progress && options && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(4), paddingTop: th.space(3), paddingBottom: Math.max(insets.bottom, th.space(3)), backgroundColor: th.colors.surface, borderTopWidth: 1, borderTopColor: th.colors.divider }}>
          {back && <IconButton icon={ArrowLeft} label={t('Wapas')} variant="secondary" size="lg" flip disabled={busy} onPress={() => go(back)} />}
          <View style={{ flex: 1 }} />
          {step?.skippable && <Button variant="ghost" size="lg" onPress={skip} disabled={busy}>{t('Skip')}</Button>}
          <Button size="lg" onPress={primary} loading={busy} iconEnd={position === 'finish' ? Check : ArrowRight} iconEndFlip={position !== 'finish'} style={{ minWidth: 140 }}>
            {position === 'finish' ? t('Start') : t('Next')}
          </Button>
        </View>
      )}
    </View>
  );
}
