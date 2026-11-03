/**
 * One person: role, branch, whether on duty, sales; tabs for overview,
 * permissions, branches, attendance, salary and commission, logins and
 * devices, and activity. From the top: edit, call, WhatsApp, give a login,
 * new password, mark as left or bring back.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, KeyRound, LogIn, MessageCircle, Pencil, Phone, Undo2, UserMinus } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Avatar, Button, DetailTemplate, Row, StatusPill, Tabs, Text, useTheme } from '@/design';
import { peopleApi } from '../api/people';
import { ActivityTab, AttendanceTab, BranchesTab, LoginsTab, OverviewTab, PayTab, PermissionsTab } from '../components/ProfileTabs';
import { GiveLoginSheet, ResetPasswordSheet, StatusSheet } from '../components/ProfileSheets';
import { PEOPLE_KEY, STATUS, ago, cleanPhone, day, roleOf, salaryTypeOf, tenure, time, waLink } from '../lib/meta';

type Tab = 'overview' | 'permissions' | 'branches' | 'attendance' | 'pay' | 'logins' | 'activity';

export function StaffProfileScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>((['permissions', 'branches', 'attendance', 'pay', 'logins', 'activity'] as string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'overview');
  const [modal, setModal] = useState<null | 'login' | 'password' | 'leave' | 'back'>(null);
  const q = useQuery({ queryKey: [PEOPLE_KEY, 'profile', id], queryFn: () => peopleApi.profile(id!), enabled: !!id });
  const p = q.data;

  const person = p?.person;
  const role = roleOf(person?.role);
  const st = person ? STATUS[person.status] : null;
  const phone = cleanPhone(person?.phone);
  const canEdit = !!p && (p.viewer.manage || (p.viewer.owner && p.person.hasLogin));
  const away = person ? person.status === 'LEFT' || person.status === 'INACTIVE' || person.status === 'ON_LEAVE' : false;
  const ownerTarget = person?.role === 'OWNER';
  const canStatus = !!p && !ownerTarget && ((!!p.staff && p.viewer.manage) || (p.viewer.owner && !!p.login));

  return (
    <DetailTemplate
      title={person?.fullName ?? t('Staff')}
      subtitle={person ? [person.designation, person.staffNumber].filter(Boolean).join(' · ') || undefined : undefined}
      loading={q.isLoading}
      error={q.isError && !p ? q.error : (!q.isLoading && !p ? new Error('not found') : undefined)}
      onRetry={q.refetch}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
      actions={canEdit ? <Button size="sm" variant="soft" icon={Pencil} onPress={() => router.push(`/staff/${id}/edit` as never)}>{t('Edit')}</Button> : undefined}
    >
      {p && person && st && (
        <>
          <View style={{ gap: th.space(3) }}>
            <Row gap={3}>
              <Avatar name={person.fullName} url={person.avatarUrl} size={64} />
              <View style={{ flex: 1, gap: 6 }}>
                <Row gap={1} wrap>
                  <StatusPill tone={role.tone}>{t(role.label)}</StatusPill>
                  {person.status !== 'ACTIVE' && <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>}
                </Row>
                <Text size="sm" tone="muted">{person.shop?.name ?? t('Sab branches')}</Text>
                {p.onDuty && (
                  <Row gap={1}><Clock size={14} color={th.colors.success.solid} /><Text size="xs" tone="success" weight="semibold">{t('Duty par · {{since}} se', { since: time(p.onDuty.since) })}</Text></Row>
                )}
              </View>
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              {[
                p.sales && { label: t('Aaj ki sale'), value: formatMoney(p.sales.today.sales), hint: t('{{count}} bill', { count: p.sales.today.bills }) },
                { label: t('Kab se'), value: tenure(person.joinDate), hint: day(person.joinDate) },
                { label: t('Aakhri login'), value: p.login ? ago(p.login.lastLoginAt) : person.hasLogin ? '—' : t('Login nahi') },
                { label: t('Is mahine haazri'), value: p.attendance ? t('{{count}} din', { count: p.attendance.present }) : '—', hint: p.attendance?.absent ? t('{{absent}} ghair haazir', { absent: p.attendance.absent }) : undefined },
                { label: t('Tankhwah'), value: p.salary ? (p.salary.salaryType === 'COMMISSION' ? t('Commission') : formatMoney(p.salary.baseSalary)) : '—', hint: p.salary?.unpaid ? t('{{unpaid}} baqi', { unpaid: formatMoney(p.salary.unpaid) }) : p.salary ? salaryTypeOf(p.salary.salaryType).label : undefined },
              ].filter(Boolean).map((s) => {
                const x = s as { label: string; value: string; hint?: string };
                return (
                  <View key={x.label} style={{ flexGrow: 1, flexBasis: '30%', backgroundColor: th.colors.surface, borderRadius: th.radius('lg'), borderWidth: 0.5, borderColor: th.colors.border, padding: th.space(3), gap: 2 }}>
                    <Text size="2xs" tone="muted" numberOfLines={1}>{x.label}</Text>
                    <Text weight="bold" numberOfLines={1}>{x.value}</Text>
                    {!!x.hint && <Text size="2xs" tone="muted" numberOfLines={1}>{x.hint}</Text>}
                  </View>
                );
              })}
            </View>
            <Row gap={2} wrap>
              {phone && <Button size="sm" variant="secondary" icon={Phone} onPress={() => void Linking.openURL(`tel:${phone}`)}>{t('Call')}</Button>}
              {phone && <Button size="sm" variant="success" icon={MessageCircle} onPress={() => void Linking.openURL(waLink(phone))}>{t('WhatsApp')}</Button>}
              {p.viewer.owner && !person.hasLogin && !!p.staff && person.status !== 'LEFT' && <Button size="sm" variant="secondary" icon={LogIn} onPress={() => setModal('login')}>{t('Login dein')}</Button>}
              {p.viewer.owner && !!p.login && !ownerTarget && <Button size="sm" variant="secondary" icon={KeyRound} onPress={() => setModal('password')}>{t('Naya password')}</Button>}
              {canStatus && (away
                ? <Button size="sm" variant="secondary" icon={Undo2} onPress={() => setModal('back')}>{t('Wapas kaam par')}</Button>
                : <Button size="sm" variant="secondary" icon={UserMinus} onPress={() => setModal('leave')}>{t('Chhutti / chhor gaya')}</Button>)}
            </Row>
          </View>

          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'overview', label: t('Khulasa') },
            { value: 'permissions', label: t('Permissions'), count: p.login && !ownerTarget ? p.login.permissions.length : undefined },
            { value: 'branches', label: t('Branch') },
            { value: 'attendance', label: t('Haazri') },
            { value: 'pay', label: t('Tankhwah') },
            { value: 'logins', label: t('Login aur devices'), count: p.sessions.length || undefined },
            { value: 'activity', label: t('Activity') },
          ]} />

          {tab === 'overview' && <OverviewTab p={p} />}
          {tab === 'permissions' && <PermissionsTab p={p} />}
          {tab === 'branches' && <BranchesTab p={p} />}
          {tab === 'attendance' && <AttendanceTab p={p} />}
          {tab === 'pay' && <PayTab p={p} />}
          {tab === 'logins' && <LoginsTab p={p} onResetPassword={() => setModal('password')} />}
          {tab === 'activity' && <ActivityTab p={p} />}

          {modal === 'login' && <GiveLoginSheet p={p} onClose={() => setModal(null)} />}
          {modal === 'password' && p.login && <ResetPasswordSheet p={p} onClose={() => setModal(null)} />}
          {(modal === 'leave' || modal === 'back') && <StatusSheet p={p} back={modal === 'back'} onClose={() => setModal(null)} />}
        </>
      )}
    </DetailTemplate>
  );
}
