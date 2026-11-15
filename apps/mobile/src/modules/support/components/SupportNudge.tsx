/**
 * Home banner for a proactive message from the Nafaa team (a welcome or a
 * trial check-in): the team member's name and the first line; a tap opens
 * the chat. Each message is shown once: it counts as seen as soon as the
 * banner appears, and stays until tapped or closed in this session.
 */

import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Avatar, Icon, PressableScale, Text, useTheme } from '@/design';
import { SUPPORT_HREF } from '../lib/notify';
import { firstLine, markNudgeSeen, nudgeSeen, readProactive, type ProactiveNudge } from '../lib/proactive';
import { useSupportStore } from '../store';

export function SupportNudge() {
  const th = useTheme();
  const status = useSupportStore((s) => s.status);
  const [shown, setShown] = useState<ProactiveNudge | null>(null);

  useEffect(() => {
    const next = readProactive(status);
    if (!next || shown?.messageId === next.messageId || nudgeSeen(next.messageId)) return;
    markNudgeSeen(next.messageId);
    setShown(next);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  const name = shown.agentName ? t('{{name}} (Nafaa team)', { name: shown.agentName }) : t('Nafaa team');

  return (
    <PressableScale
      onPress={() => { setShown(null); router.push(SUPPORT_HREF as never); }}
      haptic="tap"
      accessibilityLabel={t('{{name}} ka message. Chat kholein', { name })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.brand.soft, borderWidth: 1, borderColor: th.colors.brand.border }}
    >
      <Avatar name={shown.agentName ?? 'Nafaa'} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" weight="semibold" tone="brand" numberOfLines={1}>{name}</Text>
        <Text size="sm" numberOfLines={2}>{firstLine(shown.text)}</Text>
        <Text size="2xs" tone="muted" style={{ marginTop: 2 }}>{t('Reply ke liye dabayein')}</Text>
      </View>
      <PressableScale onPress={() => setShown(null)} accessibilityLabel={t('Band karein')} hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={X} size={18} tone="muted" />
      </PressableScale>
    </PressableScale>
  );
}
