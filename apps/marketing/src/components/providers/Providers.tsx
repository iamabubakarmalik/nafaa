'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { LocaleProvider } from './LocaleProvider';
import { ToastProvider } from './ToastProvider';
import { AnalyticsProvider } from './AnalyticsProvider';
import { Cursor } from '@/components/primitives/Cursor';
import { AIAdvisor } from '@/components/features/AIAdvisor';
import { ReferralWidget } from '@/components/features/ReferralWidget';
import { CookieConsent } from '@/components/features/CookieConsent';
import { BackToTop } from '@/components/features/BackToTop';
import { CulturalMoment } from '@/components/features/CulturalMoment';
import { PrayerTimeBanner } from '@/components/features/PrayerTimeBanner';
import { ScrollProgress } from '@/components/features/ScrollProgress';
import { PWAInstallPrompt } from '@/components/features/PWAInstallPrompt';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AnalyticsProvider />
        <ScrollProgress />
        <CulturalMoment />
        <PrayerTimeBanner />
        {children}
        <ToastProvider />
        <Cursor />
        <AIAdvisor />
        <ReferralWidget />
        <BackToTop />
        <CookieConsent />
        <PWAInstallPrompt />
      </LocaleProvider>
    </ThemeProvider>
  );
}
