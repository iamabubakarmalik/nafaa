/**
 * Tax setup as stored per tenant in SystemSetting `tax_authority:<tenantId>`.
 *
 * One profile per authority (PRA, SRB, KPRA, FBR). Each branch reports to at
 * most one enabled authority: a terminal tied to a branch wins over a
 * "Sab branches" terminal. Records written before multi-authority support
 * hold a single profile at the top level and are read as a one-profile
 * setup. Saved records keep the first enabled profile at the top level as
 * well, so an older build still reads them after a rollback.
 */

import type { Authority, Env } from './adapters';

export interface Terminal { shopId: string | null; posId: string; ntn: string; secret: string | null }

export interface TaxAuthorityConfig {
  authority: Authority;
  enabled: boolean;
  env: Env;
  businessName: string;
  /** PRA/FBR: 8-digit PCT code from registration; SRB: cpcCode */
  pctCode: string;
  cashRate: number;
  /** Card and digital payments (PRA restaurants: 8%) */
  cardRate: number;
  /** POS bills only, not online orders */
  onlyPos: boolean;
  terminals: Terminal[];
  /** Bills before this moment are never sent */
  startAt: string | null;
}

export const AUTHORITY_LIST: Authority[] = ['PRA', 'SRB', 'KPRA', 'FBR'];

export const isAuthority = (v: unknown): v is Authority => AUTHORITY_LIST.includes(v as Authority);

/** Parses a stored record; tolerates the single-profile format and bad JSON. */
export function readSetup(raw: string | null | undefined): TaxAuthorityConfig[] {
  if (!raw) return [];
  let v: any;
  try { v = JSON.parse(raw); } catch { return []; }
  const list: any[] = Array.isArray(v?.profiles) ? v.profiles : v?.authority ? [v] : [];
  const seen = new Set<string>();
  const out: TaxAuthorityConfig[] = [];
  for (const p of list) {
    if (!isAuthority(p?.authority) || seen.has(p.authority)) continue;
    seen.add(p.authority);
    out.push({
      authority: p.authority,
      enabled: !!p.enabled,
      // KPRA has a single live endpoint
      env: p.authority === 'KPRA' || p.env === 'live' ? 'live' : 'sandbox',
      businessName: String(p.businessName ?? ''),
      pctCode: String(p.pctCode ?? ''),
      cashRate: Number(p.cashRate) || 0,
      cardRate: Number(p.cardRate) || 0,
      onlyPos: p.onlyPos !== false,
      terminals: Array.isArray(p.terminals) ? p.terminals.filter((t: any) => t && t.posId) : [],
      startAt: typeof p.startAt === 'string' ? p.startAt : null,
    });
  }
  return out.sort((a, b) => AUTHORITY_LIST.indexOf(a.authority) - AUTHORITY_LIST.indexOf(b.authority));
}

export function writeSetup(profiles: TaxAuthorityConfig[]): string {
  const primary = profiles.find((p) => p.enabled) ?? profiles[0];
  return JSON.stringify({ ...(primary ?? {}), version: 2, profiles });
}

const live = (profiles: TaxAuthorityConfig[]) => profiles.filter((p) => p.enabled && p.startAt);

/** The terminal of one profile that serves a branch. */
export function terminalIn(p: TaxAuthorityConfig, shopId: string | null): Terminal | null {
  return p.terminals.find((t) => t.shopId && t.shopId === shopId) ?? p.terminals.find((t) => !t.shopId) ?? null;
}

/** Which enabled authority and terminal a branch's bills go to. */
export function routeFor(profiles: TaxAuthorityConfig[], shopId: string | null): { profile: TaxAuthorityConfig; terminal: Terminal } | null {
  const on = live(profiles);
  for (const p of on) {
    const t = p.terminals.find((x) => x.shopId && x.shopId === shopId);
    if (t) return { profile: p, terminal: t };
  }
  for (const p of on) {
    const t = p.terminals.find((x) => !x.shopId);
    if (t) return { profile: p, terminal: t };
  }
  return null;
}

/** Prisma `where` part for the sales one enabled profile is responsible for. */
export function salesShopWhere(profiles: TaxAuthorityConfig[], p: TaxAuthorityConfig): Record<string, unknown> {
  const own = p.terminals.filter((t) => t.shopId).map((t) => t.shopId as string);
  if (!p.terminals.some((t) => !t.shopId)) return { shopId: { in: own } };
  const others = live(profiles)
    .filter((x) => x.authority !== p.authority)
    .flatMap((x) => x.terminals.filter((t) => t.shopId).map((t) => t.shopId as string));
  return others.length ? { OR: [{ shopId: null }, { shopId: { notIn: others } }] } : {};
}

export type RoutingConflict = { kind: 'fallback'; a: Authority; b: Authority } | { kind: 'shop'; shopId: string; a: Authority; b: Authority };

/** A branch claimed by two enabled authorities, or two "all branches" terminals. */
export function routingConflict(profiles: TaxAuthorityConfig[]): RoutingConflict | null {
  const owner = new Map<string, Authority>();
  let fallback: Authority | null = null;
  for (const p of profiles.filter((x) => x.enabled)) {
    for (const t of p.terminals) {
      if (!t.shopId) {
        if (fallback && fallback !== p.authority) return { kind: 'fallback', a: fallback, b: p.authority };
        fallback = p.authority;
        continue;
      }
      const o = owner.get(t.shopId);
      if (o && o !== p.authority) return { kind: 'shop', shopId: t.shopId, a: o, b: p.authority };
      owner.set(t.shopId, p.authority);
    }
  }
  return null;
}

const SECRET_KEY = /^(pos_pass|pass|password|key|token|secret|authorization|api_?key)$/i;

/** Copy of a stored request/response with every credential-like value hidden. */
export function maskSecrets(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => maskSecrets(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) && v != null && v !== '' ? '••••' : maskSecrets(v, depth + 1);
  }
  return out;
}
