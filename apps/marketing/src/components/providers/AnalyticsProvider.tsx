'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { GA_ID, GTM_ID, pageview, setConsentDefaults, grantConsent } from '@/lib/analytics/gtag';
import { initMetaPixel, meta } from '@/lib/analytics/pixels/meta';
import { initTikTokPixel } from '@/lib/analytics/pixels/tiktok';
import { initLinkedIn } from '@/lib/analytics/pixels/linkedin';
import { initClarity } from '@/lib/analytics/pixels/clarity';
import { initSnapPixel } from '@/lib/analytics/pixels/snap';
import { initPinterest } from '@/lib/analytics/pixels/pinterest';
import { initHotjar } from '@/lib/analytics/pixels/hotjar';
import '@/lib/analytics/types'; // side-effect: window types
import '@/lib/analytics/config'; // side-effect: dev logging

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Init all pixels once
  useEffect(() => {
    initMetaPixel();
    initTikTokPixel();
    initLinkedIn();
    initClarity();
    initSnapPixel();
    initPinterest();
    initHotjar();
  }, []);

  // Consent defaults + grant if previously accepted
  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;
    setConsentDefaults();
    if (localStorage.getItem('nafaa-cookies') === 'all') grantConsent();
  }, []);

  // Route change → pageview to GA4 + Meta
  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const url = pathname + (qs ? `?${qs}` : '');
    pageview(url);
    meta.pageView();
    // TikTok, Pinterest, Snap already handle SPA pageviews via their loaders
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider() {
  return (
    <>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      <Suspense fallback={null}>
        <AnalyticsInner />
      </Suspense>
    </>
  );
}
