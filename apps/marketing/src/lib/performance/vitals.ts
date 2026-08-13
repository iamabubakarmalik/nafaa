'use client';

import type { Metric } from 'web-vitals';

const reportUrl = '/api/vitals';

export function reportVitals(metric: Metric) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    delta: metric.delta,
    navigationType: metric.navigationType,
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    timestamp: Date.now(),
  });


  // Also send to GA4 as event
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }

  // Use sendBeacon for reliability
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(reportUrl, blob);
  }
}
