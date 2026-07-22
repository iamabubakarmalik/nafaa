import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Scissors,
  Plus, AlertTriangle, Trash2, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useSalonWizard, type WizardStep } from '../hooks/useSalonWizard';
import { SalonWizardStepper } from '../components/wizard/SalonWizardStepper';
import { SalonWizardStep1Basic } from '../components/wizard/SalonWizardStep1Basic';
import { SalonWizardStep2Targeting } from '../components/wizard/SalonWizardStep2Targeting';
import { SalonWizardStep3Settings } from '../components/wizard/SalonWizardStep3Settings';
import { SalonWizardSummary } from '../components/wizard/SalonWizardSummary';
import { saveSalonWizard, type SalonWizardSaveResult } from '../api/salon-wizard.api';

export default function SalonServiceWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    reset,
  } = useSalonWizard({ autoLoadDraft: true });

  const [savedResult, setSavedResult] = useState<SalonWizardSaveResult | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => saveSalonWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['salon-services'] });
      toast.success(`${result.serviceName} created successfully`);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save service'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1
    : draft.step === 2 ? validation.step2
    : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

  // SUCCESS SCREEN
  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-pink-900">Service Created!</h1>
          <p className="text-pink-800 font-semibold mt-1">
            <strong>{savedResult.serviceName}</strong> ready hai
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <SuccessStat label="Price" value={`Rs ${savedResult.price}`} />
            <SuccessStat label="Duration" value={`${savedResult.durationMinutes}m`} />
            <SuccessStat label="Category" value={savedResult.category.replace(/_/g, ' ')} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-2xl bg-pink-600 hover:bg-pink-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another Service</div>
            <div className="text-xs opacity-90 font-semibold">Wizard reset ho jayega</div>
          </button>
          <button
            onClick={() => navigate(`/salon-services/${savedResult.serviceId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Eye className="h-6 w-6 text-pink-600" />
            <div className="font-extrabold text-slate-900">View Service</div>
            <div className="text-xs text-slate-500 font-semibold">Full detail page</div>
          </button>
          <button
            onClick={() => navigate('/salon/services')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-pink-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Scissors className="h-6 w-6 text-pink-600" />
            <div className="font-extrabold text-slate-900">All Services</div>
            <div className="text-xs text-slate-500 font-semibold">Services list page</div>
          </button>
        </div>
      </div>
    );
  }

  // WIZARD
  return (
    <div className="space-y-5 pb-24">
      {draftRestored && (
        <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-pink-700" />
          <div className="text-xs text-pink-900 flex-1 min-w-0">
            <strong>Draft restored</strong> — pichli bar ki values load ho gayi hain
          </div>
          <button
            onClick={() => { if (confirm('Draft delete kar ke naya start karein?')) reset(); }}
            className="px-3 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-rose-200"
          >
            <Trash2 className="h-3 w-3" /> Fresh Start
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/salon/services')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Services
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-rose-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Scissors className="h-3.5 w-3.5 text-amber-300" />
            Salon Service Wizard
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            Add New Salon Service
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Service, pricing, audience, commission — sab ek page mein.
          </p>
        </div>
      </section>

      <SalonWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid)
            goToStep(s as WizardStep);
        }}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <SalonWizardStep1Basic
              basic={draft.basic}
              onChange={updateBasic}
              errors={validation.step1.errors}
            />
          )}
          {draft.step === 2 && (
            <SalonWizardStep2Targeting
              basic={draft.basic}
              onChange={updateBasic}
              errors={validation.step2.errors}
            />
          )}
          {draft.step === 3 && (
            <SalonWizardStep3Settings
              basic={draft.basic}
              onChange={updateBasic}
              errors={validation.step3.errors}
            />
          )}
        </div>

        <SalonWizardSummary draft={draft} stats={stats} allValid={canSave} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={prevStep}
            disabled={draft.step === 1}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="text-xs font-extrabold text-slate-500 hidden sm:block">
            Step {draft.step} of 3
            {!currentValidation.valid && (
              <span className="ml-2 inline-flex items-center gap-1 text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                {currentValidation.errors[0]}
              </span>
            )}
          </div>

          {draft.step < 3 ? (
            <button
              onClick={nextStep}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
              className="bg-gradient-to-r from-pink-600 to-rose-700"
            >
              <Save className="h-4 w-4" />
              Save Service
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-pink-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-pink-700">{label}</div>
      <div className="text-xl font-extrabold text-pink-900 tabular-nums mt-0.5 truncate">{value}</div>
    </div>
  );
}
