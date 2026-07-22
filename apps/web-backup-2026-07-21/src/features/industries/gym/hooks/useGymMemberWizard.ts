import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Goal, MemberStatus } from '../api/members.api';

const DRAFT_KEY = 'nafaa.gym-member-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface GymWizardBasic {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  memberNumber: string;
  rfidCard: string;
  qrCode: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  heightCm: number | '';
  currentWeightKg: number | '';
  targetWeightKg: number | '';
  bodyFatPct: number | '';
  muscleMassPct: number | '';
  primaryGoal: Goal;
  secondaryGoals: Goal[];
  fitnessLevel: string;
  experienceYears: number | '';
  status: MemberStatus;
}

export interface GymWizardMedical {
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  medicalConditions: string;
  injuries: string;
  allergies: string[];
  medications: string;
  doctorClearance: boolean;
  doctorClearanceUrl: string;
  preferredWorkoutTime: string;
  preferredTrainerId: string;
  workoutDays: number[];
  dietaryPreferences: string[];
  bio: string;
  notes: string;
}

export interface GymWizardSubscription {
  photoUrl: string;
  planId: string;
  startDate: string;
  paidAmount: number | '';
  totalPrice: number | '';
  autoRenew: boolean;
  referralCode: string;
}

export interface GymWizardDraft {
  step: WizardStep;
  basic: GymWizardBasic;
  medical: GymWizardMedical;
  subscription: GymWizardSubscription;
  savedAt: number;
}

const emptyBasic = (): GymWizardBasic => ({
  customerName: '', customerPhone: '', customerEmail: '', customerAddress: '',
  memberNumber: '', rfidCard: '', qrCode: '',
  dateOfBirth: '', gender: 'MALE', bloodGroup: '',
  heightCm: '', currentWeightKg: '', targetWeightKg: '',
  bodyFatPct: '', muscleMassPct: '',
  primaryGoal: 'GENERAL_FITNESS', secondaryGoals: [],
  fitnessLevel: 'BEGINNER', experienceYears: '',
  status: 'ACTIVE',
});

const emptyMedical = (): GymWizardMedical => ({
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: 'FAMILY',
  medicalConditions: '', injuries: '', allergies: [], medications: '',
  doctorClearance: false, doctorClearanceUrl: '',
  preferredWorkoutTime: 'EVENING', preferredTrainerId: '',
  workoutDays: [1, 2, 3, 4, 5], dietaryPreferences: [],
  bio: '', notes: '',
});

const emptySubscription = (): GymWizardSubscription => ({
  photoUrl: '', planId: '', startDate: new Date().toISOString().split('T')[0],
  paidAmount: '', totalPrice: '', autoRenew: false, referralCode: '',
});

const emptyDraft = (): GymWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  medical: emptyMedical(),
  subscription: emptySubscription(),
  savedAt: Date.now(),
});

interface Opts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useGymMemberWizard(opts: Opts = {}) {
  const [draft, setDraft] = useState<GymWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.basic) { setDraft(parsed); setDraftRestored(true); opts.onDraftLoaded?.(); }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() })); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const goToStep = useCallback((step: WizardStep) => setDraft((d) => ({ ...d, step })), []);
  const nextStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep })), []);
  const prevStep = useCallback(() => setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep })), []);

  const updateBasic = useCallback((patch: Partial<GymWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);
  const updateMedical = useCallback((patch: Partial<GymWizardMedical>) => {
    setDraft((d) => ({ ...d, medical: { ...d.medical, ...patch } }));
  }, []);
  const updateSubscription = useCallback((patch: Partial<GymWizardSubscription>) => {
    setDraft((d) => ({ ...d, subscription: { ...d.subscription, ...patch } }));
  }, []);

  const toggleGoal = useCallback((g: Goal) => {
    setDraft((d) => {
      const has = d.basic.secondaryGoals.includes(g);
      return {
        ...d,
        basic: {
          ...d.basic,
          secondaryGoals: has ? d.basic.secondaryGoals.filter((x) => x !== g) : [...d.basic.secondaryGoals, g],
        },
      };
    });
  }, []);

  const toggleAllergy = useCallback((a: string) => {
    setDraft((d) => {
      const has = d.medical.allergies.includes(a);
      return {
        ...d,
        medical: { ...d.medical, allergies: has ? d.medical.allergies.filter((x) => x !== a) : [...d.medical.allergies, a] },
      };
    });
  }, []);

  const toggleDay = useCallback((day: number) => {
    setDraft((d) => {
      const has = d.medical.workoutDays.includes(day);
      return {
        ...d,
        medical: { ...d.medical, workoutDays: has ? d.medical.workoutDays.filter((x) => x !== day) : [...d.medical.workoutDays, day] },
      };
    });
  }, []);

  const toggleDietary = useCallback((pref: string) => {
    setDraft((d) => {
      const has = d.medical.dietaryPreferences.includes(pref);
      return {
        ...d,
        medical: { ...d.medical, dietaryPreferences: has ? d.medical.dietaryPreferences.filter((x) => x !== pref) : [...d.medical.dietaryPreferences, pref] },
      };
    });
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const hydrateFromMember = useCallback((member: any) => {
    if (!member) return;
    setDraft((d) => ({
      ...d,
      basic: {
        ...d.basic,
        customerName: member.customer?.name ?? '',
        customerPhone: member.customer?.phone ?? '',
        customerEmail: member.customer?.email ?? '',
        customerAddress: member.customer?.address ?? '',
        memberNumber: member.memberNumber ?? '',
        rfidCard: member.rfidCard ?? '',
        qrCode: member.qrCode ?? '',
        dateOfBirth: member.dateOfBirth ? member.dateOfBirth.slice(0, 10) : '',
        gender: member.gender ?? 'MALE',
        bloodGroup: member.bloodGroup ?? '',
        heightCm: member.heightCm ?? '',
        currentWeightKg: member.currentWeightKg ?? '',
        targetWeightKg: member.targetWeightKg ?? '',
        bodyFatPct: member.bodyFatPct ?? '',
        muscleMassPct: member.muscleMassPct ?? '',
        primaryGoal: member.primaryGoal ?? 'GENERAL_FITNESS',
        secondaryGoals: member.secondaryGoals ?? [],
        fitnessLevel: member.fitnessLevel ?? 'BEGINNER',
        experienceYears: member.experienceYears ?? '',
        status: member.status ?? 'ACTIVE',
      },
      medical: {
        ...d.medical,
        emergencyContactName: member.emergencyContactName ?? '',
        emergencyContactPhone: member.emergencyContactPhone ?? '',
        emergencyContactRelation: member.emergencyContactRelation ?? 'FAMILY',
        medicalConditions: member.medicalConditions ?? '',
        injuries: member.injuries ?? '',
        allergies: member.allergies ?? [],
        medications: member.medications ?? '',
        doctorClearance: member.doctorClearance ?? false,
        doctorClearanceUrl: member.doctorClearanceUrl ?? '',
        preferredWorkoutTime: member.preferredWorkoutTime ?? 'EVENING',
        preferredTrainerId: member.preferredTrainerId ?? '',
        workoutDays: member.workoutDays ?? [1, 2, 3, 4, 5],
        dietaryPreferences: member.dietaryPreferences ?? [],
        bio: member.bio ?? '',
        notes: member.notes ?? '',
      },
      subscription: {
        ...d.subscription,
        photoUrl: member.photoUrl ?? '',
      },
    }));
  }, []);

  const validation = useMemo(() => {
    const s1: string[] = [];
    if (!draft.basic.customerName.trim()) s1.push('Customer name required');
    if (!draft.basic.customerPhone.trim()) s1.push('Phone required');

    const s2: string[] = [];
    if (!draft.medical.emergencyContactName.trim()) s2.push('Emergency contact name required');
    if (!draft.medical.emergencyContactPhone.trim()) s2.push('Emergency contact phone required');

    const s3: string[] = [];

    return {
      step1: { valid: s1.length === 0, errors: s1 },
      step2: { valid: s2.length === 0, errors: s2 },
      step3: { valid: s3.length === 0, errors: s3 },
      allValid: s1.length === 0 && s2.length === 0 && s3.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const h = Number(draft.basic.heightCm || 0) / 100;
    const w = Number(draft.basic.currentWeightKg || 0);
    const bmi = h > 0 && w > 0 ? w / (h * h) : 0;
    const bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    const goalsCount = 1 + draft.basic.secondaryGoals.length;
    return {
      bmi,
      bmiCategory,
      goalsCount,
      workoutDays: draft.medical.workoutDays.length,
      hasPhoto: !!draft.subscription.photoUrl,
      hasPlan: !!draft.subscription.planId,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic, updateMedical, updateSubscription,
    toggleGoal, toggleAllergy, toggleDay, toggleDietary,
    reset, hydrateFromMember,
  };
}
