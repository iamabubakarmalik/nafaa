/**
 * Add or edit a supplier: name and contact, address, tax numbers, bank
 * details and payment terms. A new supplier can start with the balance owed
 * from before. Warns when the name or phone is already used. Needs internet
 * to save.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Mail, Phone, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Card, Chip, ErrorState, FormSection, FormTemplate, Input, MoneyInput, Row, SkeletonRows, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { PUR, useOnline } from '@/modules/inventory/lib/shared';
import { supplierLedgerApi, suppliersApi, type UpsertSupplierPayload } from '../api/suppliers';
import { useSupplierPickerList } from '../components/SupplierPicker';

type Form = Required<Omit<UpsertSupplierPayload, 'isActive'>> & { isActive: boolean };
type TextKey = Exclude<keyof Form, 'isActive'>;

const EMPTY: Form = {
  name: '', contactPerson: '', phone: '', altPhone: '', email: '', cnic: '', ntn: '', address: '', city: '', area: '',
  logoUrl: '', bankName: '', accountNumber: '', iban: '', paymentTerms: '', notes: '', isActive: true,
};
const TEXT_KEYS = Object.keys(EMPTY).filter((k) => k !== 'isActive') as TextKey[];
const TERMS = [msg('Cash on delivery'), '7', '15', '30', msg('Har hafte'), msg('Mahine ke aakhir')];

const phoneFmt = (raw: string) => {
  const d = raw.replace(/[^\d+]/g, '').replace(/^\+?92/, '0');
  return /^03\d{9}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4)}` : raw;
};
const digits = (v: string | null | undefined) => String(v ?? '').replace(/\D/g, '').replace(/^92/, '0');
const phoneOk = (v: string) => /^0\d{9,10}$/.test(digits(v));

export function SupplierFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id && id !== 'new';
  const qc = useQueryClient();
  const online = useOnline();
  const [f, setF] = useState<Form>(EMPTY);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY));
  const [opening, setOpening] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const existing = useQuery({ queryKey: [PUR, 'supplier', id], queryFn: () => suppliersApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const s = existing.data;
    if (!s) return;
    const n = { ...EMPTY, isActive: s.isActive !== false };
    TEXT_KEYS.forEach((k) => { n[k] = (s[k] as string | null | undefined) ?? ''; });
    setF(n);
    setBaseline(JSON.stringify(n));
  }, [existing.data]);
  useEffect(() => { if (next) router.replace(next as never); }, [next]);

  const dirty = JSON.stringify(f) !== baseline || !!opening;
  const all = useSupplierPickerList();
  const clash = useMemo(() => {
    const name = f.name.trim().toLowerCase();
    const phones = [digits(f.phone), digits(f.altPhone)].filter((p) => p.length >= 10);
    const list = (all.data?.items ?? []).filter((s) => s.id !== id);
    return {
      name: name ? list.find((s) => s.name.trim().toLowerCase() === name) ?? null : null,
      phone: phones.length ? list.find((s) => [digits(s.phone), digits(s.altPhone)].some((p) => p && phones.includes(p))) ?? null : null,
    };
  }, [f.name, f.phone, f.altPhone, all.data, id]);

  // Format checks run only on values typed here, so an old record in another format can still be edited.
  const errors = useMemo(() => {
    const old = JSON.parse(baseline) as Form;
    const typed = (k: TextKey) => !!f[k].trim() && f[k] !== old[k];
    const e: Partial<Record<TextKey, string>> = {};
    if (!f.name.trim()) e.name = t('Supplier ka naam likhein');
    if (typed('phone') && !phoneOk(f.phone)) e.phone = t('Number theek nahi — misaal: 0300-1234567 ya 042-35761234');
    if (typed('altPhone') && !phoneOk(f.altPhone)) e.altPhone = t('Number theek nahi');
    if (typed('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = t('Email theek nahi — misaal: orders@company.pk');
    if (typed('cnic') && f.cnic.replace(/\D/g, '').length !== 13) e.cnic = t('CNIC 13 hindsay ka hota hai');
    if (typed('iban') && !/^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(f.iban.trim())) e.iban = t('IBAN PK se shuru, 24 harf (misaal: PK36MEZN0000…)');
    return e;
  }, [f, baseline]);
  const err = (k: TextKey) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(TEXT_KEYS.map((k) => [k, f[k].trim() || undefined])) as unknown as UpsertSupplierPayload;
      payload.name = f.name.trim();
      payload.isActive = f.isActive;
      const saved = editing ? await suppliersApi.update(id!, payload) : await suppliersApi.create(payload);
      let openingFailed = false;
      if (!editing && (opening ?? 0) > 0) {
        await supplierLedgerApi.setOpeningBalance(saved.id, { amount: opening!, note: msg('Purana hisab — supplier banate waqt darj kiya') }).catch(() => { openingFailed = true; });
      }
      return { saved, openingFailed };
    },
    onSuccess: ({ saved, openingFailed }) => {
      toast.success(editing ? t('Save ho gaya') : t('{{name}} jur gaya', { name: saved.name }));
      if (openingFailed) toast.error(t('Purana hisaab save nahi hua — supplier ke khata se dobara daalein'));
      void qc.invalidateQueries({ queryKey: [PUR] });
      setBaseline(JSON.stringify(f));
      setOpening(null);
      setNext(`/suppliers/${saved.id}`);
    },
  });

  const submit = () => {
    setTried(true);
    if (Object.keys(errors).length) { toast.error(Object.values(errors)[0]!); return; }
    if (!online) { toast.warning(t('Supplier save karne ke liye internet chahiye.')); return; }
    save.mutate();
  };

  if (editing && !existing.data) {
    return (
      <FormTemplate title={t('Supplier')} onSave={() => undefined} saveDisabled>
        {existing.error ? <ErrorState error={existing.error} onRetry={existing.refetch} /> : <SkeletonRows count={6} />}
      </FormTemplate>
    );
  }

  return (
    <FormTemplate
      title={editing ? t('{{value}} — badlein', { value: existing.data?.name ?? 'Supplier' }) : t('Naya supplier')}
      subtitle={editing ? t('Jo badalna hai badlein — baqi waisa hi rahega') : t('Sirf naam zaroori hai. Phone ho to WhatsApp par order aur hisaab bhej sakenge.')}
      dirty={dirty && !save.isPending && !next}
      saving={save.isPending}
      saveLabel={editing ? t('Save karein') : t('Supplier jorein')}
      onSave={submit}
    >
      <View style={{ gap: th.space(4) }}>
        {(clash.name || clash.phone) && (
          <Card tone="warning">
            <Row gap={2} align="start">
              <AlertTriangle size={16} color={th.colors.warning.text} />
              <Text size="sm" style={{ flex: 1 }}>
                {clash.name
                  ? t('Is naam ka supplier pehle se hai: {{name}}. Kahin dobara to nahi bana rahe?', { name: `${clash.name.name}${clash.name.phone ? ` (${clash.name.phone})` : ''}` })
                  : t('Yeh phone {{name}} ka hai', { name: clash.phone!.name })}
              </Text>
            </Row>
          </Card>
        )}
        <FormSection title={t('Supplier')}>
          <Input label={t('Naam')} value={f.name} onChangeText={(v) => set('name', v)} maxLength={120} placeholder={t('Misaal: Al-Madina Traders')} size="lg" autoFocus={!editing}
            error={err('name')} hint={t('Dukaan / company ka naam jo parchi par likha hota hai')} />
          <Input label={t('Rabte wala banda')} value={f.contactPerson} onChangeText={(v) => set('contactPerson', v)} maxLength={100} icon={UserRound} hint={t('Jis se aap baat karte hain — salesman ya malik')} />
          <Input label={t('Phone')} value={f.phone} onChangeText={(v) => set('phone', v)} onBlur={() => set('phone', phoneFmt(f.phone))} keyboardType="phone-pad" icon={Phone} ltr
            placeholder="0300-1234567" error={err('phone')} maxLength={20} hint={t('WhatsApp wala number behtar — order aur hisaab seedha bhej sakenge')} />
          <Input label={t('Doosra phone')} value={f.altPhone} onChangeText={(v) => set('altPhone', v)} onBlur={() => set('altPhone', phoneFmt(f.altPhone))} keyboardType="phone-pad" icon={Phone} ltr
            error={err('altPhone')} maxLength={20} hint={t('Office ya delivery wale ka number (marzi hai)')} />
          <Input label={t('Email')} value={f.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" icon={Mail} ltr
            error={err('email')} hint={t('Marzi hai — purchase order email karne ke liye')} />
        </FormSection>
        <FormSection title={t('Pata aur tax')}>
          <Input label={t('Pata')} value={f.address} onChangeText={(v) => set('address', v)} maxLength={255} hint={t('Godown ya dukaan ka pata — maal lene jana ho to kaam aata hai')} />
          <Row gap={2} align="start">
            <Input containerStyle={{ flex: 1 }} label={t('Shehar')} value={f.city} onChangeText={(v) => set('city', v)} maxLength={80} />
            <Input containerStyle={{ flex: 1 }} label={t('Ilaqa')} value={f.area} onChangeText={(v) => set('area', v)} maxLength={80} placeholder={t('Misaal: Akbari Mandi, Shah Alam')} />
          </Row>
          <Input label={t('CNIC')} value={f.cnic} onChangeText={(v) => set('cnic', v)} keyboardType="number-pad" maxLength={20} placeholder="35202-1234567-1" ltr error={err('cnic')} hint={t('Marzi hai — bare len-den ke liye')} />
          <Input label={t('NTN')} value={f.ntn} onChangeText={(v) => set('ntn', v)} maxLength={20} ltr hint={t('Tax wala supplier ho to — tax invoice ke liye')} />
        </FormSection>
        <FormSection title={t('Bank aur payment')}>
          <Input label={t('Bank')} value={f.bankName} onChangeText={(v) => set('bankName', v)} maxLength={80} placeholder={t('Meezan, HBL…')} hint={t('Jis bank me aap paisa bhejte hain')} />
          <Input label={t('Account #')} value={f.accountNumber} onChangeText={(v) => set('accountNumber', v)} maxLength={40} ltr hint={t('Supplier ka account number')} />
          <Input label={t('IBAN')} value={f.iban} onChangeText={(v) => set('iban', v.toUpperCase().replace(/\s/g, ''))} maxLength={40} placeholder={t('PK36MEZN…')} ltr autoCapitalize="characters"
            error={err('iban')} hint={t('PK se shuru hone wala 24 harf ka number — online transfer ke liye')} />
          <Input label={t('Payment ki shart')} value={f.paymentTerms} onChangeText={(v) => set('paymentTerms', v)} maxLength={60} hint={t('Kitne din me paisa dena hota hai — neeche se jaldi chunein')} />
          <Row gap={1.5} wrap>
            {TERMS.map((x) => {
              const label = /^\d+$/.test(x) ? t('{{count}} din', { count: Number(x) }) : t(x);
              return <Chip key={x} label={label} selected={f.paymentTerms === label} onPress={() => set('paymentTerms', label)} />;
            })}
          </Row>
        </FormSection>
        {!editing && (
          <FormSection title={t('Purana hisaab')} description={t('Sirf naya supplier banate waqt — baad me khata se daalein')}>
            <MoneyInput label={t('Is supplier ko pehle se kitna dena hai (Rs)')} value={opening} onChangeValue={setOpening}
              hint={(opening ?? 0) > 0 ? t('Khata {{openingAmount}} baqi se shuru hoga', { openingAmount: formatPKR(opening) }) : t('Khata shuru hone se pehle ka baqi; nahi to khali chhor dein')} />
          </FormSection>
        )}
        <FormSection title={t('Aur')}>
          <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set('notes', v)} maxLength={500} hint={t('Kuch bhi yaad rakhna ho — misaal: har mangal ko maal deta hai')} />
          <Switch value={f.isActive} onChange={(v) => set('isActive', v)} label={t('Chalu supplier')} description={t('Band ho to purchase me nahi aata; purana hisaab mehfooz rehta hai')} />
        </FormSection>
        {!online && <Card tone="info"><Text size="sm">{t('Supplier save karne ke liye internet chahiye.')}</Text></Card>}
      </View>
    </FormTemplate>
  );
}
