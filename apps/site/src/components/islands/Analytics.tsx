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
 * - Sign-up links get attribution parameters as they are clicked
 *   (lib/analytics/attribution.ts); sign-up and WhatsApp clicks are recorded
 *   even on CMS buttons tagged cta_click.
 * - With a GTM id, only GTM loads (its GA4 Configuration tag sends GA4) and
 *   every event goes to dataLayer: signup_clicked as `sign_up_start`,
 *   demo_submit as `demo_request`, the rest by name, each with page_path and
 *   page_type. Consent Mode defaults are pushed first, and the banner choice
 *   follows as a consent update plus a `nafaa_consent_update` event.
 * - Google tags (GTM, GA4, Google Ads) load at the visitor's first
 *   interaction (tap, scroll, key), a few seconds after the page has loaded,
 *   or at consent, whichever comes first, in Consent Mode v2 (storage denied
 *   until the visitor accepts). They used to load on idle, which put about a
 *   second of third-party script (GTM also pulls in its own tags) in the way
 *   of the page becoming responsive on mid-range phones. Clarity and the ad
 *   pixels load only after consent. Ids come from settings `analytics` or the
 *   NEXT_PUBLIC_* variables (lib/analytics/env.ts); each loads only when set.
 */
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { CONSENT_EVENT, readConsent, type ConsentChoice } from '@/lib/analytics/consent';
import type { AdsConversions } from '@/lib/analytics/env';
import { decorateSignupUrl, isSignupHref, pageTypeOf, rememberFirstTouch } from '@/lib/analytics/attribution';
import { googleForwarder, initGoogleConsent, loadClarity, loadGoogle, loadPixels, pixelPageview, updateGoogleConsent, type PixelIds } from '@/lib/analytics/loaders';
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

/** Without an interaction, Google tags load this long after the window load event (then on idle). */
const LOAD_DELAY_MS = 5000;
/** The first of these starts the Google tags early. */
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/** The anchor a pointer or click event landed on, with its parsed href. */
function anchorOf(event: Event): { el: HTMLAnchorElement; href: URL } | null {
  const target = event.target instanceof Element ? event.target : null;
  const el = target?.closest<HTMLAnchorElement>('a[href]');
  if (!el) return null;
  try {
    return { el, href: new URL(el.href, window.location.href) };
  } catch {
    return null;
  }
}

function signupContext(el: HTMLElement) {
  const path = window.location.pathname;
  const area = el.closest<HTMLElement>('[data-track-area]')?.dataset.trackArea;
  return { pagePath: path, pageType: pageTypeOf(path), cta: el.dataset.trackLabel ?? area };
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
    if (first) rememberFirstTouch();
    trackPageview(referrer);
    // Pixels send their own first PageView on load; GA4 follows history changes itself.
    if (!first) pixelPageview();
  }, [pathname]);

  // Sign-up links carry attribution (lib/analytics/attribution.ts). The href
  // is rewritten as the pointer goes down and again on click, so a normal
  // click, a middle-click, a new-tab click and "copy link" all leave with it.
  useEffect(() => {
    if (!signupUrl) return;
    const decorate = (event: Event) => {
      const hit = anchorOf(event);
      if (!hit || !isSignupHref(hit.href, signupUrl)) return;
      const next = decorateSignupUrl(hit.href, signupContext(hit.el));
      if (next !== hit.el.href) hit.el.href = next;
    };
    const events = ['pointerdown', 'click', 'auxclick', 'contextmenu', 'keydown'] as const;
    for (const name of events) document.addEventListener(name, decorate, { capture: true, passive: true });
    return () => {
      for (const name of events) document.removeEventListener(name, decorate, { capture: true });
    };
  }, [signupUrl]);

  // Click tracking.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const el = target?.closest<HTMLElement>('a[href], button[data-track]');
      if (!el) return;
      const explicit = el.dataset.track as TrackEvent | undefined;
      const label = el.dataset.trackLabel ?? el.textContent?.trim().slice(0, 80) ?? '';
      const location = el.closest<HTMLElement>('[data-track-area]')?.dataset.trackArea;
      const page = { page_path: window.location.pathname, page_type: pageTypeOf(window.location.pathname) };
      let href: URL | null = null;
      if (el instanceof HTMLAnchorElement) {
        try {
          href = new URL(el.href, window.location.href);
        } catch {
          href = null;
        }
      }
      const whatsapp = href ? /(^|\.)wa\.me$|whatsapp\.com$/.test(href.hostname) : false;
      const signup = href ? isSignupHref(href, signupUrl) : false;
      // Conversion events first, whatever data-track says: CMS buttons are
      // tagged cta_click, and a sign-up or WhatsApp click must still count.
      if (signup) track('signup_clicked', { label, location, ...page, cta_location: location ?? label });
      else if (whatsapp && explicit !== 'whatsapp_click') track('whatsapp_click', { label, location, ...page, cta_location: location ?? label });
      if (explicit) {
        track(explicit, explicit === 'whatsapp_click' ? { label, location, ...page, cta_location: location ?? label } : { label, location });
        return;
      }
      if (!href || signup || whatsapp) return;
      if (href.origin !== window.location.origin && /^https?:$/.test(href.protocol)) {
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
    // Consent defaults go into dataLayer before anything else, and events
    // are forwarded from now on: with GTM they queue in dataLayer until the
    // container starts, so early clicks are not lost.
    initGoogleConsent(readConsent() === 'granted');
    setTrackForwarder(googleForwarder({ gtmId, adsId }, { signup: adsSignup, lead: adsLead, demo: adsDemo }));
    const start = () => loadGoogle(google, readConsent() === 'granted');
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopWaiting = () => {
      for (const name of INTERACTION_EVENTS) window.removeEventListener(name, onInteraction);
      window.removeEventListener('load', onLoad);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer) clearTimeout(timer);
    };
    const startNow = () => {
      stopWaiting();
      start();
    };
    const onInteraction = () => startNow();
    const onLoad = () => {
      timer = setTimeout(() => {
        if ('requestIdleCallback' in window) idle = window.requestIdleCallback(startNow, { timeout: LOAD_DELAY_MS });
        else startNow();
      }, LOAD_DELAY_MS);
    };
    if (readConsent() === 'granted') start();
    else {
      for (const name of INTERACTION_EVENTS) window.addEventListener(name, onInteraction, { once: true, passive: true });
      if (document.readyState === 'complete') onLoad();
      else window.addEventListener('load', onLoad, { once: true });
    }
    const onConsent = (event: Event) => {
      const choice = (event as CustomEvent<ConsentChoice>).detail;
      startNow();
      updateGoogleConsent(choice === 'granted');
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      stopWaiting();
      setTrackForwarder(null);
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
