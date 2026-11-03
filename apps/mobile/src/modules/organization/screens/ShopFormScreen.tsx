/**
 * New branch or edit a branch: type, name, phone, address, main flag and
 * on/off. A new branch can get its manager's login in the same step; the
 * login details are shown once afterwards.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  EmptyState, FormSection, FormTemplate, IconButton, Input, Screen, Select, SkeletonRows, Switch, Text, toast,
} from '@/design';
import { shopsApi, type CreateShopPayload, type ShopType } from '../api/organization';
import { LoginSlipSheet, type LoginSlip } from '../components/LoginSlipSheet';
import { SHOP_KEYS, SHOP_TYPES, makePassword, validPhone } from '../lib/meta';

export function ShopFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.SHOPS_MANAGE);
  const canTeam = can(P.TEAM_MANAGE);

  const shopQ = useQuery({ queryKey: ['shops', id], queryFn: () => shopsApi.get(id!), enabled: editing });
  const listQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, enabled: !editing });
  const shop = shopQ.data;

  const [type, setType] = useState<ShopType>('SHOP');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [mOn, setMOn] = useState(false);
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPass, setMPass] = useState('');
  const [dirty, setDirty] = useState(false);
  const [slip, setSlip] = useState<LoginSlip | null>(null);
  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); };

  useEffect(() => {
    if (!shop) return;
    setType(shop.type); setName(shop.name); setPhone(shop.phone ?? ''); setAddress(shop.address ?? ''); setIsMain(shop.isMain); setIsActive(shop.isActive);
    setDirty(false);
  }, [shop]);
  // The first branch of an account is the main one.
  useEffect(() => { if (!editing && listQ.data?.length === 0) setIsMain(true); }, [editing, listQ.data]);

  const problem =
    (!name.trim() && t('Branch ka naam likhein')) ||
    (mOn && !mName.trim() && t('Manager ka naam likhein')) ||
    (mOn && !/^\S+@\S+\.\S+$/.test(mEmail.trim()) && t('Manager ka sahi email likhein')) ||
    (mOn && mPass.length < 8 && t('Password kam se kam 8 harf ka ho')) ||
    (mOn && !validPhone(mPhone) && t('Phone number sahi nahi')) || '';

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return shopsApi.update(id!, {
          name: name.trim(), phone: phone.trim(), address: address.trim(), type,
          ...(isMain !== shop?.isMain && { isMain }),
          ...(isActive !== shop?.isActive && { isActive }),
        });
      }
      const body: CreateShopPayload = {
        name: name.trim(), type, isMain,
        ...(phone.trim() && { phone: phone.trim() }),
        ...(address.trim() && { address: address.trim() }),
        ...(mOn && { managerName: mName.trim(), managerEmail: mEmail.trim().toLowerCase(), managerPassword: mPass, ...(mPhone.trim() && { managerPhone: mPhone.trim() }) }),
      };
      return shopsApi.create(body);
    },
    onSuccess: (res) => {
      SHOP_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ['team'] });
      toast.success(editing ? t('Branch save ho gayi') : t('{{name}} ban gayi', { name: res.name }));
      setDirty(false);
      if (!editing && mOn) {
        setSlip({ name: mName.trim(), email: mEmail.trim().toLowerCase(), password: mPass, role: t('Manager'), branch: res.name });
        return;
      }
      router.back();
    },
  });

  const submit = () => {
    if (problem) return toast.error(problem);
    save.mutate();
  };

  if (!canManage) {
    return <Screen title={t('Branch')}><EmptyState title={t('Branch banane ya badalne ke liye "Branches sambhalna" ki permission chahiye')} /></Screen>;
  }
  if (editing && shopQ.isLoading) return <Screen title={t('Edit branch')}><SkeletonRows count={5} avatar={false} /></Screen>;
  if (editing && !shop) return <Screen title={t('Edit branch')}><EmptyState title={t('Yeh branch nahi mili')} /></Screen>;

  const switchingOffMain = editing && shop?.isMain && !isActive;

  return (
    <>
      <FormTemplate
        title={editing ? t('Edit branch') : t('New branch')}
        subtitle={editing ? undefined : t('Dukaan, warehouse ya godown. Manager ka login bhi yahin de sakte hain.')}
        dirty={dirty}
        saving={save.isPending}
        onSave={submit}
        saveDisabled={!!switchingOffMain}
        saveLabel={!editing && mOn ? t('Branch aur login banayein') : undefined}
      >
        <FormSection title={t('Branch ki type')}>
          <Select
            label={t('Type')}
            value={type}
            onChange={touch(setType)}
            options={(Object.keys(SHOP_TYPES) as ShopType[]).map((k) => ({ value: k, label: t(SHOP_TYPES[k].label), description: t(SHOP_TYPES[k].hint), icon: SHOP_TYPES[k].icon }))}
            hint={editing && shop && shop.type !== type ? t('Type badalne se purani sale aur stock nahi badlenge. Store me POS aur drawer nahi chalte.') : t('Type se tay hota hai ke is branch me kya chalega')}
          />
        </FormSection>

        <FormSection title={t('Details')}>
          <Input label={t('Branch ka naam')} value={name} onChangeText={touch(setName)} maxLength={100}
            placeholder={type === 'SHOP' ? t('Ali Store — Saddar') : t('Bara godown')} hint={t('Bill, report aur branch chunne ki list me yahi naam aata hai. Do branches ka ek naam nahi ho sakta.')} />
          <Input label={t('Phone')} value={phone} onChangeText={touch(setPhone)} keyboardType="phone-pad" ltr maxLength={20} placeholder="03001234567"
            error={!validPhone(phone) && t('Phone number sahi nahi')} hint={t('Marzi hai — bill par chhapta hai.')} />
          <Input label={t('Pata')} value={address} onChangeText={touch(setAddress)} maxLength={255} placeholder={t('Shop 12, Main Bazar, Lahore')} hint={t('Marzi hai — bill aur parchi par chhapta hai')} />
        </FormSection>

        <FormSection title={t('Main aur chalu')}>
          <Switch value={isMain} disabled={editing && shop?.isMain} onChange={touch(setIsMain)} label={t('Main branch')}
            description={editing && shop?.isMain ? t('Yeh main branch hai. Main badalne ke liye doosri branch me yeh on karein.') : t('Naye staff aur "Sab branches" wale kaam pehle yahan jaate hain. Ek waqt me ek hi main hoti hai.')} />
          {editing && (
            <Switch value={isActive} disabled={shop?.isMain} onChange={touch(setIsActive)} label={t('Branch chalu hai')}
              description={shop?.isMain ? t('Main branch band nahi hoti.') : t('Band branch me sale nahi hoti; purana hisaab waise hi rehta hai.')} />
          )}
          {!!switchingOffMain && <Text size="sm" tone="danger">{t('Main branch band nahi ho sakti.')}</Text>}
        </FormSection>

        {!editing && (
          <FormSection title={t('Manager ka login')}>
            {!canTeam ? (
              <Text size="sm" tone="muted">{t('Login dene ke liye "Team sambhalna" ki permission chahiye. Branch ban jaye to Staff ke page se login dein.')}</Text>
            ) : (
              <>
                <Switch value={mOn} onChange={(v) => { setMOn(v); setDirty(true); if (v && !mPass) setMPass(makePassword()); }} label={t('Is branch ka manager banayein')}
                  description={t('Manager sirf isi branch ka data dekhega: sale, maal, expenses aur reports. Permissions baad me Staff → profile se badal sakte hain.')} />
                {mOn && (
                  <>
                    <Input label={t('Naam')} value={mName} onChangeText={touch(setMName)} maxLength={100} placeholder={t('Bilal Ahmad')} hint={t('Bill aur report par yahi naam aata hai')} />
                    <Input label={t('Login email')} value={mEmail} onChangeText={touch(setMEmail)} keyboardType="email-address" autoCapitalize="none" ltr placeholder="bilal@gmail.com" hint={t('Isi se login karega. Har login ka alag email.')} />
                    <Input label={t('Phone')} value={mPhone} onChangeText={touch(setMPhone)} keyboardType="phone-pad" ltr maxLength={20} placeholder="03001234567" error={!validPhone(mPhone) && t('Phone number sahi nahi')} />
                    <Input label={t('Password')} value={mPass} onChangeText={touch(setMPass)} autoCapitalize="none" ltr maxLength={64}
                      trailing={<IconButton icon={RefreshCw} label={t('Naya password')} size="sm" onPress={() => { setMPass(makePassword()); setDirty(true); }} />}
                      hint={t('Kam se kam 8 harf. Save ke baad ek dafa parchi par dikhega — manager pehli dafa login karke badal le.')} />
                  </>
                )}
              </>
            )}
          </FormSection>
        )}
      </FormTemplate>
      <LoginSlipSheet slip={slip} title={t('Manager ka login ban gaya')} onClose={() => { setSlip(null); router.back(); }} />
    </>
  );
}
