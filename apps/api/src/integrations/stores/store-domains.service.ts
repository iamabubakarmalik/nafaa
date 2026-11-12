/**
 * Custom domains through the Vercel Domains API: attach the merchant's host
 * to the storefront project, show the exact DNS records, check verification
 * and set the primary host (others redirect to it). SSL is issued by Vercel
 * once DNS points at it. Without the Vercel env the screens say domains are
 * coming soon instead of failing.
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
import { blockedDomain, loadControls } from './store-controls';

export interface VercelDomain { name: string; verified?: boolean; redirect?: string | null; verification?: Array<{ type: string; domain: string; value: string; reason?: string }>; error?: { code?: string; message?: string } }
export interface DnsRecord { type: 'A' | 'CNAME' | 'TXT'; name: string; value: string; ok: boolean | null }

export const vercelReady = () => !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_STOREFRONT_PROJECT_ID;

@Injectable()
export class StoreDomainsService {
  private readonly logger = new Logger(StoreDomainsService.name);

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

  /** Puts the host back on the Vercel project when it is missing there (admin retry). */
  async ensureAttached(d: StoreDomain) {
    const got = await this.vercel<VercelDomain>('GET', `/v9/projects/${this.project()}/domains/${encodeURIComponent(d.hostname)}`);
    if (got.status === 404) await this.attach(d.hostname, d.redirectTo);
  }

  async detach(host: string) {
    const r = await this.vercel<VercelDomain>('DELETE', `/v9/projects/${this.project()}/domains/${encodeURIComponent(host)}`);
    return r.status < 300 || r.status === 404;
  }

  /** Asks Vercel for verification and DNS state, and saves it on the row. */
  async check(d: StoreDomain): Promise<StoreDomain> {
    try {
      let info = (await this.vercel<VercelDomain>('GET', `/v9/projects/${this.project()}/domains/${encodeURIComponent(d.hostname)}`));
      if (info.status === 404) info = { status: 200, data: await this.attach(d.hostname, d.redirectTo) };
      if (info.data.verified === false) {
        const v = await this.vercel<VercelDomain>('POST', `/v9/projects/${this.project()}/domains/${encodeURIComponent(d.hostname)}/verify`);
        if (v.status < 300) info = v;
      }
      const cfg = await this.vercel<{ misconfigured?: boolean }>('GET', `/v6/domains/${encodeURIComponent(d.hostname)}/config`);
      const dnsOk = cfg.status < 300 ? cfg.data.misconfigured === false : null;
      const verified = info.data.verified !== false;
      const records: DnsRecord[] = [
        ...dnsRecordsFor(d.hostname).map((r) => ({ ...r, ok: dnsOk })),
        ...(info.data.verification ?? []).map((v) => ({ type: 'TXT' as const, name: v.domain.replace(new RegExp(`\\.?${d.hostname.split('.').slice(-2).join('\\.')}$`), '') || '@', value: v.value, ok: verified })),
      ];
      const status = !verified ? 'VERIFYING' : dnsOk ? 'ACTIVE' : 'PENDING';
      return this.prisma.storeDomain.update({
        where: { id: d.id },
        data: { status, records: records as unknown as Prisma.InputJsonValue, error: null, lastCheckedAt: new Date() },
      });
    } catch (e: any) {
      if (e instanceof ServiceUnavailableException) throw e;
      return this.prisma.storeDomain.update({ where: { id: d.id }, data: { error: String(e?.message ?? 'Check failed').slice(0, 300), lastCheckedAt: new Date() } });
    }
  }

  // ─── merchant ───

  present(d: StoreDomain) {
    return {
      id: d.id, hostname: d.hostname, isPrimary: d.isPrimary, kind: domainKind(d.hostname), status: d.status, redirectTo: d.redirectTo,
      records: (Array.isArray(d.records) ? d.records : []) as unknown as DnsRecord[], error: d.error, lastCheckedAt: d.lastCheckedAt?.toISOString() ?? null,
      sslReady: d.status === 'ACTIVE',
    };
  }

  private async listFor(ctx: StoreCtx) {
    const rows = await this.prisma.storeDomain.findMany({ where: { storeId: ctx.store.id }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
    return rows.map((d) => this.present(d));
  }

  async list(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const host = subdomainHost(ctx.store.slug);
    return { ready: vercelReady(), subdomain: { host, url: `https://${host}` }, rootDomain: rootDomain(), domains: await this.listFor(ctx) };
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
    if (!vercelReady()) return this.present(d);
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
    return { storeId: store.id, slug: store.slug, status: store.suspendedAt ? 'SUSPENDED' : store.status, primaryHost, redirectTo, rootDomain: rootDomain() };
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
  }
}
