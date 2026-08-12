'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import { GA_ID, GTM_ID, pageview, setConsentDefaults, grantConsent } from '@/lib/analytics/gtag';

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const qs = searchParams?.toString();
      pageview(pathname + (qs ? `?${qs}` : ''));
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;
    setConsentDefaults();
    if (localStorage.getItem('nafaa-cookies') === 'all') grantConsent();
  }, [pathname]);

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
