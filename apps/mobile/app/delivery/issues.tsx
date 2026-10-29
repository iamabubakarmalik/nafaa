/**
 * Delivery sync issues: reports or recoveries the server refused. A report
 * can be opened, fixed and saved again; anything can be removed from the list.
 */

import { Alert, FlatList, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react-native';
import { useDeliveryQuery, useDeliveryStore } from '@/features/delivery/store';
import { dismissIssue, openIssues } from '@/features/delivery/core/repo';
import { ActionButton, Card, Empty, ScreenHeader, Tag } from '@/features/booker/ui/parts';

const KIND: Record<string, string> = { report: 'Delivery report', recovery: 'Recovery' };

export default function DeliveryIssues() {
  const router = useRouter();
  const { db, bump, refreshCounts } = useDeliveryStore();
  const { data: issues = [] } = useDeliveryQuery((d) => openIssues(d), []);

  const remove = (id: number) => {
    const go = async () => {
      if (!db) return;
      await dismissIssue(db, id);
      bump();
      refreshCounts();
    };
    if (Platform.OS === 'web') { go(); return; }
    Alert.alert('List se hatayein?', 'Ye entry office nahi jayegi.', [
      { text: 'Nahi', style: 'cancel' },
      { text: 'Hatayein', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader title="Sync issues" subtitle="Ye entries server ne nahi li" onBack={() => (router.canGoBack() ? router.back() : router.replace('/delivery'))} />
      <FlatList
        data={issues}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        ListEmptyComponent={<Empty icon={CheckCircle2} title="Koi masla nahi" text="Sab entries office pohanch gayi hain" />}
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center gap-2">
              <Tag tone="red">{KIND[item.kind] ?? item.kind}</Tag>
              <Text numberOfLines={1} className="flex-1 text-sm font-extrabold text-neutral-900 dark:text-white">{item.title}</Text>
            </View>
            <Text className="text-xs text-neutral-500 mt-1">{new Date(item.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
            <Text className="text-sm text-red-700 dark:text-red-300 mt-2">{item.reason}</Text>
            <View className="flex-row gap-2 mt-3">
              {item.kind === 'report' && item.orderId && (
                <ActionButton label="Theek karke dobara" icon={Pencil} className="flex-1" onPress={() => router.push(`/delivery/invoice/${item.orderId}`)} />
              )}
              <ActionButton label="Hatayein" icon={Trash2} tone="white" className="flex-1" onPress={() => remove(item.id)} />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
