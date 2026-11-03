/** Sheets for one team login: edit details, reset password, approval PIN. */

import { RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { Button, IconButton, Input, Row, Select, Sheet, Text, toast, useTheme } from '@/design';
import { shopsApi, teamApi, type AssignableRole, type TeamMember } from '../api/organization';
import { ASSIGNABLE, ROLES, makePassword, onlyDigits, validPhone } from '../lib/meta';

const refreshTeam = (qc: ReturnType<typeof useQueryClient>) => ['team', 'staff-people', 'staff'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

export function EditLoginSheet({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, enabled: !!member });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive && s.type === 'SHOP');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AssignableRole>('CASHIER');
  const [shopId, setShopId] = useState('');

  useEffect(() => {
    if (!member) return;
    setName(member.fullName); setEmail(member.email); setPhone(member.phone ?? '');
    setRole((ASSIGNABLE.includes(member.role as AssignableRole) ? member.role : 'CASHIER') as AssignableRole);
    setShopId(member.shopId ?? member.assignedShop?.id ?? '');
  }, [member]);

  const needsShop = role === 'MANAGER' || role === 'CASHIER';
  const problem =
    (!name.trim() && t('Naam likhein')) || (!/^\S+@\S+\.\S+$/.test(email.trim()) && t('Login ke liye sahi email likhein')) ||
    (!validPhone(phone) && t('Phone number sahi nahi')) || (needsShop && !shopId && t('{{label}} ke liye branch chunein', { label: t(ROLES[role].label) })) || '';
  const roleChanged = !!member && member.role !== role;

  const save = useMutation({
    mutationFn: () => teamApi.updateLogin(member!.id, { fullName: name.trim(), email: email.trim(), phone: phone.trim(), role, shopId: shopId || null }),
    onSuccess: () => { refreshTeam(qc); toast.success(roleChanged ? t('Save ho gaya — naye role ke liye banda dobara login karega') : t('Save ho gaya')); onClose(); },
  });

  return (
    <Sheet open={!!member} onClose={onClose} title={t('Edit login')}
      footer={<Button fullWidth loading={save.isPending} onPress={() => (problem ? toast.error(problem) : save.mutate())}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Poora naam')} value={name} onChangeText={setName} />
        <Input label={t('Login email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" ltr hint={t('Isi se login karta hai')} />
        <Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr error={!validPhone(phone) && t('Phone number sahi nahi')} />
        <Select label={t('Role')} value={role} onChange={setRole}
          options={ASSIGNABLE.map((r) => ({ value: r, label: t(ROLES[r].label), description: t(ROLES[r].hint), icon: ROLES[r].icon }))}
          hint={roleChanged ? t('Permissions wohi rahengi. Naye role ki permission chahiye to profile ke Permissions tab me "role wali" dabayein.') : t('Role badalne se banda sab devices se logout hoga')} />
        <Select label={t('Login ki branch')} value={shopId} onChange={setShopId} placeholder={t('— Chunein —')}
          options={[...(role === 'STAFF' ? [{ value: '', label: t('Sab branches') }] : []), ...shops.map((s) => ({ value: s.id, label: s.name }))]}
          hint={t('Sirf isi branch ka data dekhega aur isi me sale karega')} />
      </View>
    </Sheet>
  );
}

export function ResetPasswordSheet({ member, onClose }: { member: TeamMember | null; onClose: () => void }) {
  const th = useTheme();
  const [password, setPassword] = useState('');
  useEffect(() => { if (member) setPassword(makePassword()); }, [member]);
  const save = useMutation({
    mutationFn: () => teamApi.resetPassword(member!.id, password),
    onSuccess: (r) => { toast.success(t('Naya password lag gaya'), { message: t('{{count}} devices se logout ho gaya', { count: r.sessionsClosed }) }); onClose(); },
  });
  return (
    <Sheet open={!!member} onClose={onClose} title={t('Naya password')} description={member?.fullName}
      footer={<Button fullWidth loading={save.isPending} disabled={password.length < 8} onPress={() => save.mutate()}>{t('Password badlein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naya password')} value={password} onChangeText={setPassword} autoCapitalize="none" autoCorrect={false} ltr
          trailing={<IconButton icon={RefreshCw} label={t('Naya password')} size="sm" onPress={() => setPassword(makePassword())} />}
          hint={t('Kam az kam 8 harf. Is ke baad banda har device se logout ho jayega — password usay khud batayein.')} />
      </View>
    </Sheet>
  );
}

/** The person's own PIN for approving counter actions they hold the permission for. */
export function ApprovalPinSheet({ member, hasPin, onClose }: { member: TeamMember | null; hasPin: boolean; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [pin, setPin] = useState('');
  useEffect(() => { if (member) setPin(''); }, [member]);
  const done = () => { qc.invalidateQueries({ queryKey: ['team-profile'] }); onClose(); };
  const save = useMutation({ mutationFn: () => teamApi.setApprovalPin(member!.id, pin), onSuccess: () => { toast.success(t('PIN lag gaya')); done(); } });
  const clear = useMutation({ mutationFn: () => teamApi.clearApprovalPin(member!.id), onSuccess: () => { toast.success(t('PIN hata diya')); done(); } });
  return (
    <Sheet open={!!member} onClose={onClose} title={t('Approval PIN')} description={member?.fullName}
      footer={(
        <Row gap={2}>
          {hasPin && <Button variant="danger" loading={clear.isPending} onPress={() => clear.mutate()}>{t('Remove')}</Button>}
          <Button style={{ flex: 1 }} loading={save.isPending} disabled={pin.length < 4} onPress={() => save.mutate()}>{hasPin ? t('PIN badlein') : t('PIN lagayein')}</Button>
        </Row>
      )}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="muted">{t('Is PIN se yeh banda counter par wohi kaam approve kar sakta hai jis ki permission is ke paas hai (Discount, void, return, udhaar limit).')}</Text>
        <Input label={t('Naya PIN (4 se 8 hindsay)')} value={pin} onChangeText={(v) => setPin(onlyDigits(v))} keyboardType="number-pad" secureTextEntry maxLength={8} ltr />
      </View>
    </Sheet>
  );
}
