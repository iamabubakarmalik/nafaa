import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Bed,
  Plus, AlertTriangle, Trash2, Eye, Edit3, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { useHotelWizard, type WizardStep } from '../hooks/useHotelWizard';
import { HotelWizardStepper } from '../components/wizard/HotelWizardStepper';
import { HotelWizardStep1Basic } from '../components/wizard/HotelWizardStep1Basic';
import { HotelWizardStep2Amenities } from '../components/wizard/HotelWizardStep2Amenities';
import { HotelWizardStep3Rooms } from '../components/wizard/HotelWizardStep3Rooms';
import { HotelWizardSummary } from '../components/wizard/HotelWizardSummary';
import { saveHotelWizard, type HotelWizardSaveResult } from '../api/hotel-wizard.api';
import { roomTypesApi } from '../api/room-types.api';

export default function HotelRoomTypeWizardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    updateAmenities, toggleCustomAmenity, addCustomAmenity,
    setAddRooms, updateRoomsConfig,
    addRoomEntry, updateRoomEntry, removeRoomEntry,
    generateFromRange, clearRooms,
    reset,
  } = useHotelWizard({ autoLoadDraft: !isEdit });

  const [savedResult, setSavedResult] = useState<HotelWizardSaveResult | null>(null);
  const [editLoaded, setEditLoaded] = useState(false);

  const { data: existingRoomType } = useQuery({
    queryKey: ['room-type-for-wizard', id],
    queryFn: () => roomTypesApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit || !existingRoomType || editLoaded) return;

    updateBasic({
      code: existingRoomType.code,
      name: existingRoomType.name,
      type: existingRoomType.type,
      description: existingRoomType.description ?? '',
      maxAdults: existingRoomType.maxAdults,
      maxChildren: existingRoomType.maxChildren,
      maxOccupancy: existingRoomType.maxOccupancy,
      bedType: existingRoomType.bedType,
      bedCount: existingRoomType.bedCount,
      extraBedAllowed: existingRoomType.extraBedAllowed,
      extraBedPrice: existingRoomType.extraBedPrice,
      basePrice: existingRoomType.basePrice,
      weekendPrice: existingRoomType.weekendPrice ?? '',
      peakPrice: existingRoomType.peakPrice ?? '',
      offSeasonPrice: existingRoomType.offSeasonPrice ?? '',
      hourlyPrice: existingRoomType.hourlyPrice ?? '',
      imageUrls: existingRoomType.imageUrls ?? [],
      isActive: existingRoomType.isActive,
    });

    updateAmenities({
      hasAC: existingRoomType.hasAC,
      hasHeater: existingRoomType.hasHeater,
      hasTV: existingRoomType.hasTV,
      hasWifi: existingRoomType.hasWifi,
      hasBalcony: existingRoomType.hasBalcony,
      hasKitchen: existingRoomType.hasKitchen,
      hasBathtub: existingRoomType.hasBathtub,
      hasSafe: existingRoomType.hasSafe,
      hasMinibar: existingRoomType.hasMinibar,
      isPetFriendly: existingRoomType.isPetFriendly,
      isSmoking: existingRoomType.isSmoking,
      sizeSqft: existingRoomType.sizeSqft ?? '',
      sizeSqm: existingRoomType.sizeSqm ?? '',
      customAmenities: existingRoomType.amenities ?? [],
    });

    setEditLoaded(true);
  }, [isEdit, existingRoomType, editLoaded, updateBasic, updateAmenities]);

  const saveMutation = useMutation({
    mutationFn: () => saveHotelWizard(draft),
    onSuccess: (result) => {
      setSavedResult(result);
      queryClient.invalidateQueries({ queryKey: ['hotel-room-types'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['hotel-rooms-summary'] });
      toast.success(`${result.roomTypeName} ${isEdit ? 'updated' : 'created'} — ${result.roomsCreated} rooms`);
      if (!isEdit) reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to save room type'),
  });

  const currentValidation =
    draft.step === 1 ? validation.step1 :
    draft.step === 2 ? validation.step2 : validation.step3;

  const canGoNext = currentValidation.valid && draft.step < 3;
  const canSave = validation.step1.valid && validation.step2.valid && validation.step3.valid;

  if (isEdit && !editLoaded && !existingRoomType) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (savedResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 p-8 text-center shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-xl mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-indigo-900">
            Room Type {isEdit ? 'Updated' : 'Created'}!
          </h1>
          <p className="text-indigo-800 font-semibold mt-1">
            <strong>{savedResult.roomTypeName}</strong> ({savedResult.roomTypeCode}) ready hai
          </p>

          <div className="grid grid-cols-3 gap-3 mt-6">
            <SuccessStat label="Rooms Created" value={savedResult.roomsCreated} />
            <SuccessStat label="Total Capacity" value={savedResult.totalCapacity} />
            <SuccessStat label="Amenities" value={savedResult.amenityCount} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setSavedResult(null);
              reset();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (isEdit) navigate('/hotel-room-types/new');
            }}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white p-5 flex flex-col items-center gap-2 shadow-md transition"
          >
            <Plus className="h-6 w-6" />
            <div className="font-extrabold">Add Another</div>
            <div className="text-xs opacity-90 font-semibold">New room type</div>
          </button>
          <button
            onClick={() => navigate(`/hotel-room-types/${savedResult.roomTypeId}`)}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Eye className="h-6 w-6 text-indigo-600" />
            <div className="font-extrabold text-slate-900">View Room Type</div>
            <div className="text-xs text-slate-500 font-semibold">Full details</div>
          </button>
          <button
            onClick={() => navigate('/hotel/rooms')}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md p-5 flex flex-col items-center gap-2 transition"
          >
            <Home className="h-6 w-6 text-indigo-600" />
            <div className="font-extrabold text-slate-900">All Rooms</div>
            <div className="text-xs text-slate-500 font-semibold">Room inventory</div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {draftRestored && !isEdit && (
        <div className="rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-3 flex items-center gap-3 flex-wrap">
          <Sparkles className="h-4 w-4 text-indigo-700" />
          <div className="text-xs text-indigo-900 flex-1 min-w-0">
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

      {isEdit && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-3">
          <Edit3 className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <div className="font-extrabold mb-0.5">Edit Mode</div>
            <div className="font-semibold">
              Room type details edit ho sakte hain. Naye rooms Step 3 se add karain,
              existing rooms alag manage karain.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate(isEdit ? `/hotel-room-types/${id}` : '/hotel/room-types')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> {isEdit ? 'Back to Room Type' : 'Back to Room Types'}
        </button>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-400/15 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Bed className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Editing Room Type' : 'Hotel Room Type Wizard'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? draft.basic.name || 'Edit Room Type' : 'Add New Room Type'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-xl">
            Room type, amenities, aur individual rooms — sab ek page mein.
          </p>
        </div>
      </section>

      <HotelWizardStepper
        currentStep={draft.step}
        stepValidation={validation}
        onStepClick={(s) => {
          if (s === 1) goToStep(1);
          else if (s === 2 && validation.step1.valid) goToStep(s as WizardStep);
          else if (s === 3 && validation.step1.valid && validation.step2.valid) goToStep(s as WizardStep);
        }}
      />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {draft.step === 1 && (
            <HotelWizardStep1Basic basic={draft.basic} onChange={updateBasic} errors={validation.step1.errors} />
          )}
          {draft.step === 2 && (
            <HotelWizardStep2Amenities
              amenities={draft.amenities}
              onChange={updateAmenities}
              onAddCustom={addCustomAmenity}
              onToggleCustom={toggleCustomAmenity}
              errors={validation.step2.errors}
            />
          )}
          {draft.step === 3 && (
            <HotelWizardStep3Rooms
              basic={draft.basic}
              rooms={draft.rooms}
              onToggleAddRooms={setAddRooms}
              onUpdateConfig={updateRoomsConfig}
              onAddRoom={addRoomEntry}
              onUpdateRoom={updateRoomEntry}
              onRemoveRoom={removeRoomEntry}
              onGenerateFromRange={generateFromRange}
              onClearRooms={clearRooms}
              errors={validation.step3.errors}
            />
          )}
        </div>

        <HotelWizardSummary draft={draft} stats={stats} allValid={canSave} />
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white text-sm font-extrabold shadow-md disabled:opacity-50 transition"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Button
              onClick={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
              disabled={!canSave}
              className="bg-gradient-to-r from-indigo-600 to-purple-700"
            >
              <Save className="h-4 w-4" />
              {isEdit ? 'Save Changes' : `Save (${stats.roomCount} rooms)`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-indigo-200 p-3">
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700">{label}</div>
      <div className="text-2xl font-extrabold text-indigo-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
