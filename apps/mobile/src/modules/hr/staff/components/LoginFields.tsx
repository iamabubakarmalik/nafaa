/**
 * Fields for a new login: email, a temporary password, role, branch and the
 * permission boxes. Picking a role fills the boxes with that role's preset,
 * visibly; the owner can then tick or untick any box.
 */

import { Eye, EyeOff, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import type { Shop } from '@/core/auth/types';
import { t } from '@/core/i18n';
import { Button, ChipGroup, IconButton, Input, ListGroup, ListRow, Row, Switch, Text, useTheme } from '@/design';
import { PermissionPicker } from './PermissionPicker';
import { useDistributionPresets, useRoleDefaults } from '../lib/hooks';
import { ASSIGNABLE, ROLES, makePassword, type AssignableRole } from '../lib/meta';

export interface LoginDraft {
  email: string;
  password: string;
  role: AssignableRole;
  shopId: string;
  permissions: string[];
  sendEmail: boolean;
}

export const newLoginDraft = (defaults: Record<string, string[]>, shopId = ''): LoginDraft => ({
  email: '', password: makePassword(), role: 'CASHIER', shopId, permissions: [...(defaults.CASHIER ?? [])], sendEmail: false,
});

/** First problem with the login part, or null. */
export function loginProblem(d: LoginDraft) {
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return t('Login ke liye sahi email likhein');
  if (d.password.length < 8) return t('Password kam az kam 8 harf ka ho');
  if ((d.role === 'MANAGER' || d.role === 'CASHIER') && !d.shopId) return t('{{label}} ke liye branch chunein', { label: t(ROLES[d.role].label) });
  return null;
}

export function LoginFields({ value, onChange, shops }: { value: LoginDraft; onChange: (d: LoginDraft) => void; shops: Shop[] }) {
  const th = useTheme();
  const defaults = useRoleDefaults();
  const presets = useDistributionPresets();
  const [show, setShow] = useState(true);
  const [perms, setPerms] = useState(false);
  const set = <K extends keyof LoginDraft>(k: K, v: LoginDraft[K]) => onChange({ ...value, [k]: v });
  const needsShop = value.role === 'MANAGER' || value.role === 'CASHIER';
  const branchOptions = [...(needsShop ? [] : [{ value: '', label: t('Sab branches') }]), ...shops.map((s) => ({ value: s.id, label: s.isMain ? `${s.name} (${t('Main')})` : s.name }))];

  return (
    <View style={{ gap: th.space(4) }}>
      <Input label={t('Login email')} value={value.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
        placeholder="bilal@meridukaan.pk" hint={t('Isi se login karega. Har bande ka apna email — doosre ka nahi chalega.')} />
      <Input label={t('Pehla password')} value={value.password} onChangeText={(v) => set('password', v)} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} ltr
        hint={t('Kam az kam 8 harf. Save ke baad parchi milegi; banda baad me khud badal le.')}
        trailing={(
          <Row gap={1}>
            <IconButton icon={show ? EyeOff : Eye} label={show ? t('Chhupayein') : t('Dikhayein')} size="sm" onPress={() => setShow((s) => !s)} />
            <IconButton icon={RefreshCw} label={t('Naya password')} size="sm" onPress={() => set('password', makePassword())} />
          </Row>
        )} />

      <View style={{ gap: th.space(2) }}>
        <Text size="sm" weight="medium" tone="secondary">{t('Role')}</Text>
        <ListGroup>
          {ASSIGNABLE.map((r) => (
            <ListRow key={r} icon={ROLES[r].icon} iconTone={ROLES[r].tone} title={t(ROLES[r].label)} subtitle={t(ROLES[r].hint)} selected={value.role === r}
              onPress={() => onChange({ ...value, role: r, permissions: [...(defaults[r] ?? [])] })} />
          ))}
        </ListGroup>
        <Text size="xs" tone="muted">{t('Role chunne se neeche ki permission us role ki ho jati hain. Phir jo chahein badal lein.')}</Text>
        {presets.length > 0 && (
          <View style={{ gap: th.space(1) }}>
            <Text size="xs" weight="semibold">{t('Distribution ke liye:')}</Text>
            <Row gap={2} wrap>
              {presets.map((p) => (
                <Button key={p.key} size="sm" variant="soft" onPress={() => onChange({ ...value, role: p.role, permissions: [...p.permissions] })}>{p.label}</Button>
              ))}
            </Row>
          </View>
        )}
      </View>

      {shops.length > 0 && (
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="medium" tone="secondary">{needsShop ? `${t('Branch')} *` : t('Branch')}</Text>
          <ChipGroup wrap value={value.shopId} onChange={(v) => set('shopId', v)} options={branchOptions} />
          <Text size="xs" tone="muted">
            {value.shopId ? t('Sirf isi branch ka data dekhega aur isi me sale karega.') : needsShop ? t('{{label}} ko ek branch deni zaroori hai.', { label: t(ROLES[value.role].label) }) : t('Har branch ka data dekh sakega (jitni permission hai).')}
          </Text>
        </View>
      )}

      <View style={{ gap: th.space(2) }}>
        <Button variant="secondary" onPress={() => setPerms((p) => !p)}>{t('Permissions ({{count}})', { count: value.permissions.length })}</Button>
        {perms && <PermissionPicker value={value.permissions} onChange={(p) => set('permissions', p)} role={value.role} />}
      </View>

      <Switch value={value.sendEmail} onChange={(v) => set('sendEmail', v)} label={t('Email par bhi bhejein')}
        description={t('Login aur password bande ke email par chala jayega. Na bhejein to parchi ya WhatsApp se dein.')} />
    </View>
  );
}
