'use client';

type EventName =
  | 'page_view' | 'cta_click' | 'signup_started' | 'demo_booked'
  | 'newsletter_subscribed' | 'contact_submitted' | 'referral_shared'
  | 'voice_search_used' | 'ai_advisor_opened' | 'ai_advisor_message'
  | 'command_palette_opened' | 'download_started' | 'video_played'
  | 'faq_opened' | 'pricing_toggle' | 'industry_clicked'
  | 'integration_clicked' | 'feature_clicked' | 'roi_calculated'
  | 'template_downloaded' | 'roadmap_voted' | 'playground_checkout';

interface EventProps {
  category?: string;
  label?: string;
  value?: number;
  [k: string]: any;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    plausible?: (event: string, opts?: any) => void;
    dataLayer?: any[];
  }
}

export function track(name: EventName, props?: EventProps) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', name, props);
  }
  // Meta Pixel
  if (window.fbq) {
    window.fbq('trackCustom', name, props);
  }
  // Plausible
  if (window.plausible) {
    window.plausible(name, { props });
  }
  // Console (dev)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[track] ${name}`, props);
  }
}

export function trackPageView(path: string) {
  track('page_view', { path });
}
