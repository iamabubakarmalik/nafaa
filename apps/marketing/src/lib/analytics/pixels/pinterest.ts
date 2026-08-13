'use client';

import { ANALYTICS } from '../config';

let initialized = false;

export function initPinterest() {
  if (initialized || typeof window === 'undefined' || !ANALYTICS.pinterest.enabled) return;
  initialized = true;

  (function (e: string) {
    if (!window.pintrk) {
      const pintrk: any = function () {
        (pintrk.queue = pintrk.queue || []).push(Array.prototype.slice.call(arguments));
      };
      pintrk.queue = [];
      pintrk.version = '3.0';
      window.pintrk = pintrk;
      const t = document.createElement('script');
      t.async = true;
      t.src = e;
      const r = document.getElementsByTagName('script')[0];
      r.parentNode?.insertBefore(t, r);
    }
  })('https://s.pinimg.com/ct/core.js');

  window.pintrk!('load', ANALYTICS.pinterest.tagId);
  window.pintrk!('page');
}

export function pinterestTrack(event: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.pintrk) return;
  window.pintrk(event, params);
}
