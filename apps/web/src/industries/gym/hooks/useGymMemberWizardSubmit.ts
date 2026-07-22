import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { gymMembersApi } from '../api/members.api';
import { membershipsApi } from '../api/memberships.api';
import type { GymWizardDraft } from './useGymMemberWizard';

export interface SubmitProgress {
  stage: 'idle' | 'customer' | 'member' | 'subscription' | 'done';
  message: string;
  memberCreated?: boolean;
  memberId?: string;
}

export function useGymMemberWizardSubmit(existingMemberId?: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SubmitProgress>({ stage: 'idle', message: '' });
  const isEdit = Boolean(existingMemberId);

  const mutation = useMutation({
    mutationFn: async (draft: GymWizardDraft) => {
      setProgress({ stage: 'customer', message: isEdit ? 'Updating profile...' : 'Creating customer...' });

      let customerId = '';
      if (!isEdit) {
        const customer = await customersApi.create({
          name: draft.basic.customerName.trim(),
          phone: draft.basic.customerPhone.trim(),
          email: draft.basic.customerEmail || undefined,
          address: draft.basic.customerAddress || undefined,
        });
        customerId = customer.id;
      }

      setProgress({ stage: 'member', message: 'Saving member details...' });

      const memberPayload: any = {
        customerId: customerId || undefined,
        memberNumber: draft.basic.memberNumber || undefined,
        rfidCard: draft.basic.rfidCard || undefined,
        qrCode: draft.basic.qrCode || undefined,
        dateOfBirth: draft.basic.dateOfBirth || undefined,
        gender: draft.basic.gender || undefined,
        bloodGroup: draft.basic.bloodGroup || undefined,
        heightCm: draft.basic.heightCm ? Number(draft.basic.heightCm) : undefined,
        currentWeightKg: draft.basic.currentWeightKg ? Number(draft.basic.currentWeightKg) : undefined,
        targetWeightKg: draft.basic.targetWeightKg ? Number(draft.basic.targetWeightKg) : undefined,
        bodyFatPct: draft.basic.bodyFatPct ? Number(draft.basic.bodyFatPct) : undefined,
        muscleMassPct: draft.basic.muscleMassPct ? Number(draft.basic.muscleMassPct) : undefined,
        primaryGoal: draft.basic.primaryGoal,
        secondaryGoals: draft.basic.secondaryGoals,
        fitnessLevel: draft.basic.fitnessLevel || undefined,
        experienceYears: draft.basic.experienceYears ? Number(draft.basic.experienceYears) : undefined,
        status: draft.basic.status,
        emergencyContactName: draft.medical.emergencyContactName || undefined,
        emergencyContactPhone: draft.medical.emergencyContactPhone || undefined,
        emergencyContactRelation: draft.medical.emergencyContactRelation || undefined,
        medicalConditions: draft.medical.medicalConditions || undefined,
        injuries: draft.medical.injuries || undefined,
        allergies: draft.medical.allergies,
        medications: draft.medical.medications || undefined,
        doctorClearance: draft.medical.doctorClearance,
        doctorClearanceUrl: draft.medical.doctorClearanceUrl || undefined,
        preferredWorkoutTime: draft.medical.preferredWorkoutTime || undefined,
        preferredTrainerId: draft.medical.preferredTrainerId || undefined,
        workoutDays: draft.medical.workoutDays,
        dietaryPreferences: draft.medical.dietaryPreferences,
        bio: draft.medical.bio || undefined,
        notes: draft.medical.notes || undefined,
        photoUrl: draft.subscription.photoUrl || undefined,
        referralCode: draft.subscription.referralCode || undefined,
      };

      const member = isEdit
        ? await gymMembersApi.update(existingMemberId!, memberPayload)
        : await gymMembersApi.create(memberPayload);

      // Subscription (only for new members with plan selected)
      if (!isEdit && draft.subscription.planId) {
        setProgress({ stage: 'subscription', message: 'Setting up membership...' });
        try {
          await membershipsApi.subscribe({
            memberId: member.id,
            planId: draft.subscription.planId,
            startDate: draft.subscription.startDate,
            paidAmount: Number(draft.subscription.paidAmount) || 0,
            totalPrice: Number(draft.subscription.totalPrice) || undefined,
            autoRenew: draft.subscription.autoRenew,
          });
        } catch (err) {
          console.warn('Subscription failed', err);
        }
      }

      setProgress({ stage: 'done', message: 'All done!', memberCreated: true, memberId: member.id });
      return member;
    },
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ['gym-members'] });
      queryClient.invalidateQueries({ queryKey: ['gym-member', member.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(isEdit ? 'Member updated!' : 'Member enrolled!', { duration: 3000 });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Save failed');
      setProgress({ stage: 'idle', message: '' });
    },
  });

  return { mutation, progress, isEdit };
}
