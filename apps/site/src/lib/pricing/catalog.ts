/**
 * Pricing v2 catalog for the public site: plans, add-ons and the feature
 * list, read from the public API (`GET /plans/catalog`).
 *
 * Server-only. The read never throws: when the API is down or the shape is
 * unexpected it returns null and the pricing page falls back to the plans it
 * already gets from the CMS (the add-ons section and the calculator hide).
 */
import { cmsApiUrl } from '@/lib/cms/env';

export type AddOnKind = 'FLAT' | 'PER_UNIT' | 'ONE_TIME';

export interface CatalogPlan {
  slug: string;
  name: string;
  description: string | null;
  isFree: boolean;
  priceMonthly: number;
  priceQuarterly: number;
  priceYearly: number;
  limits: { users: number; shops: number; products: number; salesPerMonth: number };
  /** Feature keys the plan includes. */
  features: string[];
}

export interface CatalogAddOn {
  key: string;
  name: string;
  description: string | null;
  category: string;
  kind: AddOnKind;
  priceMonthly: number;
  unitLabel: string | null;
  bundleKeys: string[];
  availableOnPlans: string[];
  comingSoon: boolean;
}

export interface CatalogFeature {
  key: string;
  label: string;
  group: string;
}

export interface PricingCatalog {
  plans: CatalogPlan[];
  addOns: CatalogAddOn[];
  features: CatalogFeature[];
  trialDays: number;
  /** Limits at or above this value mean "unlimited". */
  unlimited: number;
}

const KINDS = new Set<string>(['FLAT', 'PER_UNIT', 'ONE_TIME']);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function parse(body: unknown): PricingCatalog | null {
  const raw = body && typeof body === 'object' && 'data' in body && 'success' in body ? (body as { data: unknown }).data : body;
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.plans) || !Array.isArray(r.addOns) || !Array.isArray(r.features)) return null;

  const plans: CatalogPlan[] = r.plans.flatMap((p: Record<string, unknown>) => {
    const slug = str(p.slug);
    const name = str(p.name);
    if (!slug || !name) return [];
    const l = (p.limits ?? {}) as Record<string, unknown>;
    return [
      {
        slug,
        name,
        description: str(p.description),
        isFree: p.isFree === true,
        priceMonthly: num(p.priceMonthly),
        priceQuarterly: num(p.priceQuarterly),
        priceYearly: num(p.priceYearly),
        limits: { users: num(l.users), shops: num(l.shops), products: num(l.products), salesPerMonth: num(l.salesPerMonth) },
        features: strings(p.features),
      },
    ];
  });

  const addOns: CatalogAddOn[] = r.addOns.flatMap((a: Record<string, unknown>) => {
    const key = str(a.key);
    const name = str(a.name);
    const kind = str(a.kind);
    if (!key || !name || !kind || !KINDS.has(kind)) return [];
    return [
      {
        key,
        name,
        description: str(a.description),
        category: str(a.category) ?? 'other',
        kind: kind as AddOnKind,
        priceMonthly: num(a.priceMonthly),
        unitLabel: str(a.unitLabel),
        bundleKeys: strings(a.bundleKeys),
        availableOnPlans: strings(a.availableOnPlans),
        comingSoon: a.comingSoon === true,
      },
    ];
  });

  const features: CatalogFeature[] = r.features.flatMap((f: Record<string, unknown>) => {
    const key = str(f.key);
    const label = str(f.label);
    return key && label ? [{ key, label, group: str(f.group) ?? 'Core' }] : [];
  });

  if (!plans.length) return null;
  return { plans, addOns, features, trialDays: num(r.trialDays, 7), unlimited: num(r.unlimited, 999_999) };
}

/** The catalog, or null when it cannot be read. Cached for an hour. */
export async function loadPricingCatalog(): Promise<PricingCatalog | null> {
  try {
    const res = await fetch(`${cmsApiUrl()}/plans/catalog`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 3600, tags: ['plans', 'all'] },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return parse(await res.json());
  } catch {
    return null;
  }
}
