/**
 * Pieces of the support chat screen: the header (who is helping, online /
 * away / last seen / typing, call button, menu), the welcome with quick
 * questions, the typing bubble, the away note and the rating card shown
 * after the chat is resolved.
 */

import { ArrowLeft, EllipsisVertical, Headset, Phone, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { t } from '@/core/i18n';
import { Avatar, Button, Card, Icon, IconButton, NafaaAiMark, PressableScale, Text, TextArea, useTheme } from '@/design';
import { FAQS } from '@/modules/help/lib/content';
import { lastSeenText, replyTimeText } from '../lib/format';
import { useSupportStore } from '../store';
import { ChipButton } from './MessageBubble';

/** Common questions shown when the server sends none. */
const FALLBACK_CHIPS = ['pos-sale', 'stock-update', 'khata', 'plan', 'password'];

export function usePresenceLine(): { text: string; online: boolean } {
  const status = useSupportStore((s) => s.status);
  const conversation = useSupportStore((s) => s.conversation);
  const typing = useSupportStore((s) => s.typing);
  if (typing) return { text: typing.name ? t('{{name}} type kar rahe hain…', { name: typing.name }) : t('Type ho raha hai…'), online: true };
  const agent = conversation?.assignedAgent;
  if (agent && conversation?.status !== 'BOT') {
    if (agent.state === 'online') return { text: t('Online'), online: true };
    if (agent.state === 'away') return { text: t('Away · thori der mein reply'), online: false };
    return { text: lastSeenText(agent.lastSeenAt) ?? t('Offline'), online: false };
  }
  if ((!conversation || conversation.status === 'BOT') && status?.aiEnabled) return { text: t('Nafaa AI foran jawab deta hai'), online: true };
  const team = status?.team;
  if (!team) return { text: t('Nafaa Support'), online: false };
  if (team.state === 'online') return { text: status?.teamLine || t('Team online hai, abhi reply milega'), online: true };
  if (team.state === 'away') return { text: t('Team thori der mein reply karegi'), online: false };
  if (status && !status.withinHours && status.hoursText) return { text: t('Team abhi offline hai · {{hours}}', { hours: status.hoursText }), online: false };
  return { text: lastSeenText(team.lastSeenAt) ?? t('Team abhi offline hai'), online: false };
}

export function ChatHeader({ onCall, onMenu }: { onCall: () => void; onMenu: (() => void) | null }) {
  const th = useTheme();
  const navigation = useNavigation();
  const conversation = useSupportStore((s) => s.conversation);
  const presence = usePresenceLine();
  const bot = !conversation || conversation.status === 'BOT';
  const agent = !bot ? conversation?.assignedAgent : null;
  const back = () => (navigation.canGoBack() ? router.back() : router.replace('/' as never));

  return (
    <View style={{ backgroundColor: th.colors.surface, borderBottomWidth: 1, borderBottomColor: th.colors.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), height: 60, paddingHorizontal: th.space(2) }}>
        <IconButton icon={ArrowLeft} label={t('Wapas')} onPress={back} flip />
        <View>
          {agent
            ? <Avatar name={agent.name} url={agent.avatarUrl} size={40} />
            : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: th.colors.brand.soft, borderWidth: 1, borderColor: th.colors.brand.border, alignItems: 'center', justifyContent: 'center' }}>
                {bot ? <NafaaAiMark size={26} /> : <Icon icon={Headset} size={20} tone="brand" />}
              </View>
            )}
          <View style={{ position: 'absolute', bottom: -1, end: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: th.colors.surface, backgroundColor: presence.online ? th.colors.success.solid : th.colors.borderStrong }} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="md" weight="bold" numberOfLines={1} accessibilityRole="header">
            {agent ? t('{{name}} (Nafaa team)', { name: agent.name }) : bot ? t('Nafaa Support') : t('Nafaa Support team')}
          </Text>
          <Text size="xs" numberOfLines={1} color={presence.online ? th.colors.success.text : th.colors.textMuted}>{presence.text}</Text>
        </View>
        <IconButton icon={Phone} label={t('Call')} onPress={onCall} />
        {onMenu && <IconButton icon={EllipsisVertical} label={t('Aur options')} onPress={onMenu} />}
      </View>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const th = useTheme();
  const motion = th.motion;
  const y = useSharedValue(0);
  useEffect(() => {
    if (!motion) return;
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-3, { duration: 280 }), withTiming(0, { duration: 280 })), -1));
  }, [delay, motion, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: th.colors.textSubtle }, style]} />;
}

export function TypingBubble({ name }: { name: string | null }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: th.space(1.5), marginTop: th.space(2) }} accessibilityLabel={t('Type ho raha hai…')}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: th.colors.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
        <Text size="xs" weight="bold" color={th.colors.brand.onSolid}>{(name || 'N').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: th.space(3.5), paddingVertical: th.space(3), borderRadius: th.radius('xl'), borderTopStartRadius: 4, backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border }}>
        {[0, 150, 300].map((d) => <Dot key={d} delay={d} />)}
      </View>
    </View>
  );
}

export function Welcome({ onChip, onHandover, busy }: { onChip: (text: string) => void; onHandover: () => void; busy: boolean }) {
  const th = useTheme();
  const status = useSupportStore((s) => s.status);
  const presence = usePresenceLine();
  const chips = status?.quickReplies?.length
    ? status.quickReplies.map((q) => q.label)
    : FAQS.filter((f) => FALLBACK_CHIPS.includes(f.id)).map((f) => f.q);
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: th.space(4), paddingVertical: th.space(6), gap: th.space(2) }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <NafaaAiMark size={42} />
      </View>
      <Text size="lg" weight="bold" align="center">{t('Assalam-o-Alaikum! Kaise help karein?')}</Text>
      <Text size="sm" tone="muted" align="center" style={{ maxWidth: 320 }}>
        {status?.welcomeMessage || t('Apna sawal likhein ya screenshot bhejein. Nafaa AI foran jawab deta hai, aur support team bhi yahin hai.')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: th.space(2.5), paddingVertical: th.space(1), borderRadius: 999, backgroundColor: presence.online ? th.colors.success.soft : th.colors.surfaceMuted }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: presence.online ? th.colors.success.solid : th.colors.textSubtle }} />
        <Text size="xs" weight="medium" color={presence.online ? th.colors.success.text : th.colors.textMuted}>{presence.text}</Text>
      </View>
      <Text size="2xs" weight="semibold" tone="subtle" uppercase style={{ marginTop: th.space(3) }}>{t('Aam sawal')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: th.space(1.5) }}>
        {chips.slice(0, 6).map((c) => <ChipButton key={c} label={c} onPress={() => onChip(c)} />)}
      </View>
      <Button icon={Headset} loading={busy} onPress={onHandover} style={{ marginTop: th.space(3) }}>{t('Support team se baat karein')}</Button>
    </View>
  );
}

export function AwayNote() {
  const th = useTheme();
  const status = useSupportStore((s) => s.status);
  const conversation = useSupportStore((s) => s.conversation);
  if (!status || !conversation || conversation.status !== 'WAITING' || status.team.state === 'online') return null;
  return (
    <Card tone="warning" style={{ marginTop: th.space(3) }}>
      <Text size="sm" weight="semibold" tone="warning">{status.awayMessage || t('Team abhi online nahi hai')}</Text>
      <Text size="xs" tone="warning" style={{ marginTop: th.space(1) }}>
        {t('Aap ka message mil gaya, {{time}} mein reply karte hain. Reply aane par notification aa jayegi.', { time: replyTimeText(status.expectedReplyMinutes) })}
      </Text>
      {!!status.hoursText && <Text size="2xs" tone="warning" style={{ marginTop: th.space(1) }}>{t('Team timings: {{hours}}', { hours: status.hoursText })}</Text>}
    </Card>
  );
}

export function RatingCard() {
  const th = useTheme();
  const conversation = useSupportStore((s) => s.conversation);
  const rate = useSupportStore((s) => s.rate);
  const newChat = useSupportStore((s) => s.newChat);
  const [choice, setChoice] = useState<'up' | 'down' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!conversation || (conversation.status !== 'RESOLVED' && conversation.status !== 'CLOSED')) return null;
  const closed = conversation.status === 'CLOSED';

  if (conversation.rating) {
    return (
      <Card style={{ marginTop: th.space(3), alignItems: 'center' }}>
        <Icon icon={conversation.rating === 'up' ? ThumbsUp : ThumbsDown} size={26} color={conversation.rating === 'up' ? th.colors.success.text : th.colors.danger.text} />
        <Text size="sm" weight="semibold" align="center" style={{ marginTop: th.space(1) }}>{t('Shukriya! Aap ki rating mil gayi.')}</Text>
        {closed && <Button variant="link" size="sm" onPress={newChat}>{t('Nayi chat shuru karein')}</Button>}
      </Card>
    );
  }

  const send = async () => {
    if (!choice) return;
    setBusy(true);
    try { await rate(choice, note); } catch { /* the card stays to try again */ } finally { setBusy(false); }
  };

  return (
    <Card style={{ marginTop: th.space(3) }}>
      <Text size="sm" weight="semibold" align="center">{t('Kya aap ka issue solve ho gaya?')}</Text>
      <Text size="xs" tone="muted" align="center" style={{ marginTop: 2 }}>{t('Apni rating dein, is se humari support behtar hoti hai.')}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: th.space(3), marginTop: th.space(3) }}>
        {(['up', 'down'] as const).map((r) => {
          const on = choice === r;
          const tone = r === 'up' ? th.colors.success : th.colors.danger;
          return (
            <PressableScale
              key={r}
              onPress={() => setChoice(r)}
              disabled={busy}
              haptic="select"
              accessibilityLabel={r === 'up' ? t('Haan, achi support') : t('Nahi, theek nahi')}
              accessibilityState={{ selected: on }}
              style={{ width: 72, height: 52, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 1, borderColor: on ? tone.solid : th.colors.border, backgroundColor: on ? tone.soft : th.colors.surface }}
            >
              <Icon icon={r === 'up' ? ThumbsUp : ThumbsDown} size={22} color={tone.text} />
            </PressableScale>
          );
        })}
      </View>
      {choice && (
        <View style={{ gap: th.space(2), marginTop: th.space(3) }}>
          <TextArea
            value={note}
            onChangeText={setNote}
            maxLength={500}
            placeholder={choice === 'up' ? t('Kuch kehna hai? (zaroori nahi)') : t('Kya behtar ho sakta tha? (zaroori nahi)')}
          />
          <Button fullWidth loading={busy} onPress={() => void send()}>{t('Rating bhejein')}</Button>
        </View>
      )}
      {closed && !choice && <Button variant="link" size="sm" onPress={newChat} style={{ alignSelf: 'center' }}>{t('Nayi chat shuru karein')}</Button>}
    </Card>
  );
}
