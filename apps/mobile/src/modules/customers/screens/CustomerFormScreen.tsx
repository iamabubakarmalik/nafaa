/**
 * New customer or edit: only the name is required. Phone, email, gender, city
 * and area, credit limit, price tier, VIP, ID details, birthday and a note.
 * Warns when the phone or name already belongs to someone. Saves through the
 * offline engine, so it works without internet.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { guessGender } from '@nafaa/core/customers';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { OfflineRuleError, useCustomer, useCustomerSearch } from '@/core/offline';
import { Chip, ChipGroup, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Switch, TextArea, Text, toast, useTheme } from '@/design';
import { useCounter } from '@/modules/pos/engine/counter';
import { customersApi, type Gender } from '../api/customers';
import { createCustomer, updateCustomer } from '../lib/actions';
import { digitsOf, formatCnic, formatPhone, normalizePhone, validPhone } from '../lib/phone';
import { keyOfDateLocal } from '../lib/dates';

const PK_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot', 'Hyderabad',
  'Bahawalpur', 'Sargodha', 'Sukkur', 'Sahiwal', 'Sheikhupura', 'Jhang', 'Gujrat', 'Mardan', 'Abbottabad', 'Mirpur', 'Okara',
];
const NOTE_CHIPS = [msg('Regular customer'), msg('Udhaar time par deta hai'), msg('Udhaar der se deta hai'), msg('Bulk buyer'), msg('Ghar par delivery'), msg('Sirf cash')];
const isTemp = (id: string) => id.startsWith('tmp_');

interface Form {
  name: string; phone: string; email: string; cnic: string; ntn: string; address: string; city: string; area: string; gender: '' | Gender;
  dateOfBirth: string; notes: string; creditLimit: number | null; isVip: boolean; isActive: boolean; priceTier: '' | 'RETAIL' | 'WHOLESALE' | 'CREDIT';
}
const EMPTY: Form = {
  name: '', phone: '', email: '', cnic: '', ntn: '', address: '', city: '', area: '', gender: '', dateOfBirth: '', notes: '', creditLimit: null,
  isVip: false, isActive: true, priceTier: '',
};

export function CustomerFormScreen({ mode }: { mode?: 'new' }) {
  const th = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = mode === 'new' ? undefined : params.id;
  const editing = !!id;
  const online = useOnlineStatus();
  const counter = useCounter();
  const [f, setF] = useState<Form>(EMPTY);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY));
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [phoneAck, setPhoneAck] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const mirror = useCustomer(id);
  const detail = useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.getOne(id!), enabled: editing && !isTemp(id!) && online });
  useEffect(() => {
    const c = detail.data;
    const m = mirror.data;
    if (!c && !m) return;
    const next: Form = {
      name: c?.name ?? m?.name ?? '', phone: c?.phone ?? m?.phone ?? '', email: c?.email ?? m?.email ?? '', cnic: c?.cnic ?? m?.cnic ?? '', ntn: c?.ntn ?? '',
      address: c?.address ?? m?.address ?? '', city: c?.city ?? m?.city ?? '', area: c?.area ?? m?.area ?? '', gender: c?.gender ?? '',
      dateOfBirth: c?.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '', notes: c?.notes ?? '', creditLimit: (c?.creditLimit ?? m?.creditLimit) || null,
      isVip: c?.isVip ?? m?.isVip ?? false, isActive: c?.isActive ?? m?.isActive ?? true, priceTier: (c?.priceTier ?? m?.priceTier ?? '') as Form['priceTier'],
    };
    setF(next);
    setBaseline(JSON.stringify(next));
  }, [detail.data, mirror.data]);
  const dirty = JSON.stringify(f) !== baseline;

  // Same phone or name already on file (from the phone's own copy, so it works offline too).
  const phoneKey = useMemo(() => normalizePhone(f.phone), [f.phone]);
  const phoneReady = /^03\d{9}$/.test(phoneKey);
  const phoneHits = useCustomerSearch({ query: phoneKey, limit: 5 }, { enabled: phoneReady });
  const phoneClash = phoneReady ? phoneHits.data?.find((c) => c.id !== id && normalizePhone(c.phone ?? '') === phoneKey) ?? null : null;
  const nameHits = useCustomerSearch({ query: f.name.trim(), limit: 6 }, { enabled: f.name.trim().length >= 3 });
  const nameClash = (nameHits.data ?? []).find((c) => c.id !== id && c.name.trim().toLowerCase() === f.name.trim().toLowerCase());
  useEffect(() => setPhoneAck(false), [phoneKey]);

  const old = JSON.parse(baseline) as Form;
  const typed = (k: 'phone' | 'email' | 'cnic') => !!f[k].trim() && f[k] !== old[k];
  const errors: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) errors.name = t('Naam likhein');
  if (typed('phone') && !validPhone(f.phone)) errors.phone = t('Mobile number 03 se shuru, 11 hindsay (0300-1234567)');
  if (typed('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = t('Email theek nahi — misaal: ali@gmail.com');
  if (typed('cnic') && digitsOf(f.cnic).length !== 13) errors.cnic = t('CNIC 13 hindsay ka hota hai');
  const err = (k: keyof Form) => (tried ? errors[k] : undefined);
  const genderGuess = f.gender ? null : guessGender(f.name);
  const citySuggestions = f.city.trim().length > 0 ? PK_CITIES.filter((c) => c.toLowerCase().startsWith(f.city.trim().toLowerCase()) && c !== f.city).slice(0, 5) : [];

  const submit = async () => {
    setTried(true);
    if (Object.keys(errors).length) return toast.warning(Object.values(errors)[0]!);
    if (phoneClash && !phoneAck) return toast.warning(t('Yeh number pehle se {{name}} ka hai — upar tasdeeq karein', { name: phoneClash.name }));
    setSaving(true);
    const opt = (v: string) => (v.trim() ? v.trim() : editing ? '' : undefined);
    const body = {
      name: f.name.trim(), phone: opt(f.phone), email: opt(f.email), cnic: opt(f.cnic), ntn: opt(f.ntn), address: opt(f.address), city: opt(f.city), area: opt(f.area),
      gender: (f.gender || (editing ? '' : undefined)) as Gender | undefined, dateOfBirth: opt(f.dateOfBirth), notes: opt(f.notes),
      creditLimit: f.creditLimit ? Math.max(f.creditLimit, 0) : editing ? 0 : undefined, isVip: f.isVip, isActive: f.isActive,
      priceTier: (f.priceTier || (editing ? null : undefined)) as Form['priceTier'] | null | undefined,
    };
    try {
      let target = id;
      if (editing) await updateCustomer(id!, body as never);
      else target = await createCustomer(body as never);
      setBaseline(JSON.stringify(f));
      toast.success(editing ? t('Save ho gaya') : t('{{name}} jur gaya', { name: f.name.trim() }));
      // Leave the form without the "unsaved changes" prompt, then show the profile.
      setTimeout(() => (editing ? router.back() : router.replace(`/customers/${target}` as never)), 0);
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : apiErrorMessage(e, t('Save nahi hua — dobara koshish karein')));
    } finally { setSaving(false); }
  };

  const notFound = editing && !mirror.isLoading && !mirror.data && !detail.data && !detail.isLoading;
  const dob = f.dateOfBirth ? new Date(`${f.dateOfBirth}T12:00:00`) : null;
  return (
    <FormTemplate title={editing ? t('{{name}} — badlein', { name: old.name || f.name }) : t('Naya customer')} dirty={dirty} saving={saving} onSave={() => void submit()}
      saveLabel={editing ? t('Save karein') : t('Customer jorein')} saveDisabled={notFound}>
      {notFound ? <Text tone="secondary">{t('Yeh customer nahi mila')}</Text> : (
        <>
          <FormSection title={t('Customer')}>
            <Input label={t('Poora naam')} value={f.name} onChangeText={(v) => set('name', v)} placeholder={t('Ali Raza')} autoFocus={!editing} autoCapitalize="words" error={err('name')} hint={t('Bill, khata aur WhatsApp par yahi naam aata hai')} />
            {nameClash && !editing && <Text size="xs" tone="warning">{t('Isi naam ka customer pehle se hai:')} {nameClash.name}{t('. Wahi banda hai to naya na banayein.')}</Text>}
            <Input label={t('Phone')} value={f.phone} onChangeText={(v) => set('phone', formatPhone(v))} keyboardType="phone-pad" placeholder="0300-1234567" error={err('phone')} hint={t('WhatsApp wala number — bill aur udhaar ki yaad-dihani isi par')} />
            {phoneClash && (
              <View style={{ gap: th.space(2) }}>
                <Text size="xs" tone="warning">{t('Yeh number pehle se {{name}} ka hai', { name: phoneClash.name })}</Text>
                <Switch value={phoneAck} onChange={setPhoneAck} label={t('Haan, yeh alag banda hai (ghar ka number saanjha hai)')} />
              </View>
            )}
            <Input label={t('Email')} labelHint={t('(optional)')} value={f.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="ali@gmail.com" error={err('email')} />
            <View style={{ gap: th.space(2) }}>
              <Text size="sm" weight="semibold" tone="secondary">{t('Jins')}</Text>
              <ChipGroup value={f.gender} onChange={(v) => set('gender', (v === f.gender ? '' : v) as Form['gender'])}
                options={[{ value: 'MALE', label: t('Mard') }, { value: 'FEMALE', label: t('Aurat') }, { value: 'OTHER', label: t('Doosra') }]} />
              {genderGuess && <Chip label={t('Naam se {{value}} lagta hai — chunein?', { value: genderGuess === 'FEMALE' ? t('aurat') : t('mard') })} onPress={() => set('gender', genderGuess)} />}
            </View>
          </FormSection>

          <FormSection title={t('Pata')}>
            <Input label={t('Shehar')} value={f.city} onChangeText={(v) => set('city', v)} placeholder={t('Lahore')} autoCapitalize="words" />
            {citySuggestions.length > 0 && <Row gap={2} wrap>{citySuggestions.map((c) => <Chip key={c} label={c} onPress={() => set('city', c)} />)}</Row>}
            <Input label={t('Ilaqa / mohalla')} value={f.area} onChangeText={(v) => set('area', v)} placeholder={t('Gulberg')} autoCapitalize="words" />
            <TextArea label={t('Poora pata')} value={f.address} onChangeText={(v) => set('address', v)} numberOfLines={2} placeholder={t('Ghar #, gali, nishani')} />
          </FormSection>

          <FormSection title={t('Udhaar')}>
            <MoneyInput label={t('Udhaar ki limit (Rs)')} value={f.creditLimit} onChangeValue={(v) => set('creditLimit', v)} decimals={false}
              hint={f.creditLimit ? t('Is se zyada udhaar POS par nahi jayega ({{limit}})', { limit: `Rs ${f.creditLimit.toLocaleString('en-US')}` }) : t('0 = koi had nahi — naye customer par limit lagana behtar hai')} />
          </FormSection>

          {counter.parts.priceTiers && (
            <FormSection title={t('Default price')}>
              <Select label={t('Is customer ko kis rate par bechna hai')} value={f.priceTier} onChange={(v) => set('priceTier', v as Form['priceTier'])}
                options={[{ value: '', label: t('Shop default ({{value}})', { value: counter.parts.defaultPriceTier }) }, ...counter.parts.priceTierList.map((x) => ({ value: x, label: x }))]}
                hint={t('POS par yeh customer chunte hi yahi price lagti hai')} />
            </FormSection>
          )}

          <FormSection title={t('Photo aur haisiyat')}>
            <Switch value={f.isVip} onChange={(v) => set('isVip', v)} label={t('VIP customer')} />
            <Switch value={f.isActive} onChange={(v) => set('isActive', v)} label={t('Chalu customer')} description={t('Band ho to POS me nahi aata')} />
          </FormSection>

          <FormSection title={t('Pehchan')}>
            <Input label={t('CNIC')} value={f.cnic} onChangeText={(v) => set('cnic', formatCnic(v))} keyboardType="number-pad" placeholder="35202-1234567-1" error={err('cnic')} hint={t('Marzi hai — bara udhaar dene se pehle')} />
            <Input label={t('NTN')} value={f.ntn} onChangeText={(v) => set('ntn', v)} autoCapitalize="characters" />
            <DatePicker label={t('Paidaish ki date')} value={dob} maximumDate={new Date()} onChange={(d) => set('dateOfBirth', keyOfDateLocal(d))} hint={t('Marzi hai — salgirah par mubarak ka message bhej sakein')} />
          </FormSection>

          <FormSection title={t('Note')}>
            <TextArea value={f.notes} onChangeText={(v) => set('notes', v)} numberOfLines={3} placeholder={t('Pasand, size, khaas baatein…')} />
            <Row gap={2} wrap>{NOTE_CHIPS.map((c) => <Chip key={c} label={t(c)} onPress={() => set('notes', f.notes ? `${f.notes}, ${t(c)}` : t(c))} />)}</Row>
          </FormSection>
        </>
      )}
    </FormTemplate>
  );
}
