import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { uploadsApi, type UploadPurpose, type UploadRecord } from '@/api/uploads.api';
import Toast from 'react-native-toast-message';

export interface UploadingImage {
  id: string;
  uri: string;
  name: string;
  type: string;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  result?: UploadRecord;
}

interface Options {
  purpose?: UploadPurpose;
  onUploaded?: (records: UploadRecord[]) => void;
}

export function useImagePicker(opts: Options = {}) {
  const { purpose = 'product-image', onUploaded } = opts;
  const [items, setItems] = useState<UploadingImage[]>([]);
  const [busy, setBusy] = useState(false);

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required');
      return false;
    }
    return true;
  };

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required');
      return false;
    }
    return true;
  };

  const uploadAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      const queued: UploadingImage[] = assets.map((a) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: a.uri,
        name: a.fileName || `image-${Date.now()}.jpg`,
        type: a.mimeType || 'image/jpeg',
        progress: 0,
        status: 'queued',
      }));

      setItems((prev) => [...prev, ...queued]);
      setBusy(true);

      const successful: UploadRecord[] = [];

      for (const item of queued) {
        try {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i)),
          );

          const result = await uploadsApi.single(
            { uri: item.uri, name: item.name, type: item.type },
            {
              purpose,
              onProgress: ({ percent }) => {
                setItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i)),
                );
              },
            },
          );

          successful.push(result);
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: 'done', progress: 100, result } : i,
            ),
          );
        } catch (e: any) {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'error' } : i)),
          );
          Toast.show({ type: 'error', text1: 'Upload failed', text2: item.name });
        }
      }

      setBusy(false);
      if (successful.length && onUploaded) onUploaded(successful);
      if (successful.length) {
        Toast.show({
          type: 'success',
          text1: `${successful.length} uploaded`,
        });
      }
    },
    [onUploaded, purpose],
  );

  const pickFromCamera = useCallback(async () => {
    if (!(await ensureCameraPermission())) return;
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets) await uploadAssets(res.assets);
  }, [uploadAssets]);

  const pickFromGallery = useCallback(
    async (multiple = true) => {
      if (!(await ensureLibraryPermission())) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        quality: 0.8,
        selectionLimit: multiple ? 10 : 1,
      });
      if (!res.canceled && res.assets) await uploadAssets(res.assets);
    },
    [uploadAssets],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, busy, pickFromCamera, pickFromGallery, remove, clear };
}
