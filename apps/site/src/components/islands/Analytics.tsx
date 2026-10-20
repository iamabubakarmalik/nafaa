'use client';

/**
 * Analytics island (ARCH 11). Mounted once in the root layout; renders nothing.
 *
 * - A pageview on load and on every client navigation (first-party API).
 * - One delegated click listener, so server components need no handlers:
 *     <a data-track="cta_click" data-track-label="Header: Book a demo">
 *   Without data-track it still records WhatsApp links (whatsapp_click),
 *   sign-up links (signup_clicked, matched against `signupUrl`) and links to
 *   other sites (outbound_click, domain only).
 * - Google tags (GTM, GA4, Google Ads) load on idle or at consent, in Consent
 *   Mode v2 (storage denied until the visitor accepts). Clarity and the ad
 *   pixels load only after consent. Ids come from settings `analytics` or the
 *   NEXT_PUBLIC_* variables (lib/analytics/env.ts); each loads only when set.
 */
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CONSENT_EVENT, readConsent, type ConsentChoice } from '@/lib/analytics/consent';
import type { AdsConversions } from '@/lib/analytics/env';
import { googleForwarder, loadClarity, loadGoogle, loadPixels, pixelPageview, updateGoogleConsent, type PixelIds } from '@/lib/analytics/loaders';
import { setTrackForwarder, track, trackPageview, type TrackEvent } from '@/lib/analytics/track';

export interface AnalyticsProps {
  signupUrl?: string;
  gtmId?: string;
  gaId?: string;
  adsId?: string;
  adsConversions?: AdsConversions;
  clarityId?: string;
  /** Share of sessions recorded by Clarity, 0-1. */
  claritySample?: number;
  pixels?: PixelIds;
}

/** Google tags wait for the browser to be idle (or this long) so they stay off the critical path. */
const IDLE_TIMEOUT_MS = 4000;

function isSignup(href: URL, signupUrl: string | undefined): boolean {
  if (!signupUrl) return false;
  try {
    const target = new URL(signupUrl);
    return href.host === target.host && href.pathname.startsWith(target.pathname);
  } catch {
    return false;
  }
}

export function Analytics({ signupUrl, gtmId, gaId, adsId, adsConversions, clarityId, claritySample = 0.1, pixels }: AnalyticsProps) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Pageviews: the first one uses document.referrer, later ones the previous URL.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    const first = lastPath.current === null;
    const referrer = first ? document.referrer : `${window.location.origin}${lastPath.current}`;
    lastPath.current = pathname;
    trackPageview(referrer);
    // Pixels send their own first PageView on load; GA4 follows history changes itself.
    if (!first) pixelPageview();
  }, [pathname]);

  // Click tracking.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const el = target?.closest<HTMLElement>('a[href], button[data-track]');
      if (!el) return;
      const explicit = el.dataset.track as TrackEvent | undefined;
      const label = el.dataset.trackLabel ?? el.textContent?.trim().slice(0, 80) ?? '';
      const location = el.closest<HTMLElement>('[data-track-area]')?.dataset.trackArea;
      if (explicit) {
        track(explicit, { label, location });
        return;
      }
      if (!(el instanceof HTMLAnchorElement)) return;
      let href: URL;
      try {
        href = new URL(el.href, window.location.href);
      } catch {
        return;
      }
      if (/(^|\.)wa\.me$|whatsapp\.com$/.test(href.hostname)) track('whatsapp_click', { label, location });
      else if (isSignup(href, signupUrl)) track('signup_clicked', { label, location });
      else if (href.origin !== window.location.origin && /^https?:$/.test(href.protocol)) {
        track('outbound_click', { domain: href.hostname, location });
      }
    };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [signupUrl]);

  const metaPixelId = pixels?.metaPixelId;
  const tiktokPixelId = pixels?.tiktokPixelId;
  const linkedinPartnerId = pixels?.linkedinPartnerId;
  const hotjarId = pixels?.hotjarId;
  const adsSignup = adsConversions?.signup;
  const adsLead = adsConversions?.lead;
  const adsDemo = adsConversions?.demo;

  // Google tags: on idle in consent mode, or at once when consent is already given.
  useEffect(() => {
    if (!gtmId && !gaId && !adsId) return;
    const google = { gtmId, gaId, adsId };
    const start = () => {
      loadGoogle(google, readConsent() === 'granted');
      setTrackForwarder(googleForwarder(adsId, { signup: adsSignup, lead: adsLead, demo: adsDemo }));
    };
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (readConsent() === 'granted') start();
    else if ('requestIdleCallback' in window) idle = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
    else timer = setTimeout(start, IDLE_TIMEOUT_MS / 2);
    const onConsent = (event: Event) => {
      const choice = (event as CustomEvent<ConsentChoice>).detail;
      start();
      updateGoogleConsent(choice === 'granted');
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer) clearTimeout(timer);
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, [gtmId, gaId, adsId, adsSignup, adsLead, adsDemo]);

  // Clarity and pixels: only after consent.
  useEffect(() => {
    if (!clarityId && !metaPixelId && !tiktokPixelId && !linkedinPartnerId && !hotjarId) return;
    const apply = (choice: ConsentChoice | null) => {
      if (choice !== 'granted') return;
      if (clarityId) loadClarity(clarityId, claritySample);
      loadPixels({ metaPixelId, tiktokPixelId, linkedinPartnerId, hotjarId });
    };
    apply(readConsent());
    const onConsent = (event: Event) => apply((event as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [clarityId, claritySample, metaPixelId, tiktokPixelId, linkedinPartnerId, hotjarId]);

  return null;
}
