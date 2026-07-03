import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Smart back navigation — if user came from More tab,
 * back button takes them back to More tab (not Dashboard).
 *
 * Usage:
 *   const goBack = useSmartBack();
 *   <Pressable onPress={goBack}>...</Pressable>
 */
export function useSmartBack() {
  const router = useRouter();

  const goBack = useCallback(async () => {
    try {
      const source = await AsyncStorage.getItem('nafaa-nav-source');
      if (source === 'more') {
        // Clear the flag and go to More tab
        await AsyncStorage.removeItem('nafaa-nav-source');
        router.replace('/(tabs)/more' as any);
        return;
      }
    } catch {}

    // Default behavior — go back or fallback to dashboard
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  }, [router]);

  // Also intercept hardware back button (Android)
  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        goBack();
        return true; // prevent default
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [goBack]),
  );

  return goBack;
}
