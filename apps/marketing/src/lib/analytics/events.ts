'use client';

/**
 * Unified event tracking across ALL platforms
 * Ek `trackEvent()` call → GA4 + Meta + TikTok + LinkedIn + Clarity ko simultaneously bhejta hai
 * Platform-specific mapping already built-in
 */

import { event as gaEvent, dataLayerPush } from './gtag';
import { meta, metaTrackCustom } from './pixels/meta';
import { tiktok } from './pixels/tiktok';
import { linkedinTrack } from './pixels/linkedin';
import { clarityEvent, clarityUpgrade } from './pixels/clarity';
import { googleAds } from './pixels/google-ads';
import { snapTrack } from './pixels/snap';
import { pinterestTrack } from './pixels/pinterest';

export type EventName =
  | 'page_view' | 'cta_click' | 'sign_up_start' | 'sign_up_complete'
  | 'demo_booked' | 'newsletter_signup' | 'contact_submitted'
  | 'whatsapp_click' | 'quiz_complete' | 'roi_calculated'
  | 'view_industry' | 'view_integration' | 'view_feature'
  | 'voice_search' | 'ai_advisor_opened' | 'ai_advisor_message'
  | 'command_palette_search' | 'download_started' | 'video_played'
  | 'faq_opened' | 'pricing_toggle' | 'template_downloaded'
  | 'roadmap_voted' | 'playground_checkout' | 'language_switch'
  | 'theme_switch' | 'referral_shared' | 'purchase' | 'add_to_cart'
  | 'search_performed';

export interface EventProps {
  [key: string]: any;
  value?: number;
  currency?: string;
}

/**
 * Universal tracker — fires event across ALL enabled platforms
 * with proper event-name mapping per platform
 */
export function trackEvent(name: EventName, props?: EventProps) {
  if (typeof window === 'undefined') return;

  // ─── 1. GA4 (via gtag) ───
  gaEvent(name, props);

  // ─── 2. GTM dataLayer (for GTM-managed tags) ───
  dataLayerPush({ event: name, ...props });

  // ─── 3. Platform-specific mapping ───
  switch (name) {
    case 'sign_up_start':
      meta.startTrial(props);
      tiktok.completeRegistration(props);
      break;

    case 'sign_up_complete':
      meta.completeRegistration(props);
      tiktok.completeRegistration(props);
      googleAds.signup();
      break;

    case 'demo_booked':
      meta.lead({ ...props, content_name: 'demo' });
      tiktok.submitForm(props);
      linkedinTrack(props?.linkedin_conversion_id ?? 0);
      googleAds.demo();
      clarityUpgrade('demo_booked');
      break;

    case 'contact_submitted':
      meta.contact(props);
      tiktok.contact(props);
      googleAds.lead(props?.value);
      break;

    case 'newsletter_signup':
      meta.subscribe(props);
      tiktok.subscribe(props);
      break;

    case 'purchase':
      meta.purchase(props?.value ?? 0, props?.currency ?? 'PKR');
      tiktok.purchase(props?.value ?? 0, props?.currency ?? 'PKR');
      googleAds.purchase(props?.value ?? 0, props?.transaction_id);
      pinterestTrack('checkout', props);
      snapTrack('PURCHASE', props);
      break;

    case 'add_to_cart':
      meta.addToCart(props);
      pinterestTrack('addtocart', props);
      break;

    case 'view_industry':
    case 'view_integration':
    case 'view_feature':
      meta.viewContent(props);
      break;

    case 'search_performed':
      meta.search(props?.query ?? '');
      break;

    default:
      // Custom events → Meta trackCustom, TikTok custom
      metaTrackCustom(name, props);
      break;
  }

  // ─── 4. Clarity (custom event for filtering sessions) ───
  clarityEvent(name);

  // ─── 5. Dev logging ───
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[track] ${name}`, props);
  }
}

// Backwards-compat helpers
export function trackPageView(path: string) {
  trackEvent('page_view', { path });
}
