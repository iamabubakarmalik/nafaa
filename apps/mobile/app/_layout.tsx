import '../global.css';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@/store/auth.store';
import { onboardingApi } from '@/api/onboarding.api';
import { initCrashReporting } from '@/lib/crashReporting';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
    initCrashReporting();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AuthGate>
            <Slot />
          </AuthGate>
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * AuthGate — the single source of truth for routing.
 *
 * Routes:
 * - /auth/*  → only for non-authenticated users (login, register, etc.)
 * - /onboarding → for authenticated users with incomplete onboarding
 * - /(tabs)/* → for authenticated + onboarded users
 *
 * Behavior:
 * 1. Wait for store hydration (isInitialized)
 * 2. Not authenticated → redirect to /auth/login
 * 3. Authenticated but onboarding incomplete → redirect to /onboarding
 * 4. Authenticated + onboarded → allow (tabs) access
 * 5. Auth screens for already-authenticated users → bounce to dashboard
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Fetch onboarding status ONLY if authenticated
  const { data: onboarding, isLoading: loadingOnboarding } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: onboardingApi.get,
    enabled: isInitialized && isAuthenticated,
    retry: 1,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!isInitialized) return;

    const firstSegment = segments[0] as string | undefined;
    const inAuthGroup = firstSegment === 'auth';
    const inOnboarding = firstSegment === 'onboarding';
    const inTabsGroup = firstSegment === '(tabs)';

    // ─── 1. Not authenticated ───────────────────────────────
    if (!isAuthenticated) {
      // If user is anywhere except /auth/*, redirect to login
      if (!inAuthGroup) {
        router.replace('/auth/login');
      }
      return;
    }

    // ─── 2. Authenticated — wait for onboarding status ──────
    if (loadingOnboarding) return;

    // ─── 3. Onboarding incomplete → force to /onboarding ────
    if (onboarding && !onboarding.isCompleted) {
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
      return;
    }

    // ─── 4. Auth screens for logged-in user → bounce home ───
    if (inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }

    // ─── 5. Onboarding screen for completed users → bounce ──
    if (inOnboarding && onboarding?.isCompleted) {
      router.replace('/(tabs)');
      return;
    }
  }, [
    isInitialized,
    isAuthenticated,
    onboarding,
    loadingOnboarding,
    segments,
    router,
  ]);

  // Loading state — while hydrating or checking onboarding
  if (!isInitialized || (isAuthenticated && loadingOnboarding)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
        }}
      >
        <View
          style={{
            height: 80,
            width: 80,
            borderRadius: 24,
            backgroundColor: '#16a34a',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#16a34a',
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <ActivityIndicator color="#ffffff" size="large" />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}
