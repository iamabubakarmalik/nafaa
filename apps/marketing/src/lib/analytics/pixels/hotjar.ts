'use client';

import { ANALYTICS } from '../config';

let initialized = false;

export function initHotjar() {
  if (initialized || typeof window === 'undefined' || !ANALYTICS.hotjar.enabled) return;
  initialized = true;

  (function (h: any, o: any, t: string, j: string) {
    h.hj = h.hj || function () { (h.hj.q = h.hj.q || []).push(arguments); };
    h._hjSettings = { hjid: ANALYTICS.hotjar.id as any, hjsv: 6 };
    const a = o.getElementsByTagName('head')[0];
    const r = o.createElement('script');
    r.async = true; r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
    a.appendChild(r);
  })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
}
