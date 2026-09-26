import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Sparkles, Trash2, X, CheckCircle2, ExternalLink, Cake,
  GraduationCap, Tag, Package, DollarSign, Timer, Wheat, ChefHat, ShoppingBag,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { bakeryProductsApi } from '../api/products.api';
import { useBakeryWizard } from '../hooks/useBakeryWizard';
import { useBakeryWizardSubmit } from '../hooks/useBakeryWizardSubmit';
import { BakeryWizardStepper } from '../components/wizard/BakeryWizardStepper';
import { BakeryWizardSummary } from '../components/wizard/BakeryWizardSummary';
import { BakeryWizardStep1Basic } from '../components/wizard/BakeryWizardStep1Basic';
import { BakeryWizardStep2Cake } from '../components/wizard/BakeryWizardStep2Cake';
import { BakeryWizardStep3Production } from '../components/wizard/BakeryWizardStep3Production';
import { BakeryItemTypePicker } from '../components/wizard/BakeryItemTypePicker';
import { BakeryRecipeBuilder } from '../components/wizard/BakeryRecipeBuilder';
import { BakeryRawForm } from '../components/wizard/BakeryRawForm';

export default function BakeryProductWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const wizard = useBakeryWizard({ autoLoadDraft: !isEdit });
  const { mutation, progress } = useBakeryWizardSubmit(isEdit ? id : undefined);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
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
      onSuccess: (product: any) => {
        setTimeout(() => {
          if (!isEdit) wizard.reset();
          /* Banane ka saamaan Product nahi banta — uska ghar
             Ingredients ka safha hai. */
          navigate(product?.__raw ? '/bakery/ingredients' : `/bakery-products/${product.id}`);
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
            {isEdit
              ? 'Tafseel, rate, customization aur khane ki maloomat — sab yahin badal lein.'
              : 'Cake, pastry, bread, mithai — sab ek jagah. Teen qadam, aur cheez POS par tayyar.'}
          </p>
          <button
            type="button"
            onClick={() => setShowTeacher(true)}
            className="mt-4 h-11 px-4 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition"
          >
            <GraduationCap className="h-4 w-4" /> Ye safha kaise chalta hai
          </button>
        </div>
      </section>

      {/* Pehla sawal: ye cheez kya hai. Isi se aage ke saare step
          tay hote hain. Edit me type badalna mana hai. */}
      <BakeryItemTypePicker
        value={wizard.draft.itemType}
        onChange={wizard.setItemType}
        locked={isEdit}
      />

      <BakeryWizardStepper
        currentStep={wizard.draft.step}
        stepValidation={wizard.validation}
        itemType={wizard.draft.itemType}
        onStepClick={wizard.goToStep}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {/* ── Banane ka saamaan: sirf ek chhota form ── */}
          {wizard.draft.itemType === 'RAW' ? (
            <BakeryRawForm
              basic={wizard.draft.basic}
              raw={wizard.draft.raw}
              onChangeBasic={wizard.updateBasic}
              onChangeRaw={wizard.updateRaw}
              onSubmit={handleSubmit}
              submitting={submitting}
              validation={wizard.validation.step1}
            />
          ) : (
            <>
              {wizard.draft.step === 1 && (
                <BakeryWizardStep1Basic
                  basic={wizard.draft.basic}
                  onChange={wizard.updateBasic}
                  onNext={wizard.nextStep}
                  validation={wizard.validation.step1}
                />
              )}

              {/* Cake wale sawal sirf us cheez par jo hum khud banate
                  hain. Bahar se laye Lays ka koi flavour nahi hota. */}
              {wizard.draft.step === 2 && wizard.draft.itemType === 'MADE' && (
                <div className="space-y-5">
                  <BakeryWizardStep2Cake
                    cake={wizard.draft.cake}
                    isSeasonalItem={wizard.draft.basic.isSeasonalItem}
                    onChange={wizard.updateCake}
                    onToggleDecoration={wizard.toggleDecorativeItem}
                    onBack={wizard.prevStep}
                    onNext={wizard.nextStep}
                    validation={wizard.validation.step2}
                  />
                  <BakeryRecipeBuilder
                    recipe={wizard.draft.recipe}
                    onAdd={wizard.addRecipeLine}
                    onUpdate={wizard.updateRecipeLine}
                    onRemove={wizard.removeRecipeLine}
                    yieldQty={wizard.draft.recipeYield}
                    onYieldChange={wizard.setRecipeYield}
                    onApplyCost={(c) => wizard.updateBasic({ costPrice: c })}
                    currentCost={wizard.draft.basic.costPrice}
                    itemName={wizard.draft.basic.name}
                  />
                </div>
              )}

              {/* Bahar se laya maal: doosra (aur aakhri) step */}
              {wizard.draft.step === 2 && wizard.draft.itemType === 'BOUGHT' && (
                <BakeryWizardStep3Production
                  production={wizard.draft.production}
                  onChange={wizard.updateProduction}
                  onToggleAllergen={wizard.toggleAllergen}
                  onBack={wizard.prevStep}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                  validation={wizard.validation.step2}
                  allValid={wizard.validation.allValid}
                />
              )}

              {wizard.draft.step === 3 && wizard.draft.itemType === 'MADE' && (
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
            </>
          )}
        </div>

        {wizard.draft.itemType !== 'RAW' && (
          <BakeryWizardSummary
            draft={wizard.draft}
            stats={wizard.stats}
            allValid={wizard.validation.allValid}
          />
        )}
      </div>

      {showTeacher && <WizardTeacher onClose={() => setShowTeacher(false)} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER — "ye safha kaise chalta hai"
   ═════════════════════════════════════════════════════════════ */
function WizardTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-fuchsia-50 dark:from-pink-500/15 dark:to-fuchsia-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Cheez kaise banayein
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Sab se pehla sawal hai: <strong>ye cheez kya hai?</strong> Bakery me teen
            tarah ki cheezein hoti hain, aur teenon ka hisab alag chalta hai.
          </p>

          <Tip icon={ChefHat} title="1. Hum khud banate hain">
            Cake, pastry, patties, bread. In ka poora raasta chalta hai — flavour,
            shape, recipe, aur kitni der theek rehti hai.
          </Tip>

          <Tip icon={ShoppingBag} title="2. Bahar se la kar bechte hain">
            Lays, bottle, chips, juice. In se cake wale sawal nahi poochay jate —
            bas rate, cost, stock aur expiry. Do hi step lagte hain.
          </Tip>

          <Tip icon={Wheat} title="3. Banane ka saamaan">
            Maida, cheeni, makkhan. <strong>Ye bechne ki cheez nahi</strong>, is liye
            POS aur catalog me kabhi nazar nahi aata. Iska kaam do hai: cake ki recipe
            me lagna, aur khatam hone par bata dena.
          </Tip>

          <Tip icon={Tag} title="Category — sirf aap ki apni">
            Pehle yahan do category poochi jati thin: ek system ki lambi list, aur ek
            aap ki. Ab sirf <strong>aap wali</strong> hai. Neeche jo naam pare hain
            (Pizza, Rusk, Halwa…) wo sirf madad ke liye — click karo to ban jate hain,
            warna apna naam likh lo.
          </Tip>

          <Tip icon={DollarSign} title="Rate — jitne chahiye utne">
            Ek hi cheez pound se bhi bikti hai, slice se bhi, aur poori bhi. Jo jo
            chalta ho sirf wohi bharein — kam se kam ek zaroori hai.
          </Tip>

          <Tip icon={Wheat} title="Recipe — is me kya lagta hai">
            Cake me kitna maida, kitni cheeni. Bharna zaroori nahi, lekin bhar dein to
            ek bara faida hai: maida mehnga hote hi aap ko pata chal jayega ke ab ek
            cake par kitna kharcha aa raha hai. Ek button se wohi cost bhar bhi jati hai.
          </Tip>

          <Tip icon={Package} title="Cost aur stock">
            <strong>Cost</strong> bharenge tabhi munafa sahi nikalta hai. Stock sirf
            nayi cheez banate waqt set hota hai; edit karte waqt counter ka maujooda
            stock haath nahi lagta.
          </Tip>

          <Tip icon={Timer} title="Kitni der theek rehti hai">
            Ye bakery ka sab se ahem khana hai. Isi se "aaj kya banana hai" wale safhe
            par expiry ki warning aati hai — warna bana hua maal chup-chaap kharab
            ho jata hai.
          </Tip>

          <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800 p-3 space-y-1">
            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
              Upar wali patti par <strong>laal nishan</strong> us step par aata hai jahan
              kuch reh gaya ho — us par click karke seedha wahin ja sakte hain.
            </p>
            <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
              Adhoora chhod dein to bhi kuch nahi jata — draft khud save ho jata hai.
            </p>
          </div>

          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-pink-600 dark:text-pink-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
