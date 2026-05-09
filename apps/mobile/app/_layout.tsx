import '../global.css';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import Toast from 'react-native-toast-message';
import { colorScheme as nwColorScheme } from 'nativewind';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useLocaleStore } from '@/store/locale.store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30 * 1000, refetchOnWindowFocus: false },
  },
});

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, segments]);
}

function RootLayoutNav() {
  const { isDark, mode } = useThemeStore();
  useProtectedRoute();

  // Sync NativeWind colorScheme + system UI bg with theme store
  useEffect(() => {
    nwColorScheme.set(mode === 'system' ? 'system' : (isDark ? 'dark' : 'light'));
    SystemUI.setBackgroundColorAsync(isDark ? '#0a0a0a' : '#fafafa').catch(() => {});
  }, [isDark, mode]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0a0a0a' : '#fafafa' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: isDark ? '#0a0a0a' : '#fafafa' },
        }}
      >
        <Stack.Screen name="auth" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sales/index" />
        <Stack.Screen name="sales/[id]" />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="notifications/index" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="plan/index" />
        <Stack.Screen name="referrals/index" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const { initialize: initAuth, isInitialized } = useAuthStore();
  const { initialize: initTheme } = useThemeStore();
  const { initialize: initLocale } = useLocaleStore();

  useEffect(() => {
    (async () => {
      await Promise.all([initAuth(), initTheme(), initLocale()]);
      await SplashScreen.hideAsync();
    })();
  }, []);

  if (!isInitialized) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
          <Toast position="top" topOffset={60} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
