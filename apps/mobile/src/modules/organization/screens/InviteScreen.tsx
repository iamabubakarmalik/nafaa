/**
 * New login for a team member: name, email, a temporary password, role,
 * branch and permissions. Picking a role fills the permission boxes with
 * that role's preset (visibly); every box can still be changed. The login
 * details are shown once after saving.
 */

import { router } from 'expo-router';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { isOwner, PERMISSIONS as P, usePermissions } from '@/core/permissions';
import { Button, Card, EmptyState, FormSection, FormTemplate, IconButton, Input, Row, Screen, Select, Switch, Text, toast, useTheme } from '@/design';
import { shopsApi, teamApi, type AssignableRole } from '../api/organization';
import { LoginSlipSheet, type LoginSlip } from '../components/LoginSlipSheet';
import { PermissionEditor } from '../components/PermissionEditor';
import { ASSIGNABLE, ROLES, makePassword, validPhone } from '../lib/meta';
import { useDistributionPresets, useRoleDefaults } from '../lib/useTeam';

export function InviteScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { can, role: myRole } = usePermissions();
  const defaults = useRoleDefaults();
  const dist = useDistributionPresets();
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive && s.type === 'SHOP');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(makePassword);
  const [role, setRole] = useState<AssignableRole>('CASHIER');
  const [shopId, setShopId] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [showPerms, setShowPerms] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [slip, setSlip] = useState<LoginSlip | null>(null);
  const [filled, setFilled] = useState(false);

  // The role preset fills the boxes once the server list has arrived.
  useEffect(() => { if (!filled && defaults.CASHIER?.length) { setPermissions([...defaults.CASHIER]); setFilled(true); } }, [defaults, filled]);

  const needsShop = role === 'MANAGER' || role === 'CASHIER';
  const problem =
    (!fullName.trim() && t('Naam likhein')) ||
    (!/^\S+@\S+\.\S+$/.test(email.trim()) && t('Login ke liye sahi email likhein')) ||
    (!validPhone(phone) && t('Phone number sahi nahi')) ||
    (password.length < 8 && t('Password kam az kam 8 harf ka ho')) ||
    (needsShop && !shopId && t('{{label}} ke liye branch chunein', { label: t(ROLES[role].label) })) || '';

  const pickRole = (r: AssignableRole) => { setRole(r); setPermissions([...(defaults[r] ?? [])]); setDirty(true); };

  const save = useMutation({
    mutationFn: () => teamApi.invite({
      fullName: fullName.trim(), email: email.trim().toLowerCase(), password, role, permissions,
      ...(phone.trim() && { phone: phone.trim() }), ...(shopId && { shopId }), ...(sendEmail && { sendEmail: true }),
    }),
    onSuccess: (res) => {
      ['team', 'staff-people', 'staff'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t('Login ban gaya'));
      if (sendEmail && !res.emailSent) toast.error(t('Email nahi gaya — parchi ya WhatsApp se dein'));
      setDirty(false);
      setSlip({ name: res.fullName, email: res.email, password, role: t(ROLES[role].label), branch: shops.find((s) => s.id === shopId)?.name ?? null });
    },
  });

  if (!isOwner(myRole) && !can(P.TEAM_MANAGE)) {
    return <Screen title={t('New login')}><EmptyState title={t('Login sirf malik bana sakta hai.')} /></Screen>;
  }

  const t$ = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); };

  return (
    <>
      <FormTemplate title={t('New login')} subtitle={t('Naam, role aur branch. Permissions role se bhar jati hain.')} dirty={dirty} saving={save.isPending}
        saveLabel={t('Login banayein')} onSave={() => (problem ? toast.error(problem) : save.mutate())}>
        <FormSection title={t('Details')}>
          <Input label={t('Poora naam')} value={fullName} onChangeText={t$(setFullName)} maxLength={100} placeholder={t('Bilal Ahmad')} />
          <Input label={t('Login email')} value={email} onChangeText={t$(setEmail)} keyboardType="email-address" autoCapitalize="none" autoComplete="off" ltr
            placeholder="bilal@meridukaan.pk" hint={t('Isi se login karega. Har bande ka apna email — doosre ka nahi chalega.')} />
          <Input label={t('Phone')} value={phone} onChangeText={t$(setPhone)} keyboardType="phone-pad" ltr maxLength={20} placeholder="03001234567" error={!validPhone(phone) && t('Phone number sahi nahi')} />
          <Input label={t('Pehla password')} value={password} onChangeText={t$(setPassword)} autoCapitalize="none" autoCorrect={false} ltr
            trailing={<IconButton icon={RefreshCw} label={t('Naya password')} size="sm" onPress={() => { setPassword(makePassword()); setDirty(true); }} />}
            hint={t('Kam az kam 8 harf. Save ke baad parchi milegi; banda baad me khud badal le.')} />
        </FormSection>

        <FormSection title={t('Role aur branch')}>
          <Select label={t('Role')} value={role} onChange={pickRole}
            options={ASSIGNABLE.map((r) => ({ value: r, label: t(ROLES[r].label), description: t(ROLES[r].hint), icon: ROLES[r].icon }))}
            hint={t('Role chunne se neeche ki permission us role ki ho jati hain. Phir jo chahein badal lein.')} />
          {dist.length > 0 && (
            <View style={{ gap: th.space(1.5) }}>
              <Text size="xs" weight="semibold" tone="muted">{t('Distribution ke liye:')}</Text>
              <Row gap={2} wrap>
                {dist.map((p) => <Button key={p.key} size="sm" variant="soft" onPress={() => { setRole(p.role as AssignableRole); setPermissions([...p.permissions]); setDirty(true); }}>{p.label}</Button>)}
              </Row>
            </View>
          )}
          {shops.length > 0 && (
            <Select label={t('Branch')} value={shopId} onChange={t$(setShopId)}
              options={[...(needsShop ? [] : [{ value: '', label: t('Sab branches') }]), ...shops.map((s) => ({ value: s.id, label: s.name, description: s.isMain ? t('Main') : undefined }))]}
              placeholder={t('— Chunein —')}
              hint={shopId ? t('Sirf isi branch ka data dekhega aur isi me sale karega.') : needsShop ? t('{{label}} ko ek branch deni zaroori hai.', { label: t(ROLES[role].label) }) : t('Branch na di to har branch ka data dekh sakega (jitni permission hai).')} />
          )}
        </FormSection>

        <Card flush>
          <View style={{ padding: th.space(3), gap: th.space(3) }}>
            <Row justify="between" align="center">
              <View style={{ flex: 1 }}>
                <Text weight="bold">{t('Permissions ({{count}})', { count: permissions.length })}</Text>
                <Text size="xs" tone="muted">{t('Kya kya kar sakega — kholein aur dekhein')}</Text>
              </View>
              <IconButton icon={showPerms ? ChevronUp : ChevronDown} label={t('Permissions')} onPress={() => setShowPerms((v) => !v)} />
            </Row>
            {showPerms && <PermissionEditor value={permissions} onChange={t$(setPermissions)} role={role} />}
          </View>
        </Card>

        <Switch value={sendEmail} onChange={t$(setSendEmail)} label={t('Email par bhi bhejein')}
          description={t('Login aur password bande ke email par chala jayega. Na bhejein to parchi chhap kar ya WhatsApp se dein.')} />
      </FormTemplate>
      <LoginSlipSheet slip={slip} onClose={() => { setSlip(null); router.back(); }} />
    </>
  );
}
