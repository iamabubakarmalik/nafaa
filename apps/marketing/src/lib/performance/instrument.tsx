'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { reportVitals } from './vitals';

export function PerformanceInstrument() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    onCLS(reportVitals);
    onINP(reportVitals);
    onLCP(reportVitals);
    onFCP(reportVitals);
    onTTFB(reportVitals);
  }, []);
  return null;
}
