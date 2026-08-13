'use client';

import { ANALYTICS } from '../config';

let initialized = false;

export function initTikTokPixel() {
  if (initialized || typeof window === 'undefined' || !ANALYTICS.tiktok.enabled) return;
  initialized = true;

  (function (w: any, d: any, t: string) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.setAndDefer = function (t: any, e: string) {
      t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t: any) {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (e: string, n?: any) {
      const r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
      ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
      const o = d.createElement('script');
      o.type = 'text/javascript'; o.async = true; o.src = `${r}?sdkid=${e}&lib=${t}`;
      const a = d.getElementsByTagName('script')[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(ANALYTICS.tiktok.pixelId);
    ttq.page();
  })(window, document, 'ttq');
}

export function tiktokTrack(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.ttq || !window.ttq.track) return;
  window.ttq.track(event, params);
}

export const tiktok = {
  viewContent: (params?: any) => tiktokTrack('ViewContent', params),
  completeRegistration: (params?: any) => tiktokTrack('CompleteRegistration', params),
  contact: (params?: any) => tiktokTrack('Contact', params),
  subscribe: (params?: any) => tiktokTrack('Subscribe', params),
  submitForm: (params?: any) => tiktokTrack('SubmitForm', params),
  purchase: (value: number, currency = 'PKR') => tiktokTrack('CompletePayment', { value, currency }),
};
