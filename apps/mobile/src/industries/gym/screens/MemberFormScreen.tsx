/** New member (web MemberFormPage): registration with the khata customer opened by phone; joining a plan follows from the member's sheet. */

import { router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/i18n';
import { PhotoPick } from '@/modules/hr/staff/components/PhotoPick';
import { FormSection, FormTemplate, Input, Select, toast } from '@/design';
import { errorText } from '../../_shared/deskKit';
import { clean } from '../../_shared/serviceKit';
import { gymApi } from '../api';
import { refreshGym } from '../meta';

const GOALS = [['GENERAL_FITNESS', t('Fitness')], ['WEIGHT_LOSS', t('Weight loss')], ['MUSCLE_GAIN', t('Muscle gain')], ['BODY_BUILDING', t('Body building')], ['STRENGTH', t('Strength')], ['ENDURANCE', t('Endurance')]] as const;

export function MemberFormScreen() {
  const [photo, setPhoto] = useState('');
  const [v, setV] = useState({ name: '', phone: '', cnic: '', gender: '', goal: 'GENERAL_FITNESS', emergencyContactName: '', emergencyContactPhone: '', medicalConditions: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v) => (x: string) => setV((p) => ({ ...p, [k]: x }));
  const ok = v.name.trim().length > 1 && v.phone.trim().length >= 10;
  const save = async () => {
    setSaving(true);
    try {
      const m = await gymApi.members.create(clean({ photoUrl: photo, name: v.name.trim(), phone: v.phone.trim(), cnic: v.cnic.trim(), gender: v.gender, primaryGoal: v.goal, emergencyContactName: v.emergencyContactName.trim(), emergencyContactPhone: v.emergencyContactPhone.trim(), medicalConditions: v.medicalConditions.trim(), doctorClearance: false, workoutDays: [], secondaryGoals: [], allergies: [], dietaryPreferences: [] }));
      refreshGym(); toast.success(t('Member ban gaya'), { message: m.memberNumber }); router.back();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  return (
    <FormTemplate title={t('New member')} dirty={!!v.name || !!v.phone} saving={saving} onSave={() => (ok ? void save() : toast.warning(t('Naam aur phone likhein')))}>
      <FormSection title={t('Member')}>
        <PhotoPick value={photo} onChange={setPhoto} purpose="avatar" round size={88} />
        <Input label={t('Naam')} value={v.name} onChangeText={set('name')} />
        <Input label={t('Phone')} value={v.phone} onChangeText={set('phone')} keyboardType="phone-pad" ltr />
        <Input label={t('CNIC')} value={v.cnic} onChangeText={set('cnic')} keyboardType="number-pad" ltr />
        <Select label={t('Gender')} value={v.gender || null} onChange={set('gender')} options={[{ value: 'MALE', label: t('Mard') }, { value: 'FEMALE', label: t('Aurat') }, { value: 'OTHER', label: t('Doosra') }]} />
        <Select label={t('Maqsad')} value={v.goal} onChange={set('goal')} options={GOALS.map(([value, label]) => ({ value, label }))} />
      </FormSection>
      <FormSection title={t('Emergency aur sehat')}>
        <Input label={t('Emergency contact')} value={v.emergencyContactName} onChangeText={set('emergencyContactName')} />
        <Input label={t('Emergency phone')} value={v.emergencyContactPhone} onChangeText={set('emergencyContactPhone')} keyboardType="phone-pad" ltr />
        <Input label={t('Bimari / chot')} value={v.medicalConditions} onChangeText={set('medicalConditions')} multiline />
      </FormSection>
    </FormTemplate>
  );
}
