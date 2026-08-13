'use client';

import { ANALYTICS } from '../config';

let initialized = false;

export function initClarity() {
  if (initialized || typeof window === 'undefined' || !ANALYTICS.clarity.enabled) return;
  initialized = true;

  (function (c: any, l: any, a: string, r: string, i: string) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${i}`;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, 'clarity', 'script', ANALYTICS.clarity.id);
}

// Identify user (post-login)
export function clarityIdentify(userId: string, sessionId?: string, pageId?: string, friendlyName?: string) {
  if (typeof window === 'undefined' || !window.clarity) return;
  window.clarity('identify', userId, sessionId, pageId, friendlyName);
}

// Set custom tag (for filtering sessions)
export function claritySet(key: string, value: string) {
  if (typeof window === 'undefined' || !window.clarity) return;
  window.clarity('set', key, value);
}

// Track custom event
export function clarityEvent(name: string) {
  if (typeof window === 'undefined' || !window.clarity) return;
  window.clarity('event', name);
}

// Upgrade session priority (mark important sessions)
export function clarityUpgrade(reason: string) {
  if (typeof window === 'undefined' || !window.clarity) return;
  window.clarity('upgrade', reason);
}
