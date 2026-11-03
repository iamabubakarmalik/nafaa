/**
 * One message in the chat. The question is a bubble; the answer shows the
 * streaming text, a progress line while tools run, charts, the reorder panel,
 * action cards, links, follow-up chips and the answer actions (copy,
 * WhatsApp, feedback, regenerate).
 */

import * as Clipboard from 'expo-clipboard';
import { ArrowUpRight, Check, Copy, MessageCircle, Pencil, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Linking, View } from 'react-native';
import { formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Icon, NafaaAiMark, PressableScale, Skeleton, Text, toast, useTheme } from '@/design';
import { AiActionCard } from './AiActionCard';
import { AiChartView } from './AiChartView';
import { AiMarkdown } from './AiMarkdown';
import { AiReorderPanel } from './AiReorderPanel';
import { openAiLink, plainAnswer } from '../lib/links';
import type { ChatMessage } from '../store';

interface Props {
  m: ChatMessage;
  isLast: boolean;
  streaming: boolean;
  canRegenerate: boolean;
  canEdit: boolean;
  onRegenerate: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onFeedback: (v: -1 | 0 | 1) => void;
  onAsk: (q: string) => void;
}

function ActionIcon({ icon, label, onPress, active, tone, disabled }: { icon: typeof Copy; label: string; onPress: () => void; active?: boolean; tone?: 'brand' | 'danger'; disabled?: boolean }) {
  const th = useTheme();
  const color = active ? (tone === 'danger' ? th.colors.danger.text : th.colors.brand.text) : th.colors.textMuted;
  return (
    <PressableScale onPress={onPress} disabled={disabled} haptic="tap" accessibilityLabel={label} accessibilityRole="button" style={{ width: 40, height: 36, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Icon icon={icon} size={17} color={color} />
    </PressableScale>
  );
}

export const MessageItem = memo(function MessageItem({ m, isLast, streaming, canRegenerate, canEdit, onRegenerate, onRetry, onEdit, onFeedback, onAsk }: Props) {
  const th = useTheme();
  const c = th.colors;
  const [copied, setCopied] = useState(false);

  if (m.role === 'user') {
    return (
      <View style={{ alignSelf: 'flex-end', maxWidth: '86%', alignItems: 'flex-end', gap: 2 }}>
        <View style={{ backgroundColor: c.brand.solid, paddingHorizontal: th.space(3.5), paddingVertical: th.space(2.5), borderRadius: th.radius('xl'), borderEndEndRadius: th.radius('sm') }}>
          <Text color={c.brand.onSolid} selectable>{m.content}</Text>
        </View>
        {canEdit && (
          <PressableScale onPress={onEdit} accessibilityLabel={t('Edit question')} haptic="tap" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
            <Icon icon={Pencil} size={13} tone="subtle" />
            <Text size="xs" tone="subtle">{t('Edit')}</Text>
          </PressableScale>
        )}
      </View>
    );
  }

  const done = !m.pending && !m.error && !!m.content;
  const primary = m.links.filter((l) => l.primary);
  const other = m.links.filter((l) => !l.primary);
  const retryable = isLast && !!m.error && !m.pending && m.error.code !== 'LIMIT' && m.error.code !== 'FORBIDDEN';

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(plainAnswer(m.content));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error(t('Copy nahi ho saka')); }
  };
  const share = () => { void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(plainAnswer(m.content))}`).catch(() => undefined); };

  return (
    <View style={{ flexDirection: 'row', gap: th.space(2.5), alignItems: 'flex-start' }}>
      <View style={{ marginTop: 2 }}><NafaaAiMark size={28} /></View>
      <View style={{ flex: 1, gap: th.space(2.5) }} accessibilityLiveRegion={isLast ? 'polite' : 'none'}>
        {m.pending && !m.content && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" tone="muted">{m.status ?? t('Soch raha hoon…')}</Text>
            <Skeleton height={12} width="80%" />
            <Skeleton height={12} width="55%" />
          </View>
        )}
        {!!m.content && <AiMarkdown text={m.content} />}
        {m.pending && !!m.content && !!m.status && <Text size="xs" tone="subtle">{m.status}</Text>}
        {m.error && (
          <View style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: c.warning.soft }}>
            <Text size="sm" tone="warning">{m.error.message}</Text>
            {retryable && <Button size="sm" variant="secondary" icon={RefreshCw} disabled={streaming} onPress={onRetry} style={{ alignSelf: 'flex-start' }}>{t('Dobara koshish')}</Button>}
          </View>
        )}
        {m.charts.map((ch, i) => <AiChartView key={i} chart={ch} />)}
        {m.reorder && <AiReorderPanel reorder={m.reorder} />}
        {m.actions.map((a) => <AiActionCard key={a.id} action={a} />)}
        {primary.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {primary.map((l) => <Button key={`${l.to}:${l.label}`} size="md" iconEnd={ArrowUpRight} iconEndFlip onPress={() => openAiLink(l)}>{l.label || t('Open')}</Button>)}
          </View>
        )}
        {other.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {other.map((l) => (
              <PressableScale key={`${l.to}:${l.label}`} onPress={() => openAiLink(l)} haptic="tap" accessibilityRole="link"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: th.space(3), borderRadius: th.radius('full'), backgroundColor: c.brand.soft }}>
                <Text size="sm" weight="semibold" tone="brand">{l.label}</Text>
                <Icon icon={ArrowUpRight} size={14} flip tone="brand" />
              </PressableScale>
            ))}
          </View>
        )}
        {done && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActionIcon icon={copied ? Check : Copy} label={t('Copy')} onPress={copy} active={copied} tone="brand" />
            <ActionIcon icon={MessageCircle} label={t('WhatsApp par bhejein')} onPress={share} />
            <ActionIcon icon={ThumbsUp} label={t('Acha jawab')} onPress={() => onFeedback(m.feedback === 1 ? 0 : 1)} active={m.feedback === 1} tone="brand" disabled={!m.saved} />
            <ActionIcon icon={ThumbsDown} label={t('Theek nahi')} onPress={() => onFeedback(m.feedback === -1 ? 0 : -1)} active={m.feedback === -1} tone="danger" disabled={!m.saved} />
            {isLast && canRegenerate && <ActionIcon icon={RefreshCw} label={t('Dobara jawab')} onPress={onRegenerate} />}
            <Text size="2xs" tone="subtle" ltr style={{ marginStart: th.space(1) }}>{formatTime(m.createdAt)}</Text>
          </View>
        )}
        {isLast && !m.pending && !streaming && m.suggestions.length > 0 && (
          <View style={{ gap: th.space(2) }}>
            {m.suggestions.map((q) => (
              <PressableScale key={q} onPress={() => onAsk(q)} haptic="tap" style={{ alignSelf: 'flex-start', paddingHorizontal: th.space(3), paddingVertical: th.space(2), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
                <Text size="sm" tone="secondary">{q}</Text>
              </PressableScale>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});
