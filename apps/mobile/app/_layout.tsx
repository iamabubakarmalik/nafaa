/**
 * Root: providers, startup, routing between sign-in, onboarding and the app,
 * and the opening animation on a cold start.
 *
 * Start order (cold start): session + language (boot) -> the shop's industry
 * pack -> a first frame that holds only the opening animation, so the native
 * splash goes at once -> the app mounts underneath on the next frame while the
 * animation runs on the UI thread. Background work (offline engine, device
 * check-in) waits until the first screen is up.
 */

import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Appearance as RNAppearance, AppState, InteractionManager, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { boot } from '@/core/boot';
import { startIndustryPacks } from '@/industries';
import { queryClient } from '@/core/query/client';
import { useBiometric } from '@/core/auth/biometric';
import { useAuthStore } from '@/core/auth/store';
import { consumeSkipIntro } from '@/core/i18n/sync';
import { initCrashReporting } from '@/core/device/crash-reporting';
import {
  AppearanceBridge, AppIntro, DialogHost, getAppearance, primeFirstFrame, SheetProvider, ThemeProvider, ToastHost, useAppearance, useBundledFonts, useTheme,
} from '@/design';
import { AppControlGate, useDeviceHeartbeat } from '@/modules/shell/appControl';
import { AuthGate } from '@/modules/shell/AuthGate';
import { ShellSheets } from '@/modules/shell/components/ShellSheets';
import { LockScreen } from '@/modules/shell/components/LockScreen';
import { ManagerPinHost } from '@/core/security/ManagerPin';
import { perfMark } from '@/core/perf';

perfMark('layout-module');

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// The intro plays once per cold start; a language reload skips it.
const playIntro = !consumeSkipIntro();

// Native controls (date picker, keyboard, alerts) follow the app theme; in
// "system" mode the OS setting stays in charge.
function syncNativeScheme(mode: string) {
  RNAppearance.setColorScheme(mode === 'dark' || mode === 'light' ? mode : null);
}

// The saved theme paints the native background before the first frame, also
// right after a language reload.
primeFirstFrame();
syncNativeScheme(getAppearance().mode);

export default function RootLayout() {
  const fontsReady = useBundledFonts();
  const [booted, setBooted] = useState(false);
  perfMark('root-render');
  if (fontsReady) perfMark('fonts-ready');

  useEffect(() => {
    // Firebase loads its native modules on first use; that waits until the
    // first screen is up (native crashes are caught from launch either way).
    const crash = InteractionManager.runAfterInteractions(() => void initCrashReporting());
    boot()
      .then((ok) => {
        perfMark('boot-done');
        startIndustryPacks();
        if (ok) setBooted(true);
      })
      .catch(() => {
        startIndustryPacks();
        setBooted(true);
      });
    return () => crash.cancel();
  }, []);

  if (!fontsReady || !booted) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <SheetProvider>
                <AppControlGate>
                  <AppFrame />
                </AppControlGate>
              </SheetProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppFrame() {
  const th = useTheme();
  const { mode, isDark } = useAppearance();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [intro, setIntro] = useState(playIntro && th.motion);
  // With the opening animation the first frame holds only the animation; the
  // app mounts one frame later, underneath it.
  const [appMounted, setAppMounted] = useState(!intro);
  useDeviceHeartbeat();

  useEffect(() => {
    syncNativeScheme(mode);
  }, [mode]);

  const hideSplash = useCallback(() => {
    perfMark('splash-hide');
    return SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  perfMark('frame-render');

  useEffect(() => {
    if (!intro) hideSplash();
  }, [intro, hideSplash]);

  const onIntroReady = useCallback(() => {
    void hideSplash();
    requestAnimationFrame(() => setAppMounted(true));
  }, [hideSplash]);

  // Biometric lock after time in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') useBiometric.getState().markBackground();
      if (s === 'active') useBiometric.getState().lockIfNeeded(false);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {appMounted && (
        <>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: th.colors.canvas }, animation: th.motion ? 'default' : 'none' }} />
          </AuthGate>
          {isAuthenticated && <ShellSheets />}
          {isAuthenticated && <ManagerPinHost />}
          <DialogHost />
          <ToastHost />
          <LockScreen />
        </>
      )}
      <AppearanceBridge />
      {intro && (
        <AppIntro
          onReady={onIntroReady}
          onDone={() => {
            perfMark('intro-done');
            setAppMounted(true);
            setIntro(false);
          }}
        />
      )}
    </View>
  );
}
