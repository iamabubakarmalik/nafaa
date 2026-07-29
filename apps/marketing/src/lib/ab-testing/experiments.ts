'use client';

// Lightweight A/B testing — no external dependency, localStorage-based.
// For production scale, swap the resolver with Vercel Edge Config / GrowthBook / PostHog.

export interface Experiment {
  id: string;
  name: string;
  variants: Array<{ id: string; label: string; weight: number }>;
}

export const experiments: Record<string, Experiment> = {
  heroHeadline: {
    id: 'heroHeadline',
    name: 'Homepage hero headline',
    variants: [
      { id: 'a', label: 'Run your entire business on one intelligent platform', weight: 50 },
      { id: 'b', label: 'Pakistan\'s #1 business platform — built for you', weight: 50 },
    ],
  },
  ctaButton: {
    id: 'ctaButton',
    name: 'Primary CTA button text',
    variants: [
      { id: 'a', label: 'Start free trial', weight: 50 },
      { id: 'b', label: 'Get started — free', weight: 50 },
    ],
  },
  pricingDefault: {
    id: 'pricingDefault',
    name: 'Default billing toggle',
    variants: [
      { id: 'monthly', label: 'Monthly', weight: 50 },
      { id: 'yearly', label: 'Yearly', weight: 50 },
    ],
  },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getVariant(experimentId: string, userId?: string): string {
  if (typeof window === 'undefined') return experiments[experimentId]?.variants[0].id ?? 'a';

  const exp = experiments[experimentId];
  if (!exp) return 'a';

  const storageKey = `nafaa-ab-${experimentId}`;
  const stored = localStorage.getItem(storageKey);
  if (stored && exp.variants.some((v) => v.id === stored)) return stored;

  // Deterministic assignment based on userId or random
  const seed = userId || `${experimentId}-${Math.random()}`;
  const totalWeight = exp.variants.reduce((s, v) => s + v.weight, 0);
  const hash = hashString(seed) % totalWeight;

  let cumulative = 0;
  for (const v of exp.variants) {
    cumulative += v.weight;
    if (hash < cumulative) {
      localStorage.setItem(storageKey, v.id);
      return v.id;
    }
  }
  return exp.variants[0].id;
}

export function getVariantLabel(experimentId: string, userId?: string): string {
  const exp = experiments[experimentId];
  if (!exp) return '';
  const variantId = getVariant(experimentId, userId);
  return exp.variants.find((v) => v.id === variantId)?.label ?? exp.variants[0].label;
}

export function trackExposure(experimentId: string, variantId: string) {
  if (typeof window === 'undefined') return;
  // Hook into your analytics
  if (window.gtag) window.gtag('event', 'experiment_exposure', { experiment_id: experimentId, variant_id: variantId });
  if (window.plausible) window.plausible('experiment_exposure', { props: { experiment: experimentId, variant: variantId } });
}
