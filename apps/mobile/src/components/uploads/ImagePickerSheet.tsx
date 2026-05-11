import { useState } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { Camera, Image as ImageIcon, X, CheckCircle2, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useImagePicker, type UploadingImage } from '@/hooks/useImagePicker';
import type { UploadPurpose, UploadRecord } from '@/api/uploads.api';

import { useTranslation } from '@/i18n/useTranslation';
interface Props {
  visible: boolean;
  onClose: () => void;
  purpose?: UploadPurpose;
  multiple?: boolean;
  onUploaded?: (records: UploadRecord[]) => void;
  title?: string;
}

export function ImagePickerSheet({
  visible,
  onClose,
  purpose = 'product-image',
  multiple = true,
  onUploaded,
  title = 'Add Photos',
}: Props) {
  const { t } = useTranslation();
  const { items, busy, pickFromCamera, pickFromGallery, remove, clear } = useImagePicker({
    purpose,
    onUploaded: (records) => {
      onUploaded?.(records);
    },
  });

  const handleClose = () => {
    if (!busy) {
      clear();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-neutral-900 rounded-t-3xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <Text className="text-lg font-bold text-neutral-900 dark:text-white">
              {title}
            </Text>
            <Pressable
              onPress={handleClose}
              disabled={busy}
              className="h-9 w-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center"
            >
              <X size={18} color="#6b7280" />
            </Pressable>
          </View>

          {/* Source picker */}
          <View className="flex-row gap-3 p-5">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                pickFromCamera();
              }}
              disabled={busy}
              className="flex-1 rounded-2xl bg-brand-600 active:bg-brand-700 p-5 items-center"
            >
              <Camera size={28} color="#ffffff" />
              <Text className="mt-2 text-white font-bold">{t('auto.ImagePickerSheet.camera')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                pickFromGallery(multiple);
              }}
              disabled={busy}
              className="flex-1 rounded-2xl bg-violet-600 active:bg-violet-700 p-5 items-center"
            >
              <ImageIcon size={28} color="#ffffff" />
              <Text className="mt-2 text-white font-bold">{t('auto.ImagePickerSheet.gallery')}</Text>
            </Pressable>
          </View>

          {/* Uploading list */}
          {items.length > 0 && (
            <ScrollView className="px-5 pb-5" showsVerticalScrollIndicator={false}>
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                {items.length} item{items.length > 1 ? 's' : ''}
              </Text>
              <View className="flex-row flex-wrap -mx-1">
                {items.map((item) => (
                  <UploadCardMobile
                    key={item.id}
                    item={item}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {/* Footer */}
          <View className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800">
            <Pressable
              onPress={handleClose}
              disabled={busy}
              className="h-12 rounded-2xl bg-emerald-600 active:bg-emerald-700 items-center justify-center disabled:opacity-50"
            >
              <Text className="text-white font-bold">
                {busy ? 'Uploading…' : 'Done'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function UploadCardMobile({
  item,
  onRemove,
}: {
  item: UploadingImage;
  onRemove: () => void;
}) {
  return (
    <View className="w-1/3 px-1 mb-2">
      <View className="aspect-square rounded-xl bg-neutral-200 dark:bg-neutral-800 overflow-hidden relative">
        <Image source={{ uri: item.uri }} className="w-full h-full" resizeMode="cover" />

        {item.status === 'uploading' && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <ActivityIndicator color="#ffffff" />
            <Text className="text-white text-xs font-bold mt-1">{item.progress}%</Text>
          </View>
        )}

        {item.status === 'done' && (
          <View className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-emerald-500 items-center justify-center">
            <CheckCircle2 size={14} color="#ffffff" />
          </View>
        )}

        {item.status === 'error' && (
          <View className="absolute inset-0 bg-rose-600/90 items-center justify-center">
            <AlertCircle size={20} color="#ffffff" />
          </View>
        )}

        <Pressable
          onPress={onRemove}
          disabled={item.status === 'uploading'}
          className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-black/60 items-center justify-center"
        >
          <X size={12} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}
