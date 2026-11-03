/** One customer in the directory and the khata book: who, how much they owe or hold, and for how long. */

import { Check, CloudOff, Crown, MessageCircle, Phone, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { balanceState } from '@nafaa/core/customers';
import { t } from '@/core/i18n';
import { Amount, Avatar, Badge, ListRow, Row, SwipeRow, Text, useTheme, type SwipeAction } from '@/design';
import type { DirectoryCustomer } from '../api/customers';

export function CustomerRow({ c, selected, selecting, showAge, onPress, onLongPress, onWhatsApp, onCall, onPayment }: {
  c: DirectoryCustomer;
  selected?: boolean;
  selecting?: boolean;
  showAge?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onWhatsApp?: () => void;
  onCall?: () => void;
  onPayment?: () => void;
}) {
  const th = useTheme();
  const state = balanceState(c.balance);
  const end: SwipeAction[] = [
    ...(c.phone && onWhatsApp ? [{ icon: MessageCircle, label: t('WhatsApp'), tone: 'success' as const, onPress: onWhatsApp }] : []),
    ...(c.phone && onCall ? [{ icon: Phone, label: t('Call'), tone: 'info' as const, onPress: onCall }] : []),
  ];
  const start: SwipeAction[] = state === 'owes' && onPayment ? [{ icon: Wallet, label: t('Payment'), tone: 'success', onPress: onPayment }] : [];
  const sub = [c.phone, [c.area, c.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  const avatar = (
    <View>
      <Avatar name={c.name} url={c.avatarUrl ?? undefined} size={42} />
      {selected && (
        <View style={{ position: 'absolute', inset: 0, borderRadius: 21, backgroundColor: th.colors.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={22} color={th.colors.brand.onSolid} />
        </View>
      )}
      {c.isVip && !selected && (
        <View style={{ position: 'absolute', end: -4, top: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: th.colors.warning.solid, alignItems: 'center', justifyContent: 'center' }}>
          <Crown size={10} color={th.colors.warning.onSolid} />
        </View>
      )}
    </View>
  );
  return (
    <SwipeRow start={selecting ? [] : start} end={selecting ? [] : end}>
      <ListRow
        selected={selected}
        avatar={avatar}
        title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{c.name}</Text>
          {c.pending && <Badge tone="warning" icon={CloudOff}>{t('Waiting')}</Badge>}
          {!c.isActive && <Badge tone="neutral">{t('Band')}</Badge>}
          {c.overLimit && <Badge tone="danger">{t('Had se zyada')}</Badge>}</Row>}
        subtitle={sub ? <Text size="sm" tone="muted" ltr numberOfLines={1}>{sub}</Text> : undefined}
        trailing={state === 'clear' ? undefined : (
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Amount value={Math.abs(c.balance)} weight="bold" tone={state === 'owes' ? 'danger' : 'success'} />
            <Text size="2xs" tone="muted">{state === 'advance' ? t('Advance') : showAge && c.dueDays != null ? t('{{count}} din', { count: c.dueDays }) : t('baqi')}</Text>
          </View>
        )}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    </SwipeRow>
  );
}
