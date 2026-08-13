'use client';

import { ANALYTICS } from '../config';

let initialized = false;

export function initMetaPixel() {
  if (initialized || typeof window === 'undefined' || !ANALYTICS.meta.enabled) return;
  initialized = true;

  // Meta Pixel base code
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq!('init', ANALYTICS.meta.pixelId);
  window.fbq!('track', 'PageView');
}

export function metaTrack(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, params);
}

export function metaTrackCustom(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackCustom', event, params);
}

// Standard Meta events
export const meta = {
  pageView: () => metaTrack('PageView'),
  lead: (params?: any) => metaTrack('Lead', params),
  completeRegistration: (params?: any) => metaTrack('CompleteRegistration', params),
  contact: (params?: any) => metaTrack('Contact', params),
  subscribe: (params?: any) => metaTrack('Subscribe', params),
  startTrial: (params?: any) => metaTrack('StartTrial', params),
  purchase: (value: number, currency = 'PKR') => metaTrack('Purchase', { value, currency }),
  addToCart: (params?: any) => metaTrack('AddToCart', params),
  viewContent: (params?: any) => metaTrack('ViewContent', params),
  search: (query: string) => metaTrack('Search', { search_string: query }),
};
