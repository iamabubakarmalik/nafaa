/** New or edit farmer (web FarmerFormPage): who, village, land and crops, season credit. A customer on the link starts the form from that khata. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { cnicOk, formatCnic, phoneOk } from '@nafaa/core/industries/agri';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { ChipGroup, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Select, TextArea, toast } from '@/design';
import { customersApi } from '@/modules/customers/api/customers';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { farmersApi, type Farmer } from '../api';
import { AGRI_KEYS, CROPS, FARMING, OWNERSHIP, PROVINCES, SEASONS, SOILS, WATER, opt, refreshAgri } from '../meta';

interface Draft {
  fullName: string; fatherName: string; phone: string; altPhone: string; cnic: string; village: string; tehsil: string; district: string; province: string; address: string;
  landAreaAcres: number | null; landOwnership: string; soilType: string; waterSource: string; currentCrop: string; currentSeason: string; primaryCrops: string[]; farmingType: string[];
  creditLimit: number | null; creditDays: number | null; notes: string;
}
const blank: Draft = {
  fullName: '', fatherName: '', phone: '', altPhone: '', cnic: '', village: '', tehsil: '', district: '', province: '', address: '', landAreaAcres: null, landOwnership: '', soilType: '', waterSource: '',
  currentCrop: '', currentSeason: '', primaryCrops: [], farmingType: [], creditLimit: null, creditDays: null, notes: '',
};
const fromFarmer = (f: Farmer): Draft => ({
  fullName: f.fullName, fatherName: f.fatherName ?? '', phone: f.phone, altPhone: f.altPhone ?? '', cnic: f.cnic ?? '', village: f.village ?? '', tehsil: f.tehsil ?? '', district: f.district ?? '',
  province: f.province ?? '', address: f.address ?? '', landAreaAcres: f.landAreaAcres ?? null, landOwnership: f.landOwnership ?? '', soilType: f.soilType ?? '', waterSource: f.waterSource ?? '',
  currentCrop: f.currentCrop ?? '', currentSeason: f.currentSeason ?? '', primaryCrops: f.primaryCrops ?? [], farmingType: f.farmingType ?? [], creditLimit: f.creditLimit || null, creditDays: f.creditDays || null, notes: f.notes ?? '',
});
const list = (arr: string[]) => [{ value: '', label: '—' }, ...arr.map((v) => ({ value: v, label: t(v) }))];

export function FarmerFormScreen() {
  const { id, customer } = useLocalSearchParams<{ id?: string; customer?: string }>();
  const editing = !!id;
  const { guard } = useDeskOnline('agriDesk');
  const [d, setD] = useState<Draft>(blank);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDirty(true); setD((x) => ({ ...x, [k]: v })); };
  const q = useQuery({ queryKey: [AGRI_KEYS.farmer, id, 'one'], queryFn: () => farmersApi.getOne(id!), enabled: editing });
  const cq = useQuery({ queryKey: ['customer', customer], queryFn: () => customersApi.getOne(customer!), enabled: !!customer && !editing });
  useEffect(() => { if (q.data) { setD(fromFarmer(q.data)); setDirty(false); } }, [q.data]);
  useEffect(() => {
    const c = cq.data as undefined | { name?: string; phone?: string | null; cnic?: string | null; address?: string | null; creditLimit?: number };
    if (c) setD((x) => ({ ...x, fullName: x.fullName || c.name || '', phone: x.phone || c.phone || '', cnic: x.cnic || c.cnic || '', address: x.address || c.address || '', creditLimit: x.creditLimit ?? (c.creditLimit || null) }));
  }, [cq.data]);

  const errors: Record<string, string> = {};
  if (!d.fullName.trim()) errors.fullName = t('Farmer ka naam likhein');
  if (!d.phone.trim()) errors.phone = t('Phone number likhein'); else if (!phoneOk(d.phone)) errors.phone = t('Phone poora likhein (03XX-XXXXXXX)');
  if (!cnicOk(d.cnic)) errors.cnic = t('CNIC 13 hindsay ka hota hai');
  if (d.creditDays && d.creditDays > 400) errors.creditDays = t('400 din se zyada nahi');
  const err = (k: string) => (touched ? errors[k] : undefined);

  const save = async () => {
    setTouched(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    const body: Partial<Farmer> & { customerId?: string } = {
      fullName: d.fullName.trim(), fatherName: d.fatherName, phone: d.phone.trim(), altPhone: d.altPhone, cnic: d.cnic, village: d.village, tehsil: d.tehsil, district: d.district, province: d.province, address: d.address,
      landAreaAcres: d.landAreaAcres ?? undefined, landOwnership: d.landOwnership, soilType: d.soilType, waterSource: d.waterSource, farmingType: d.farmingType, primaryCrops: d.primaryCrops,
      currentCrop: d.currentCrop, currentSeason: opt(d.currentSeason), creditLimit: d.creditLimit ?? 0, creditDays: d.creditDays ?? undefined, notes: d.notes,
    };
    setSaving(true);
    try {
      const f = editing ? await farmersApi.update(id!, body) : await farmersApi.create({ ...body, ...(customer ? { customerId: customer } : {}) });
      refreshAgri([AGRI_KEYS.farmers, AGRI_KEYS.farmer, AGRI_KEYS.byCustomer]);
      setDirty(false);
      toast.success(editing ? t('Save ho gaya') : t('{{fullName}} jur gaya ({{farmerNumber}}) — khata bhi ban gaya', { fullName: f.fullName, farmerNumber: f.farmerNumber }));
      router.back();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };

  if (editing && !q.data && !q.isLoading) return <FormTemplate title={t('Farmer')} onSave={() => router.back()}><EmptyState title={t('Ye farmer nahi mila')} /></FormTemplate>;
  return (
    <FormTemplate title={editing ? t('{{fullName}} — badlein', { fullName: q.data?.fullName ?? '' }) : t('Naya farmer')} dirty={dirty} saving={saving} saveLabel={editing ? t('Save karein') : t('Farmer banayein')} onSave={() => guard(() => void save())}>
      <OfflineNote feature="agriDesk" />
      <FormSection title={t('Farmer')}>
        <Input label={t('Poora naam')} value={d.fullName} onChangeText={(v) => set('fullName', v)} placeholder={t('Ghulam Rasool')} maxLength={100} error={err('fullName')} />
        <Input label={t('Walid ka naam')} value={d.fatherName} onChangeText={(v) => set('fatherName', v)} hint={t('Marzi hai — gaon me pehchaan ke liye')} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={d.phone} onChangeText={(v) => set('phone', v)} placeholder="03001234567" error={err('phone')} />
        <Input label={t('Doosra phone')} keyboardType="phone-pad" ltr value={d.altPhone} onChangeText={(v) => set('altPhone', v)} hint={t('Marzi hai')} />
        <Input label={t('CNIC')} keyboardType="number-pad" ltr value={d.cnic} onChangeText={(v) => set('cnic', formatCnic(v))} placeholder="35202-1234567-1" error={err('cnic')} />
      </FormSection>
      <FormSection title={t('Gaon')}>
        <Input label={t('Gaon / chak')} value={d.village} onChangeText={(v) => set('village', v)} placeholder={t('Chak 45/2L')} />
        <Input label={t('Tehsil')} value={d.tehsil} onChangeText={(v) => set('tehsil', v)} />
        <Input label={t('Zila')} value={d.district} onChangeText={(v) => set('district', v)} />
        <Select label={t('Soobah')} value={d.province} onChange={(v) => set('province', v)} options={[{ value: '', label: '—' }, ...PROVINCES.map((p) => ({ value: p, label: p }))]} />
        <Input label={t('Pata')} value={d.address} onChangeText={(v) => set('address', v)} hint={t('Marzi hai')} />
      </FormSection>
      <FormSection title={t('Zameen aur fasal')}>
        <NumberInput label={t('Zameen (acre)')} value={d.landAreaAcres} onChangeValue={(v) => set('landAreaAcres', v)} />
        <Select label={t('Zameen kis ki')} value={d.landOwnership} onChange={(v) => set('landOwnership', v)} options={list(OWNERSHIP)} />
        <Select label={t('Paani')} value={d.waterSource} onChange={(v) => set('waterSource', v)} options={list(WATER)} />
        <Select label={t('Mitti')} value={d.soilType} onChange={(v) => set('soilType', v)} options={list(SOILS)} />
        <Input label={t('Abhi kya laga hai')} value={d.currentCrop} onChangeText={(v) => set('currentCrop', v)} />
        <Select label={t('Season')} value={d.currentSeason} onChange={(v) => set('currentSeason', v)} options={[{ value: '', label: '—' }, ...SEASONS.filter((s) => s.value !== 'ALL_SEASON').map((s) => ({ value: s.value, label: t(s.label) }))]} />
        <ChipGroup wrap multiple value={d.primaryCrops} onChange={(v) => set('primaryCrops', v)} options={CROPS.map((c) => ({ value: c, label: t(c) }))} />
        <ChipGroup wrap multiple value={d.farmingType} onChange={(v) => set('farmingType', v)} options={FARMING.map((c) => ({ value: c, label: t(c) }))} />
      </FormSection>
      <FormSection title={t('Season ka udhaar')} description={t('Rabi ka udhaar 31 May tak, Kharif ka 15 Dec tak — katai ke baad')}>
        <MoneyInput label={t('Udhaar ki had (Rs)')} value={d.creditLimit} onChangeValue={(v) => set('creditLimit', v)} hint={(d.creditLimit ?? 0) > 0 ? t('{{limit}} se upar udhaar par POS manager PIN maangega', { limit: formatMoney(d.creditLimit) }) : t('0 = koi had nahi')} />
        <ChipGroup value="" onChange={(v) => set('creditLimit', Number(v))} options={[25000, 50000, 100000, 200000].map((v) => ({ value: String(v), label: formatMoney(v) }))} />
        <NumberInput label={t('Udhaar ke din')} integer value={d.creditDays} onChangeValue={(v) => set('creditDays', v)} error={err('creditDays')} />
      </FormSection>
      <FormSection title={t('Note')}>
        <TextArea value={d.notes} onChangeText={(v) => set('notes', v)} placeholder={t('Jo baat yaad rakhni ho — zamin, guarantor, waada…')} maxLength={2000} />
      </FormSection>
    </FormTemplate>
  );
}
