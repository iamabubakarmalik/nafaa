/**
 * Saved chats: search, rename, pin and delete (swipe), grouped as Pinned,
 * Today, Yesterday, This week and Older. The server scopes the list to the
 * signed-in person. The last list is kept for offline reading.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Pencil, Pin, PinOff, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Button, EmptyState, ErrorState, Input, ListRow, SearchBar, Sheet, SkeletonRows, SwipeRow, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { aiApi, type AiConversationSummary } from '../api/ai';
import { useAiStore } from '../store';

const DAY = 86_400_000;
type Group = 'Pinned' | 'Today' | 'Yesterday' | 'This week' | 'Older';
const ORDER: Group[] = ['Pinned', 'Today', 'Yesterday', 'This week', 'Older'];
const LABEL: Record<Group, () => string> = {
  Pinned: () => t('Pinned'), Today: () => t('Aaj'), Yesterday: () => t('Kal'), 'This week': () => t('Is hafte'), Older: () => t('Purane'),
};

function groupOf(c: AiConversationSummary, now: Date): Group {
  if (c.pinned) return 'Pinned';
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const at = new Date(c.lastMessageAt).getTime();
  if (at >= start) return 'Today';
  if (at >= start - DAY) return 'Yesterday';
  if (at >= start - 6 * DAY) return 'This week';
  return 'Older';
}

type Item = { kind: 'head'; id: string; label: string } | { kind: 'chat'; id: string; chat: AiConversationSummary };

export function AiHistory({ onPicked }: { onPicked?: () => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q, 250).trim();
  const [renaming, setRenaming] = useState<AiConversationSummary | null>(null);
  const [draft, setDraft] = useState('');
  const version = useAiStore((s) => s.historyVersion);
  const activeId = useAiStore((s) => s.conversationId);
  const load = useAiStore((s) => s.load);
  const newChat = useAiStore((s) => s.newChat);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ['ai', 'conversations', query, version], queryFn: () => aiApi.conversations(query), staleTime: 30_000, retry: false });

  const items = useMemo<Item[]>(() => {
    const now = new Date();
    const by = new Map<Group, AiConversationSummary[]>();
    for (const c of list.data ?? []) {
      const g = groupOf(c, now);
      by.set(g, [...(by.get(g) ?? []), c]);
    }
    return ORDER.filter((g) => by.has(g)).flatMap((g) => [
      { kind: 'head' as const, id: `h-${g}`, label: LABEL[g]() },
      ...by.get(g)!.map((chat) => ({ kind: 'chat' as const, id: chat.id, chat })),
    ]);
  }, [list.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
  const open = async (id: string) => {
    if (!online) { toast.info(t('Purani chat kholne ke liye internet chahiye')); return; }
    try { await load(id); onPicked?.(); } catch { toast.error(t('Chat nahi khul saki')); }
  };
  const saveName = async () => {
    const c = renaming;
    const title = draft.trim();
    setRenaming(null);
    if (!c || !title || title === c.title) return;
    try { await aiApi.update(c.id, { title }); refresh(); if (activeId === c.id) useAiStore.setState({ title }); } catch { toast.error(t('Naam save nahi hua')); }
  };
  const togglePin = async (c: AiConversationSummary) => {
    try { await aiApi.update(c.id, { pinned: !c.pinned }); refresh(); } catch { toast.error(t('Pin nahi hua')); }
  };
  const remove = async (c: AiConversationSummary) => {
    if (!(await confirm({ title: t('"{{title}}" chat mitayein?', { title: c.title }), tone: 'danger', confirmLabel: t('Delete') }))) return;
    try {
      await aiApi.remove(c.id);
      if (activeId === c.id) newChat();
      refresh();
    } catch { toast.error(t('Chat nahi miti')); }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: th.space(3) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Purani chat dhoondein…')} />
      </View>
      {list.isLoading ? <SkeletonRows count={5} avatar={false} />
        : list.isError ? <ErrorState error={list.error} onRetry={list.refetch} />
        : items.length === 0 ? <EmptyState compact icon={MessageSquare} title={query ? t('Is naam ki koi chat nahi.') : t('Abhi koi chat nahi — pehla sawal poochein.')} />
        : (
          <FlashList
            data={items}
            keyExtractor={(i) => i.id}
            getItemType={(i) => i.kind}
            contentContainerStyle={{ paddingHorizontal: th.space(3), paddingBottom: th.space(6) }}
            renderItem={({ item }) => item.kind === 'head' ? (
              <Text size="xs" weight="semibold" tone="subtle" uppercase style={{ paddingTop: th.space(3), paddingBottom: th.space(1), paddingHorizontal: th.space(2) }}>{item.label}</Text>
            ) : (
              <SwipeRow end={[
                { icon: item.chat.pinned ? PinOff : Pin, label: item.chat.pinned ? t('Unpin') : t('Pin'), tone: 'brand', onPress: () => void togglePin(item.chat) },
                { icon: Pencil, label: t('Rename'), tone: 'info', onPress: () => { setDraft(item.chat.title); setRenaming(item.chat); } },
                { icon: Trash2, label: t('Delete'), tone: 'danger', onPress: () => void remove(item.chat) },
              ]}>
                <ListRow
                  icon={item.chat.pinned ? Pin : MessageSquare}
                  title={item.chat.title || t('Nayi chat')}
                  selected={activeId === item.chat.id}
                  onPress={() => void open(item.chat.id)}
                />
              </SwipeRow>
            )}
          />
        )}
      <Sheet open={!!renaming} onClose={() => setRenaming(null)} title={t('Rename chat')}
        footer={<Button fullWidth onPress={() => void saveName()} disabled={!draft.trim()}>{t('Save')}</Button>}>
        <Input value={draft} onChangeText={setDraft} maxLength={80} autoFocus returnKeyType="done" onSubmitEditing={() => void saveName()} accessibilityLabel={t('Chat ka naya naam')} />
      </Sheet>
    </View>
  );
}
