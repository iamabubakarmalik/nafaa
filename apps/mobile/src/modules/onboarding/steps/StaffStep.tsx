/** Step 5: logins for cashiers and managers (owner only). */

import { Mail, Plus, Trash2, UserPlus } from 'lucide-react-native';
import { View } from 'react-native';
import { t, msg } from '@/core/i18n';
import { Button, Card, Icon, IconButton, Input, PressableScale, Select, Text, useTheme } from '@/design';

export interface StaffMember { fullName: string; email: string; password: string; role: 'MANAGER' | 'CASHIER' | 'STAFF' }
export interface StaffForm { members: StaffMember[] }
export type StaffErrors = Record<number, Partial<Record<keyof StaffMember, string>>>;

const ROLES = [
  { value: 'CASHIER' as const, label: msg('Cashier — counter par sale') },
  { value: 'MANAGER' as const, label: msg('Manager — billing ke ilawa sab') },
  { value: 'STAFF' as const, label: msg('Staff — stock ka kaam') },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MEMBERS = 10;
const emptyMember = (): StaffMember => ({ fullName: '', email: '', password: '', role: 'CASHIER' });
const isBlank = (m: StaffMember) => !m.fullName.trim() && !m.email.trim() && !m.password;

export const filledMembers = (f: StaffForm) => f.members.filter((m) => !isBlank(m));

export function validateStaff(f: StaffForm): StaffErrors {
  const errors: StaffErrors = {};
  const seen = new Set<string>();
  f.members.forEach((m, i) => {
    if (isBlank(m)) return;
    const e: Partial<Record<keyof StaffMember, string>> = {};
    if (m.fullName.trim().length < 2) e.fullName = t('Naam likhein');
    const email = m.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) e.email = t('Email sahi likhein');
    else if (seen.has(email)) e.email = t('Ye email upar bhi likha hai');
    seen.add(email);
    if (m.password.length < 6) e.password = t('Kam se kam 6 huroof');
    if (Object.keys(e).length) errors[i] = e;
  });
  return errors;
}

export function StaffStep({ value, onChange, errors, addedCount, isOwner }: { value: StaffForm; onChange: (p: Partial<StaffForm>) => void; errors: StaffErrors; addedCount: number; isOwner: boolean }) {
  const th = useTheme();
  const setMember = (i: number, patch: Partial<StaffMember>) => onChange({ members: value.members.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });

  if (!isOwner) {
    return <Card tone="info" title={<Text weight="bold" tone="info">{t('Staff sirf malik add kar sakta hai')}</Text>}><Text size="sm" tone="info">{t('Ye step chhor dein. Malik baad me Staff page se logins bana sakta hai.')}</Text></Card>;
  }

  return (
    <View style={{ gap: th.space(4) }}>
      {addedCount > 0 && <Card tone="success"><Text size="sm" tone="success">{t('{{addedCount}} staff pehle hi add ho chuke', { addedCount })}</Text></Card>}
      <Text size="sm" tone="secondary">{t('Har banda apne email aur password se login karega, taake pata rahe kis ne kya becha. Branch aur permissions baad me Staff page se set hoti hain.')}</Text>
      {value.members.length === 0 ? (
        <PressableScale onPress={() => onChange({ members: [emptyMember()] })} haptic="tap" style={{ alignItems: 'center', gap: th.space(2), padding: th.space(8), borderRadius: th.radius('xl'), borderWidth: 2, borderStyle: 'dashed', borderColor: th.colors.borderStrong }}>
          <Icon icon={UserPlus} size={26} tone="brand" />
          <Text weight="bold">{t('Pehla staff member add karein')}</Text>
          <Text size="xs" tone="muted">{t('Ya abhi chhor dein — baad me bhi ho jayega')}</Text>
        </PressableScale>
      ) : (
        <View style={{ gap: th.space(3) }}>
          {value.members.map((m, i) => {
            const e = errors[i] ?? {};
            return (
              <View key={i} style={{ gap: th.space(3), padding: th.space(4), borderRadius: th.radius('xl'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text size="xs" weight="bold" tone="muted" uppercase>{t('Staff {{value}}', { value: i + 1 })}</Text>
                  <IconButton icon={Trash2} label={t('Hatayein')} size="sm" onPress={() => onChange({ members: value.members.filter((_, idx) => idx !== i) })} />
                </View>
                <Input label={t('Naam')} placeholder={t('Bilal')} value={m.fullName} onChangeText={(fullName) => setMember(i, { fullName })} error={e.fullName} size="md" />
                <Select label={t('Kaam')} value={m.role} onChange={(role) => setMember(i, { role })} options={ROLES.map((r) => ({ value: r.value, label: t(r.label) }))} />
                <Input label={t('Login email')} placeholder="bilal@gmail.com" icon={Mail} keyboardType="email-address" autoCapitalize="none" value={m.email} onChangeText={(email) => setMember(i, { email })} error={e.email} size="md" />
                <Input label={t('Password')} placeholder={t('Kam se kam 6 huroof')} autoCapitalize="none" value={m.password} onChangeText={(password) => setMember(i, { password })} hint={e.password ? undefined : t('Ye password staff ko bata dein.')} error={e.password} size="md" ltr />
              </View>
            );
          })}
          {value.members.length < MAX_MEMBERS && <Button variant="secondary" icon={Plus} onPress={() => onChange({ members: [...value.members, emptyMember()] })} style={{ alignSelf: 'flex-start' }}>{t('Ek aur staff')}</Button>}
        </View>
      )}
    </View>
  );
}
