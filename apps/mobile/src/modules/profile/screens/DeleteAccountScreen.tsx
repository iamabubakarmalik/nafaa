/**
 * Delete my account (required by the App Store).
 *
 * Owner: deleting the account means deleting the whole business, so this is
 * the business deletion of the web Danger zone (confirmation text + password,
 * 7 days to change the mind). Everyone else: a request that is recorded and
 * shown to the owner; nothing is deleted at once and it can be cancelled.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Database, LogOut, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { isOwner } from '@/core/permissions';
import { Button, Card, FormSection, FormTemplate, Icon, Input, PasswordInput, Row, Screen, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { profileApi } from '../api/profile';
import { signOut, signOutAndWipe } from '../lib/logout';

const BUSINESS_TEXT = 'DELETE MY SHOP';
const ACCOUNT_TEXT = 'DELETE MY ACCOUNT';

export function DeleteAccountScreen() {
  const user = useAuthStore((s) => s.user);
  return isOwner(user?.role) ? <DeleteBusiness /> : <DeleteMyAccount />;
}

function Consequences({ items }: { items: string[] }) {
  const th = useTheme();
  return (
    <Card tone="danger" title={t('Soch samajh kar')}>
      <View style={{ gap: th.space(2) }}>
        {items.map((x) => (
          <Row key={x} gap={2} align="start"><Icon icon={AlertTriangle} size={15} tone="danger" /><Text size="sm" style={{ flex: 1 }}>{x}</Text></Row>
        ))}
      </View>
    </Card>
  );
}

function DeleteBusiness() {
  const th = useTheme();
  const online = useOnlineStatus();
  const tenant = useAuthStore((s) => s.tenant);
  // Google / Apple only owners have no password: the typed text is the check.
  const hasPassword = useAuthStore((s) => s.user?.hasPassword !== false);
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(tenant?.status === 'SUSPENDED');

  const del = useMutation({
    mutationFn: () => profileApi.deleteBusiness(text, hasPassword ? password : undefined),
    onSuccess: () => { setSent(true); toast.success(t('Delete ki darkhwast lag gayi — 7 din me cancel kar sakte hain')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Delete nahi hua'))),
  });
  const cancel = useMutation({
    mutationFn: profileApi.cancelBusinessDeletion,
    onSuccess: () => { setSent(false); setText(''); setPassword(''); toast.success(t('Delete cancel ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Cancel nahi hua'))),
  });

  const ready = text === BUSINESS_TEXT && (!hasPassword || password.length >= 4);
  const submit = async () => {
    if (!online) { toast.warning(onlineNeededText('settings')); return; }
    const ok = await confirm({ title: t('Poora business delete karein?'), message: t('Ye aap ke account, team aur poore data par asar karega.'), tone: 'danger', confirmLabel: t('Haan, delete karein') });
    if (ok) del.mutate();
  };

  if (sent) {
    return (
      <Screen title={t('Delete my account')}>
        <Card tone="warning" title={t('Delete ki darkhwast lag gayi')}>
          <Text size="sm">{t('7 din me business ka data permanently delete ho jayega. Tab tak aap ye darkhwast cancel kar sakte hain.')}</Text>
        </Card>
        <Button variant="secondary" icon={Undo2} loading={cancel.isPending} onPress={() => (online ? cancel.mutate() : toast.warning(onlineNeededText('settings')))}>{t('Delete cancel karein')}</Button>
        <Button variant="ghost" icon={LogOut} onPress={() => void signOutAndWipe().then(() => router.replace('/' as never))}>{t('Logout')}</Button>
      </Screen>
    );
  }

  return (
    <FormTemplate title={t('Delete my account')} saveLabel={t('Business delete karein')} saving={del.isPending} saveDisabled={!ready} onSave={() => void submit()}>
      <Consequences items={[
        t('Aap malik hain, is liye account delete karne ka matlab poora business delete karna hai.'),
        t('Saari branches, products, bills, khata aur reports.'),
        t('Aap ki team ke sab logins band ho jayenge.'),
        t('Yahan ke kaam wapas nahi hote — pehle Backup le lein.'),
      ]} />
      <Button variant="secondary" icon={Database} onPress={() => router.push('/backup' as never)}>{t('Backup')}</Button>
      <FormSection title={t('Tasdeeq')}>
        <Input label={t('Likhein: {{text}}', { text: BUSINESS_TEXT })} value={text} onChangeText={setText} autoCapitalize="characters" autoCorrect={false} ltr />
        {hasPassword && <PasswordInput label={t('Password')} value={password} onChangeText={setPassword} />}
        <Text size="xs" tone="muted" style={{ marginTop: -th.space(1) }}>{t('Delete ki darkhwast ke baad 7 din ki mohlat hai.')}</Text>
      </FormSection>
    </FormTemplate>
  );
}

function DeleteMyAccount() {
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const user = useAuthStore((s) => s.user);
  const hasPassword = user?.hasPassword !== false;
  const [password, setPassword] = useState('');
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');

  const status = useQuery({ queryKey: ['account-deletion'], queryFn: profileApi.deletionStatus });
  const refresh = () => qc.invalidateQueries({ queryKey: ['account-deletion'] });
  const request = useMutation({
    mutationFn: () => profileApi.requestDeletion(hasPassword ? { currentPassword: password, reason: reason.trim() || undefined } : { confirmation: text, reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success(t('Delete ki darkhwast lag gayi')); setPassword(''); setText(''); void refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Darkhwast nahi lagi'))),
  });
  const cancel = useMutation({
    mutationFn: profileApi.cancelDeletion,
    onSuccess: () => { toast.success(t('Delete ki darkhwast cancel ho gayi')); void refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Cancel nahi hua'))),
  });

  const pending = status.data?.requested;
  const ready = hasPassword ? password.length >= 4 : text === ACCOUNT_TEXT;
  const submit = async () => {
    if (!online) { toast.warning(onlineNeededText('settings')); return; }
    const ok = await confirm({ title: t('Account delete karein?'), message: t('Aap ka login 30 din me hamesha ke liye band kar diya jayega.'), tone: 'danger', confirmLabel: t('Haan, delete karein') });
    if (ok) request.mutate();
  };

  if (pending) {
    return (
      <Screen title={t('Delete my account')} refreshing={status.isRefetching} onRefresh={() => void status.refetch()}>
        <Card tone="warning" title={t('Delete ki darkhwast lag gayi')}>
          <Text size="sm">{t('Aap ka account {{date}} tak delete ho jayega. Tab tak ye darkhwast cancel kar sakte hain.', { date: status.data?.scheduledFor ? formatDate(status.data.scheduledFor, { year: true }) : '' })}</Text>
        </Card>
        <Button variant="secondary" icon={Undo2} loading={cancel.isPending} onPress={() => (online ? cancel.mutate() : toast.warning(onlineNeededText('settings')))}>{t('Delete cancel karein')}</Button>
        <Button variant="ghost" icon={LogOut} onPress={() => void signOut()}>{t('Logout')}</Button>
      </Screen>
    );
  }

  return (
    <FormTemplate title={t('Delete my account')} saveLabel={t('Account delete karein')} saving={request.isPending} saveDisabled={!ready} onSave={() => void submit()}>
      <Consequences items={[
        t('Aap ka login hamesha ke liye band ho jayega.'),
        t('Business ka data (bills, products, khata) business ke malik ke paas rahega.'),
        t('Malik ko is darkhwast ki khabar di jayegi.'),
        t('Darkhwast ke baad 30 din tak aap isay cancel kar sakte hain.'),
      ]} />
      <FormSection title={t('Tasdeeq')}>
        {hasPassword
          ? <PasswordInput label={t('Password')} value={password} onChangeText={setPassword} />
          : <Input label={t('Likhein: {{text}}', { text: ACCOUNT_TEXT })} value={text} onChangeText={setText} autoCapitalize="characters" autoCorrect={false} ltr />}
        <TextArea label={t('Wajah (zaroori nahi)')} value={reason} onChangeText={setReason} />
      </FormSection>
    </FormTemplate>
  );
}
