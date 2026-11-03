/**
 * Nafaa AI chat: saved chats in a sheet (a side pane on tablets), page-aware
 * suggestions, Fast/Smart answers, streaming text, charts, action cards that
 * need a confirm, and the reorder list. Needs internet; offline it shows the
 * last chat saved on the phone.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { History, MapPin, Send, Square, SquarePen, WifiOff } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { useFeatureFlag } from '@/modules/app-control';
import { Button, Card, Chip, EmptyState, IconButton, Input, NafaaAiMark, PressableScale, Screen, Segmented, Sheet, Text, toast, useLayout, useTheme } from '@/design';
import { aiApi } from '../api/ai';
import { AiHistory } from '../components/AiHistory';
import { MessageItem } from '../components/MessageItem';
import { pageContext, pageInfo } from '../lib/suggestions';
import { useAiStore, type ChatMessage } from '../store';

export function AiScreen() {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const can = usePermission();
  const enabled = useFeatureFlag('feature.ai');
  const online = useOnlineStatus();
  const userId = useAuthStore((s) => s.user?.id);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const s = useAiStore();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stick = useRef(true);

  const ctxPath = typeof from === 'string' && from ? from : '';
  const info = pageInfo(ctxPath || '/dashboard');
  const context = s.withContext && ctxPath ? pageContext(ctxPath) : undefined;

  // A chat never carries over to another person on the same phone.
  useEffect(() => {
    const owner = useAiStore.getState().ownerId;
    if (owner && owner !== userId) useAiStore.getState().newChat();
    useAiStore.setState({ ownerId: userId });
  }, [userId]);

  const status = useQuery({ queryKey: ['ai', 'status'], queryFn: aiApi.status, staleTime: 60_000, retry: false, enabled: online });
  useEffect(() => { if (status.data) s.setRemaining(status.data.remaining); }, [status.data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!online) s.restoreLast(); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const q = s.takePendingAsk();
    if (q) void s.send(q, context);
  }, [s.pendingAsk]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastUserIndex = useMemo(() => {
    for (let i = s.messages.length - 1; i >= 0; i--) if (s.messages[i].role === 'user') return i;
    return -1;
  }, [s.messages]);

  const ask = useCallback((q: string) => { stick.current = true; void useAiStore.getState().send(q, context); }, [context]);
  const submit = () => {
    const q = text.trim();
    if (!q || s.streaming || !online) return;
    setText('');
    stick.current = true;
    if (editing) { setEditing(false); void s.editLast(q, context); } else void s.send(q, context);
  };
  const startEdit = () => {
    if (lastUserIndex < 0 || s.streaming) return;
    setText(s.messages[lastUserIndex].content);
    setEditing(true);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    stick.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
  };

  const newChat = () => { s.newChat(); setEditing(false); setText(''); };
  const empty = s.messages.length === 0 && !s.loadingConversation;
  const smart = s.mode === 'smart';

  if (!can(PERMISSIONS.AI_USE) || !enabled) {
    return (
      <Screen title={t('Nafaa AI')}>
        <EmptyState icon={SquarePen} title={!enabled ? t('Nafaa AI abhi band hai') : t('Is kaam ki permission aap ke paas nahi')} tone="neutral" />
      </Screen>
    );
  }

  const greeting = (
    <View style={{ alignItems: 'center', paddingTop: th.space(8), paddingHorizontal: th.space(4), gap: th.space(2) }}>
      <NafaaAiMark size={64} />
      <Text size="lg" weight="bold" align="center">{t('Assalam-o-Alaikum! Main Nafaa AI hoon.')}</Text>
      <Text size="sm" tone="muted" align="center">{t('Apni dukaan ke baare mein kuch bhi poochein — Sale, Profit, stock, udhaar, expenses. Jawab aap ke asal data se aata hai.')}</Text>
      {online ? (
        <View style={{ alignSelf: 'stretch', gap: th.space(2), marginTop: th.space(4) }}>
          {info.questions.map((q) => (
            <PressableScale key={q} onPress={() => ask(t(q))} haptic="tap" style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface }}>
              <Text size="sm">{t(q)}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );

  const chat = (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      {!online && (
        <View style={{ paddingHorizontal: th.space(4), paddingTop: th.space(2) }}>
          <Card tone="warning">
            <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'center' }}>
              <WifiOff size={16} color={th.colors.warning.text} />
              <Text size="sm" tone="warning" style={{ flex: 1 }}>{t('{{what}} — internet aane par dobara poochein.', { what: t(onlineNeededText('ai')) })}</Text>
            </View>
          </Card>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(4), paddingTop: th.space(2) }}>
        <Segmented value={s.mode} onChange={s.setMode} options={[{ value: 'fast', label: t('Fast') }, { value: 'smart', label: t('Smart') }]} />
        <View style={{ flex: 1 }}>
          <Text size="xs" tone="muted" align="end">
            {smart ? t('3 message ke barabar') : s.remaining != null ? t('Aaj {{remaining}} sawal baqi', { remaining: s.remaining }) : ''}
          </Text>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={s.messages}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={onScroll}
        scrollEventThrottle={32}
        onContentSizeChange={() => { if (stick.current) listRef.current?.scrollToEnd({ animated: false }); }}
        ListHeaderComponent={empty ? greeting : s.loadingConversation ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Chat khul rahi hai…')}</Text> : null}
        contentContainerStyle={{ padding: th.space(4), gap: th.space(5), flexGrow: 1, maxWidth: 760, width: '100%', alignSelf: 'center' }}
        renderItem={({ item, index }) => (
          <MessageItem
            m={item}
            isLast={index === s.messages.length - 1}
            streaming={s.streaming}
            canRegenerate={!s.streaming && !!s.conversationId && online}
            canEdit={index === lastUserIndex && !s.streaming && online}
            onRegenerate={() => { stick.current = true; void s.regenerate(context); }}
            onEdit={startEdit}
            onFeedback={(v) => { s.setFeedback(item.id, v).catch(() => toast.error(t('Feedback save nahi hua'))); }}
            onRetry={() => { stick.current = true; void s.retry(context); }}
            onAsk={ask}
          />
        )}
      />
      <View style={{ paddingHorizontal: th.space(3), paddingTop: th.space(2), paddingBottom: Math.max(insets.bottom, th.space(2)), borderTopWidth: 1, borderTopColor: th.colors.divider, backgroundColor: th.colors.surface, gap: th.space(2) }}>
        {!!ctxPath && (
          <View style={{ flexDirection: 'row' }}>
            <Chip icon={MapPin} selected={s.withContext} onPress={() => s.setWithContext(!s.withContext)} label={t('Is page ke baare mein{{title}}', { title: info.title ? `: ${t(info.title)}` : '' })} />
          </View>
        )}
        {editing && <Text size="xs" tone="brand">{t('Pichhla sawal badal rahe hain')}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: th.space(2) }}>
          <View style={{ flex: 1 }}>
            <Input
              size="md" multiline value={text} onChangeText={setText} maxLength={2000} disabled={!online}
              placeholder={t('Kuch bhi poochein… jaise "Aaj ki sale?"')} accessibilityLabel={t('Nafaa AI se poochein')}
              submitBehavior="newline"
            />
          </View>
          {s.streaming ? (
            <IconButton icon={Square} label={t('Rokein')} variant="inverse" size="lg" onPress={s.stop} />
          ) : (
            <IconButton icon={Send} label={t('Bhejein')} variant="primary" size="lg" flip disabled={!text.trim() || !online} onPress={submit} />
          )}
        </View>
        <Text size="2xs" tone="subtle" align="center">{t('Nafaa AI ghalti kar sakta hai, zaroori number report me dekh lein.')}</Text>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <Screen
      title={s.title || t('Nafaa AI')}
      scroll={false}
      actions={(
        <View style={{ flexDirection: 'row' }}>
          {!isTablet && <IconButton icon={History} label={t('Purani chats')} onPress={() => setHistoryOpen(true)} />}
          <IconButton icon={SquarePen} label={t('Nayi chat')} onPress={newChat} />
        </View>
      )}
    >
      {isTablet ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 300, borderEndWidth: 1, borderEndColor: th.colors.divider }}><AiHistory /></View>
          <View style={{ flex: 1 }}>{chat}</View>
        </View>
      ) : chat}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('Purani chats')} height={0.8} scrollable={false}>
        <AiHistory onPicked={() => setHistoryOpen(false)} />
      </Sheet>
    </Screen>
  );
}
