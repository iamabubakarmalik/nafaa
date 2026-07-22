import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, SkipForward, X, Sparkles } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { onboardingApi } from '../api/onboarding.api';
import {
  useOnboardingOptions,
  useOnboardingProgress,
  useStepMutation,
  useSkipStep,
} from '../hooks/useOnboarding';
import { useOnboardingTimer } from '../hooks/useOnboardingTimer';
import { STEP_CONFIG, TOTAL_STEPS } from '../constants/step-config';
import { ProgressBar } from '../components/ProgressBar';
import { StepHeader } from '../components/StepHeader';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { Step1BusinessType } from '../steps/Step1BusinessType';
import { Step2OwnerProfile } from '../steps/Step2OwnerProfile';
import { Step3ShopDetails } from '../steps/Step3ShopDetails';
import { Step4Preferences } from '../steps/Step4Preferences';
import { Step5Features } from '../steps/Step5Features';
import { Step6Products } from '../steps/Step6Products';
import { Step7Team } from '../steps/Step7Team';
import { Step8Finish } from '../steps/Step8Finish';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const updateTenant = useAuthStore((s) => s.updateTenant);

  const { data: options, isLoading: loadingOptions } = useOnboardingOptions();
  const { data: progress, isLoading: loadingProgress } = useOnboardingProgress();

  const [step, setStep] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useOnboardingTimer(!!progress && !progress.isCompleted);

  // ═══ CRITICAL: agar completed hai → hard redirect (no loop) ═══
  useEffect(() => {
    if (!progress) return;

    if (progress.isCompleted) {
      window.location.replace('/dashboard');
      return;
    }

    if (typeof progress.currentStep === 'number') {
      const clamped = Math.min(Math.max(progress.currentStep, 1), TOTAL_STEPS);
      setStep(clamped);
    }
  }, [progress]);

  // ═══ Form state ═══
  const [s1, setS1] = useState({
    businessType: '',
    businessSize: 'SMALL',
    city: '',
    province: '',
  });
  const [s2, setS2] = useState({
    whatsappNumber: '',
    cnic: '',
    preferredLanguage: 'roman_ur',
    gender: '',
    dateOfBirth: '',
  });
  const [s3, setS3] = useState({
    shopAddress: '',
    shopArea: '',
    shopLandmark: '',
    openTime: '09:00',
    closeTime: '22:00',
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    taxNumber: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [s4, setS4] = useState({
    enabledCategories: [] as string[],
    paymentMethods: ['CASH'],
    receiptTemplate: 'THERMAL_58MM',
    lowStockThreshold: 10,
    currency: 'PKR',
    enableTax: false,
    taxRate: 0,
  });
  const [s5, setS5] = useState({ enabledFeatures: {} as Record<string, boolean> });
  const [s6, setS6] = useState({ products: [] as any[], useSampleData: false });
  const [s7, setS7] = useState({ teamMembers: [] as any[] });
  const [s8, setS8] = useState({ wantsTutorial: true, subscribedToTips: true });

  // ═══ Hydrate form state from server ═══
  useEffect(() => {
    if (!progress) return;
    setS1({
      businessType: progress.businessType || '',
      businessSize: progress.businessSize || 'SMALL',
      city: progress.city || (progress as any).detectedCity || '',
      province: progress.province || (progress as any).detectedProvince || '',
    });
    setS2({
      whatsappNumber: progress.whatsappNumber || '',
      cnic: progress.cnic || '',
      preferredLanguage: progress.preferredLanguage || 'roman_ur',
      gender: (progress as any).gender || '',
      dateOfBirth: (progress as any).dateOfBirth || '',
    });
    setS3({
      shopAddress: progress.shopAddress || '',
      shopArea: (progress as any).shopArea || '',
      shopLandmark: (progress as any).shopLandmark || '',
      openTime: progress.openTime || '09:00',
      closeTime: progress.closeTime || '22:00',
      workingDays: progress.workingDays?.length
        ? progress.workingDays
        : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      taxNumber: progress.taxNumber || '',
      latitude: (progress as any).latitude ?? undefined,
      longitude: (progress as any).longitude ?? undefined,
    });
    setS4({
      enabledCategories: progress.enabledCategories || [],
      paymentMethods: progress.paymentMethods?.length
        ? progress.paymentMethods
        : ['CASH'],
      receiptTemplate: progress.receiptTemplate || 'THERMAL_58MM',
      lowStockThreshold: progress.lowStockThreshold ?? 10,
      currency: (progress as any).currency || 'PKR',
      enableTax: (progress as any).enableTax || false,
      taxRate: (progress as any).taxRate || 0,
    });
    setS5({ enabledFeatures: (progress as any).enabledFeatures || {} });
    setS8({
      wantsTutorial: progress.wantsTutorial ?? true,
      subscribedToTips: (progress as any).subscribedToTips ?? true,
    });
  }, [progress]);

  // ═══ Config (safe access) ═══
  const cfg = STEP_CONFIG[step] || STEP_CONFIG[1];
  const mutation = useStepMutation(step);
  const skipMutation = useSkipStep();

  const businessType = s1.businessType || progress?.businessType || 'GENERAL';
  const businessTemplate = options?.businessTemplates?.[businessType];
  const businessEmoji = businessTemplate?.emoji || '🏪';

  // ═══ Validation per step ═══
  const canProceed = useMemo(() => {
    if (step === 1) return !!s1.businessType && !!s1.businessSize && !!s1.city;
    if (step === 2) return !!s2.preferredLanguage;
    if (step === 3) return true;
    if (step === 4) return s4.paymentMethods.length > 0;
    if (step === 5) return true;
    if (step === 6) return true;
    if (step === 7) {
      return s7.teamMembers.every(
        (m) => !m.email || (m.email && m.password && m.password.length >= 6),
      );
    }
    if (step === 8) return true;
    return true;
  }, [step, s1, s2, s4, s7]);

  // ═══ Continue handler ═══
  const handleContinue = async () => {
    try {
      const bodyMap: Record<number, any> = {
        1: s1,
        2: s2,
        3: s3,
        4: s4,
        5: s5,
        6: {
          products: s6.products
            .filter((p) => p.name && Number(p.price) > 0)
            .map((p) => ({
              name: p.name,
              price: Number(p.price),
              stock: Number(p.stock) || 0,
            })),
          useSampleData: s6.useSampleData,
        },
        7: {
          teamMembers: s7.teamMembers.filter((m) => m.email && m.password),
        },
        8: s8,
      };

      const result = await mutation.mutateAsync(bodyMap[step] || {});

      if (step === 1) {
        updateTenant({ businessType: s1.businessType });
      }

      if (result.isCompleted) {
        setShowCelebration(true);
        return;
      }

      const nextStep = Math.min(Math.max(result.currentStep, 1), TOTAL_STEPS);
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      const flat = Array.isArray(msg) ? msg[0] : msg;
      if (typeof flat === 'string' && flat.toLowerCase().includes('already completed')) {
        toast.success('Setup already complete — dashboard pe le ja rahe hain');
        window.location.replace('/dashboard');
      }
    }
  };

  // ═══ Use sample data ═══
  const handleUseSamples = async () => {
    setS6({ ...s6, useSampleData: true });
    try {
      const result = await mutation.mutateAsync({ useSampleData: true, products: [] });
      toast.success(`✨ ${result.productsAddedCount || 0} sample products load ho gaye!`);
      if (result.isCompleted) {
        setShowCelebration(true);
      } else {
        const nextStep = Math.min(Math.max(result.currentStep, 1), TOTAL_STEPS);
        setStep(nextStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setS6({ ...s6, useSampleData: false });
    }
  };

  // ═══ Skip step ═══
  const handleSkip = async () => {
    try {
      const result = await skipMutation.mutateAsync(step);
      const nextStep = Math.min(Math.max(result.currentStep, 1), TOTAL_STEPS);
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  // ═══ EXIT — force complete on backend, THEN hard-redirect ═══
  // Bina backend ko complete kiye redirect karenge to OnboardingGate wapis
  // /onboarding pe bhej dega (infinite loop). window.location.replace()
  // full page reload karta hai, React Router state clear ho jati hai.
  const handleExit = async () => {
    const confirmed = confirm(
      'Setup abhi skip karein? Aap baad mein settings > Business Config se features change kar sakte hain.',
    );
    if (!confirmed) return;

    setIsExiting(true);
    try {
      await onboardingApi.complete();
    } catch (e) {
      // Silent — even if backend fails, allow escape
      console.warn('[onboarding] exit complete call failed', e);
    }
    window.location.replace('/dashboard');
  };

  // ═══ Step click (jump to any completed step) ═══
  const handleStepClick = (n: number) => {
    const completed = progress?.completedSteps ?? [];
    if (completed.includes(n) || n <= step) {
      setStep(n);
    }
  };

  // ═══ Celebration close ═══
  const handleCelebrationClose = () => {
    window.location.replace('/dashboard');
  };

  // ═══ Loading state ═══
  if (loadingOptions || loadingProgress || !options || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 h-16 w-16 rounded-full bg-gradient-to-tr from-emerald-400 to-violet-500 blur-xl opacity-40 animate-pulse" />
            <Sparkles className="relative h-14 w-14 text-emerald-600 animate-pulse" />
          </div>
          <p className="mt-4 text-sm font-black text-slate-700">
            Aap ka shop tayyar kar rahe hain...
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">Ek pal ruko</p>
        </div>
      </div>
    );
  }

  // ═══ If completed, don't render UI (redirect will fire) ═══
  if (progress.isCompleted || isExiting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50">
        <div className="text-center">
          <div className="h-14 w-14 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm font-black text-slate-600">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 py-6 px-4 relative">
        {/* Decorative background blobs */}
        <div className="fixed top-0 -left-40 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl pointer-events-none" />
        <div className="fixed bottom-0 -right-40 h-96 w-96 rounded-full bg-pink-200/20 blur-3xl pointer-events-none" />
        <div className="fixed top-1/3 right-1/4 h-64 w-64 rounded-full bg-violet-200/15 blur-3xl pointer-events-none" />

        <div className="w-full max-w-5xl mx-auto relative">
          {/* ═══ Top nav ═══ */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {step > 1 && !progress.isCompleted ? (
                <button
                  onClick={() => setStep(Math.max(step - 1, 1))}
                  className="h-11 w-11 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 shadow-sm transition group"
                  title="Wapis jayein"
                >
                  <ArrowLeft className="h-5 w-5 text-slate-700 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <div className="h-11 w-11" />
              )}
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Step {step} of {TOTAL_STEPS}
                </div>
                <div className="text-xl font-black text-slate-900">{cfg.title}</div>
              </div>
            </div>
            <button
              onClick={handleExit}
              disabled={isExiting}
              className="h-11 w-11 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 shadow-sm transition group disabled:opacity-50"
              title="Setup skip karein"
            >
              <X className="h-5 w-5 text-slate-600 group-hover:text-rose-600 transition-colors" />
            </button>
          </div>

          {/* ═══ Progress bar ═══ */}
          <ProgressBar
            currentStep={step}
            completedSteps={progress?.completedSteps ?? []}
            onStepClick={handleStepClick}
          />

          {/* ═══ Hero header ═══ */}
          <div className="mt-5">
            <StepHeader
              step={step}
              estimatedMinutesLeft={(progress as any)?.estimatedMinutesLeft}
            />
          </div>

          {/* ═══ Content card ═══ */}
          <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-8 mt-5 shadow-sm">
            {step === 1 && (
              <Step1BusinessType
                data={s1}
                onChange={(patch) => setS1({ ...s1, ...patch })}
                options={options}
                detectedCity={(progress as any)?.detectedCity}
              />
            )}
            {step === 2 && (
              <Step2OwnerProfile
                data={s2}
                onChange={(patch) => setS2({ ...s2, ...patch })}
                options={options}
              />
            )}
            {step === 3 && (
              <Step3ShopDetails
                data={s3}
                onChange={(patch) => setS3({ ...s3, ...patch })}
                options={options}
              />
            )}
            {step === 4 && (
              <Step4Preferences
                data={s4}
                onChange={(patch) => setS4({ ...s4, ...patch })}
                options={options}
                businessType={businessType}
              />
            )}
            {step === 5 && (
              <Step5Features
                data={s5}
                onChange={(patch) => setS5({ ...s5, ...patch })}
                options={options}
                businessType={businessType}
              />
            )}
            {step === 6 && (
              <Step6Products
                data={s6}
                onChange={(patch) => setS6({ ...s6, ...patch })}
                businessType={businessType}
                businessEmoji={businessEmoji}
                onUseSamples={handleUseSamples}
                isSubmitting={mutation.isPending}
              />
            )}
            {step === 7 && (
              <Step7Team
                data={s7}
                onChange={(patch) => setS7({ ...s7, ...patch })}
                options={options}
              />
            )}
            {step === 8 && (
              <Step8Finish
                data={s8}
                onChange={(patch) => setS8({ ...s8, ...patch })}
                progress={progress}
              />
            )}
          </div>

          {/* ═══ Action bar (sticky) ═══ */}
          <div className="flex gap-2 mt-5 sticky bottom-4 z-20">
            {cfg.canSkip && (
              <button
                onClick={handleSkip}
                disabled={skipMutation.isPending}
                className="h-14 px-6 rounded-2xl border-2 border-slate-200 bg-white/90 backdrop-blur flex items-center justify-center gap-1.5 font-black text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-lg transition disabled:opacity-60"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </button>
            )}
            <button
              onClick={handleContinue}
              disabled={!canProceed || mutation.isPending}
              className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-white transition-all shadow-xl ${
                !canProceed || mutation.isPending
                  ? 'bg-slate-400 cursor-not-allowed'
                  : `bg-gradient-to-r ${cfg.gradientFrom} ${cfg.gradientTo} hover:shadow-2xl hover:scale-[1.01]`
              }`}
            >
              {mutation.isPending ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving...
                </>
              ) : step === TOTAL_STEPS ? (
                <>
                  Finish Setup 🎉
                  <Check className="h-5 w-5" strokeWidth={3} />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-5 w-5" strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Celebration modal ═══ */}
      {showCelebration && (
        <CompletionCelebration
          onContinue={handleCelebrationClose}
          stats={{
            products: progress?.productsAddedCount || 0,
            team: progress?.teamMembersAdded || 0,
            categories: progress?.enabledCategories?.length || 0,
          }}
        />
      )}
    </>
  );
}
