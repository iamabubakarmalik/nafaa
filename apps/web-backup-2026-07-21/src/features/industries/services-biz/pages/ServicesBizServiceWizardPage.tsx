import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Sparkles, Trash2, X, CheckCircle2, ExternalLink, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { catalogApi } from '../api/catalog.api';
import { useServicesBizWizard } from '../hooks/useServicesBizWizard';
import { useServicesBizWizardSubmit } from '../hooks/useServicesBizWizardSubmit';
import { ServicesBizWizardStepper } from '../components/wizard/ServicesBizWizardStepper';
import { ServicesBizWizardSummary } from '../components/wizard/ServicesBizWizardSummary';
import { ServicesBizWizardStep1Basic } from '../components/wizard/ServicesBizWizardStep1Basic';
import { ServicesBizWizardStep2Pricing } from '../components/wizard/ServicesBizWizardStep2Pricing';
import { ServicesBizWizardStep3Warranty } from '../components/wizard/ServicesBizWizardStep3Warranty';

export default function ServicesBizServiceWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const wizard = useServicesBizWizard({ autoLoadDraft: !isEdit });
  const { mutation, progress } = useServicesBizWizardSubmit(isEdit ? id : undefined);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['catalog-service', id],
    queryFn: () => catalogApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && existing && !hydrated) {
      wizard.hydrateFromService(existing);
      setHydrated(true);
    }
  }, [isEdit, existing, hydrated, wizard]);

  useEffect(() => {
    if (!isEdit && wizard.draftRestored) setShowDraftBanner(true);
  }, [isEdit, wizard.draftRestored]);

  const submitting = mutation.isPending;

  const handleSubmit = () => {
    mutation.mutate(wizard.draft, {
      onSuccess: (service) => {
        setTimeout(() => {
          if (!isEdit) wizard.reset();
          navigate(`/services-biz-services/${service.id}`);
        }, 1500);
      },
    });
  };

  if (progress.stage === 'done' && progress.serviceId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 border-2 border-cyan-200 shadow-xl p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mx-auto flex items-center justify-center shadow-lg mb-4 animate-bounce">
            <Wrench className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            🎉 {isEdit ? 'Service Updated!' : 'Service Created!'}
          </h2>
          <p className="text-slate-600 font-semibold mt-2">
            <strong className="text-cyan-700">{wizard.draft.basic.name}</strong>
            {isEdit ? ' saved successfully' : ' ab POS aur catalog dono mein available hai'}
          </p>
          <div className="text-xs text-slate-500 font-bold mt-6">Redirecting to service detail...</div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white shadow-2xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-extrabold text-slate-900">Saving...</h3>
          <p className="text-slate-600 font-semibold mt-1">{progress.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {showDraftBanner && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <div className="text-xs text-amber-900">
              <strong>Draft restored</strong> — jahan chhoda tha wahin se shuru karein
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (confirm('Discard draft?')) {
                  wizard.reset();
                  setShowDraftBanner(false);
                }
              }}
              className="h-8 px-3 rounded-lg bg-white border-2 border-amber-300 hover:bg-amber-100 text-amber-800 text-xs font-extrabold inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Discard
            </button>
            <button
              onClick={() => setShowDraftBanner(false)}
              className="h-8 w-8 rounded-lg bg-white border-2 border-amber-300 hover:bg-amber-100 text-amber-800 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-600 font-bold transition">
          <ArrowLeft className="h-4 w-4" /> Back to Services
        </Link>
        {isEdit && (
          <Link to={`/services-biz-services/${id}`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600 font-bold">
            View detail page <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            🛠️ {isEdit ? 'Edit Service' : 'Add Service'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? (wizard.draft.basic.name || 'Edit Service') : 'Add Service'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-2xl">
            {isEdit ? 'Update pricing, warranty, skills.' : 'Repair, installation, maintenance — sab kuch ek jaga. 3 quick steps.'}
          </p>
        </div>
      </section>

      <ServicesBizWizardStepper
        currentStep={wizard.draft.step}
        stepValidation={wizard.validation}
        onStepClick={wizard.goToStep}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {wizard.draft.step === 1 && (
            <ServicesBizWizardStep1Basic
              basic={wizard.draft.basic}
              onChange={wizard.updateBasic}
              onNext={wizard.nextStep}
              validation={wizard.validation.step1}
            />
          )}
          {wizard.draft.step === 2 && (
            <ServicesBizWizardStep2Pricing
              pricing={wizard.draft.pricing}
              onChange={wizard.updatePricing}
              onBack={wizard.prevStep}
              onNext={wizard.nextStep}
              validation={wizard.validation.step2}
            />
          )}
          {wizard.draft.step === 3 && (
            <ServicesBizWizardStep3Warranty
              warranty={wizard.draft.warranty}
              onChange={wizard.updateWarranty}
              onToggleTool={wizard.toggleTool}
              onTogglePart={wizard.togglePart}
              onBack={wizard.prevStep}
              onSubmit={handleSubmit}
              submitting={submitting}
              validation={wizard.validation.step3}
              allValid={wizard.validation.allValid}
            />
          )}
        </div>

        <ServicesBizWizardSummary
          draft={wizard.draft}
          stats={wizard.stats}
          allValid={wizard.validation.allValid}
        />
      </div>
    </div>
  );
}
