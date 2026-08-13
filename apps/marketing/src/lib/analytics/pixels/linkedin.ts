'use client';

import { ANALYTICS } from '../config';

let initialized = false;

export function initLinkedIn() {
  if (initialized || typeof window === 'undefined' || !ANALYTICS.linkedin.enabled) return;
  initialized = true;

  window._linkedin_partner_id = ANALYTICS.linkedin.partnerId;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(ANALYTICS.linkedin.partnerId);

  (function (l: any) {
    if (!l) {
      window.lintrk = function (a: string, b: any) {
        (window.lintrk as any).q.push([a, b]);
      };
      (window.lintrk as any).q = [];
    }
    const s = document.getElementsByTagName('script')[0];
    const b = document.createElement('script');
    b.type = 'text/javascript'; b.async = true;
    b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    s.parentNode?.insertBefore(b, s);
  })(window.lintrk);
}

export function linkedinTrack(conversionId: string | number) {
  if (typeof window === 'undefined' || !window.lintrk) return;
  window.lintrk('track', { conversion_id: conversionId });
}
