import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Sparkles, Trash2, X, CheckCircle2, ExternalLink, Stethoscope,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { clinicServicesApi } from '../api/services.api';
import { useClinicWizard } from '../hooks/useClinicWizard';
import { useClinicWizardSubmit } from '../hooks/useClinicWizardSubmit';
import { ClinicWizardStepper } from '../components/wizard/ClinicWizardStepper';
import { ClinicWizardSummary } from '../components/wizard/ClinicWizardSummary';
import { ClinicWizardStep1Basic } from '../components/wizard/ClinicWizardStep1Basic';
import { ClinicWizardStep2Requirements } from '../components/wizard/ClinicWizardStep2Requirements';
import { ClinicWizardStep3Safety } from '../components/wizard/ClinicWizardStep3Safety';

export default function ClinicServiceWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const wizard = useClinicWizard({ autoLoadDraft: !isEdit });
  const { mutation, progress } = useClinicWizardSubmit(isEdit ? id : undefined);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: existingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: existingService } = useQuery({
    queryKey: ['clinic-service-by-product', id],
    queryFn: () => clinicServicesApi.byProduct(id!).catch(() => null),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && existingProduct && !hydrated) {
      wizard.hydrateFromProduct?.(existingProduct, existingService);
      setHydrated(true);
    }
  }, [isEdit, existingProduct, existingService, hydrated, wizard]);

  useEffect(() => {
    if (!isEdit && wizard.draftRestored) setShowDraftBanner(true);
  }, [isEdit, wizard.draftRestored]);

  const submitting = mutation.isPending;

  const handleSubmit = () => {
    mutation.mutate(wizard.draft, {
      onSuccess: (product) => {
        setTimeout(() => {
          if (!isEdit) wizard.reset();
          navigate('/clinic-services/' + product.id);
        }, 1500);
      },
    });
  };

  if (progress.stage === 'done' && progress.productId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 border-2 border-cyan-200 shadow-xl p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mx-auto flex items-center justify-center shadow-lg mb-4 animate-bounce">
            <Stethoscope className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">
            {isEdit ? '🎉 Service Updated!' : '🎉 Service Created!'}
          </h2>
          <p className="text-slate-600 font-semibold mt-2">
            <strong className="text-cyan-700">{wizard.draft.basic.name}</strong> saved successfully
          </p>
          <div className="text-xs text-slate-500 font-bold mt-6">Redirecting...</div>
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
            <div className="text-xs text-amber-900"><strong>Draft restored</strong></div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => { if (confirm('Discard draft?')) { wizard.reset(); setShowDraftBanner(false); } }}
              className="h-8 px-3 rounded-lg bg-white border-2 border-amber-300 text-amber-800 text-xs font-extrabold inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Discard
            </button>
            <button onClick={() => setShowDraftBanner(false)} className="h-8 w-8 rounded-lg bg-white border-2 border-amber-300 text-amber-800 flex items-center justify-center">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-600 font-bold transition">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        {isEdit && (
          <Link to={'/clinic-services/' + id} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-600 font-bold">
            View detail <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            🩺 {isEdit ? 'Edit Clinical Service' : 'Add Clinical Service'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? (wizard.draft.basic.name || 'Edit Service') : 'Add Clinical Service'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-2xl">
            Consultation, procedure, lab test, package — 3 quick steps, atomic save.
          </p>
        </div>
      </section>

      <ClinicWizardStepper
        currentStep={wizard.draft.step}
        stepValidation={wizard.validation}
        onStepClick={wizard.goToStep}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {wizard.draft.step === 1 && (
            <ClinicWizardStep1Basic
              basic={wizard.draft.basic}
              onChange={wizard.updateBasic}
              onNext={wizard.nextStep}
              validation={wizard.validation.step1}
            />
          )}
          {wizard.draft.step === 2 && (
            <ClinicWizardStep2Requirements
              requirements={wizard.draft.requirements}
              serviceCategory={wizard.draft.basic.serviceCategory}
              onChange={wizard.updateRequirements}
              onTogglePackageItem={wizard.togglePackageItem}
              onBack={wizard.prevStep}
              onNext={wizard.nextStep}
              validation={wizard.validation.step2}
            />
          )}
          {wizard.draft.step === 3 && (
            <ClinicWizardStep3Safety
              safety={wizard.draft.safety}
              onChange={wizard.updateSafety}
              onBack={wizard.prevStep}
              onSubmit={handleSubmit}
              submitting={submitting}
              validation={wizard.validation.step3}
              allValid={wizard.validation.allValid}
            />
          )}
        </div>
        <ClinicWizardSummary draft={wizard.draft} stats={wizard.stats} allValid={wizard.validation.allValid} />
      </div>
    </div>
  );
}
