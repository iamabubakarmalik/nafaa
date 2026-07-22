import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Sparkles, Trash2, X, CheckCircle2, ExternalLink, Cake,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { productsApi } from '@/api/products.api';
import { bakeryProductsApi } from '../api/products.api';
import { useBakeryWizard } from '../hooks/useBakeryWizard';
import { useBakeryWizardSubmit } from '../hooks/useBakeryWizardSubmit';
import { BakeryWizardStepper } from '../components/wizard/BakeryWizardStepper';
import { BakeryWizardSummary } from '../components/wizard/BakeryWizardSummary';
import { BakeryWizardStep1Basic } from '../components/wizard/BakeryWizardStep1Basic';
import { BakeryWizardStep2Cake } from '../components/wizard/BakeryWizardStep2Cake';
import { BakeryWizardStep3Production } from '../components/wizard/BakeryWizardStep3Production';

export default function BakeryProductWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const wizard = useBakeryWizard({ autoLoadDraft: !isEdit });
  const { mutation, progress } = useBakeryWizardSubmit(isEdit ? id : undefined);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load existing product for edit mode
  const { data: existingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['bakery-profile-by-product', id],
    queryFn: () => bakeryProductsApi.byProduct(id!).catch(() => null),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && existingProduct && !hydrated) {
      wizard.hydrateFromProduct?.(existingProduct, existingProfile);
      setHydrated(true);
    }
  }, [isEdit, existingProduct, existingProfile, hydrated, wizard]);

  useEffect(() => {
    if (!isEdit && wizard.draftRestored) setShowDraftBanner(true);
  }, [isEdit, wizard.draftRestored]);

  const submitting = mutation.isPending;

  const handleSubmit = () => {
    mutation.mutate(wizard.draft, {
      onSuccess: (product) => {
        setTimeout(() => {
          if (!isEdit) wizard.reset();
          navigate(`/bakery-products/${product.id}`);
        }, 1500);
      },
    });
  };

  // Success screen
  if (progress.stage === 'done' && progress.productId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-3xl bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-pink-950/40 dark:via-neutral-900 dark:to-fuchsia-950/40 border-2 border-pink-200 dark:border-pink-800 shadow-xl p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 mx-auto flex items-center justify-center shadow-lg mb-4 animate-bounce">
            <Cake className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            🎉 {isEdit ? 'Product Updated!' : 'Bakery Product Created!'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 font-semibold mt-2">
            <strong className="text-pink-700 dark:text-pink-300">{wizard.draft.basic.name}</strong>
            {isEdit ? ' has been saved successfully' : ' ab POS aur catalog dono mein available hai'}
          </p>
          <div className="text-xs text-slate-500 font-bold mt-6">Redirecting to product page...</div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white dark:bg-neutral-900 shadow-2xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full border-4 border-pink-200 border-t-pink-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Saving...</h3>
          <p className="text-slate-600 dark:text-slate-400 font-semibold mt-1">{progress.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {showDraftBanner && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-800 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <strong>Draft restored</strong> — jahan chhoda tha wahin se shuru karein
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (confirm('Draft delete karein aur naye sirse shuru karein?')) {
                  wizard.reset();
                  setShowDraftBanner(false);
                }
              }}
              className="h-8 px-3 rounded-lg bg-white dark:bg-neutral-800 border-2 border-amber-300 hover:bg-amber-100 text-amber-800 text-xs font-extrabold inline-flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Discard
            </button>
            <button
              onClick={() => setShowDraftBanner(false)}
              className="h-8 w-8 rounded-lg bg-white dark:bg-neutral-800 border-2 border-amber-300 hover:bg-amber-100 text-amber-800 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-pink-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        {isEdit && (
          <Link
            to={`/bakery-products/${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-pink-600 font-bold"
          >
            View detail page <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            🍰 {isEdit ? 'Edit Bakery Product' : 'Add Bakery Product'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? (wizard.draft.basic.name || 'Edit Product') : 'Add Bakery Product'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-2xl">
            {isEdit ? 'Update details, prices, customization options and dietary info.' : 'Cake, pastry, bread, mithai — sab kuch ek jaga. 3 quick steps, atomic save.'}
          </p>
        </div>
      </section>

      <BakeryWizardStepper
        currentStep={wizard.draft.step}
        stepValidation={wizard.validation}
        onStepClick={wizard.goToStep}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {wizard.draft.step === 1 && (
            <BakeryWizardStep1Basic
              basic={wizard.draft.basic}
              onChange={wizard.updateBasic}
              onNext={wizard.nextStep}
              validation={wizard.validation.step1}
            />
          )}
          {wizard.draft.step === 2 && (
            <BakeryWizardStep2Cake
              cake={wizard.draft.cake}
              isSeasonalItem={wizard.draft.basic.isSeasonalItem}
              onChange={wizard.updateCake}
              onToggleDecoration={wizard.toggleDecorativeItem}
              onBack={wizard.prevStep}
              onNext={wizard.nextStep}
              validation={wizard.validation.step2}
            />
          )}
          {wizard.draft.step === 3 && (
            <BakeryWizardStep3Production
              production={wizard.draft.production}
              onChange={wizard.updateProduction}
              onToggleAllergen={wizard.toggleAllergen}
              onBack={wizard.prevStep}
              onSubmit={handleSubmit}
              submitting={submitting}
              validation={wizard.validation.step3}
              allValid={wizard.validation.allValid}
            />
          )}
        </div>

        <BakeryWizardSummary
          draft={wizard.draft}
          stats={wizard.stats}
          allValid={wizard.validation.allValid}
        />
      </div>
    </div>
  );
}
