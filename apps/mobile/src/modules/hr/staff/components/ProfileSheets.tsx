/**
 * Actions on one person that need a confirm step: give an HR record a login,
 * set a new password, and mark someone as left / on leave / back at work
 * (with the choice to close or reopen their login too). Nothing is deleted.
 */

import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useShops } from '@/core/auth/useShops';
import { msg, t } from '@/core/i18n';
import { Button, Card, DatePicker, Icon, IconButton, Input, ListGroup, ListRow, Row, Sheet, Switch, Text, toast, useTheme } from '@/design';
import { peopleApi, type Profile, type StaffStatus } from '../api/people';
import { useRefreshPeople, useRoleDefaults } from '../lib/hooks';
import { ROLES, cleanPhone, makePassword } from '../lib/meta';
import { LoginFields, loginProblem, newLoginDraft, type LoginDraft } from './LoginFields';
import { LoginSlipSheet } from './LoginSlipSheet';

/** Login for a person who so far has only an HR record. */
export function GiveLoginSheet({ p, onClose }: { p: Profile; onClose: () => void }) {
  const refresh = useRefreshPeople();
  const defaults = useRoleDefaults();
  const shops = (useShops().data ?? []).filter((s) => s.isActive);
  const [d, setD] = useState<LoginDraft>(() => ({ ...newLoginDraft(defaults, p.staff?.shopId ?? ''), email: p.staff?.email ?? '' }));
  const [done, setDone] = useState(false);
  const problem = loginProblem(d);
  const save = useMutation({
    mutationFn: () => peopleApi.invite({
      fullName: p.person.fullName, email: d.email.trim(), phone: cleanPhone(p.person.phone) ?? undefined,
      password: d.password, role: d.role, shopId: d.shopId || undefined, permissions: d.permissions, staffId: p.staff!.id, sendEmail: d.sendEmail,
    }),
    onSuccess: (r) => {
      refresh();
      toast.success(t('Login ban gaya'));
      if (d.sendEmail && !r.emailSent) toast.error(t('Email nahi gaya — parchi ya WhatsApp se dein'));
      setDone(true);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Login nahi bana'))),
  });
  if (done) {
    return <LoginSlipSheet title={t('Login ban gaya')} phone={p.person.phone} onClose={onClose}
      slip={{ name: p.person.fullName, email: d.email.trim(), password: d.password, role: t(ROLES[d.role].label), branch: shops.find((s) => s.id === d.shopId)?.name ?? null }} />;
  }
  return (
    <Sheet open onClose={onClose} height={0.92} title={t('{{fullName}} ko login dein', { fullName: p.person.fullName })} description={t('HR record wohi rahega; login us se jur jayega')}
      footer={(
        <View style={{ gap: 6 }}>
          {problem && <Text size="xs" tone="warning">{problem}</Text>}
          <Button fullWidth loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Login banayein')}</Button>
        </View>
      )}>
      <LoginFields value={d} onChange={setD} shops={shops} />
    </Sheet>
  );
}

/** Owner sets a new password; the member is signed out everywhere. */
export function ResetPasswordSheet({ p, onClose }: { p: Profile; onClose: () => void }) {
  const [password, setPassword] = useState(makePassword);
  const [done, setDone] = useState(false);
  const login = p.login!;
  const save = useMutation({
    mutationFn: () => peopleApi.resetPassword(login.id, password),
    onSuccess: (r) => { toast.success(r.sessionsClosed ? t('Password badal gaya — {{sessionsClosed}} device se logout', { sessionsClosed: r.sessionsClosed }) : t('Password badal gaya')); setDone(true); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Password nahi badla'))),
  });
  if (done) {
    return <LoginSlipSheet title={t('Naya password')} phone={p.person.phone} onClose={onClose}
      slip={{ name: p.person.fullName, email: login.email, password, role: ROLES[login.role as keyof typeof ROLES] ? t(ROLES[login.role as keyof typeof ROLES].label) : login.role, branch: login.shop?.name ?? null }} />;
  }
  return (
    <Sheet open onClose={onClose} title={t('Naya password dein')} description={t('{{fullName}} ka purana password band ho jayega aur woh har device se logout hoga', { fullName: p.person.fullName })}
      footer={<Button fullWidth loading={save.isPending} disabled={password.length < 8} onPress={() => save.mutate()}>{t('Password badlein')}</Button>}>
      <Input label={t('Naya password')} value={password} onChangeText={setPassword} autoCapitalize="none" autoCorrect={false} ltr
        hint={t('Kam az kam 8 harf. Agle step me Copy, Share aur WhatsApp ka button milega.')}
        trailing={<IconButton icon={RefreshCw} label={t('Naya password')} size="sm" onPress={() => setPassword(makePassword())} />} />
    </Sheet>
  );
}

const LEAVE_OPTIONS: Array<{ id: StaffStatus; label: string; hint: string }> = [
  { id: 'RESIGNED', label: msg('Khud chhor gaya'), hint: msg('Istifa diya ya kaam chhor diya') },
  { id: 'TERMINATED', label: msg('Kaam se hataya'), hint: msg('Dukaan ne kaam khatam kiya') },
  { id: 'SUSPENDED', label: msg('Kuch din ke liye band'), hint: msg('Wapas aa sakta hai') },
  { id: 'ON_LEAVE', label: msg('Lambi chhutti'), hint: msg('Haazri me chhutti dikhegi') },
];

/** Mark a person as gone, suspended or on leave, or bring them back. HR record and login are separate switches. */
export function StatusSheet({ p, back, onClose }: { p: Profile; back: boolean; onClose: () => void }) {
  const th = useTheme();
  const refresh = useRefreshPeople();
  const [status, setStatus] = useState<StaffStatus>(back ? 'ACTIVE' : 'RESIGNED');
  const [endDate, setEndDate] = useState(new Date());
  const login = p.login;
  const canLogin = !!login && p.viewer.owner && login.role !== 'OWNER';
  const [touchLogin, setTouchLogin] = useState(canLogin && (back ? !login!.isActive : login!.isActive));
  const leaving = status === 'RESIGNED' || status === 'TERMINATED';
  const save = useMutation({
    mutationFn: async () => {
      if (p.staff && p.viewer.manage) await peopleApi.setStatus(p.staff.id, status, leaving ? endDate.toISOString().slice(0, 10) : undefined);
      if (touchLogin && canLogin) await peopleApi.setActive(login!.id, back);
    },
    onSuccess: () => { refresh(); toast.success(back ? t('Wapas kaam par') : t('Haal badal gaya')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const nothing = (!p.staff || !p.viewer.manage) && !touchLogin;
  const h = p.history;
  const history = h?.any ? [h.sales && t('{{count}} bill', { count: h.sales }), h.returns && t('{{count}} return', { count: h.returns }), h.shifts && t('{{count}} shift', { count: h.shifts }), h.expenses && t('{{count}} expenses', { count: h.expenses }), h.purchases && t('{{count}} purchase', { count: h.purchases })].filter(Boolean).join(', ') : '';
  return (
    <Sheet open onClose={onClose} height={0.85} title={back ? t('{{fullName}} wapas kaam par', { fullName: p.person.fullName }) : t('{{fullName}} — kaam ka haal', { fullName: p.person.fullName })}
      description={t('Kuch mitta nahi — sale, tankhwah aur commission ka hisaab waisa hi rehta hai')}
      footer={<Button fullWidth variant={back ? 'primary' : 'danger'} loading={save.isPending} disabled={nothing} onPress={() => save.mutate()}>{back ? t('Wapas laayein') : t('Haal badlein')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        {p.staff && p.viewer.manage && !back && (
          <ListGroup>
            {LEAVE_OPTIONS.map((o) => <ListRow key={o.id} title={t(o.label)} subtitle={t(o.hint)} selected={status === o.id} onPress={() => setStatus(o.id)} />)}
          </ListGroup>
        )}
        {p.staff && p.viewer.manage && leaving && !back && (
          <DatePicker label={t('Aakhri din')} value={endDate} onChange={setEndDate} maximumDate={new Date()} hint={t('Tankhwah ka hisaab is din tak banega')} />
        )}
        {p.staff && !p.viewer.manage && <Text size="sm" tone="muted">{t('HR record ka haal badalne ke liye "Staff sambhalna" ki permission chahiye.')}</Text>}
        {canLogin && (
          <Switch value={touchLogin} onChange={setTouchLogin} disabled={back ? login!.isActive : !login!.isActive}
            label={back ? (login!.isActive ? t('Login pehle se chalu hai') : t('Login bhi chalu karein')) : (login!.isActive ? t('Login bhi band karein') : t('Login pehle se band hai'))}
            description={back ? t('Banda phir se app khol sakega') : t('Har device se foran logout — app nahi khul sakegi')} />
        )}
        {!back && !!history && <Card tone="muted"><Text size="xs" tone="secondary">{t('Is ke naam {{value}} hain. Yeh sab waisa hi rahega — record kabhi mitaya nahi jata.', { value: history })}</Text></Card>}
        {!back && login?.isActive && !canLogin && (
          <Card tone="warning">
            <Row gap={2} align="start"><Icon icon={AlertTriangle} size={16} tone="warning" /><Text size="xs" style={{ flex: 1 }}>{t('Is ka login abhi chalu hai. Login sirf malik band kar sakta hai.')}</Text></Row>
          </Card>
        )}
      </View>
    </Sheet>
  );
}
