/**
 * Custom domains through the Vercel Domains API: attach the merchant's host
 * to the storefront project, show the exact DNS records, check verification
 * and set the primary host (others redirect to it). SSL is issued by Vercel
 * once DNS points at it. Without the Vercel env the screens say domains are
 * coming soon instead of failing.
 * The free `<slug>.<STORE_ROOT_DOMAIN>` address is attached the same way when
 * a store is created or renamed (state in SystemSetting, see lib/hosting).
 * Domains the Nafaa admin removed from hosting stay off until the admin retry.
 * Env: VERCEL_TOKEN, VERCEL_STOREFRONT_PROJECT_ID, VERCEL_TEAM_ID (optional).
 */
import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, StoreDomain } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '../../core/system-control/cron.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { StoreAccessService, StoreCtx } from './store-access.service';
import { StoreRevalidateService } from './store-revalidate.service';
import { dnsRecordsFor, domainKind, hostProblem, normalizeHost, pairOf, rootDomain, subdomainHost } from './lib/host';
import {
  HOSTING_CATEGORY, REMOVED_BY_NAFAA, ROOT_HOSTING_ID, SubdomainState, hostingKey, isRemovedByNafaa, readSubdomainState, storeIdOfHostingKey, subdomainDue, subdomainPlan, subdomainView,
} from './lib/hosting';
import { blockedDomain, loadControls } from './store-controls';
import { readSettings } from './store-settings';

export interface VercelDomain { name: string; verified?: boolean; redirect?: string | null; verification?: Array<{ type: string; domain: string; value: string; reason?: string }>; error?: { code?: string; message?: string } }
export interface DnsRecord { type: 'A' | 'CNAME' | 'TXT'; name: string; value: string; ok: boolean | null }

export const vercelReady = () => !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_STOREFRONT_PROJECT_ID;

@Injectable()
export class StoreDomainsService {
  private readonly logger = new Logger(StoreDomainsService.name);
  /** Free-address runs in progress, one chain per store. */
  private readonly syncing = new Map<string, { slug: string; run: Promise<SubdomainState | null> }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly revalidate: StoreRevalidateService,
  ) {}

  // ─── Vercel ───

  private async vercel<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    if (!vercelReady()) throw new ServiceUnavailableException({ statusCode: 503, code: 'DOMAIN_NOT_READY', message: 'Domain jorna jald shuru hoga' });
    const team = process.env.VERCEL_TEAM_ID ? `${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : '';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(`https://api.vercel.com${path}${team}`, {
        method,
        headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        ...(body !== undefined && { body: JSON.stringify(body) }),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as T;
      return { status: res.status, data };
    } finally {
      clearTimeout(t);
    }
  }

  private project() {
    return encodeURIComponent(process.env.VERCEL_STOREFRONT_PROJECT_ID ?? '');
  }

  /** Adds (or finds) the host on the Vercel project. */
  private async attach(host: string, redirect: string | null): Promise<VercelDomain> {
    const r = await this.vercel<VercelDomain>('POST', `/v10/projects/${this.project()}/domains`, { name: host, ...(redirect && { redirect, redirectStatusCode: 308 }) });
    if (r.status < 300) return r.data;
    const code = r.data?.error?.code;
    if (code === 'domain_already_in_use' || code === 'domain_already_exists' || r.status === 409) {
      const got = await this.vercel<VercelDomain>('GET', `/v9/projects/${this.project()}/domains/${encodeURIComponent(host)}`);
      if (got.status < 300) return got.data;
      throw new BadRequestException('Ye domain kisi aur Vercel project par laga hai — pehle wahan se hatayein');
    }
    throw new BadRequestException(r.data?.error?.message ? `Domain nahi jur saka: ${r.data.error.message}` : 'Domain nahi jur saka — dobara koshish karein');
  }

  /** Puts the host back on the Vercel project when it is missing there (admin retry, which clears the removed mark first). */
  async ensureAttached(d: StoreDomain) {
    if (isRemovedByNafaa(d)) return;
    const got = await this.vercel<VercelDomain>('GET', `/v9/projects/${this.project()}/domains/${encodeURIComponent(d.hostname)}`);
    if (got.status === 404) await this.attach(d.hostname, d.redirectTo);
  }

  async detach(host: string) {
    const r = await this.vercel<VercelDomain>('DELETE', `/v9/projects/${this.project()}/domains/${encodeURIComponent(host)}`);
    return r.status < 300 || r.status === 404;
  }

  /** Vercel verification and DNS state of a host; adds the host to the project when it is missing there. */
  private async probe(host: string, redirect: string | null): Promise<{ info: VercelDomain; verified: boolean; dnsOk: boolean | null }> {
    let info = await this.vercel<VercelDomain>('GET', `/v9/projects/${this.project()}/domains/${encodeURIComponent(host)}`);
    if (info.status === 404) info = { status: 200, data: await this.attach(host, redirect) };
    else if (info.status >= 300) throw new Error(info.data?.error?.message ?? `Hosting check failed (${info.status})`);
    if (info.data.verified === false) {
      const v = await this.vercel<VercelDomain>('POST', `/v9/projects/${this.project()}/domains/${encodeURIComponent(host)}/verify`);
      if (v.status < 300) info = v;
    }
    const cfg = await this.vercel<{ misconfigured?: boolean }>('GET', `/v6/domains/${encodeURIComponent(host)}/config`);
    return { info: info.data, verified: info.data.verified !== false, dnsOk: cfg.status < 300 ? cfg.data.misconfigured === false : null };
  }

  /**
   * Asks Vercel for verification and DNS state, and saves it on the row.
   * A domain the Nafaa admin removed from hosting is returned unchanged, so
   * merchant checks and the poll job never put it back.
   */
  async check(d: StoreDomain): Promise<StoreDomain> {
    if (isRemovedByNafaa(d)) return d;
    try {
      const { info, verified, dnsOk } = await this.probe(d.hostname, d.redirectTo);
      const records: DnsRecord[] = [
        ...dnsRecordsFor(d.hostname).map((r) => ({ ...r, ok: dnsOk })),
        ...(info.verification ?? []).map((v) => ({ type: 'TXT' as const, name: v.domain.replace(new RegExp(`\\.?${d.hostname.split('.').slice(-2).join('\\.')}$`), '') || '@', value: v.value, ok: verified })),
      ];
      const status = !verified ? 'VERIFYING' : dnsOk ? 'ACTIVE' : 'PENDING';
      return await this.saveUnlessRemoved(d, { status, records: records as unknown as Prisma.InputJsonValue, error: null, lastCheckedAt: new Date() });
    } catch (e: any) {
      if (e instanceof ServiceUnavailableException) throw e;
      return this.saveUnlessRemoved(d, { error: String(e?.message ?? 'Check failed').slice(0, 300), lastCheckedAt: new Date() });
    }
  }

  /** Saves a check result unless the admin removed the domain from hosting meanwhile (that mark wins). */
  private async saveUnlessRemoved(d: StoreDomain, data: Prisma.StoreDomainUpdateManyMutationInput): Promise<StoreDomain> {
    await this.prisma.storeDomain.updateMany({ where: { id: d.id, OR: [{ error: null }, { error: { not: REMOVED_BY_NAFAA } }] }, data });
    return (await this.prisma.storeDomain.findUnique({ where: { id: d.id } })) ?? d;
  }

  // ─── merchant ───

  present(d: StoreDomain) {
    return {
      id: d.id, hostname: d.hostname, isPrimary: d.isPrimary, kind: domainKind(d.hostname), status: d.status, redirectTo: d.redirectTo,
      records: (Array.isArray(d.records) ? d.records : []) as unknown as DnsRecord[], error: d.error, lastCheckedAt: d.lastCheckedAt?.toISOString() ?? null,
      sslReady: d.status === 'ACTIVE', removedByNafaa: isRemovedByNafaa(d),
    };
  }

  private async listFor(ctx: StoreCtx) {
    const rows = await this.prisma.storeDomain.findMany({ where: { storeId: ctx.store.id }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
    return rows.map((d) => this.present(d));
  }

  async list(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const host = subdomainHost(ctx.store.slug);
    const ready = vercelReady();
    const state = ready ? await this.readState(ctx.store.id) : null;
    // Stores made before hosting was set up get their free address attached on first visit.
    if (ready && (!state || state.host !== host || (!state.attached && subdomainDue(state)))) this.queueSubdomain(ctx.store.id, ctx.store.slug);
    return { ready, subdomain: { host, url: `https://${host}`, status: subdomainView(ready, host, state) }, rootDomain: rootDomain(), domains: await this.listFor(ctx) };
  }

  async add(user: AuthenticatedUser, id: string, body: { hostname?: string }) {
    await this.access.assertWrite(user);
    this.access.assertManager(user);
    const ctx = await this.access.requireStore(user, id);
    const host = normalizeHost(body?.hostname);
    const problem = hostProblem(host);
    if (problem) throw new BadRequestException(problem);
    const controls = await loadControls(this.prisma);
    if (blockedDomain(controls, host)) throw new BadRequestException('Ye domain nahi jor sakte');
    if (!vercelReady()) throw new ServiceUnavailableException({ statusCode: 503, code: 'DOMAIN_NOT_READY', message: 'Domain jorna jald shuru hoga' });
    const existing = await this.prisma.storeDomain.findUnique({ where: { hostname: host } });
    if (existing && existing.storeId !== ctx.store.id) throw new BadRequestException('Ye domain kisi aur website par laga hai');
    if (existing) return { domains: await this.listFor(ctx) };
    const mains = await this.prisma.storeDomain.count({ where: { storeId: ctx.store.id, redirectTo: null } });
    if (mains >= controls.maxCustomDomains) throw new BadRequestException(`Ek website par zyada se zyada ${controls.maxCustomDomains} domain`);

    await this.attach(host, null);
    const first = (await this.prisma.storeDomain.count({ where: { storeId: ctx.store.id } })) === 0;
    const main = await this.prisma.storeDomain.create({ data: { storeId: ctx.store.id, tenantId: ctx.tenantId, hostname: host, isPrimary: first, status: 'PENDING' } });
    const pair = pairOf(host);
    if (pair && !(await this.prisma.storeDomain.findUnique({ where: { hostname: pair } }))) {
      try {
        await this.attach(pair, host);
        const p = await this.prisma.storeDomain.create({ data: { storeId: ctx.store.id, tenantId: ctx.tenantId, hostname: pair, status: 'PENDING', redirectTo: host } });
        await this.check(p);
      } catch (e: any) {
        this.logger.warn(`Pair domain ${pair}: ${e?.message}`);
      }
    }
    await this.check(main);
    this.access.invalidate(ctx.store.id);
    return { domains: await this.listFor(ctx) };
  }

  private async own(user: AuthenticatedUser, id: string, domainId: string) {
    const ctx = await this.access.requireStore(user, id);
    const d = await this.prisma.storeDomain.findFirst({ where: { id: domainId, storeId: ctx.store.id } });
    if (!d) throw new NotFoundException('Ye domain nahi mila');
    return { ctx, d };
  }

  async verify(user: AuthenticatedUser, id: string, domainId: string) {
    const { d } = await this.own(user, id, domainId);
    if (!vercelReady() || isRemovedByNafaa(d)) return this.present(d);
    const out = await this.check(d);
    if (out.status === 'ACTIVE' && d.status !== 'ACTIVE') {
      this.access.invalidate(d.storeId);
      void this.revalidate.send(d.storeId);
    }
    return this.present(out);
  }

  async makePrimary(user: AuthenticatedUser, id: string, domainId: string) {
    await this.access.assertWrite(user);
    this.access.assertManager(user);
    const { ctx, d } = await this.own(user, id, domainId);
    if (d.redirectTo) throw new BadRequestException('Ye domain doosre domain par bhejta hai — asal domain ko primary banayein');
    if (isRemovedByNafaa(d)) throw new BadRequestException('Ye domain Nafaa team ne roka hai — Nafaa team se rabta karein');
    await this.prisma.$transaction([
      this.prisma.storeDomain.updateMany({ where: { storeId: ctx.store.id }, data: { isPrimary: false } }),
      this.prisma.storeDomain.update({ where: { id: d.id }, data: { isPrimary: true } }),
    ]);
    this.access.invalidate(ctx.store.id);
    void this.revalidate.send(ctx.store.id);
    return { domains: await this.listFor(ctx) };
  }

  /** Removes a domain the merchant no longer wants (and its www/apex partner). */
  async remove(user: AuthenticatedUser, id: string, domainId: string) {
    await this.access.assertWrite(user);
    this.access.assertManager(user);
    const { ctx, d } = await this.own(user, id, domainId);
    const partners = await this.prisma.storeDomain.findMany({ where: { storeId: ctx.store.id, redirectTo: d.hostname } });
    for (const x of [d, ...partners]) {
      if (vercelReady()) await this.detach(x.hostname).catch(() => false);
      await this.prisma.storeDomain.delete({ where: { id: x.id } });
    }
    if (d.isPrimary) {
      const next = await this.prisma.storeDomain.findFirst({ where: { storeId: ctx.store.id, redirectTo: null }, orderBy: { createdAt: 'asc' } });
      if (next) await this.prisma.storeDomain.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    this.access.invalidate(ctx.store.id);
    return { domains: await this.listFor(ctx) };
  }

  // ─── public resolve ───

  /** Host → store, with the redirect the storefront must do (apex↔www, subdomain → primary custom domain). */
  async resolve(q: { host?: string; slug?: string }) {
    const host = normalizeHost(q.host);
    let store: { id: string; slug: string; status: string; suspendedAt: Date | null } | null = null;
    let viaDomain: StoreDomain | null = null;
    if (q.slug) store = await this.prisma.nafaaStore.findUnique({ where: { slug: String(q.slug).toLowerCase().slice(0, 40) }, select: { id: true, slug: true, status: true, suspendedAt: true } });
    else if (host) {
      const root = rootDomain();
      const sub = host.endsWith(`.${root}`) ? host.slice(0, -(root.length + 1)) : host.endsWith('.localhost') ? host.slice(0, -'.localhost'.length) : null;
      if (sub && !sub.includes('.')) store = await this.prisma.nafaaStore.findUnique({ where: { slug: sub }, select: { id: true, slug: true, status: true, suspendedAt: true } });
      else {
        viaDomain = await this.prisma.storeDomain.findUnique({ where: { hostname: host } });
        if (viaDomain) store = await this.prisma.nafaaStore.findUnique({ where: { id: viaDomain.storeId }, select: { id: true, slug: true, status: true, suspendedAt: true } });
      }
    }
    if (!store) throw new NotFoundException('Store not found');
    const primaryHost = await this.access.primaryHost(store);
    let redirectTo: string | null = null;
    if (viaDomain?.redirectTo) redirectTo = `https://${viaDomain.redirectTo}`;
    else if (host && !q.slug && host !== primaryHost && !host.endsWith('.localhost') && primaryHost !== subdomainHost(store.slug)) redirectTo = `https://${primaryHost}`;
    // Languages the storefront serves; /ur/... goes to English when Urdu is off.
    const langs = readSettings((await this.prisma.nafaaStore.findUnique({ where: { id: store.id }, select: { settings: true } }))?.settings).languages.enabled;
    return { storeId: store.id, slug: store.slug, status: store.suspendedAt ? 'SUSPENDED' : store.status, primaryHost, redirectTo, rootDomain: rootDomain(), languages: langs };
  }

  // ─── background ───

  /** Re-checks domains waiting for DNS (first 14 days) every 5 minutes. */
  @Cron('20 */5 * * * *')
  async poll() {
    if (process.env.DISABLE_STORE_JOBS === '1' || !vercelReady()) return;
    const rows = await this.prisma.storeDomain.findMany({
      where: { status: { in: ['PENDING', 'VERIFYING'] }, createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
      orderBy: { lastCheckedAt: { sort: 'asc', nulls: 'first' } },
      take: 30,
    });
    for (const d of rows) {
      const out = await this.check(d).catch(() => d);
      if (out.status === 'ACTIVE') {
        this.access.invalidate(d.storeId);
        void this.revalidate.send(d.storeId);
      }
    }
    await this.pollSubdomains().catch((e) => this.logger.warn(`Subdomain poll: ${e?.message}`));
  }

  // ─── free subdomain ───

  private async readState(id: string): Promise<SubdomainState | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: hostingKey(id) }, select: { value: true } });
    return readSubdomainState(row?.value);
  }

  private async saveState(id: string, s: SubdomainState) {
    const key = hostingKey(id);
    const value = JSON.stringify(s);
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, category: HOSTING_CATEGORY, description: 'Nafaa Stores: free address hosting state', isPublic: false },
      update: { value },
    });
  }

  /** Adds the host to the storefront project and reads its state; failures are recorded, not thrown. */
  private async probeSubdomain(host: string, prev: SubdomainState | null): Promise<SubdomainState> {
    const since = prev?.host === host ? prev.since : new Date().toISOString();
    const checkedAt = new Date().toISOString();
    try {
      const { info, verified, dnsOk } = await this.probe(host, null);
      const status = verified && dnsOk === true ? 'ACTIVE' : 'PENDING';
      const txt = (info.verification ?? []).map((v) => `TXT ${v.domain} = ${v.value}`).join('; ');
      const error = !verified ? `Vercel wants domain verification: ${txt || 'see the Vercel project'}`.slice(0, 300) : dnsOk === false ? 'DNS does not point to Vercel yet' : null;
      if (status === 'ACTIVE' && !(prev?.host === host && prev.status === 'ACTIVE')) this.logger.log(`Free address ${host} is live`);
      else if (status !== 'ACTIVE') this.logger.log(`Free address ${host} attached, waiting: ${error ?? 'DNS check unavailable'}`);
      return { host, status, attached: true, error, since, checkedAt };
    } catch (e: any) {
      this.logger.warn(`Free address ${host} not attached: ${e?.message}`);
      return { host, status: 'PENDING', attached: false, error: String(e?.message ?? 'Attach failed').slice(0, 300), since, checkedAt };
    }
  }

  /** Store create / slug change: attaches the free address in the background. Never throws, no-op without the Vercel env. */
  queueSubdomain(storeId: string, slug: string, previousSlug: string | null = null) {
    if (!vercelReady()) return;
    void this.syncSubdomain(storeId, slug, previousSlug).catch((e) => this.logger.warn(`Free address for ${slug}: ${e?.message}`));
  }

  /**
   * Attaches `<slug>.<root>` (and the bare root until it is on the project),
   * saves the state, and after a rename detaches the old subdomain once the
   * new one is on the project and no store uses the old slug. Old subdomains
   * do not redirect (resolve() finds stores by current slug only).
   */
  async syncSubdomain(storeId: string, slug: string, previousSlug: string | null = null): Promise<SubdomainState | null> {
    if (!vercelReady()) return null;
    const busy = this.syncing.get(storeId);
    // Same address already being attached: share that run. A rename waits for it, then runs.
    if (busy && busy.slug === slug && !previousSlug) return busy.run;
    const run = (busy?.run ?? Promise.resolve(null)).catch(() => null).then(() => this.runSync(storeId, slug, previousSlug));
    this.syncing.set(storeId, { slug, run });
    try {
      return await run;
    } finally {
      if (this.syncing.get(storeId)?.run === run) this.syncing.delete(storeId);
    }
  }

  private async runSync(storeId: string, slug: string, previousSlug: string | null): Promise<SubdomainState | null> {
    const [state, rootState] = await Promise.all([this.readState(storeId), this.readState(ROOT_HOSTING_ID)]);
    const plan = subdomainPlan({ ready: true, slug, previousSlug, state, rootState });
    const root = rootDomain();
    let out = state;
    for (const h of plan.attach) {
      if (h === root) await this.saveState(ROOT_HOSTING_ID, await this.probeSubdomain(root, rootState));
      else await this.saveState(storeId, (out = await this.probeSubdomain(h, state)));
    }
    if (plan.detach && out?.attached && out.host === subdomainHost(slug) && previousSlug) {
      const taken = await this.prisma.nafaaStore.findUnique({ where: { slug: previousSlug }, select: { id: true } });
      if (!taken) {
        const ok = await this.detach(plan.detach).catch(() => false);
        this.logger.log(`Old free address ${plan.detach} ${ok ? 'detached' : 'could not be detached'}`);
      }
    }
    return out;
  }

  /** Retries free addresses that are not live yet (back-off in subdomainDue). */
  private async pollSubdomains() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { category: HOSTING_CATEGORY, value: { contains: '"status":"PENDING"' } },
      orderBy: { updatedAt: 'asc' },
      take: 200,
      select: { key: true, value: true },
    });
    let done = 0;
    for (const r of rows) {
      if (done >= 20) break;
      const s = readSubdomainState(r.value);
      const id = storeIdOfHostingKey(r.key);
      if (!s || !id || !subdomainDue(s)) continue;
      done++;
      if (id === ROOT_HOSTING_ID) {
        await this.saveState(ROOT_HOSTING_ID, await this.probeSubdomain(rootDomain(), s));
        continue;
      }
      const store = await this.prisma.nafaaStore.findUnique({ where: { id }, select: { slug: true } });
      if (!store) await this.saveState(id, { ...s, status: 'GONE' });
      else await this.syncSubdomain(id, store.slug);
    }
  }

  /** Admin one-time action: attaches the free address of every store (stores made before the env existed). */
  async attachAllSubdomains() {
    const out = { ready: vercelReady(), total: 0, alreadyLive: 0, live: 0, waiting: 0, failed: 0 };
    if (!out.ready) return out;
    const stores = await this.prisma.nafaaStore.findMany({ select: { id: true, slug: true }, orderBy: { createdAt: 'asc' } });
    out.total = stores.length;
    const one = async (s: { id: string; slug: string }) => {
      const before = await this.readState(s.id);
      if (before?.status === 'ACTIVE' && before.host === subdomainHost(s.slug)) return void out.alreadyLive++;
      const st = await this.syncSubdomain(s.id, s.slug).catch(() => null);
      if (st?.status === 'ACTIVE') out.live++;
      else if (st?.attached) out.waiting++;
      else out.failed++;
    };
    // The first store also attaches the bare root; the rest go five at a time.
    if (stores.length) await one(stores[0]);
    for (let i = 1; i < stores.length; i += 5) await Promise.all(stores.slice(i, i + 5).map(one));
    this.logger.log(`Attach all free addresses: ${JSON.stringify(out)}`);
    return out;
  }
}
