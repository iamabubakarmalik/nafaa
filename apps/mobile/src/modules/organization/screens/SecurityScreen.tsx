/**
 * Settings → Security & PIN: the security score, the owner's PIN, the pages
 * locked behind it, the account password, signed-in devices (each can be
 * signed out) and the latest security-related activity.
 */

import { router } from 'expo-router';
import { Activity, CheckCircle2, KeyRound, Lock, LogOut, Plus, Smartphone, TriangleAlert } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { t, msg } from '@/core/i18n';
import { formatDateTime } from '@/core/format';
import { isOwner, PERMISSIONS as P, usePermissions } from '@/core/permissions';
import {
  Badge, Button, Card, Checkbox, Chip, EmptyState, Icon, Input, ListRow, ProgressBar, Row, Screen, SettingLink, SettingSwitch, SettingsGroup, Skeleton, Text, confirm, toast, useTheme,
} from '@/design';
import { securityApi, type TenantSession } from '../api/organization';
import { AccountPasswordCard } from '../components/AccountPasswordCard';
import { PinSheet } from '../components/PinSheet';

const CHECK_LABELS: Record<string, string> = {
  managerPin: msg('Malik ka PIN laga hai'),
  refundPin: msg('Return par PIN'),
  voidPin: msg('Bill cancel par PIN'),
  emailVerified: msg('Malik ka email verify hai'),
  passwordSet: msg('Password laga hai'),
};

/** Pages that can be locked (web paths, shared with the web app). */
const LOCKABLE: Array<{ group: string; items: Array<{ path: string; label: string; hint: string }> }> = [
  { group: msg('Paisa'), items: [
    { path: '/khata', label: msg('Khata / Udhaar'), hint: msg('Kis ka kitna baqi hai') },
    { path: '/expenses', label: msg('Expenses'), hint: msg('Store ka har Expense') },
    { path: '/cash-register', label: msg('Cash register'), hint: msg('Din ka cash') },
    { path: '/suppliers', label: msg('Suppliers'), hint: msg('Kis ko kitna dena hai') },
  ] },
  { group: msg('Hisaab aur reports'), items: [
    { path: '/reports', label: msg('Reports'), hint: msg('Sab reports — andar ke pages bhi') },
    { path: '/dashboard', label: msg('Dashboard'), hint: msg('Din bhar ka khulasa') },
    { path: '/analytics', label: msg('Analytics'), hint: msg('Profit ka tafseeli hisaab') },
  ] },
  { group: msg('Maal'), items: [
    { path: '/products', label: msg('Products'), hint: msg('Cost aur rate') },
    { path: '/purchases', label: msg('Purchase'), hint: msg('Kis se kitne ka maal aaya') },
    { path: '/inventory', label: msg('Stock'), hint: msg('Kitna maal para hai') },
  ] },
  { group: msg('Intezam'), items: [
    { path: '/settings', label: msg('Settings'), hint: msg('Store ki saari settings') },
    { path: '/staff', label: msg('Staff'), hint: msg('Staff aur tankhwah') },
    { path: '/sales', label: msg('Sales history'), hint: msg('Purane bill') },
  ] },
];
const UNLOCK_MINUTES = [5, 15, 30, 60, 120];

export function SecurityScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { can, role } = usePermissions();
  const manage = isOwner(role) || can(P.SETTINGS_MANAGE);
  const [pinOpen, setPinOpen] = useState(false);

  const status = useQuery({ queryKey: ['pin-status'], queryFn: securityApi.status });
  const score = useQuery({ queryKey: ['security-score'], queryFn: securityApi.score });
  const sessions = useQuery({ queryKey: ['tenant-sessions'], queryFn: securityApi.sessions });
  const activity = useQuery({
    queryKey: ['security-activity'],
    queryFn: () => apiClient.get('/settings/security/activity-log', { params: { limit: 10 } }).then((r) => (r.data?.data ?? r.data) as Array<{ id: string; action: string; description?: string; createdAt: string; user?: { fullName?: string } }>),
    retry: false,
  });
  const st = status.data;
  const hasPin = !!st?.hasPin;

  const [picked, setPicked] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [custom, setCustom] = useState('');
  useEffect(() => { if (st && !dirty) setPicked(st.lockedRoutes ?? []); }, [st]); // eslint-disable-line react-hooks/exhaustive-deps

  const prefs = useMutation({
    mutationFn: (body: { unlockMinutes?: number; hideCostByDefault?: boolean }) => securityApi.updatePrefs(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pin-status'] }); toast.success(t('Save ho gaya')); },
  });
  const saveLocks = useMutation({
    mutationFn: () => securityApi.setLockedRoutes(picked),
    onSuccess: (r) => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['pin-status'] });
      qc.invalidateQueries({ queryKey: ['security-score'] });
      toast.success(r.lockedRoutes.length ? t('{{count}} pages lock ho gaye', { count: r.lockedRoutes.length }) : t('Sab pages ka lock hat gaya'));
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => securityApi.revokeSession(id),
    onSuccess: () => { toast.success(t('Device se logout ho gaya')); sessions.refetch(); },
  });

  const toggle = (path: string) => { setPicked((p) => (p.includes(path) ? p.filter((x) => x !== path) : [...p, path])); setDirty(true); };
  const addCustom = () => {
    let v = custom.trim();
    if (!v) return;
    if (!v.startsWith('/')) v = `/${v}`;
    if (picked.includes(v)) return toast.error(t('Yeh page pehle se list me hai'));
    setPicked((p) => [...p, v]); setCustom(''); setDirty(true);
  };
  const known = useMemo(() => new Set(LOCKABLE.flatMap((g) => g.items.map((i) => i.path))), []);
  const extra = picked.filter((p) => !known.has(p));

  const sc = score.data;
  const pct = sc?.score ?? 0;
  const tone = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
  const level = sc ? ({ STRONG: t('Mazboot'), MEDIUM: t('Theek'), WEAK: t('Kamzor') } as const)[sc.level] : '';

  const refetchAll = () => { status.refetch(); score.refetch(); sessions.refetch(); activity.refetch(); };

  if (!manage) return <Screen title={t('Security & PIN')}><EmptyState title={t('Yeh safha sirf malik ke liye hai')} /></Screen>;

  return (
    <Screen title={t('Security & PIN')} narrow refreshing={status.isRefetching} onRefresh={refetchAll}>
      {score.isLoading ? <Skeleton height={120} radius={16} /> : sc && (
        <Card title={t('Security score')} description={t('Jitne kaam poore, utna store mehfooz')} action={<Badge tone={tone}>{level}</Badge>}>
          <View style={{ gap: th.space(2) }}>
            <Row align="center" gap={3}>
              <Text size="4xl" weight="bold" ltr>{`${pct}%`}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <ProgressBar value={pct / 100} tone={tone} height={10} />
                <Text size="xs" tone="muted">{sc.recommendations.length ? t('{{count}} kaam baqi hain', { count: sc.recommendations.length }) : t('Sab kaam poore — shabaash!')}</Text>
              </View>
            </Row>
            {sc.checks.map((c) => (
              <Row key={c.key} gap={2} align="center">
                <Icon icon={c.done ? CheckCircle2 : TriangleAlert} size={16} tone={c.done ? 'success' : 'warning'} />
                <Text size="sm" style={{ flex: 1 }} tone={c.done ? 'default' : 'secondary'}>{CHECK_LABELS[c.key] ? t(CHECK_LABELS[c.key]) : c.label}</Text>
                <Text size="xs" weight="semibold" tone={c.done ? 'success' : 'muted'} ltr>{`+${c.weight}%`}</Text>
              </Row>
            ))}
          </View>
        </Card>
      )}

      <SettingsGroup title={t('Malik ka PIN')} footnote={hasPin ? t('PIN aap ke account ke saath mehfooz hai, kisi ek phone ya computer ke saath nahi. Har device par wohi PIN chalta hai.') : t('PIN ke bagair maal ki Cost aur Profit har us bande ko dikhta hai jo app khol le. PIN lagate hi Cost chhup jati hai — aur jo pages aap chunein woh bhi band ho jate hain.')}>
        <SettingLink icon={KeyRound} label={hasPin ? t('PIN badlein ya hatayein') : t('PIN lagayein')}
          description={hasPin ? undefined : t('PIN lagana behtar hai')} value={hasPin ? t('Laga hua') : t('Nahi laga')} onPress={() => setPinOpen(true)} />
        {hasPin && (
          <>
            <View style={{ padding: th.space(3), gap: th.space(2) }}>
              <Text size="sm" weight="medium">{t('PIN kitni der khula rahe')}</Text>
              <Row gap={2} wrap>
                {UNLOCK_MINUTES.map((m) => <Chip key={m} label={m < 60 ? t('{{m}} min', { m }) : t('{{value}} ghanta', { value: m / 60 })} selected={(st?.unlockMinutes ?? 15) === m} onPress={() => prefs.mutate({ unlockMinutes: m })} />)}
              </Row>
              <Text size="xs" tone="muted">{t('Ek dafa PIN daalne ke baad itne minute tak dobara nahi maanga jata.')}</Text>
            </View>
            <SettingSwitch label={t('Cost pehle se chhupi rahe')} description={t('Har naye device par Cost aur Profit PIN ke baghair nahi dikhte')} value={!!st?.hideCostByDefault} onChange={(v) => prefs.mutate({ hideCostByDefault: v })} />
          </>
        )}
      </SettingsGroup>

      <Card title={t('Locked pages')} description={t('Jo page aap chunein woh PIN ke bagair nahi khulega')}
        action={picked.length > 0 ? <Badge tone="info">{t('{{count}} lock', { count: picked.length })}</Badge> : undefined}>
        {!hasPin ? (
          <Text size="sm" tone="warning">{t('Bina PIN ke page lock karne ka matlab hai khud ko bahar band kar lena — koi khol hi nahi sakega. Upar se pehle PIN lagayein.')}</Text>
        ) : (
          <View style={{ gap: th.space(3) }}>
            {LOCKABLE.map((g) => (
              <View key={g.group} style={{ gap: th.space(1) }}>
                <Text size="xs" weight="bold" tone="muted" uppercase>{t(g.group)}</Text>
                {g.items.map((i) => <Checkbox key={i.path} value={picked.includes(i.path)} onChange={() => toggle(i.path)} label={t(i.label)} description={t(i.hint)} />)}
              </View>
            ))}
            <Input label={t('Koi aur page')} value={custom} onChangeText={setCustom} autoCapitalize="none" autoCorrect={false} ltr placeholder="/appliances/profit-report"
              hint={t('Apni industry ka page, jaise /appliances/reports')} onSubmitEditing={addCustom}
              trailing={<Button size="sm" variant="secondary" icon={Plus} onPress={addCustom}>{t('Add')}</Button>} />
            {extra.length > 0 && <Row gap={2} wrap>{extra.map((p) => <Chip key={p} label={`${p}  ✕`} selected onPress={() => toggle(p)} />)}</Row>}
            {dirty && (
              <Row gap={2}>
                <Button variant="secondary" onPress={() => { setPicked(st?.lockedRoutes ?? []); setDirty(false); }}>{t('Cancel')}</Button>
                <Button style={{ flex: 1 }} icon={Lock} loading={saveLocks.isPending} onPress={() => saveLocks.mutate()}>{t('{{count}} pages lock karein', { count: picked.length })}</Button>
              </Row>
            )}
          </View>
        )}
      </Card>

      <AccountPasswordCard />

      <SettingsGroup title={t('Active devices')} footnote={t('Jin devices par login hai')}>
        {sessions.isLoading ? <View style={{ padding: th.space(3) }}><Skeleton height={44} /></View>
          : !sessions.data?.length ? <ListRow icon={Smartphone} title={t('Koi aur device login nahi hai.')} />
            : sessions.data.map((s: TenantSession) => (
              <ListRow key={s.id} icon={Smartphone} title={s.deviceName || t('Device')}
                subtitle={`${s.user?.fullName || t('User')} · ${s.location || s.ipAddress || t('Jagah maloom nahi')}${s.lastActiveAt ? ` · ${formatDateTime(s.lastActiveAt)}` : ''}`}
                trailing={<Icon icon={LogOut} size={18} tone="danger" flip />}
                onPress={async () => { if (await confirm({ title: t('Is device se logout karein?'), message: t('Wahan dobara login karna hoga.'), tone: 'danger', confirmLabel: t('Logout') })) revoke.mutate(s.id); }} />
            ))}
      </SettingsGroup>

      {!!activity.data?.length && (
        <SettingsGroup title={t('Haal ki activity')}>
          {activity.data.map((a) => (
            <ListRow key={a.id} icon={Activity} title={a.action} subtitle={`${a.description ? `${a.description} · ` : ''}${a.user?.fullName || t('System')} · ${formatDateTime(a.createdAt)}`} dense />
          ))}
          <SettingLink label={t('Poora log')} onPress={() => router.push('/activity-log' as never)} />
        </SettingsGroup>
      )}

      <PinSheet open={pinOpen} hasPin={hasPin} onClose={() => setPinOpen(false)} />
    </Screen>
  );
}
