import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Hash, Plus, Edit3, Trash2, X, Save } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ColorPicker } from '@/components/inventory/ColorPicker';
import { tagsApi, type Tag, type UpsertTagPayload } from '@/api/tags.api';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
const empty: UpsertTagPayload = { name: '', color: '#16a34a' };

export default function TagsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState<UpsertTagPayload>(empty);

  const { data: tags = [], refetch } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? tagsApi.update(editing.id, form) : tagsApi.create(form),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: editing ? 'Tag updated' : 'Tag created' });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      close();
    },
    onError: (e: any) =>
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed' }),
  });

  const removeMutation = useMutation({
    mutationFn: tagsApi.remove,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const close = () => {
    setShowForm(false);
    setEditing(null);
    setForm(empty);
  };

  const openEdit = (t: Tag) => {
    setEditing(t);
    setForm({ name: t.name, color: t.color });
    setShowForm(true);
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
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">{t('auto.index.tags')}</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {tags.length} tag{tags.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setEditing(null);
            setForm(empty);
            setShowForm(true);
          }}
          className="h-11 w-11 rounded-2xl bg-pink-600 items-center justify-center"
        >
          <Plus size={22} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ec4899" />
        }
      >
        {tags.length === 0 ? (
          <View className="items-center py-20">
            <Hash size={48} color="#d1d5db" />
            <Text className="mt-4 text-base font-bold text-neutral-700 dark:text-neutral-300">{t('auto.index.no_tags_yet')}</Text>
            <Text className="mt-1 text-sm text-neutral-500 text-center px-8">{t('auto.index.add_tags_like_organic_halal_premium_impo')}</Text>
          </View>
        ) : (
          <Card variant="outline" className="p-4">
            <View className="flex-row flex-wrap gap-2">
              {tags.map((t) => (
                <View
                  key={t.id}
                  className="flex-row items-center gap-1.5 rounded-full pl-3 pr-1 py-1.5 border-2"
                  style={{
                    backgroundColor: `${t.color}15`,
                    borderColor: `${t.color}40`,
                  }}
                >
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  <Text className="text-sm font-bold" style={{ color: t.color }}>
                    {t.name}
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    ({t._count?.products ?? 0})
                  </Text>
                  <Pressable
                    onPress={() => openEdit(t)}
                    className="h-7 w-7 rounded-full items-center justify-center"
                  >
                    <Edit3 size={12} color={t.color} />
                  </Pressable>
                  <Pressable
                    onPress={() => removeMutation.mutate(t.id)}
                    className="h-7 w-7 rounded-full items-center justify-center"
                  >
                    <Trash2 size={12} color="#dc2626" />
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                {editing ? 'Edit Tag' : 'New Tag'}
              </Text>
              <Pressable
                onPress={close}
                className="h-10 w-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <Input
                  label="Tag Name *"
                  value={form.name}
                  onChangeText={(name) => setForm({ ...form, name })}
                  placeholder="organic, halal, imported..."
                />

                <ColorPicker
                  label="Color"
                  value={form.color ?? '#16a34a'}
                  onChange={(color) => setForm({ ...form, color })}
                />

                <View
                  className="rounded-2xl p-5 items-center"
                  style={{
                    backgroundColor: `${form.color}15`,
                    borderWidth: 2,
                    borderColor: `${form.color}40`,
                  }}
                >
                  <Text className="text-xs font-bold text-neutral-500 mb-2 uppercase">{t('auto.index.preview')}</Text>
                  <View
                    className="flex-row items-center gap-2 rounded-full px-4 py-2"
                    style={{ backgroundColor: form.color }}
                  >
                    <Text className="text-white font-bold">
                      {form.name || 'Tag preview'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Button
                size="lg"
                loading={saveMutation.isPending}
                onPress={() => {
                  if (!form.name.trim()) {
                    Toast.show({ type: 'error', text1: 'Name required' });
                    return;
                  }
                  saveMutation.mutate();
                }}
              >
                <Save size={18} color="#ffffff" />
                <Text className="text-white font-bold text-base">
                  {editing ? 'Update' : 'Create'} Tag
                </Text>
              </Button>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
