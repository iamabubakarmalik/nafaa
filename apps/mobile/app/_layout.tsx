import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useLocaleStore } from '@/store/locale.store';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { TrialExpiredModal } from '@/components/billing/TrialExpiredModal';
import { Crash } from '@/lib/crashReporting';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    // Wait until store hydrated AND segments are available
    if (!isInitialized || !segments.length) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, segments, router]);
}

function RootLayoutNav() {
  // Selector subscriptions — these trigger proper re-renders on change
  const isDark = useThemeStore((s) => s.isDark);
  const isRTL = useLocaleStore((s) => s.isRTL);

  useProtectedRoute();
  usePushNotifications();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        // Force full re-mount when theme/locale changes — ensures every
        // screen pulls fresh styles and dark:/rtl classes apply.
        key={`${isDark ? 'dark' : 'light'}-${isRTL ? 'rtl' : 'ltr'}`}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: isDark ? '#0a0a0a' : '#fafafa' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const { initialize: initAuth, isInitialized } = useAuthStore();
  const { initialize: initTheme } = useThemeStore();
  const { initialize: initLocale } = useLocaleStore();

  useEffect(() => {
    (async () => {
      Crash.init();
      await Promise.all([initAuth(), initTheme(), initLocale()]);
      await SplashScreen.hideAsync();
    })();
  }, [initAuth, initTheme, initLocale]);

  if (!isInitialized) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
          <Toast position="top" topOffset={60} />
          <TrialExpiredModal />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
