/**
 * Hosting bookkeeping that needs no schema change:
 * - custom domains the Nafaa admin removed from hosting carry a fixed note in
 *   StoreDomain.error; only the admin retry may put them back on Vercel;
 * - the free `<slug>.<root>` subdomain (and the bare root once) is attached to
 *   the storefront Vercel project, with its state kept in one SystemSetting
 *   row per store (category `stores_hosting`). These rows are never treated
 *   as custom domains, so resolve() and primaryHost() are unaffected.
 */
import { rootDomain, subdomainHost } from './host';

export const REMOVED_BY_NAFAA = 'Removed by Nafaa';

/** True when the Nafaa admin detached this custom domain from hosting. */
export const isRemovedByNafaa = (d: { error?: string | null }) => d.error === REMOVED_BY_NAFAA;

export const HOSTING_CATEGORY = 'stores_hosting';
export const ROOT_HOSTING_ID = 'root';
export const hostingKey = (storeId: string) => `store_subdomain:${storeId}`;
export const storeIdOfHostingKey = (key: string) => (key.startsWith('store_subdomain:') ? key.slice('store_subdomain:'.length) : null);

/** PENDING = attach or DNS/SSL not done yet (retried by the poll job); GONE = store no longer exists. */
export type SubdomainStatus = 'PENDING' | 'ACTIVE' | 'GONE';

export interface SubdomainState {
  host: string;
  status: SubdomainStatus;
  /** Vercel has the host on the storefront project. */
  attached: boolean;
  error: string | null;
  /** When this host was first queued; drives the retry back-off. */
  since: string;
  checkedAt: string | null;
}

export function readSubdomainState(raw: string | null | undefined): SubdomainState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || typeof v.host !== 'string') return null;
    return {
      host: v.host,
      status: v.status === 'ACTIVE' || v.status === 'GONE' ? v.status : 'PENDING',
      attached: v.attached === true,
      error: typeof v.error === 'string' ? v.error : null,
      since: typeof v.since === 'string' ? v.since : new Date(0).toISOString(),
      checkedAt: typeof v.checkedAt === 'string' ? v.checkedAt : null,
    };
  } catch {
    return null;
  }
}

export interface SubdomainPlanInput {
  /** vercelReady() */
  ready: boolean;
  slug: string;
  /** Slug before a rename; null on create or when unchanged. */
  previousSlug?: string | null;
  /** Saved state of this store's subdomain. */
  state?: SubdomainState | null;
  /** Saved state of the bare root domain. */
  rootState?: SubdomainState | null;
}

export interface SubdomainPlan {
  /** Hosts to add (or confirm) on the storefront project, in order. */
  attach: string[];
  /** Old subdomain to detach once the new one is attached (rename only). */
  detach: string | null;
}

/**
 * Which hosts to attach for a store. Nothing without the Vercel env. The bare
 * root is attached until it is on the project once. An already active
 * subdomain with the same host is skipped unless the slug changed.
 */
export function subdomainPlan(i: SubdomainPlanInput): SubdomainPlan {
  if (!i.ready || !i.slug) return { attach: [], detach: null };
  const root = rootDomain();
  const host = subdomainHost(i.slug);
  const attach: string[] = [];
  if (!(i.rootState?.attached && i.rootState.host === root)) attach.push(root);
  if (!(i.state?.status === 'ACTIVE' && i.state.host === host)) attach.push(host);
  const prev = i.previousSlug && i.previousSlug !== i.slug ? subdomainHost(i.previousSlug) : null;
  return { attach, detach: prev };
}

/** Whether the poll job should re-check a pending subdomain now (5 min at first, slower as it ages). */
export function subdomainDue(s: SubdomainState, now = Date.now()): boolean {
  if (s.status !== 'PENDING') return false;
  if (!s.checkedAt) return true;
  const age = now - new Date(s.since).getTime();
  const every = age < 3_600_000 ? 5 * 60_000 : age < 86_400_000 ? 30 * 60_000 : 6 * 3_600_000;
  return now - new Date(s.checkedAt).getTime() >= every - 30_000;
}

/** Status shown to the merchant for the free address; null keeps the old screen (no Vercel env). */
export function subdomainView(ready: boolean, host: string, s: SubdomainState | null): 'ACTIVE' | 'PENDING' | null {
  if (!ready) return null;
  return s?.host === host && s.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING';
}
