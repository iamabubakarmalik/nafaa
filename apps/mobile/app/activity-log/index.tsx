import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Activity, Sparkles, Search, X, User,
  CalendarClock, Globe, Smartphone,
} from 'lucide-react-native';
import { activityLogApi } from '@/api/activity-log.api';

import { useTranslation } from '@/i18n/useTranslation';
const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const actionColors: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: '#dcfce7', text: '#15803d' },
  UPDATE: { bg: '#dbeafe', text: '#1d4ed8' },
  DELETE: { bg: '#fee2e2', text: '#b91c1c' },
  LOGIN: { bg: '#ede9fe', text: '#6d28d9' },
  LOGOUT: { bg: '#f3f4f6', text: '#4b5563' },
};

export default function ActivityLogScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const { data: logs = [], refetch } = useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => {
      try {
        const r = await activityLogApi.list();
        return Array.isArray(r) ? r : [];
      } catch {
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        (l.user?.fullName || '').toLowerCase().includes(q),
    );
  }, [logs, search]);

  const getActionColor = (action: string) => {
    const upper = action.toUpperCase();
    for (const key of Object.keys(actionColors)) {
      if (upper.includes(key)) return actionColors[key];
    }
    return { bg: '#f3f4f6', text: '#4b5563' };
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.activity_log')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#737373" />
            <Text className="text-xs text-neutral-500">
              Audit trail • {logs.length} events
            </Text>
          </View>
        </View>
      </View>

      <View className="px-5 pb-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
          <Search size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search action, entity, user..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-base text-neutral-900 dark:text-white"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={12}
              className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#737373" />}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center py-12">
            <View className="h-16 w-16 rounded-3xl bg-neutral-100 items-center justify-center">
              <Activity size={32} color="#737373" />
            </View>
            <Text className="mt-3 text-base font-bold text-neutral-700">
              {search ? 'No matches' : 'No activity yet'}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {filtered.map((l) => {
              const colors = getActionColor(l.action);
              return (
                <View
                  key={l.id}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5"
                >
                  <View className="flex-row items-start gap-3">
                    <View
                      className="h-10 w-10 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Activity size={18} color={colors.text} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <View
                          className="px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <Text className="text-[10px] font-extrabold" style={{ color: colors.text }}>
                            {l.action}
                          </Text>
                        </View>
                        <Text className="text-xs font-bold text-neutral-700">{l.entity}</Text>
                      </View>
                      {l.user && (
                        <View className="flex-row items-center gap-1 mt-1.5">
                          <User size={10} color="#737373" />
                          <Text className="text-[11px] text-neutral-600 font-semibold">
                            {l.user.fullName}
                          </Text>
                        </View>
                      )}
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <CalendarClock size={10} color="#9ca3af" />
                        <Text className="text-[10px] text-neutral-500">
                          {formatDate(l.createdAt)}
                        </Text>
                      </View>
                      {l.ipAddress && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Globe size={10} color="#9ca3af" />
                          <Text className="text-[10px] text-neutral-500 font-mono">
                            {l.ipAddress}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
