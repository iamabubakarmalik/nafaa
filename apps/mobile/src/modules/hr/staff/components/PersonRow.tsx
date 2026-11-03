/**
 * One person on the staff list: photo, role, job, branch, whether on duty
 * right now, last login and today's sales (when the viewer may see them).
 * Swipe for call and WhatsApp.
 */

import { router } from 'expo-router';
import { MessageCircle, Phone } from 'lucide-react-native';
import { memo } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { Amount, Avatar, ListRow, Row, StatusPill, SwipeRow, Text, useTheme } from '@/design';
import type { DirectoryPerson } from '../api/people';
import { STATUS, ago, cleanPhone, roleOf, time, waLink } from '../lib/meta';

function PersonRowBase({ p }: { p: DirectoryPerson }) {
  const th = useTheme();
  const role = roleOf(p.role);
  const st = STATUS[p.status];
  const phone = cleanPhone(p.phone);
  const gone = p.status === 'LEFT' || p.status === 'INACTIVE';
  const fact = p.onDuty
    ? t('Duty par · {{since}} se', { since: time(p.onDuty.since) })
    : p.todayAttendance === 'ABSENT' ? t('Aaj ghair haazir') : p.todayAttendance ? t('Aaj aaya tha') : null;
  const loginFact = p.login ? (p.login.isActive ? ago(p.login.lastLoginAt) : t('Login band')) : p.hasLogin ? t('Login hai') : t('Login nahi');

  const row = (
    <ListRow
      avatar={(
        <View>
          <Avatar name={p.fullName} url={p.avatarUrl} size={44} />
          <View style={{ position: 'absolute', end: -2, bottom: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: th.colors.surface, backgroundColor: p.onDuty ? th.colors.success.solid : th.colors[st.tone].solid }} />
        </View>
      )}
      title={p.fullName}
      subtitle={(
        <View style={{ gap: 4 }}>
          <Text size="xs" tone="muted" numberOfLines={1}>{[p.designation, p.staffNumber, p.shop?.name ?? t('Sab branches')].filter(Boolean).join(' · ')}</Text>
          <Row gap={1} wrap>
            <StatusPill tone={role.tone}>{t(role.label)}</StatusPill>
            {p.status !== 'ACTIVE' && <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>}
            {!!p.login?.isActive && p.login.neverLoggedIn && <StatusPill tone="info">{t('Login abhi nahi kiya')}</StatusPill>}
          </Row>
          <Text size="xs" tone={p.onDuty ? 'success' : 'muted'} weight={p.onDuty ? 'semibold' : 'regular'} numberOfLines={1}>{[fact, loginFact].filter(Boolean).join(' · ')}</Text>
        </View>
      )}
      trailing={p.today ? (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          {p.today.bills ? <Amount value={p.today.sales} size="sm" weight="bold" /> : <Text size="xs" tone="muted">{t('Aaj sale nahi')}</Text>}
          {p.today.bills > 0 && <Text size="2xs" tone="muted">{t('{{count}} bill', { count: p.today.bills })}</Text>}
        </View>
      ) : undefined}
      chevron
      onPress={() => router.push(`/staff/${p.id}` as never)}
      style={gone ? { opacity: 0.7 } : undefined}
    />
  );
  if (!phone) return row;
  return (
    <SwipeRow end={[
      { icon: Phone, label: t('Call'), tone: 'brand', onPress: () => void Linking.openURL(`tel:${phone}`) },
      { icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: () => void Linking.openURL(waLink(phone)) },
    ]}>{row}</SwipeRow>
  );
}
export const PersonRow = memo(PersonRowBase);
