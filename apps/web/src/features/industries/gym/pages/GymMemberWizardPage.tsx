import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Trash2, X, CheckCircle2, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { gymMembersApi } from '../api/members.api';
import { useGymMemberWizard } from '../hooks/useGymMemberWizard';
import { useGymMemberWizardSubmit } from '../hooks/useGymMemberWizardSubmit';
import { GymWizardStepper } from '../components/wizard/GymWizardStepper';
import { GymWizardSummary } from '../components/wizard/GymWizardSummary';
import { GymWizardStep1Profile } from '../components/wizard/GymWizardStep1Profile';
import { GymWizardStep2Medical } from '../components/wizard/GymWizardStep2Medical';
import { GymWizardStep3Subscription } from '../components/wizard/GymWizardStep3Subscription';

export default function GymMemberWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const wizard = useGymMemberWizard({ autoLoadDraft: !isEdit });
  const { mutation, progress } = useGymMemberWizardSubmit(isEdit ? id : undefined);
  const [showDraft, setShowDraft] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['gym-member', id],
    queryFn: () => gymMembersApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && existing && !hydrated) { wizard.hydrateFromMember(existing); setHydrated(true); }
  }, [isEdit, existing, hydrated, wizard]);

  useEffect(() => { if (!isEdit && wizard.draftRestored) setShowDraft(true); }, [isEdit, wizard.draftRestored]);

  const submitting = mutation.isPending;

  const handleSubmit = () => {
    mutation.mutate(wizard.draft, {
      onSuccess: (member) => {
        setTimeout(() => {
          if (!isEdit) wizard.reset();
          navigate('/gym-members/' + member.id);
        }, 1500);
      },
    });
  };

  if (progress.stage === 'done' && progress.memberId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-3xl bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-red-200 shadow-xl p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-red-500 to-orange-600 mx-auto flex items-center justify-center shadow-lg mb-4 animate-bounce">
            <Dumbbell className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">💪 {isEdit ? 'Member Updated!' : 'Member Enrolled!'}</h2>
          <p className="text-slate-600 font-semibold mt-2">
            <strong className="text-red-700">{wizard.draft.basic.customerName}</strong> {isEdit ? 'profile updated' : 'welcome to the gym! 🎉'}
          </p>
          <div className="text-xs text-slate-500 font-bold mt-6">Redirecting to member page...</div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white shadow-2xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full border-4 border-red-200 border-t-red-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-extrabold">Saving...</h3>
          <p className="text-slate-600 font-semibold mt-1">{progress.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {showDraft && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <div className="text-xs text-amber-900"><strong>Draft restored</strong> — jahan chhoda tha wahin se shuru karein</div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => { if (confirm('Delete draft?')) { wizard.reset(); setShowDraft(false); } }} className="h-8 px-3 rounded-lg bg-white border-2 border-amber-300 hover:bg-amber-100 text-amber-800 text-xs font-extrabold inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Discard</button>
            <button onClick={() => setShowDraft(false)} className="h-8 w-8 rounded-lg bg-white border-2 border-amber-300 hover:bg-amber-100 text-amber-800 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/gym/members" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 font-bold"><ArrowLeft className="h-4 w-4" /> Back to Members</Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            💪 {isEdit ? 'Edit Member' : 'Enroll New Member'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? (wizard.draft.basic.customerName || 'Edit Member') : 'New Gym Member'}
          </h1>
          <p className="mt-2 text-sm text-white/80 max-w-2xl">
            {isEdit ? 'Update profile, medical info, and preferences.' : '3 quick steps: Profile → Medical → Plan. Auto-save draft.'}
          </p>
        </div>
      </section>

      <GymWizardStepper currentStep={wizard.draft.step} stepValidation={wizard.validation} onStepClick={wizard.goToStep} />

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="min-w-0">
          {wizard.draft.step === 1 && (
            <GymWizardStep1Profile basic={wizard.draft.basic} onChange={wizard.updateBasic} onToggleGoal={wizard.toggleGoal} onNext={wizard.nextStep} validation={wizard.validation.step1} />
          )}
          {wizard.draft.step === 2 && (
            <GymWizardStep2Medical medical={wizard.draft.medical} onChange={wizard.updateMedical} onToggleAllergy={wizard.toggleAllergy} onToggleDay={wizard.toggleDay} onToggleDietary={wizard.toggleDietary} onBack={wizard.prevStep} onNext={wizard.nextStep} validation={wizard.validation.step2} />
          )}
          {wizard.draft.step === 3 && (
            <GymWizardStep3Subscription subscription={wizard.draft.subscription} onChange={wizard.updateSubscription} onBack={wizard.prevStep} onSubmit={handleSubmit} submitting={submitting} validation={wizard.validation.step3} allValid={wizard.validation.allValid} isEdit={isEdit} />
          )}
        </div>
        <GymWizardSummary draft={wizard.draft} stats={wizard.stats} allValid={wizard.validation.allValid} />
      </div>
    </div>
  );
}
