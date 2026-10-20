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
 * - GTM (with GA4 inside) and Clarity load only after consent, and only when
 *   their ids are configured in settings `analytics`.
 */
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CONSENT_EVENT, readConsent, type ConsentChoice } from '@/lib/analytics/consent';
import { track, trackPageview, type TrackEvent } from '@/lib/analytics/track';

export interface AnalyticsProps {
  signupUrl?: string;
  gtmId?: string;
  clarityId?: string;
  /** Share of sessions recorded by Clarity, 0-1. */
  claritySample?: number;
}

function injectScript(id: string, src: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadGtm(gtmId: string): void {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  injectScript('nafaa-gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`);
}

function loadClarity(clarityId: string, sample: number): void {
  // Sampling is decided once per session.
  let inSample = false;
  try {
    const stored = window.sessionStorage.getItem('nafaa_clarity');
    inSample = stored ? stored === '1' : Math.random() < sample;
    window.sessionStorage.setItem('nafaa_clarity', inSample ? '1' : '0');
  } catch {
    inSample = Math.random() < sample;
  }
  if (!inSample) return;
  const w = window as unknown as { clarity?: ((...args: unknown[]) => void) & { q?: unknown[] } };
  if (!w.clarity) {
    const queue: unknown[] = [];
    w.clarity = Object.assign((...args: unknown[]) => void queue.push(args), { q: queue });
  }
  injectScript('nafaa-clarity', `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`);
}

function isSignup(href: URL, signupUrl: string | undefined): boolean {
  if (!signupUrl) return false;
  try {
    const target = new URL(signupUrl);
    return href.host === target.host && href.pathname.startsWith(target.pathname);
  } catch {
    return false;
  }
}

export function Analytics({ signupUrl, gtmId, clarityId, claritySample = 0.1 }: AnalyticsProps) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Pageviews: the first one uses document.referrer, later ones the previous URL.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    const referrer = lastPath.current === null ? document.referrer : `${window.location.origin}${lastPath.current}`;
    lastPath.current = pathname;
    trackPageview(referrer);
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

  // Third-party loaders after consent.
  useEffect(() => {
    if (!gtmId && !clarityId) return;
    const apply = (choice: ConsentChoice | null) => {
      if (choice !== 'granted') return;
      if (gtmId) loadGtm(gtmId);
      if (clarityId) loadClarity(clarityId, claritySample);
    };
    apply(readConsent());
    const onConsent = (event: Event) => apply((event as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [gtmId, clarityId, claritySample]);

  return null;
}
