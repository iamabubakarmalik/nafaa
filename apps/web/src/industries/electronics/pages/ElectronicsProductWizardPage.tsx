import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Cpu,
  Plus, AlertTriangle, Trash2, Eye, Edit3, GraduationCap, X,
  Keyboard, WifiOff, Barcode, ShieldCheck, Package, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useElectronicsWizard, type WizardStep } from '../hooks/useElectronicsWizard';
import { ElectronicsWizardStepper } from '../components/wizard/ElectronicsWizardStepper';
import { ElectronicsWizardStep1Basic } from '../components/wizard/ElectronicsWizardStep1Basic';
import { ElectronicsWizardStep2Specs } from '../components/wizard/ElectronicsWizardStep2Specs';
import { ElectronicsWizardStep3Warranty } from '../components/wizard/ElectronicsWizardStep3Warranty';
import { ElectronicsWizardStep4Stock } from '../components/wizard/ElectronicsWizardStep4Stock';
import { ElectronicsWizardSummary } from '../components/wizard/ElectronicsWizardSummary';
import { saveElectronicsWizard, type ElectronicsWizardSaveResult } from '../api/electronics-wizard.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { electronicsProductsApi } from '../api/products.api';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';

export default function ElectronicsProductWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const currentShopId = useShopParam();
  const isEdit = Boolean(id);

  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateSpecs, updateWarranty,
    setHasVariants, setHasSerials,
    addVariant, updateVariant, removeVariant,
    addSerial, addSerialsBulk, updateSerial, removeSerial,
    updateStock,
    reset,
  } = useElectronicsWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<ElectronicsWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const { data: existingProduct } = useQuery({
    queryKey: ['product-for-wizard', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['electronics-profile-for-wizard', id],
    queryFn: () => electronicsProductsApi.byProduct(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !existingProduct || editLoaded) return;

    updateBasic({
      name: existingProduct.name,
      description: existingProduct.description ?? '',
      categoryId: existingProduct.categoryId ?? '',
      electronicsBrandId: existingProfile?.brandId ?? '',
      categoryType: existingProfile?.categoryType ?? 'OTHER',
      conditionType: existingProfile?.conditionType ?? 'BRAND_NEW',
      sku: existingProduct.sku ?? '',
      barcode: existingProduct.barcode ?? '',
      modelNumber: existingProfile?.modelNumber ?? '',
      partNumber: existingProfile?.partNumber ?? '',
      colorName: existingProfile?.colorName ?? '',
      colorHex: existingProfile?.colorHex ?? '',
      costPrice: existingProduct.costPrice ?? 0,
      retailPrice: existingProduct.price ?? 0,
      wholesalePrice: existingProduct.wholesalePrice ?? '',
      mrp: existingProfile?.mrp ?? '',
      taxRate: existingProduct.taxRate ?? 0,
      isActive: existingProduct.isActive,
      isFeatured: existingProduct.isFeatured,
      isBestSeller: existingProfile?.isBestSeller ?? false,
      isNewArrival: existingProfile?.isNewArrival ?? false,
      isTrending: existingProfile?.isTrending ?? false,
      imageUrls: (existingProduct.images ?? []).map((img: any) => img?.url).filter(Boolean),
      tagIds: (existingProduct.tags ?? []).map((t: any) => t?.tag?.id).filter(Boolean),
    });

    if (existingProfile) {
      updateSpecs({
        connectivity: existingProfile.connectivity ?? [],
        powerRating: existingProfile.powerRating ?? '',
        batteryCapacity: existingProfile.batteryCapacity ?? '',
        batteryLifeHours: existingProfile.batteryLifeHours ?? '',
        chargingTimeMinutes: existingProfile.chargingTimeMinutes ?? '',
        operatingRange: existingProfile.operatingRange ?? '',
        waterResistance: existingProfile.waterResistance ?? '',
        screenSize: existingProfile.screenSize ?? '',
        resolution: existingProfile.resolution ?? '',
        refreshRate: existingProfile.refreshRate ?? '',
        compatibleWith: existingProfile.compatibleWith ?? [],
        compatibleOS: existingProfile.compatibleOS ?? [],
        weightGrams: existingProfile.weightGrams ?? '',
        lengthMm: existingProfile.lengthMm ?? '',
        widthMm: existingProfile.widthMm ?? '',
        heightMm: existingProfile.heightMm ?? '',
      });

      updateWarranty({
        warrantyMonths: existingProfile.warrantyMonths ?? 12,
        warrantyType: existingProfile.warrantyType ?? 'Manufacturer',
        hasInternationalWarranty: existingProfile.hasInternationalWarranty ?? false,
        warrantyStartDate: '',
        warrantyEndDate: '',
        hasImei: existingProfile.hasImei ?? false,
        boxContents: existingProfile.boxContents ?? [],
        hasManual: existingProfile.hasManual ?? true,
        hasWarrantyCard: existingProfile.hasWarrantyCard ?? true,
      });
    }

    setEditLoaded(true);
  }, [isEdit, existingProduct, existingProfile, editLoaded, updateBasic, updateSpecs, updateWarranty]);

  const saveMutation = useMutation({
    mutationFn: () => saveElectronicsWizard(draft, currentShopId || undefined, isEdit ? id : undefined),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['electronics-products-list'] });
      queryClient.invalidateQueries({ queryKey: ['electronics-profiles-all'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${result.productName} ${isEdit ? 'updated' : 'created'}!`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 :
    draft.step === 3 ? validation.step3 : validation.step4;

  const canGoNext = currentValidation.valid && draft.step < 4;
  const canSave = validation.allValid;

  /* ─── Online / offline ─── */
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* ─── Shortcuts: Alt+← / Alt+→ step, Ctrl+S save, G guide, ? list ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canSave && !saveMutation.isPending) saveMutation.mutate();
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); if (canGoNext) nextStep(); return; }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); prevStep(); return; }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, canGoNext, showTeacher, showShortcuts]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  if (isEdit && !editLoaded && !existingProduct) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-blue-900">
            Product {isEdit ? 'Updated' : 'Created'}!
          </h1>
          <p className="text-blue-800 font-semibold mt-1">
            <strong>{savedResult.productName}</strong> ready hai
          </p>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <SuccessStat label="Profile" value={savedResult.profileCreated ? '✓' : '—'} />
            <SuccessStat label="Variants" value={savedResult.variantCount} />
            <SuccessStat label="Serials" value={savedResult.serialsCreated} />
            <SuccessStat label="Stock" value={savedResult.totalStock} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={() => { setSavedResult(null); reset(); window.scrollTo({ top: 0, behavior: 'smooth' }); if (isEdit) navigate('/electronics-products/new'); }}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition">
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another</div>
          </button>
          <button onClick={() => navigate(`/electronics-products/${savedResult.productId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Eye className="h-6 w-6 text-blue-600" />
            <div className="font-extrabold text-slate-900">View Product</div>
          </button>
          <button onClick={() => navigate('/electronics-products')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition">
            <Cpu className="h-6 w-6 text-blue-600" />
            <div className="font-extrabold text-slate-900">All Products</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {showTeacher && <WizardTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-blue-700" />
          <div className="text-xs text-blue-900 flex-1 min-w-0">
            <strong>Draft restored</strong> — pichli bar ki values load ho gayi hain
          </div>
          <button onClick={() => { if (confirm('Draft delete kar ke naya start karein?')) reset(); }}
            className="px-3 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-rose-200">
            <Trash2 className="h-3 w-3" /> Fresh Start
          </button>
        </div>
      )}

      {isEdit && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-3">
          <Edit3 className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <div className="font-extrabold mb-0.5">Edit Mode</div>
            <div className="font-semibold">Basic info + specs + warranty edit ho sakti hain. Serials aur variants add karenge to merge honge.</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate(isEdit ? `/electronics-products/${id}` : '/electronics/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold transition">
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Wapis product par' : 'Wapis dashboard'}
        </button>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!isOnline && (
            <span className="h-10 px-3 rounded-xl bg-amber-100 border-2 border-amber-300 text-amber-800 text-xs font-extrabold inline-flex items-center gap-1.5">
              <WifiOff className="h-3.5 w-3.5" /> Offline — save nahi hoga
            </span>
          )}
          <button onClick={() => setShowTeacher(true)}
            className="h-10 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            title="Guide (G)">
            <GraduationCap className="h-4 w-4" /> Guide
          </button>
          <button onClick={() => setShowShortcuts(true)}
            className="h-10 w-10 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-400 inline-flex items-center justify-center transition"
            title="Shortcuts (?)">
            <Keyboard className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Cpu className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Electronics Product' : 'Electronics Product Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Product' : 'Add New Electronics Product'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Full details, specs, warranty, IMEI/serial tracking — sab ek page mein.
          </p>
        </div>
      </section>

      <ElectronicsWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid) goToStep(s as WizardStep);
          else if (s === 4 && validation.step1.valid && validation.step2.valid && validation.step3.valid) goToStep(s as WizardStep);
        }}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <ElectronicsWizardStep1Basic basic={draft.basic} onChange={updateBasic} errors={validation.step1.errors} />
          )}
          {draft.step === 2 && (
            <ElectronicsWizardStep2Specs specs={draft.specs} onChange={updateSpecs}
              categoryType={draft.basic.categoryType} errors={validation.step2.errors} />
          )}
          {draft.step === 3 && (
            <ElectronicsWizardStep3Warranty warranty={draft.warranty} onChange={updateWarranty}
              categoryType={draft.basic.categoryType} conditionType={draft.basic.conditionType}
              errors={validation.step3.errors} />
          )}
          {draft.step === 4 && (
            <ElectronicsWizardStep4Stock
              basic={draft.basic}
              hasVariants={draft.hasVariants}
              onToggleVariants={setHasVariants}
              hasSerials={draft.hasSerials}
              onToggleSerials={setHasSerials}
              variants={draft.variants}
              serials={draft.serials}
              stock={draft.stock}
              onAddVariant={addVariant}
              onUpdateVariant={updateVariant}
              onRemoveVariant={removeVariant}
              onAddSerial={addSerial}
              onAddSerialsBulk={addSerialsBulk}
              onUpdateSerial={updateSerial}
              onRemoveSerial={removeSerial}
              onUpdateStock={updateStock}
              errors={validation.step4.errors}
            />
          )}
        </div>

        <ElectronicsWizardSummary draft={draft} stats={stats} allValid={canSave} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <button onClick={prevStep} disabled={draft.step === 1}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="text-xs font-extrabold text-slate-500 hidden sm:block">
            Step {draft.step} of 4
            {!currentValidation.valid && (
              <span className="ml-2 inline-flex items-center gap-1 text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                {currentValidation.errors[0]}
              </span>
            )}
          </div>

          {draft.step < 4 ? (
            <button onClick={nextStep} disabled={!canGoNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}
              disabled={!canSave} className="bg-gradient-to-r from-blue-600 to-cyan-700">
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : `Save Product (${stats.totalStock} pcs)`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-blue-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">{label}</div>
      <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   GUIDE + SHORTCUTS
   ═════════════════════════════════════════════════════════════ */

function WizardTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      n: 1, icon: Cpu, title: 'Basic — cheez kya hai',
      body: 'Naam, category (headphone / charger / screen…), condition (naya, open box, used), brand aur qeemat. Cost aur sale price dono daalein — profit khud dikh jayega.',
      tips: ['Category search se dhoondein — 38 options hain, Urdu naam bhi chalta hai (cover, glass, taar)', 'SKU khud bana sakte hain — "Auto" button dabayein', 'Markup buttons se sale price ek click me'],
    },
    {
      n: 2, icon: Layers, title: 'Specs — khoobiyan',
      body: 'Connectivity (Bluetooth, USB-C…), battery, screen size, wazan. Ye customer ko batane aur catalog me dikhane ke kaam aati hain.',
      tips: ['Sab kuch bharna zaroori nahi — jo maloom ho wohi daalein', 'Connectivity chips par click karke chunein'],
    },
    {
      n: 3, icon: ShieldCheck, title: 'Warranty — zimmedari',
      body: 'Kitne mahine ki warranty, kis kism ki (company / dealer / shop), aur dabbe me kya kya aata hai. Warranty claim ke waqt yehi record kaam aata hai.',
      tips: ['0 mahine ka matlab koi warranty nahi', 'Box contents chips se chunein — charger, cable, manual…'],
    },
    {
      n: 4, icon: Barcode, title: 'Stock — kitna maal',
      body: 'Simple ginti, ya har unit ka apna serial/IMEI. Mehngi cheezein (laptop, camera, SSD) serial ke saath rakhein — phir har unit ki warranty aur customer alag pehchana jayega.',
      tips: ['Serial on karein to stock ki ginti serials se khud banti hai', 'Variants se ek hi cheez ke rang/size alag alag rakh sakte hain', 'Bulk me serial paste kar sakte hain — ek line par ek'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Product Kaise Add Karein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st) => (
            <div key={st.n} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shrink-0 shadow-md">
                  <st.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900">
                    <span className="text-blue-700">Step {st.n}</span> — {st.title}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                  <ul className="mt-2 space-y-1">
                    {st.tips.map((t, i) => (
                      <li key={i} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                        <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3.5 flex items-start gap-2">
            <Package className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-blue-900 leading-relaxed">
              <strong>Draft khud bachta hai.</strong> Beech me band ho jaye to agli dafa wahin se
              shuru hoga. Save karte hi product POS par bikne ke liye tayyar — usi shop me jo aap ne
              upar select ki hai.
            </p>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['Alt + →', 'Agla step'],
    ['Alt + ←', 'Pichla step'],
    ['Ctrl + S', 'Save karo'],
    ['G', 'Guide kholo'],
    ['?', 'Ye list'],
    ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

