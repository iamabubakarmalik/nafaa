/**
 * Sync status chip for the top bar (online · offline · syncing N · issues)
 * and the sheet it opens. Reads useSyncStatus() from core/net, which the
 * offline engine fills in.
 */

import { CircleCheck, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { t } from '@/core/i18n';
import { useSyncStatus, type SyncState } from '@/core/net';
import { formatRelative } from '@/core/format/date';
import { Button, Icon, ListGroup, ListRow, PressableScale, Sheet, Text, useTheme, type StatusTone } from '@/design';
import { useShellUi } from '../hooks/useShellUi';

function Spinning({ children, on }: { children: ReactNode; on: boolean }) {
  const r = useSharedValue(0);
  useEffect(() => {
    if (on) r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
    else {
      cancelAnimation(r);
      r.value = 0;
    }
  }, [on, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const LOOK: Record<SyncState, { icon: typeof CloudOff; tone: StatusTone }> = {
  online: { icon: CircleCheck, tone: 'success' },
  offline: { icon: CloudOff, tone: 'warning' },
  syncing: { icon: RefreshCw, tone: 'info' },
  issues: { icon: TriangleAlert, tone: 'danger' },
};

export function syncLabel(state: SyncState, pending: number, issues: number): string {
  switch (state) {
    case 'offline': return t('Offline');
    case 'syncing': return t('Sync ho raha hai · {{count}}', { count: pending });
    case 'issues': return t('{{count}} masle', { count: issues });
    default: return t('Online');
  }
}

/** Top-bar chip. Online shows only a small tick; other states show a label too. */
export function SyncChip() {
  const th = useTheme();
  const { state, pending, issues } = useSyncStatus();
  const open = useShellUi((s) => s.open);
  const look = LOOK[state];
  const tc = th.colors[look.tone];
  const label = syncLabel(state, pending, issues);
  return (
    <PressableScale
      onPress={() => open('sync')}
      haptic="tap"
      accessibilityLabel={label}
      style={{
        height: 32, minWidth: 32, paddingHorizontal: state === 'online' ? 0 : th.space(2.5), borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
        backgroundColor: state === 'online' ? 'transparent' : tc.soft, borderWidth: state === 'online' ? 0 : 1, borderColor: tc.border,
      }}
    >
      <Spinning on={state === 'syncing'}><Icon icon={look.icon} size={16} color={tc.text} /></Spinning>
      {state !== 'online' && <Text size="xs" weight="semibold" color={tc.text} numberOfLines={1}>{label}</Text>}
    </PressableScale>
  );
}

export function SyncSheet() {
  const th = useTheme();
  const sheet = useShellUi((s) => s.sheet);
  const close = useShellUi((s) => s.close);
  const { state, pending, issues, lastSyncedAt, syncNow } = useSyncStatus();
  const online = state !== 'offline';
  return (
    <Sheet open={sheet === 'sync'} onClose={close} title={t('Sync & offline')}>
      <View style={{ gap: th.space(3) }}>
        <ListGroup>
          <ListRow icon={LOOK[state].icon} iconTone={LOOK[state].tone} title={syncLabel(state, pending, issues)} subtitle={online ? t('Sab kuch server se juda hua hai') : t('Kaam device par save ho raha hai')} />
          <ListRow icon={RefreshCw} iconTone="info" title={t('Baqi kaam')} trailing={<Text weight="bold" ltr>{String(pending)}</Text>} subtitle={lastSyncedAt ? t('Aakhri sync: {{when}}', { when: formatRelative(lastSyncedAt) }) : undefined} />
          {issues > 0 && <ListRow icon={TriangleAlert} iconTone="danger" title={t('Nahi ja sake')} trailing={<Text weight="bold" tone="danger" ltr>{String(issues)}</Text>} subtitle={t('Inhein dobara bhejein ya Support se rabta karein')} />}
        </ListGroup>
        {syncNow && <Button icon={RefreshCw} loading={state === 'syncing'} disabled={!online} onPress={syncNow} fullWidth>{t('Abhi sync karein')}</Button>}
      </View>
    </Sheet>
  );
}
