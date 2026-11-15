/**
 * One chat row: a WhatsApp-style bubble (own messages at the end side, the
 * team's at the start), a centred line for system and call events, or a
 * Nafaa AI answer.
 *
 * Bubbles show the quoted reply, pictures, PDFs, voice notes, the time,
 * "edited", and ticks on own messages: clock while sending, one tick sent,
 * two grey delivered, two blue read. Failed drafts offer Resend and Remove.
 * A long press opens the message actions (the screen owns that sheet).
 */

import { Image } from 'expo-image';
import { Check, CheckCheck, CircleAlert, Clock3, FileText, Monitor, Phone, PhoneMissed, Play, RotateCw, X } from 'lucide-react-native';
import { memo, type ReactNode } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { Icon, NafaaAiMark, PressableScale, Text, useTheme } from '@/design';
import { AiMarkdown } from '@/modules/ai-assistant/components/AiMarkdown';
import type { SupportAttachment, SupportReplyPreview } from '../api/support';
import { openInApp } from '../lib/capabilities';
import { clock, sizeText, timeOf } from '../lib/format';
import { previewText, senderLabel, useSupportStore, type ChatMessage } from '../store';

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Text with tappable links. */
function Linkified({ text, color }: { text: string; color: string }) {
  const parts = text.split(URL_RE);
  return (
    <Text size="base">
      {parts.map((p, i) => (i % 2 === 1
        ? <Text key={i} size="base" color={color} weight="medium" style={{ textDecorationLine: 'underline' }} onPress={() => void Linking.openURL(p).catch(() => undefined)}>{p}</Text>
        : p))}
    </Text>
  );
}

function Quote({ reply, mine, onJump }: { reply: SupportReplyPreview; mine: boolean; onJump?: (id: string) => void }) {
  const th = useTheme();
  return (
    <PressableScale
      onPress={() => onJump?.(reply.id)}
      scaleTo={1}
      accessibilityLabel={t('Reply')}
      style={{
        marginBottom: th.space(1), borderRadius: th.radius('md'), paddingHorizontal: th.space(2), paddingVertical: th.space(1),
        borderStartWidth: 3, borderStartColor: mine ? th.colors.brand.solid : th.colors.textSubtle,
        backgroundColor: mine ? th.colors.brand.border : th.colors.surfaceMuted,
      }}
    >
      <Text size="xs" weight="semibold" tone={mine ? 'brand' : 'secondary'} numberOfLines={1}>{senderLabel({ sender: reply.sender })}</Text>
      <Text size="xs" tone="muted" numberOfLines={2}>
        {reply.deleted ? t('Ye message delete ho gaya') : reply.text || previewText({ kind: reply.kind, text: null, deletedAt: null })}
      </Text>
    </PressableScale>
  );
}

function Pictures({ items, onOpen }: { items: SupportAttachment[]; onOpen: (url: string) => void }) {
  const th = useTheme();
  const single = items.length === 1;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: th.space(1) }}>
      {items.map((a, i) => {
        const ratio = a.width && a.height ? a.width / a.height : 4 / 3;
        return (
          <PressableScale key={`${a.url}-${i}`} onPress={() => onOpen(a.url)} accessibilityLabel={t('Photo')} scaleTo={0.98}
            style={{ width: single ? 240 : 118, borderRadius: th.radius('md'), overflow: 'hidden', backgroundColor: th.colors.surfaceMuted }}>
            <Image
              source={{ uri: a.url }}
              style={{ width: '100%', aspectRatio: single ? Math.min(2, Math.max(0.6, ratio)) : 1 }}
              contentFit="cover"
              transition={120}
              accessibilityLabel={a.name}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}

function FileChip({ a, mine }: { a: SupportAttachment; mine: boolean }) {
  const th = useTheme();
  const local = !/^https?:/i.test(a.url);
  return (
    <PressableScale
      onPress={() => { if (!local) void openInApp(a.url); }}
      accessibilityLabel={a.name}
      style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(2), borderRadius: th.radius('md'), marginBottom: th.space(1), backgroundColor: mine ? th.colors.brand.border : th.colors.surfaceMuted, minWidth: 200 }}
    >
      <View style={{ width: 36, height: 36, borderRadius: th.radius('md'), backgroundColor: th.colors.danger.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={FileText} size={18} color={th.colors.danger.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" weight="semibold" numberOfLines={1}>{a.name}</Text>
        <Text size="2xs" tone="muted" ltr>{a.mime === 'application/pdf' ? 'PDF' : t('File')} · {sizeText(a.bytes)}</Text>
      </View>
    </PressableScale>
  );
}

/**
 * Voice note: play button, waveform and length. This app has no audio player
 * yet (native module), so play opens the note in the in-app browser.
 */
function VoiceNote({ a, mine }: { a: SupportAttachment; mine: boolean }) {
  const th = useTheme();
  const bars = a.waveform?.length ? a.waveform : Array.from({ length: 28 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)));
  const step = Math.max(1, Math.ceil(bars.length / 32));
  const shown = bars.filter((_, i) => i % step === 0);
  const tint = mine ? th.colors.brand.solid : th.colors.textSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), minWidth: 210, paddingVertical: th.space(1) }}>
      <PressableScale
        onPress={() => void openInApp(a.url)}
        haptic="tap"
        accessibilityLabel={t('Sunein')}
        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mine ? th.colors.brand.solid : th.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon icon={Play} size={18} color={mine ? th.colors.brand.onSolid : th.colors.text} flip />
      </PressableScale>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }} accessibilityLabel={t('Voice note')}>
        {shown.map((v, i) => (
          <View key={i} style={{ flex: 1, maxWidth: 4, borderRadius: 2, height: Math.max(3, Math.min(1, v) * 26), backgroundColor: tint, opacity: 0.55 }} />
        ))}
      </View>
      <Text size="2xs" tone="muted" ltr tabular>{clock(a.durationSec)}</Text>
    </View>
  );
}

function Ticks({ m }: { m: ChatMessage }) {
  const th = useTheme();
  if (m.local === 'sending') return <Icon icon={Clock3} size={13} tone="subtle" />;
  if (m.local === 'failed') return <Icon icon={CircleAlert} size={13} color={th.colors.danger.text} />;
  if (m.readAt) return <View accessibilityLabel={t('Parh liya')}><Icon icon={CheckCheck} size={15} color={th.colors.info.text} /></View>;
  if (m.deliveredAt) return <View accessibilityLabel={t('Pohanch gaya')}><Icon icon={CheckCheck} size={15} tone="subtle" /></View>;
  return <View accessibilityLabel={t('Chala gaya')}><Icon icon={Check} size={15} tone="subtle" /></View>;
}

/** SYSTEM line text in the viewer's language when the code is known. */
function systemText(m: ChatMessage): string {
  const name = m.meta?.params?.name ? String(m.meta.params.name) : '';
  switch (m.meta?.code) {
    case 'agent_joined': return name ? t('{{name}} (Nafaa team) chat mein shamil ho gaye', { name }) : t('Nafaa team chat mein shamil ho gayi');
    case 'transferred': return name ? t('Ab {{name}} (Nafaa team) aap ki help karenge', { name }) : (m.text ?? '');
    case 'handover': return t('Aap ki chat support team ko bhej di gayi. Thori der mein reply milega.');
    case 'resolved': return t('Chat resolve ho gayi');
    case 'reopened': return t('Chat dobara khul gayi');
    case 'closed': return t('Chat band ho gayi');
    case 'rated': return t('Rating ka shukriya!');
    default: return m.text ?? '';
  }
}

function CenterPill({ children, tone }: { children: ReactNode; tone: 'info' | 'danger' | 'neutral' }) {
  const th = useTheme();
  const c = th.colors[tone];
  return (
    <View style={{ alignItems: 'center', marginVertical: th.space(1.5), paddingHorizontal: th.space(6) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5), backgroundColor: c.soft, borderColor: c.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: th.space(3), paddingVertical: th.space(1) }}>
        {children}
      </View>
    </View>
  );
}

function CallLine({ m }: { m: ChatMessage }) {
  const th = useTheme();
  const c = m.meta?.call;
  const missed = !!c && (c.outcome === 'missed' || c.outcome === 'declined' || c.outcome === 'failed');
  const label = !c ? (m.text ?? t('Call'))
    : c.outcome === 'completed' ? (c.media === 'screen' ? t('Screen share · {{time}}', { time: clock(c.durationSec) }) : t('Voice call · {{time}}', { time: clock(c.durationSec) }))
      : c.outcome === 'declined' ? t('Call decline hui')
        : c.outcome === 'failed' ? t('Call connect nahi hui')
          : c.startedBy === 'MERCHANT' ? t('Team ne call nahi uthayi') : t('Missed call');
  const glyph = missed ? PhoneMissed : c?.media === 'screen' ? Monitor : Phone;
  return (
    <CenterPill tone={missed ? 'danger' : 'neutral'}>
      <Icon icon={glyph} size={14} color={missed ? th.colors.danger.text : th.colors.textSecondary} />
      <Text size="xs" weight="medium" color={missed ? th.colors.danger.text : th.colors.textSecondary}>{label}</Text>
      <Text size="xs" tone="subtle" ltr>· {timeOf(m.createdAt)}</Text>
    </CenterPill>
  );
}

export interface MessageBubbleProps {
  m: ChatMessage;
  /** First of a run from the same sender (shows the name, the avatar and the bubble tail). */
  first: boolean;
  highlighted?: boolean;
  onOpenImage: (url: string) => void;
  onLongPress: (m: ChatMessage) => void;
  onJump?: (id: string) => void;
}

export const MessageBubble = memo(function MessageBubble({ m, first, highlighted, onOpenImage, onLongPress, onJump }: MessageBubbleProps) {
  const th = useTheme();
  const retry = useSupportStore((s) => s.retry);
  const discard = useSupportStore((s) => s.discard);

  if (m.kind === 'SYSTEM') {
    const text = systemText(m);
    if (!text) return null;
    return <CenterPill tone="info"><Text size="xs" weight="medium" tone="info" align="center">{text}</Text></CenterPill>;
  }
  if (m.kind === 'CALL_EVENT') return <CallLine m={m} />;

  const mine = m.sender === 'MERCHANT';
  const bot = m.sender === 'BOT';
  const deleted = !!m.deletedAt;
  const pictures = m.attachments.filter((a) => a.mime.startsWith('image/'));
  const voice = m.kind === 'VOICE' ? m.attachments.find((a) => a.mime.startsWith('audio/') || a.mime.startsWith('video/')) ?? m.attachments[0] : null;
  const files = m.attachments.filter((a) => a !== voice && !a.mime.startsWith('image/'));
  const c = th.colors;
  const tail = 4;
  const big = th.radius('xl');

  let body: ReactNode;
  if (deleted) {
    body = <Text size="sm" tone="muted" italic>{t('Ye message delete ho gaya')}</Text>;
  } else {
    body = (
      <>
        {m.replyTo && <Quote reply={m.replyTo} mine={mine} onJump={onJump} />}
        {pictures.length > 0 && <Pictures items={pictures} onOpen={onOpenImage} />}
        {voice && <VoiceNote a={voice} mine={mine} />}
        {files.map((a, i) => <FileChip key={`${a.url}-${i}`} a={a} mine={mine} />)}
        {!!m.text && (bot ? <AiMarkdown text={m.text} /> : <Linkified text={m.text} color={c.brand.text} />)}
      </>
    );
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: first ? th.space(2) : 2, borderRadius: th.radius('lg'), backgroundColor: highlighted ? c.warning.soft : 'transparent' }}>
      {!mine && (
        <View style={{ width: 28, marginEnd: th.space(1.5), justifyContent: 'flex-end' }}>
          {first && (bot
            ? <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}><NafaaAiMark size={18} /></View>
            : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.brand.solid, alignItems: 'center', justifyContent: 'center' }}><Text size="xs" weight="bold" color={c.brand.onSolid}>{(m.meta?.senderName || m.senderName || 'N').charAt(0).toUpperCase()}</Text></View>)}
        </View>
      )}
      <PressableScale
        onLongPress={() => { if (!m.local && !deleted) onLongPress(m); }}
        delayLongPress={300}
        haptic={false}
        scaleTo={0.99}
        accessibilityHint={t('Lamba dabayein: Reply, Copy, Edit, Delete')}
        style={{
          maxWidth: '82%', minWidth: 76, paddingHorizontal: th.space(3), paddingTop: th.space(1.5), paddingBottom: th.space(1),
          backgroundColor: mine ? c.brand.soft : c.surface,
          borderWidth: 1, borderColor: m.local === 'failed' ? c.danger.border : mine ? c.brand.border : c.border,
          borderRadius: big,
          ...(first ? (mine ? { borderTopEndRadius: tail } : { borderTopStartRadius: tail }) : {}),
        }}
      >
        {first && !mine && <Text size="xs" weight="semibold" color={bot ? c.info.text : c.brand.text} style={{ marginBottom: 2 }}>{senderLabel(m)}</Text>}
        {body}
        {m.local === 'sending' && m.progress != null && (
          <View style={{ height: 3, borderRadius: 2, backgroundColor: c.brand.border, overflow: 'hidden', marginTop: th.space(1) }}>
            <View style={{ height: 3, width: `${m.progress}%`, backgroundColor: c.brand.solid }} />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
          {!!m.editedAt && !deleted && <Text size="2xs" tone="subtle">{t('edited')}</Text>}
          <Text size="2xs" tone="subtle" ltr tabular>{timeOf(m.createdAt)}</Text>
          {mine && <Ticks m={m} />}
        </View>
        {m.local === 'failed' && (
          <View style={{ flexDirection: 'row', gap: th.space(3), borderTopWidth: 1, borderTopColor: c.danger.border, marginTop: th.space(1), paddingTop: th.space(1) }}>
            <PressableScale onPress={() => void retry(m.clientId!)} haptic="tap" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
              <Icon icon={RotateCw} size={13} color={c.danger.text} />
              <Text size="xs" weight="semibold" color={c.danger.text}>{t('Dobara bhejein')}</Text>
            </PressableScale>
            <PressableScale onPress={() => discard(m.clientId!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
              <Icon icon={X} size={13} tone="muted" />
              <Text size="xs" tone="muted">{t('Hatayein')}</Text>
            </PressableScale>
          </View>
        )}
      </PressableScale>
    </View>
  );
});

/** Question chips and the "Support team se baat karein" button under a Nafaa AI answer. */
export function BotFollowUps({ chips, showHandover, onChip, onHandover, busy }: {
  chips: string[];
  showHandover: boolean;
  onChip: (text: string) => void;
  onHandover: () => void;
  busy?: boolean;
}) {
  const th = useTheme();
  if (!chips.length && !showHandover) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5), marginTop: th.space(1.5), marginStart: 28 + th.space(1.5) }}>
      {chips.slice(0, 4).map((label) => <ChipButton key={label} label={label} onPress={() => onChip(label)} />)}
      {showHandover && <ChipButton label={t('Support team se baat karein')} solid disabled={busy} onPress={onHandover} />}
    </View>
  );
}

export function ChipButton({ label, onPress, solid, disabled }: { label: string; onPress: () => void; solid?: boolean; disabled?: boolean }) {
  const th = useTheme();
  const c = th.colors.brand;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="tap"
      style={{ paddingHorizontal: th.space(3), paddingVertical: th.space(1.5), borderRadius: 999, borderWidth: 1, borderColor: solid ? c.solid : c.border, backgroundColor: solid ? c.solid : th.colors.surface, opacity: disabled ? 0.6 : 1 }}
    >
      <Text size="sm" weight={solid ? 'semibold' : 'medium'} color={solid ? c.onSolid : c.text}>{label}</Text>
    </PressableScale>
  );
}
