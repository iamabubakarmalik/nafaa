/**
 * Help & Support chat with the Nafaa team (same chat as the web app's
 * /support page).
 *
 * Header: who is helping, presence or typing, a call button and a menu.
 * Body: welcome with quick questions on an empty chat, messages with day
 * separators, Nafaa AI's question chips and "Support team se baat karein",
 * the away note, a typing bubble and, after the chat is resolved, the rating
 * card. A long press on a message offers Reply, Copy, Edit and Delete.
 *
 * Calls and screen share are not in this app yet (lib/capabilities.ts): the
 * call button offers WhatsApp, a phone call, or the web app.
 */

import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowDown, CircleCheck, Copy, Globe, LifeBuoy, MessageCircle, Pencil, Phone, Reply, Trash2, WifiOff, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Button, Card, ErrorState, Icon, IconButton, ListGroup, ListRow, NafaaAiMark, PressableScale, Screen, Sheet, Text, confirm, toast, useTheme } from '@/design';
import { SUPPORT_LIMITS } from '../api/support';
import { AwayNote, ChatHeader, RatingCard, TypingBubble, Welcome } from '../components/ChatParts';
import { Composer } from '../components/Composer';
import { BotFollowUps, MessageBubble } from '../components/MessageBubble';
import { WEB_SUPPORT_URL, callSupportPhone, canCall, openInApp, openWhatsappSupport } from '../lib/capabilities';
import { dayKey, dayLabel } from '../lib/format';
import { markChatVisible } from '../lib/notify';
import { useSupportStore, type ChatMessage } from '../store';

type Row =
  | { type: 'day'; key: string; label: string }
  | { type: 'msg'; key: string; m: ChatMessage; first: boolean }
  | { type: 'follow'; key: string; chips: string[]; handover: boolean };

function ImageViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        {url && <Image source={{ uri: url }} style={{ flex: 1 }} contentFit="contain" accessibilityLabel={t('Photo')} />}
        <PressableScale
          onPress={onClose}
          accessibilityLabel={t('Band karein')}
          style={{ position: 'absolute', top: insets.top + 8, end: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon icon={X} size={22} color="#fff" />
        </PressableScale>
      </View>
    </Modal>
  );
}

export function SupportScreen() {
  const th = useTheme();
  const online = useOnlineStatus();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const messages = useSupportStore((s) => s.messages);
  const conversation = useSupportStore((s) => s.conversation);
  const loaded = useSupportStore((s) => s.loaded);
  const loading = useSupportStore((s) => s.loading);
  const loadError = useSupportStore((s) => s.loadError);
  const olderCursor = useSupportStore((s) => s.olderCursor);
  const loadingOlder = useSupportStore((s) => s.loadingOlder);
  const typing = useSupportStore((s) => s.typing);
  const handingOver = useSupportStore((s) => s.handingOver);
  const store = useSupportStore.getState;
  const [image, setImage] = useState<string | null>(null);
  const [actionFor, setActionFor] = useState<ChatMessage | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const list = useRef<FlatList<Row>>(null);
  const stick = useRef(true);

  // Counts as "watching" (read receipts, no alerts) only while the screen is focused.
  useFocusEffect(useCallback(() => {
    const unview = useSupportStore.getState().viewMounted();
    const unmark = markChatVisible();
    return () => { unview(); unmark(); useSupportStore.getState().setTyping(false); };
  }, []));

  const status = conversation?.status;
  const live = !!conversation && status !== 'CLOSED' && status !== 'RESOLVED';

  const rows = useMemo<Row[]>(() => {
    let lastBot = -1;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender === 'BOT') { lastBot = i; break; }
    const out: Row[] = [];
    let prevDay = '';
    let prev: ChatMessage | null = null;
    messages.forEach((m, i) => {
      const day = dayKey(m.createdAt);
      if (day !== prevDay) {
        out.push({ type: 'day', key: `d-${day}`, label: dayLabel(m.createdAt) });
        prevDay = day;
        prev = null;
      }
      const p = prev as ChatMessage | null;
      const first = !p || p.sender !== m.sender || p.kind === 'SYSTEM' || p.kind === 'CALL_EVENT'
        || (p.sender === 'ADMIN' && p.senderUserId !== m.senderUserId)
        || new Date(m.createdAt).getTime() - new Date(p.createdAt).getTime() > 5 * 60_000;
      out.push({ type: 'msg', key: m.local && m.clientId ? m.clientId : m.id, m, first });
      // Chips under the latest team or Nafaa AI answer the merchant has not replied to yet.
      const isLast = messages.slice(i + 1).every((x) => x.sender !== 'MERCHANT');
      if (isLast && !m.deletedAt && (m.sender === 'BOT' || m.sender === 'ADMIN')) {
        const chips = m.meta?.chips ?? [];
        const handover = i === lastBot && status === 'BOT';
        if (chips.length || handover) out.push({ type: 'follow', key: `f-${m.id}`, chips, handover });
      }
      prev = m;
    });
    return out;
  }, [messages, status]);

  const scrollToEnd = useCallback((animated: boolean) => list.current?.scrollToEnd({ animated }), []);
  useEffect(() => { if (typing && stick.current) setTimeout(() => scrollToEnd(true), 50); }, [typing, scrollToEnd]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const bottom = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
    stick.current = bottom;
    if (bottom !== atBottom) setAtBottom(bottom);
    if (contentOffset.y < 60 && olderCursor && !loadingOlder) void store().loadOlder();
  };

  const jumpTo = useCallback((id: string) => {
    const index = rows.findIndex((r) => r.type === 'msg' && r.m.id === id);
    if (index < 0) return;
    list.current?.scrollToIndex({ index, viewPosition: 0.4, animated: true });
    setHighlight(id);
    setTimeout(() => setHighlight((h) => (h === id ? null : h)), 1400);
  }, [rows]);

  const send = useCallback((text: string) => { stick.current = true; store().sendText(text); }, [store]);
  const onLongPress = useCallback((m: ChatMessage) => setActionFor(m), []);

  const waText = t('Assalam-o-Alaikum, mujhe Nafaa mein help chahiye.\nShop: {{shop}}\nNaam: {{name}}\n\nIssue: ', { shop: tenant?.name ?? '', name: user?.fullName ?? '' });

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === 'day') {
      return (
        <View style={{ alignItems: 'center', marginVertical: th.space(2) }}>
          <View style={{ paddingHorizontal: th.space(2.5), paddingVertical: 2, borderRadius: 999, backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border }}>
            <Text size="2xs" weight="semibold" tone="muted">{item.label}</Text>
          </View>
        </View>
      );
    }
    if (item.type === 'follow') {
      return <BotFollowUps chips={item.chips} showHandover={item.handover} onChip={send} onHandover={() => void store().handover()} busy={handingOver} />;
    }
    return <MessageBubble m={item.m} first={item.first} highlighted={highlight === item.m.id} onOpenImage={setImage} onLongPress={onLongPress} onJump={jumpTo} />;
  };

  const header = (
    <>
      {loaded && olderCursor && (
        <View style={{ alignItems: 'center', paddingVertical: th.space(2) }}>
          {loadingOlder ? <ActivityIndicator color={th.colors.textMuted} /> : <Button size="sm" variant="secondary" onPress={() => void store().loadOlder()}>{t('Purane messages dekhein')}</Button>}
        </View>
      )}
      {loaded && messages.length === 0 && <Welcome onChip={send} onHandover={() => void store().handover()} busy={handingOver} />}
    </>
  );

  const footer = (
    <>
      {typing && <TypingBubble name={typing.name} />}
      <AwayNote />
      <RatingCard />
    </>
  );

  const action = actionFor;
  const canEdit = !!action && action.sender === 'MERCHANT' && action.kind === 'TEXT' && !action.deletedAt
    && Date.now() - new Date(action.createdAt).getTime() < SUPPORT_LIMITS.editWindowMinutes * 60_000;

  return (
    <Screen header={<ChatHeader onCall={() => setCallOpen(true)} onMenu={() => setMenuOpen(true)} />} scroll={false}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {!online && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(4), paddingVertical: th.space(2), backgroundColor: th.colors.warning.soft }}>
            <Icon icon={WifiOff} size={16} color={th.colors.warning.text} />
            <Text size="xs" tone="warning" style={{ flex: 1 }}>{t('Internet nahi hai. Message internet aane par bhejein.')}</Text>
          </View>
        )}
        {!loaded && loading && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={th.colors.textMuted} /></View>}
        {!loaded && !loading && loadError && (
          <View style={{ flex: 1, justifyContent: 'center', padding: th.space(4) }}>
            <ErrorState title={t('Chat load nahi hui. Internet check karein.')} onRetry={() => void store().load(true)} />
          </View>
        )}
        {loaded && (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={list}
              data={rows}
              keyExtractor={(r) => r.key}
              renderItem={renderRow}
              ListHeaderComponent={header}
              ListFooterComponent={footer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onScroll={onScroll}
              scrollEventThrottle={32}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              onContentSizeChange={() => { if (stick.current) scrollToEnd(false); }}
              onScrollToIndexFailed={(info) => list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true })}
              contentContainerStyle={{ paddingHorizontal: th.space(3), paddingBottom: th.space(3), flexGrow: 1, maxWidth: 760, width: '100%', alignSelf: 'center' }}
              style={{ backgroundColor: th.colors.canvas }}
            />
            {!atBottom && messages.length > 0 && (
              <PressableScale
                onPress={() => { stick.current = true; scrollToEnd(true); }}
                accessibilityLabel={t('Naye messages')}
                style={{ position: 'absolute', bottom: th.space(3), end: th.space(4), width: 40, height: 40, borderRadius: 20, backgroundColor: th.colors.surfaceRaised, borderWidth: 1, borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon icon={ArrowDown} size={18} />
              </PressableScale>
            )}
          </View>
        )}
        {loaded && status === 'BOT' && messages.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(3), paddingVertical: th.space(1.5), backgroundColor: th.colors.brand.soft, borderTopWidth: 1, borderTopColor: th.colors.divider }}>
            <NafaaAiMark size={16} />
            <Text size="xs" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>{t('Nafaa AI jawab de raha hai')}</Text>
            <Button size="sm" variant="link" loading={handingOver} onPress={() => void store().handover()}>{t('Support team se baat karein')}</Button>
          </View>
        )}
        <Composer disabled={!loaded} />
      </KeyboardAvoidingView>

      <ImageViewer url={image} onClose={() => setImage(null)} />

      <Sheet open={!!action} onClose={() => setActionFor(null)}>
        <ListGroup>
          <ListRow icon={Reply} title={t('Reply')} onPress={() => { if (action) store().setReplyTo(action); setActionFor(null); }} />
          {!!action?.text && (
            <ListRow icon={Copy} title={t('Copy')} onPress={() => {
              const text = action.text ?? '';
              setActionFor(null);
              void Clipboard.setStringAsync(text).then(() => toast.success(t('Copy ho gaya')));
            }} />
          )}
          {canEdit && <ListRow icon={Pencil} title={t('Edit')} onPress={() => { store().setEditing(action); setActionFor(null); }} />}
          {action?.sender === 'MERCHANT' && !action.deletedAt && (
            <ListRow icon={Trash2} title={t('Delete')} destructive onPress={() => {
              const id = action.id;
              setActionFor(null);
              void confirm({ title: t('Ye message delete karein?'), message: t('Support team ko bhi ye message nazar nahi aayega.'), confirmLabel: t('Delete'), tone: 'danger' })
                .then((ok) => { if (ok) void store().deleteMessage(id); });
            }} />
          )}
        </ListGroup>
      </Sheet>

      <Sheet open={callOpen} onClose={() => setCallOpen(false)} title={t('Support call')}>
        <View style={{ gap: th.space(3) }}>
          {!canCall() && (
            <Card tone="info">
              <Text size="sm" tone="info">{t('App mein call aur screen share abhi nahi hote. WhatsApp par call karein, ya web app se Nafaa team ko call karein aur screen dikhayein.')}</Text>
            </Card>
          )}
          <ListGroup>
            <ListRow icon={MessageCircle} iconTone="success" title={t('WhatsApp par call karein')} subtitle={t('WhatsApp khulega, wahan call ka button dabayein')} chevron
              onPress={() => { setCallOpen(false); openWhatsappSupport(waText); }} />
            <ListRow icon={Phone} iconTone="info" title={t('Phone par call karein')} chevron onPress={() => { setCallOpen(false); callSupportPhone(); }} />
            <ListRow icon={Globe} iconTone="neutral" title={t('Web app se call aur screen share')} subtitle={WEB_SUPPORT_URL.replace(/^https?:\/\//, '')} chevron
              onPress={() => { setCallOpen(false); void openInApp(WEB_SUPPORT_URL); }} />
          </ListGroup>
        </View>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <ListGroup>
          {live && (
            <ListRow icon={CircleCheck} iconTone="success" title={t('Issue solve ho gaya')} onPress={() => { setMenuOpen(false); void store().resolve(); }} />
          )}
          <ListRow icon={LifeBuoy} title={t('Help center')} chevron onPress={() => { setMenuOpen(false); router.push('/help'); }} />
          <ListRow icon={MessageCircle} title={t('WhatsApp par baat karein')} chevron onPress={() => { setMenuOpen(false); openWhatsappSupport(waText); }} />
        </ListGroup>
      </Sheet>
    </Screen>
  );
}
