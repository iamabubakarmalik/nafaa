'use client';

import { ANALYTICS } from '../config';

let initialized = false;

export function initSnapPixel() {
  if (initialized || typeof window === 'undefined' || !ANALYTICS.snap.enabled) return;
  initialized = true;

  (function (e: any, t: any, n: string) {
    if (e.snaptr) return;
    const r: any = e.snaptr = function () {
      r.handleRequest ? r.handleRequest.apply(r, arguments) : r.queue.push(arguments);
    };
    r.queue = [];
    const a = 'script';
    const s = t.createElement(a);
    s.async = true; s.src = n;
    const u = t.getElementsByTagName(a)[0];
    u.parentNode.insertBefore(s, u);
  })(window, document, 'https://sc-static.net/scevent.min.js');

  window.snaptr!('init', ANALYTICS.snap.pixelId);
  window.snaptr!('track', 'PAGE_VIEW');
}

export function snapTrack(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.snaptr) return;
  window.snaptr(event, params);
}
