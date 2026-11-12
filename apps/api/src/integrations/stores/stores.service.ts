/**
 * Merchant side of Nafaa Stores: create a store (a NAFAA_STORE sales channel),
 * settings and launch, pages, menus, blog, redirects, policies, collections,
 * products on the website, shipping, checkout and the website home.
 * Archive instead of delete for content that other pages may link to.
 */
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { PAY_GATEWAYS } from '../online-orders/pay-api/registry';
import { PaymentLinksService } from '../online-orders/payment-links.service';
import { Coupon, readForm } from '../online-orders/storefront.service';
import { StoreAccessService, StoreCtx } from './store-access.service';
import { StoreCatalogService } from './store-catalog.service';
import { StoreRevalidateService } from './store-revalidate.service';
import { StoreDomainsService } from './store-domains.service';
import { StoreThemeService } from './store-theme.service';
import {
  POLICY_KINDS, POLICY_TITLES, PolicyKind, mergeSettings, money, policyKindOf, readCheckout, readPolicies, readSettings, readShipping, str,
} from './store-settings';
import { cleanHandle, cleanPath, cleanSlug, cleanTarget, defaultProductHandle, slugProblem, uniqueHandle } from './lib/handle';
import { randomToken, hashSecret, signToken } from './lib/tokens';
import { sanitizeHtml } from './lib/sanitize-html';
import { readRules, ruleWhere, CollectionRules } from './lib/collection-rules';
import { readMenuItems } from './lib/menus';
import { policyTemplate } from './lib/policy-templates';
import { pkCityList } from './lib/shipping';
import { storefrontUrl, subdomainHost } from './lib/host';
import { THEME_IDS, ThemeId } from './theme/theme-doc';
import { blockedWord, loadControls } from './store-controls';

const PAGE_KINDS = ['ABOUT', 'CONTACT', 'FAQ', 'CUSTOM'] as const;
const COLLECTION_SORTS = ['manual', 'best_selling', 'newest', 'price_asc', 'price_desc', 'title_asc', 'title_desc'];
const CLOSED_ORDERS = ['CANCELLED', 'REJECTED'];
const n = (v: unknown) => Number(v ?? 0) || 0;
const bool = (v: unknown) => v === true;
const json = (v: unknown) => v as Prisma.InputJsonValue;

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly catalog: StoreCatalogService,
    private readonly theme: StoreThemeService,
    private readonly revalidate: StoreRevalidateService,
    private readonly payments: PaymentLinksService,
    private readonly domains: StoreDomainsService,
  ) {}

  private async writable(user: AuthenticatedUser, id: string, manager = false): Promise<StoreCtx> {
    await this.access.assertWrite(user);
    if (manager) this.access.assertManager(user);
    return this.access.requireStore(user, id);
  }

  private changed(ctx: StoreCtx, kinds: Parameters<StoreRevalidateService['touch']>[1] = ['all']) {
    this.access.invalidate(ctx.store.id);
    this.catalog.forget(ctx.store.id);
    this.revalidate.touch(ctx.store.id, kinds);
  }

  // ═══════════════════════════════════════════════════════════
  // STORES
  // ═══════════════════════════════════════════════════════════

  async summary(store: { id: string; name: string; slug: string; status: string; themeId: string; integrationId: string; shopId: string | null; createdAt: Date; launchedAt: Date | null }) {
    return {
      id: store.id, name: store.name, slug: store.slug, status: store.status, themeId: store.themeId,
      url: await this.access.storeUrl(store), primaryHost: await this.access.primaryHost(store),
      integrationId: store.integrationId, shopId: store.shopId, createdAt: store.createdAt.toISOString(), launchedAt: store.launchedAt?.toISOString() ?? null,
    };
  }

  async list(user: AuthenticatedUser) {
    const rows = await this.prisma.nafaaStore.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'asc' } });
    return {
      entitled: await this.access.entitled(user.tenantId),
      addOnKey: 'website',
      rootDomain: this.access.rootDomain(),
      storefrontUrl: storefrontUrl(),
      items: await Promise.all(rows.map((r) => this.summary(r))),
    };
  }

  async slugCheck(raw: string, exceptId?: string) {
    const slug = cleanSlug(raw);
    const problem = slugProblem(slug);
    const controls = await loadControls(this.prisma);
    if (problem || blockedWord(controls, slug)) return { slug, available: false, suggestion: null, problem: problem ?? 'Ye naam nahi le sakte' };
    const taken = await this.prisma.nafaaStore.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === exceptId) return { slug, available: true, suggestion: null, problem: null };
    for (let i = 2; i < 50; i++) {
      const s = `${slug.slice(0, 36)}-${i}`;
      if (!(await this.prisma.nafaaStore.findUnique({ where: { slug: s }, select: { id: true } }))) return { slug, available: false, suggestion: s, problem: 'Ye naam pehle se liya ja chuka' };
    }
    return { slug, available: false, suggestion: null, problem: 'Ye naam pehle se liya ja chuka' };
  }

  async create(user: AuthenticatedUser, body: { name?: string; slug?: string; themeId?: string; shopId?: string }) {
    await this.access.assertWrite(user);
    this.access.assertManager(user);
    const name = String(body?.name ?? '').trim().slice(0, 80);
    if (name.length < 2) throw new BadRequestException('Website ka naam likhein');
    const controls = await loadControls(this.prisma);
    if (blockedWord(controls, name)) throw new BadRequestException('Ye naam nahi le sakte — doosra naam likhein');
    const count = await this.prisma.nafaaStore.count({ where: { tenantId: user.tenantId } });
    if (count >= controls.maxStoresPerShop) throw new BadRequestException(`Ek dukaan ki zyada se zyada ${controls.maxStoresPerShop} websites`);
    const check = await this.slugCheck(body?.slug || name);
    const slug = check.available ? check.slug : check.suggestion;
    if (!slug) throw new BadRequestException(check.problem ?? 'Website ka address sahi nahi');
    const themeId: ThemeId = THEME_IDS.includes(body?.themeId as ThemeId) ? (body!.themeId as ThemeId) : 'fashion';
    const shop = body?.shopId
      ? await this.prisma.shop.findFirst({ where: { id: body.shopId, tenantId: user.tenantId, isActive: true }, select: { id: true } })
      : await this.prisma.shop.findFirst({ where: { tenantId: user.tenantId, isActive: true }, orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }], select: { id: true } });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, phone: true } });
    const owner = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    const shipping = readShipping({});
    const policies: Record<string, unknown> = {};
    for (const k of POLICY_KINDS) {
      const t = controls.policyTemplates[k] ?? policyTemplate(k, { storeName: name, phone: tenant?.phone ?? null, email: owner?.email ?? null, deliveryEta: shipping.defaultEta, freeShippingThreshold: shipping.freeShippingThreshold });
      policies[k] = { title: t.title, bodyHtml: t.bodyHtml, updatedAt: new Date().toISOString() };
    }
    const store = await this.prisma.$transaction(async (tx) => {
      const integration = await tx.integration.create({
        data: {
          tenantId: user.tenantId, shopId: shop?.id ?? null, type: 'NAFAA_STORE', category: 'SALES_CHANNEL', displayName: name,
          status: 'CONNECTED', apiKey: `ns_${randomToken(18)}`, webhookVerified: true,
          config: { shopId: shop?.id ?? null, platform: 'nafaa_store', priceFrom: 'NONE', priceFromAsk: false } as Prisma.InputJsonValue,
        },
      });
      const s = await tx.nafaaStore.create({
        data: {
          tenantId: user.tenantId, integrationId: integration.id, shopId: shop?.id ?? null, slug, name, themeId, createdById: user.id,
          settings: json(readSettings({ contact: { phone: tenant?.phone, whatsapp: tenant?.phone, email: owner?.email } })),
          checkout: json(readCheckout({})), shipping: json(shipping), policies: json(policies),
        },
      });
      await this.theme.seed(tx, s, themeId, user.id);
      await tx.storePage.createMany({
        data: [
          { storeId: s.id, tenantId: s.tenantId, handle: 'about', title: 'About us', kind: 'ABOUT', bodyHtml: `<p>Welcome to ${escapeHtml(name)}. We bring you quality products with delivery all over Pakistan.</p>`, sortOrder: 1 },
          { storeId: s.id, tenantId: s.tenantId, handle: 'contact', title: 'Contact us', kind: 'CONTACT', bodyHtml: '<p>Message us on WhatsApp or call us. We reply quickly.</p>', sortOrder: 2 },
          { storeId: s.id, tenantId: s.tenantId, handle: 'faq', title: 'Questions', kind: 'FAQ', bodyHtml: '<h3>Do you offer cash on delivery?</h3><p>Yes, all over Pakistan.</p><h3>How long does delivery take?</h3><p>Usually 3-5 working days.</p>', sortOrder: 3 },
        ],
      });
      const pages = await tx.storePage.findMany({ where: { storeId: s.id }, select: { id: true, handle: true } });
      const pid = (h: string) => pages.find((p) => p.handle === h)?.id ?? null;
      await tx.storeMenu.createMany({
        data: [
          { storeId: s.id, tenantId: s.tenantId, handle: 'main-menu', title: 'Main menu', items: json([
            { id: 'home', title: 'Home', type: 'home', ref: null, children: [] },
            { id: 'shop', title: 'Shop', type: 'collection', ref: 'all', children: [] },
            { id: 'about', title: 'About', type: 'page', ref: pid('about'), children: [] },
            { id: 'contact', title: 'Contact', type: 'page', ref: pid('contact'), children: [] },
          ]) },
          { storeId: s.id, tenantId: s.tenantId, handle: 'footer', title: 'Footer menu', items: json([
            { id: 'search', title: 'Search', type: 'search', ref: null, children: [] },
            { id: 'faq', title: 'Questions', type: 'page', ref: pid('faq'), children: [] },
            { id: 'track', title: 'Track order', type: 'url', url: '/account/track', ref: null, children: [] },
            ...POLICY_KINDS.map((k) => ({ id: `p-${k}`, title: POLICY_TITLES[k], type: 'policy', ref: k, children: [] })),
          ]) },
        ],
      });
      return s;
    });
    // Free address on the storefront project; background, never blocks creation.
    this.domains.queueSubdomain(store.id, store.slug);
    return this.full(await this.access.requireStore(user, store.id));
  }

  private async full(ctx: StoreCtx) {
    const preview = signToken('preview', { s: ctx.store.id }, 2 * 3_600_000);
    return {
      ...(await this.summary(ctx.store)),
      settings: ctx.settings,
      checkout: readCheckout(ctx.store.checkout),
      hasPassword: !!ctx.store.passwordHash,
      forcedPassword: ctx.store.forcedPassword,
      suspended: !!ctx.store.suspendedAt,
      integration: { id: ctx.integration.id, status: ctx.integration.status, autoAccept: (ctx.integration.config as any)?.autoAccept === true },
      previewUrl: `${storefrontUrl()}/?store=${ctx.store.slug}&preview=${preview.token}`,
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    return this.full(await this.access.requireStore(user, id));
  }

  async update(user: AuthenticatedUser, id: string, body: { name?: string; slug?: string; settings?: unknown; password?: string | null }) {
    const ctx = await this.writable(user, id);
    const data: Prisma.NafaaStoreUpdateInput = {};
    const controls = await loadControls(this.prisma);
    if (body?.name !== undefined) {
      const name = String(body.name).trim().slice(0, 80);
      if (name.length < 2) throw new BadRequestException('Website ka naam likhein');
      if (blockedWord(controls, name)) throw new BadRequestException('Ye naam nahi le sakte — doosra naam likhein');
      data.name = name;
    }
    if (body?.slug !== undefined && cleanSlug(body.slug) !== ctx.store.slug) {
      this.access.assertManager(user);
      const check = await this.slugCheck(body.slug, ctx.store.id);
      if (!check.available) throw new BadRequestException(check.problem ?? 'Ye address nahi mil sakta');
      data.slug = check.slug;
    }
    if (body?.settings !== undefined) data.settings = json(mergeSettings(ctx.store.settings, body.settings));
    if (body?.password !== undefined) {
      this.access.assertManager(user);
      const p = body.password === null ? '' : String(body.password).trim();
      if (p && (p.length < 4 || p.length > 64)) throw new BadRequestException('Password 4 se 64 harf ka');
      data.passwordHash = p ? hashSecret(p) : null;
      if (!p && ctx.store.status === 'PASSWORD') throw new BadRequestException('Pehle website ko "Live" ya "Draft" karein, phir password hatayein');
    }
    await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data });
    if (typeof data.slug === 'string') this.domains.queueSubdomain(ctx.store.id, data.slug, ctx.store.slug);
    if (data.name) await this.prisma.integration.update({ where: { id: ctx.integration.id }, data: { displayName: data.name as string } });
    this.changed(ctx);
    return this.full(await this.access.requireStore(user, id));
  }

  async setStatus(user: AuthenticatedUser, id: string, body: { status?: string }) {
    const ctx = await this.writable(user, id, true);
    const status = String(body?.status ?? '');
    if (!['LIVE', 'PASSWORD', 'DRAFT'].includes(status)) throw new BadRequestException('Status sahi nahi');
    if (ctx.store.suspendedAt) throw new ForbiddenException('Nafaa team ne ye website roki hui hai — support se baat karein');
    if (status === 'LIVE' && ctx.store.forcedPassword) throw new ForbiddenException('Nafaa team ne website password par rakhi hai — abhi live nahi ho sakti');
    if (status === 'PASSWORD' && !ctx.store.passwordHash) throw new BadRequestException('Pehle password rakhein');
    const firstLaunch = status === 'LIVE' && !ctx.store.launchedAt;
    await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data: { status, ...(firstLaunch && { launchedAt: new Date() }) } });
    // Status changes go out at once (not through the 10-second batch), host lookups included.
    this.access.invalidate(ctx.store.id);
    this.catalog.forget(ctx.store.id);
    void this.revalidate.sendWithResolve(ctx.store.id).catch(() => false);
    if (status === 'LIVE') void this.pingSitemap(ctx);
    return this.full(await this.access.requireStore(user, id));
  }

  /** Tells Google where the sitemap is (best effort). */
  private async pingSitemap(ctx: StoreCtx) {
    if (process.env.NODE_ENV !== 'production') return;
    const base = await this.access.storeBase(ctx.store);
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${base}/sitemap.xml`)}`).catch(() => null);
  }

  previewToken(ctx: StoreCtx) {
    const t = signToken('preview', { s: ctx.store.id }, 2 * 3_600_000);
    return { token: t.token, expiresAt: t.expiresAt.toISOString(), url: `${storefrontUrl()}/?store=${ctx.store.slug}&preview=${t.token}` };
  }

  async preview(user: AuthenticatedUser, id: string) {
    return this.previewToken(await this.access.requireStore(user, id));
  }

  async home(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [published, visibleCount, domains, gateways, orders, recent, analytics] = await Promise.all([
      this.theme.published(ctx.store.id),
      this.prisma.product.count({ where: await this.catalog.baseWhere(ctx) }),
      this.prisma.storeDomain.count({ where: { storeId: ctx.store.id, status: 'ACTIVE' } }),
      this.payments.accounts(user).catch(() => [] as Array<{ active: boolean }>),
      this.prisma.channelOrder.aggregate({ where: { integrationId: ctx.integration.id, receivedAt: { gte: since }, orderStatus: { notIn: CLOSED_ORDERS }, deletedAt: null }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.channelOrder.findMany({ where: { integrationId: ctx.integration.id, deletedAt: null }, orderBy: { receivedAt: 'desc' }, take: 5, select: { id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, total: true, orderStatus: true, receivedAt: true } }),
      this.prisma.storeAnalyticsDaily.aggregate({ where: { storeId: ctx.store.id, day: { gte: since } }, _sum: { visitors: true } }),
    ]);
    const policies = readPolicies(ctx.store.policies);
    const shipping = readShipping(ctx.store.shipping);
    const checkout = readCheckout(ctx.store.checkout);
    const visitors = n(analytics._sum.visitors);
    const orderCount = orders._count._all;
    return {
      store: await this.summary(ctx.store),
      checklist: [
        { key: 'logo', done: !!ctx.settings.logoUrl, link: 'settings' },
        { key: 'theme', done: !!published && published.version > 1, link: 'theme' },
        { key: 'products', done: visibleCount > 0, link: 'products' },
        { key: 'domain', done: domains > 0, link: 'domains' },
        { key: 'payments', done: checkout.payments.cod || gateways.some((g) => g.active), link: 'checkout' },
        { key: 'shipping', done: shipping.zones.some((z) => z.rates.length > 0), link: 'shipping' },
        { key: 'policies', done: Object.keys(policies).length >= 2, link: 'policies' },
        { key: 'launch', done: ctx.store.status === 'LIVE', link: 'launch' },
      ],
      stats: { days: 30, visitors, orders: orderCount, revenue: n(orders._sum.total), conversion: visitors ? Math.round((orderCount / visitors) * 1000) / 10 : 0, products: visibleCount },
      recentOrders: recent.map((o) => ({ id: o.id, orderNumber: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, ''), customerName: o.customerName, total: n(o.total), status: o.orderStatus, receivedAt: o.receivedAt.toISOString() })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PAGES
  // ═══════════════════════════════════════════════════════════

  private presentPage(p: { id: string; handle: string; title: string; kind: string; bodyHtml: string; seoTitle: string | null; seoDescription: string | null; isPublished: boolean; updatedAt: Date }) {
    return { id: p.id, handle: p.handle, title: p.title, kind: p.kind, bodyHtml: p.bodyHtml, seoTitle: p.seoTitle, seoDescription: p.seoDescription, isPublished: p.isPublished, updatedAt: p.updatedAt.toISOString(), url: `/pages/${p.handle}` };
  }

  async pages(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const rows = await this.prisma.storePage.findMany({ where: { storeId: ctx.store.id, archivedAt: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return { items: rows.map((p) => ({ id: p.id, handle: p.handle, title: p.title, kind: p.kind, isPublished: p.isPublished, updatedAt: p.updatedAt.toISOString() })) };
  }

  async page(user: AuthenticatedUser, id: string, pageId: string) {
    const ctx = await this.access.requireStore(user, id);
    const p = await this.prisma.storePage.findFirst({ where: { id: pageId, storeId: ctx.store.id, archivedAt: null } });
    if (!p) throw new NotFoundException('Ye page nahi mila');
    return this.presentPage(p);
  }

  private async freeHandle(kind: 'page' | 'collection' | 'post', storeId: string, wanted: string, exceptId?: string, blog = 'news') {
    const base = cleanHandle(wanted) ?? kind;
    const rows: Array<{ id: string; handle: string }> =
      kind === 'page' ? await this.prisma.storePage.findMany({ where: { storeId, handle: { startsWith: base.slice(0, 60) } }, select: { id: true, handle: true } })
        : kind === 'collection' ? await this.prisma.storeCollection.findMany({ where: { storeId, handle: { startsWith: base.slice(0, 60) } }, select: { id: true, handle: true } })
          : await this.prisma.storeBlogPost.findMany({ where: { storeId, blog, handle: { startsWith: base.slice(0, 60) } }, select: { id: true, handle: true } });
    const taken = new Set(rows.filter((r) => r.id !== exceptId).map((r) => r.handle));
    if (kind === 'collection') taken.add('all');
    return uniqueHandle(base, taken);
  }

  private pageData(body: Record<string, any>) {
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const t = String(body.title).trim().slice(0, 120);
      if (!t) throw new BadRequestException('Title likhein');
      data.title = t;
    }
    if (body.kind !== undefined) data.kind = (PAGE_KINDS as readonly string[]).includes(body.kind) ? body.kind : 'CUSTOM';
    if (body.bodyHtml !== undefined) data.bodyHtml = sanitizeHtml(body.bodyHtml);
    if (body.seoTitle !== undefined) data.seoTitle = str(body.seoTitle, 70);
    if (body.seoDescription !== undefined) data.seoDescription = str(body.seoDescription, 320);
    if (body.isPublished !== undefined) data.isPublished = bool(body.isPublished);
    return data;
  }

  async createPage(user: AuthenticatedUser, id: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id);
    const data = this.pageData({ isPublished: true, ...body });
    if (!data.title) throw new BadRequestException('Title likhein');
    const handle = await this.freeHandle('page', ctx.store.id, body.handle || (data.title as string));
    const p = await this.prisma.storePage.create({ data: { storeId: ctx.store.id, tenantId: ctx.tenantId, handle, title: data.title as string, ...data } as Prisma.StorePageUncheckedCreateInput });
    this.changed(ctx, ['pages']);
    return this.presentPage(p);
  }

  async updatePage(user: AuthenticatedUser, id: string, pageId: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id);
    const p = await this.prisma.storePage.findFirst({ where: { id: pageId, storeId: ctx.store.id, archivedAt: null } });
    if (!p) throw new NotFoundException('Ye page nahi mila');
    const data = this.pageData(body ?? {});
    if (body?.handle !== undefined && cleanHandle(body.handle) !== p.handle) {
      data.handle = await this.freeHandle('page', ctx.store.id, body.handle, p.id);
      await this.addRedirect(ctx, `/pages/${p.handle}`, `/pages/${data.handle}`, 'HANDLE');
    }
    const saved = await this.prisma.storePage.update({ where: { id: p.id }, data });
    this.changed(ctx, ['pages']);
    return this.presentPage(saved);
  }

  async archivePage(user: AuthenticatedUser, id: string, pageId: string) {
    const ctx = await this.writable(user, id);
    const p = await this.prisma.storePage.findFirst({ where: { id: pageId, storeId: ctx.store.id, archivedAt: null } });
    if (!p) throw new NotFoundException('Ye page nahi mila');
    await this.prisma.storePage.update({ where: { id: p.id }, data: { archivedAt: new Date(), isPublished: false, handle: `${p.handle}-archived-${Date.now().toString(36)}`.slice(0, 140) } });
    this.changed(ctx, ['pages']);
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // MENUS
  // ═══════════════════════════════════════════════════════════

  async menus(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const rows = await this.prisma.storeMenu.findMany({ where: { storeId: ctx.store.id }, orderBy: { createdAt: 'asc' } });
    return { items: rows.map((m) => ({ handle: m.handle, title: m.title, items: readMenuItems(m.items) })) };
  }

  async saveMenu(user: AuthenticatedUser, id: string, handleRaw: string, body: { title?: string; items?: unknown }) {
    const ctx = await this.writable(user, id);
    const handle = cleanHandle(handleRaw);
    if (!handle) throw new BadRequestException('Menu ka naam sahi nahi');
    const items = readMenuItems(body?.items);
    const title = String(body?.title ?? handle).trim().slice(0, 80) || handle;
    const count = await this.prisma.storeMenu.count({ where: { storeId: ctx.store.id } });
    const exists = await this.prisma.storeMenu.findUnique({ where: { storeId_handle: { storeId: ctx.store.id, handle } } });
    if (!exists && count >= 20) throw new BadRequestException('Zyada se zyada 20 menus');
    const m = await this.prisma.storeMenu.upsert({
      where: { storeId_handle: { storeId: ctx.store.id, handle } },
      create: { storeId: ctx.store.id, tenantId: ctx.tenantId, handle, title, items: json(items) },
      update: { title, items: json(items) },
    });
    this.changed(ctx);
    return { handle: m.handle, title: m.title, items };
  }

  async removeMenu(user: AuthenticatedUser, id: string, handle: string) {
    const ctx = await this.writable(user, id);
    if (handle === 'main-menu' || handle === 'footer') throw new BadRequestException('Ye menu hata nahi sakte');
    await this.prisma.storeMenu.deleteMany({ where: { storeId: ctx.store.id, handle } });
    this.changed(ctx);
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // BLOG
  // ═══════════════════════════════════════════════════════════

  private presentPost(p: any) {
    return {
      id: p.id, blog: p.blog, handle: p.handle, title: p.title, bodyHtml: p.bodyHtml, excerpt: p.excerpt, imageUrl: p.imageUrl, tags: p.tags, author: p.author,
      seoTitle: p.seoTitle, seoDescription: p.seoDescription, isPublished: p.isPublished, publishedAt: p.publishedAt?.toISOString() ?? null, updatedAt: p.updatedAt.toISOString(),
      url: `/blogs/${p.blog}/${p.handle}`,
    };
  }

  async posts(user: AuthenticatedUser, id: string, blog?: string) {
    const ctx = await this.access.requireStore(user, id);
    const rows = await this.prisma.storeBlogPost.findMany({ where: { storeId: ctx.store.id, archivedAt: null, ...(blog && { blog }) }, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }], take: 500 });
    return { items: rows.map((p) => this.presentPost(p)) };
  }

  async post(user: AuthenticatedUser, id: string, postId: string) {
    const ctx = await this.access.requireStore(user, id);
    const p = await this.prisma.storeBlogPost.findFirst({ where: { id: postId, storeId: ctx.store.id, archivedAt: null } });
    if (!p) throw new NotFoundException('Ye post nahi mili');
    return this.presentPost(p);
  }

  private postData(body: Record<string, any>) {
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 160) || null;
    if (body.bodyHtml !== undefined) data.bodyHtml = sanitizeHtml(body.bodyHtml);
    if (body.excerpt !== undefined) data.excerpt = str(body.excerpt, 400);
    if (body.imageUrl !== undefined) data.imageUrl = typeof body.imageUrl === 'string' && /^https:\/\/\S+$/.test(body.imageUrl) ? body.imageUrl.slice(0, 1000) : null;
    if (body.tags !== undefined) data.tags = (Array.isArray(body.tags) ? body.tags : []).map((t: unknown) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 20);
    if (body.author !== undefined) data.author = str(body.author, 80);
    if (body.seoTitle !== undefined) data.seoTitle = str(body.seoTitle, 70);
    if (body.seoDescription !== undefined) data.seoDescription = str(body.seoDescription, 320);
    if (body.isPublished !== undefined) data.isPublished = bool(body.isPublished);
    if (body.publishedAt !== undefined) {
      const t = Date.parse(body.publishedAt);
      data.publishedAt = Number.isFinite(t) ? new Date(t) : null;
    }
    return data;
  }

  async createPost(user: AuthenticatedUser, id: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id);
    const blog = cleanHandle(body?.blog) ?? 'news';
    const data = this.postData({ isPublished: true, ...body });
    if (!data.title) throw new BadRequestException('Title likhein');
    const handle = await this.freeHandle('post', ctx.store.id, body.handle || (data.title as string), undefined, blog);
    const p = await this.prisma.storeBlogPost.create({
      data: { storeId: ctx.store.id, tenantId: ctx.tenantId, blog, handle, ...(data as any), publishedAt: (data.publishedAt as Date) ?? (data.isPublished ? new Date() : null) },
    });
    this.changed(ctx, ['blog']);
    return this.presentPost(p);
  }

  async updatePost(user: AuthenticatedUser, id: string, postId: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id);
    const p = await this.prisma.storeBlogPost.findFirst({ where: { id: postId, storeId: ctx.store.id, archivedAt: null } });
    if (!p) throw new NotFoundException('Ye post nahi mili');
    const data = this.postData(body ?? {});
    if (data.title === null) throw new BadRequestException('Title likhein');
    if (body?.handle !== undefined && cleanHandle(body.handle) !== p.handle) {
      data.handle = await this.freeHandle('post', ctx.store.id, body.handle, p.id, p.blog);
      await this.addRedirect(ctx, `/blogs/${p.blog}/${p.handle}`, `/blogs/${p.blog}/${data.handle}`, 'HANDLE');
    }
    if (data.isPublished === true && !p.publishedAt && data.publishedAt === undefined) data.publishedAt = new Date();
    const saved = await this.prisma.storeBlogPost.update({ where: { id: p.id }, data });
    this.changed(ctx, ['blog']);
    return this.presentPost(saved);
  }

  async archivePost(user: AuthenticatedUser, id: string, postId: string) {
    const ctx = await this.writable(user, id);
    const p = await this.prisma.storeBlogPost.findFirst({ where: { id: postId, storeId: ctx.store.id, archivedAt: null } });
    if (!p) throw new NotFoundException('Ye post nahi mili');
    await this.prisma.storeBlogPost.update({ where: { id: p.id }, data: { archivedAt: new Date(), isPublished: false, handle: `${p.handle}-archived-${Date.now().toString(36)}`.slice(0, 140) } });
    this.changed(ctx, ['blog']);
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // REDIRECTS
  // ═══════════════════════════════════════════════════════════

  async addRedirect(ctx: StoreCtx, fromRaw: string, toRaw: string, source: 'MANUAL' | 'SHOPIFY' | 'HANDLE' = 'MANUAL') {
    const fromPath = cleanPath(fromRaw);
    const toPath = cleanTarget(toRaw);
    if (!fromPath || !toPath || fromPath === toPath || fromPath === '/') return null;
    // A redirect that pointed at the new source now points at the new target (no chains).
    await this.prisma.storeRedirect.updateMany({ where: { storeId: ctx.store.id, toPath: fromPath }, data: { toPath } });
    await this.prisma.storeRedirect.deleteMany({ where: { storeId: ctx.store.id, fromPath: toPath } });
    return this.prisma.storeRedirect.upsert({
      where: { storeId_fromPath: { storeId: ctx.store.id, fromPath } },
      create: { storeId: ctx.store.id, tenantId: ctx.tenantId, fromPath, toPath, source },
      update: { toPath, source },
    });
  }

  async redirects(user: AuthenticatedUser, id: string, q: { search?: string; page?: string }) {
    const ctx = await this.access.requireStore(user, id);
    const page = Math.max(1, Math.floor(n(q.page) || 1));
    const search = String(q.search ?? '').trim().slice(0, 100);
    const where: Prisma.StoreRedirectWhereInput = { storeId: ctx.store.id, ...(search && { OR: [{ fromPath: { contains: search, mode: 'insensitive' } }, { toPath: { contains: search, mode: 'insensitive' } }] }) };
    const [items, total] = await Promise.all([
      this.prisma.storeRedirect.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 50, take: 50 }),
      this.prisma.storeRedirect.count({ where }),
    ]);
    return { items: items.map((r) => ({ id: r.id, fromPath: r.fromPath, toPath: r.toPath, source: r.source, hits: r.hits, createdAt: r.createdAt.toISOString() })), total, page, pages: Math.max(1, Math.ceil(total / 50)) };
  }

  async createRedirect(user: AuthenticatedUser, id: string, body: { fromPath?: string; toPath?: string }) {
    const ctx = await this.writable(user, id);
    const r = await this.addRedirect(ctx, String(body?.fromPath ?? ''), String(body?.toPath ?? ''));
    if (!r) throw new BadRequestException('Purana aur naya address sahi likhein (jaise /products/purana-naam)');
    return { id: r.id, fromPath: r.fromPath, toPath: r.toPath, source: r.source, hits: r.hits, createdAt: r.createdAt.toISOString() };
  }

  async bulkRedirects(user: AuthenticatedUser, id: string, body: { items?: Array<{ fromPath?: string; toPath?: string }> }) {
    const ctx = await this.writable(user, id);
    const items = (Array.isArray(body?.items) ? body.items : []).slice(0, 5000);
    let added = 0;
    for (const it of items) if (await this.addRedirect(ctx, String(it?.fromPath ?? ''), String(it?.toPath ?? ''))) added++;
    return { added, skipped: items.length - added };
  }

  async removeRedirect(user: AuthenticatedUser, id: string, redirectId: string) {
    const ctx = await this.writable(user, id);
    await this.prisma.storeRedirect.deleteMany({ where: { id: redirectId, storeId: ctx.store.id } });
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // POLICIES
  // ═══════════════════════════════════════════════════════════

  async policyTemplates(user: AuthenticatedUser) {
    const [tenant, owner, controls] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, phone: true } }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }),
      loadControls(this.prisma),
    ]);
    return { items: POLICY_KINDS.map((k) => controls.policyTemplates[k] ? { kind: k, ...controls.policyTemplates[k]! } : policyTemplate(k, { storeName: tenant?.name ?? 'our store', phone: tenant?.phone ?? null, email: owner?.email ?? null })) };
  }

  async policies(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const p = readPolicies(ctx.store.policies);
    return { items: POLICY_KINDS.map((k) => ({ kind: k, title: p[k]?.title ?? POLICY_TITLES[k], bodyHtml: p[k]?.bodyHtml ?? '', updatedAt: p[k]?.updatedAt ?? null })) };
  }

  async savePolicy(user: AuthenticatedUser, id: string, kindRaw: string, body: { bodyHtml?: string; title?: string }) {
    const ctx = await this.writable(user, id);
    const kind = policyKindOf(kindRaw);
    if (!kind) throw new NotFoundException('Ye policy nahi');
    const current = (ctx.store.policies ?? {}) as Record<string, unknown>;
    const next = { ...current, [kind]: { title: str(body?.title, 120) ?? POLICY_TITLES[kind], bodyHtml: sanitizeHtml(body?.bodyHtml ?? ''), updatedAt: new Date().toISOString() } };
    await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data: { policies: json(next) } });
    this.changed(ctx);
    return { kind, ...(next[kind] as object) };
  }

  // ═══════════════════════════════════════════════════════════
  // COLLECTIONS
  // ═══════════════════════════════════════════════════════════

  private presentCollection(c: any) {
    return {
      id: c.id, handle: c.handle, title: c.title, url: `/collections/${c.handle}`, descriptionHtml: c.descriptionHtml, imageUrl: c.imageUrl, image: c.imageUrl,
      kind: c.kind, rules: c.rules ?? null, sort: c.sort, seoTitle: c.seoTitle, seoDescription: c.seoDescription, isPublished: c.isPublished, sortOrder: c.sortOrder, updatedAt: c.updatedAt.toISOString(),
    };
  }

  async collections(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const rows = await this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id, archivedAt: null }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
    const base = await this.catalog.baseWhere(ctx);
    const items = [];
    for (const c of rows) items.push({ ...this.presentCollection(c), productCount: await this.prisma.product.count({ where: { AND: [base, await this.catalog.collectionWhere(ctx, c.id)] } }) });
    return { items };
  }

  async collection(user: AuthenticatedUser, id: string, cid: string) {
    const ctx = await this.access.requireStore(user, id);
    const c = await this.prisma.storeCollection.findFirst({ where: { id: cid, storeId: ctx.store.id, archivedAt: null } });
    if (!c) throw new NotFoundException('Ye collection nahi mili');
    return this.presentCollection(c);
  }

  private collectionData(body: Record<string, any>) {
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const t = String(body.title).trim().slice(0, 120);
      if (!t) throw new BadRequestException('Collection ka naam likhein');
      data.title = t;
    }
    if (body.descriptionHtml !== undefined) data.descriptionHtml = sanitizeHtml(body.descriptionHtml, 50_000);
    if (body.imageUrl !== undefined) data.imageUrl = typeof body.imageUrl === 'string' && /^https:\/\/\S+$/.test(body.imageUrl) ? body.imageUrl.slice(0, 1000) : null;
    if (body.kind !== undefined) data.kind = body.kind === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL';
    if (body.rules !== undefined && body.rules !== null) {
      const r = readRules(body.rules);
      if ('error' in r) throw new BadRequestException(r.error);
      data.rules = json(r);
    }
    if (body.sort !== undefined) data.sort = COLLECTION_SORTS.includes(body.sort) ? body.sort : 'manual';
    if (body.seoTitle !== undefined) data.seoTitle = str(body.seoTitle, 70);
    if (body.seoDescription !== undefined) data.seoDescription = str(body.seoDescription, 320);
    if (body.isPublished !== undefined) data.isPublished = bool(body.isPublished);
    return data;
  }

  async createCollection(user: AuthenticatedUser, id: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id);
    const data = this.collectionData({ isPublished: true, kind: 'MANUAL', ...body });
    if (!data.title) throw new BadRequestException('Collection ka naam likhein');
    if (data.kind === 'AUTOMATIC' && !data.rules) throw new BadRequestException('Kam az kam ek shart lagayein');
    if (data.kind === 'AUTOMATIC' && body.sort === undefined) data.sort = 'best_selling';
    const handle = await this.freeHandle('collection', ctx.store.id, body.handle || (data.title as string));
    const max = await this.prisma.storeCollection.aggregate({ where: { storeId: ctx.store.id }, _max: { sortOrder: true } });
    const c = await this.prisma.storeCollection.create({ data: { storeId: ctx.store.id, tenantId: ctx.tenantId, handle, sortOrder: (max._max.sortOrder ?? 0) + 1, ...(data as any) } });
    if (Array.isArray(body.productIds) && c.kind === 'MANUAL') await this.setCollectionProducts(user, id, c.id, { productIds: body.productIds });
    this.changed(ctx, ['collections']);
    return this.presentCollection(c);
  }

  async updateCollection(user: AuthenticatedUser, id: string, cid: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id);
    const c = await this.prisma.storeCollection.findFirst({ where: { id: cid, storeId: ctx.store.id, archivedAt: null } });
    if (!c) throw new NotFoundException('Ye collection nahi mili');
    const data = this.collectionData(body ?? {});
    if ((data.kind ?? c.kind) === 'AUTOMATIC' && !(data.rules ?? c.rules)) throw new BadRequestException('Kam az kam ek shart lagayein');
    if (body?.handle !== undefined && cleanHandle(body.handle) !== c.handle) {
      data.handle = await this.freeHandle('collection', ctx.store.id, body.handle, c.id);
      await this.addRedirect(ctx, `/collections/${c.handle}`, `/collections/${data.handle}`, 'HANDLE');
    }
    const saved = await this.prisma.storeCollection.update({ where: { id: c.id }, data });
    this.changed(ctx, ['collections']);
    return this.presentCollection(saved);
  }

  async archiveCollection(user: AuthenticatedUser, id: string, cid: string) {
    const ctx = await this.writable(user, id);
    const c = await this.prisma.storeCollection.findFirst({ where: { id: cid, storeId: ctx.store.id, archivedAt: null } });
    if (!c) throw new NotFoundException('Ye collection nahi mili');
    await this.prisma.storeCollection.update({ where: { id: c.id }, data: { archivedAt: new Date(), isPublished: false, handle: `${c.handle}-archived-${Date.now().toString(36)}`.slice(0, 140) } });
    this.changed(ctx, ['collections']);
    return { ok: true };
  }

  async reorderCollections(user: AuthenticatedUser, id: string, body: { ids?: string[] }) {
    const ctx = await this.writable(user, id);
    const ids = (Array.isArray(body?.ids) ? body.ids : []).slice(0, 500).map(String);
    await this.prisma.$transaction(ids.map((cid, i) => this.prisma.storeCollection.updateMany({ where: { id: cid, storeId: ctx.store.id }, data: { sortOrder: i + 1 } })));
    this.changed(ctx, ['collections']);
    return { ok: true };
  }

  async collectionProducts(user: AuthenticatedUser, id: string, cid: string, q: { page?: string }) {
    const ctx = await this.access.requireStore(user, id);
    const c = await this.prisma.storeCollection.findFirst({ where: { id: cid, storeId: ctx.store.id } });
    if (!c) throw new NotFoundException('Ye collection nahi mili');
    const page = Math.max(1, Math.floor(n(q.page) || 1));
    if (c.kind === 'MANUAL') {
      const [rows, total] = await Promise.all([
        this.prisma.storeCollectionProduct.findMany({ where: { collectionId: c.id }, orderBy: { position: 'asc' }, skip: (page - 1) * 100, take: 100 }),
        this.prisma.storeCollectionProduct.count({ where: { collectionId: c.id } }),
      ]);
      const info = await this.productRows(ctx, rows.map((r) => r.productId));
      return { items: rows.map((r) => info.get(r.productId) && { ...info.get(r.productId)!, position: r.position }).filter(Boolean), total };
    }
    const where = { AND: [{ tenantId: ctx.tenantId, isActive: true }, await this.catalog.collectionWhere(ctx, c.id)] };
    const [rows, total] = await Promise.all([this.prisma.product.findMany({ where, select: { id: true }, orderBy: { name: 'asc' }, skip: (page - 1) * 100, take: 100 }), this.prisma.product.count({ where })]);
    const info = await this.productRows(ctx, rows.map((r) => r.id));
    return { items: rows.map((r) => info.get(r.id) && { ...info.get(r.id)!, position: null }).filter(Boolean), total };
  }

  async setCollectionProducts(user: AuthenticatedUser, id: string, cid: string, body: { productIds?: string[] }) {
    const ctx = await this.writable(user, id);
    const c = await this.prisma.storeCollection.findFirst({ where: { id: cid, storeId: ctx.store.id } });
    if (!c) throw new NotFoundException('Ye collection nahi mili');
    if (c.kind !== 'MANUAL') throw new BadRequestException('Ye collection shart se banti hai — products khud judte hain');
    const wanted = [...new Set((Array.isArray(body?.productIds) ? body.productIds : []).map(String))].slice(0, 2000);
    const own = await this.prisma.product.findMany({ where: { tenantId: ctx.tenantId, id: { in: wanted } }, select: { id: true } });
    const ok = new Set(own.map((o) => o.id));
    const ids = wanted.filter((x) => ok.has(x));
    await this.prisma.$transaction([
      this.prisma.storeCollectionProduct.deleteMany({ where: { collectionId: c.id, productId: { notIn: ids } } }),
      ...ids.map((pid, i) => this.prisma.storeCollectionProduct.upsert({ where: { collectionId_productId: { collectionId: c.id, productId: pid } }, create: { collectionId: c.id, productId: pid, position: i + 1 }, update: { position: i + 1 } })),
    ]);
    this.changed(ctx, ['collections', 'products']);
    return { ok: true, count: ids.length };
  }

  async previewRules(user: AuthenticatedUser, id: string, body: { rules?: unknown }) {
    const ctx = await this.access.requireStore(user, id);
    const r = readRules(body?.rules);
    if ('error' in r) throw new BadRequestException(r.error);
    const where = { AND: [await this.catalog.baseWhere(ctx), ruleWhere(r as CollectionRules, ctx.shopId)] };
    const [count, rows] = await Promise.all([this.prisma.product.count({ where }), this.prisma.product.findMany({ where, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 12 })]);
    const info = await this.productRows(ctx, rows.map((x) => x.id));
    return { count, sample: rows.map((x) => info.get(x.id)).filter(Boolean).map((p) => ({ productId: p!.productId, name: p!.name, image: p!.image, price: p!.price })) };
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCTS ON THE WEBSITE
  // ═══════════════════════════════════════════════════════════

  /** Grid rows for products (merchant view, includes hidden ones). */
  private async productRows(ctx: StoreCtx, ids: string[]) {
    if (!ids.length) return new Map<string, ReturnType<typeof this.row>>();
    const [products, web, stocks] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: ctx.tenantId, id: { in: ids } },
        select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true, hasVariants: true, description: true, backorder: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } }, variants: { where: { isActive: true }, select: { stock: true } } },
      }),
      this.prisma.storeProduct.findMany({ where: { storeId: ctx.store.id, productId: { in: ids } } }),
      ctx.shopId ? this.prisma.shopStock.groupBy({ by: ['productId'], where: { shopId: ctx.shopId, productId: { in: ids } }, _sum: { stock: true } }) : Promise.resolve([]),
    ]);
    const w = new Map(web.map((x) => [x.productId, x]));
    const s = new Map(stocks.map((x) => [x.productId, n(x._sum.stock)]));
    return new Map(products.map((p) => [p.id, this.row(ctx, p, w.get(p.id) ?? null, ctx.shopId ? s.get(p.id) ?? 0 : p.hasVariants ? p.variants.reduce((a, v) => a + n(v.stock), 0) : n(p.stock))]));
  }

  private row(ctx: StoreCtx, p: { id: string; name: string; sku: string | null; price: number; isActive: boolean; description: string | null; backorder: boolean | null; images: Array<{ url: string }> }, w: any, stock: number) {
    const visible = !p.isActive ? false : w?.visible ?? ctx.settings.catalogMode === 'ALL';
    const handle = w?.handle ?? defaultProductHandle(p.name, p.id);
    return {
      productId: p.id, name: p.name, sku: p.sku, image: p.images[0]?.url ?? null, price: n(p.price), stock,
      availability: stock > 0 ? 'in_stock' : p.backorder ? 'backorder' : 'out_of_stock',
      visible, handle, url: `/products/${handle}`, seoTitle: w?.seoTitle ?? null, seoDescription: w?.seoDescription ?? null,
      badges: w?.badges ?? [], compareAtPrice: w?.compareAtPrice ?? null, hasWebDescription: !!w?.webDescription,
    };
  }

  async products(user: AuthenticatedUser, id: string, q: { search?: string; visible?: string; stock?: string; categoryId?: string; page?: string; limit?: string }) {
    const ctx = await this.access.requireStore(user, id);
    const limit = Math.max(1, Math.min(200, Math.floor(n(q.limit) || 50)));
    const page = Math.max(1, Math.floor(n(q.page) || 1));
    const and: Prisma.ProductWhereInput[] = [{ tenantId: ctx.tenantId, isActive: true, isRawMaterial: false }];
    const search = String(q.search ?? '').trim().slice(0, 80);
    if (search) and.push({ OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }, { barcode: search }] });
    if (q.categoryId) and.push({ categoryId: String(q.categoryId) });
    if (q.visible === 'shown' || q.visible === 'hidden') {
      const rows = await this.prisma.storeProduct.findMany({ where: { storeId: ctx.store.id, visible: { not: null } }, select: { productId: true, visible: true } });
      const shown = rows.filter((r) => r.visible).map((r) => r.productId);
      const hidden = rows.filter((r) => r.visible === false).map((r) => r.productId);
      const wantShown = q.visible === 'shown';
      if (ctx.settings.catalogMode === 'ALL') and.push(wantShown ? { id: { notIn: hidden } } : { id: { in: hidden } });
      else and.push(wantShown ? { id: { in: shown } } : { id: { notIn: shown } });
    }
    if (q.stock === 'in' || q.stock === 'out') {
      const stocked: Prisma.ProductWhereInput = ctx.shopId ? { shopStocks: { some: { shopId: ctx.shopId, stock: { gt: 0 } } } } : { stock: { gt: 0 } };
      and.push(q.stock === 'in' ? stocked : { NOT: stocked });
    }
    const where = { AND: and };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({ where, select: { id: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.product.count({ where }),
    ]);
    const info = await this.productRows(ctx, rows.map((r) => r.id));
    return { items: rows.map((r) => info.get(r.id)).filter(Boolean), total, page, pages: Math.max(1, Math.ceil(total / limit)), catalogMode: ctx.settings.catalogMode };
  }

  async product(user: AuthenticatedUser, id: string, productId: string) {
    const ctx = await this.access.requireStore(user, id);
    const info = (await this.productRows(ctx, [productId])).get(productId);
    if (!info) throw new NotFoundException('Ye product nahi mila');
    const [w, p] = await Promise.all([
      this.prisma.storeProduct.findUnique({ where: { storeId_productId: { storeId: ctx.store.id, productId } } }),
      this.prisma.product.findUnique({ where: { id: productId }, select: { description: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { id: true, url: true } } } }),
    ]);
    return {
      ...info, webDescription: w?.webDescription ?? null, description: p?.description ?? null, imageOrder: w?.imageOrder ?? [], images: p?.images ?? [],
      relatedProductIds: w?.relatedProductIds ?? [], tabs: (w?.tabs as unknown[]) ?? [], sizeChart: w?.sizeChart ?? null,
    };
  }

  async updateProduct(user: AuthenticatedUser, id: string, productId: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id);
    const p = await this.prisma.product.findFirst({ where: { id: productId, tenantId: ctx.tenantId }, select: { id: true, name: true } });
    if (!p) throw new NotFoundException('Ye product nahi mila');
    const current = await this.prisma.storeProduct.findUnique({ where: { storeId_productId: { storeId: ctx.store.id, productId } } });
    const oldHandle = current?.handle ?? defaultProductHandle(p.name, p.id);
    const data: Record<string, unknown> = {};
    if (body.visible !== undefined) data.visible = body.visible === null ? null : bool(body.visible);
    if (body.handle !== undefined) {
      const h = cleanHandle(body.handle);
      if (!h) throw new BadRequestException('URL ka naam likhein');
      if (h !== oldHandle) {
        const clash = await this.prisma.storeProduct.findUnique({ where: { storeId_handle: { storeId: ctx.store.id, handle: h } }, select: { productId: true } });
        if (clash && clash.productId !== productId) throw new ConflictException('Ye URL kisi aur product ka hai');
        data.handle = h;
      }
    }
    if (body.seoTitle !== undefined) data.seoTitle = str(body.seoTitle, 70);
    if (body.seoDescription !== undefined) data.seoDescription = str(body.seoDescription, 320);
    if (body.webDescription !== undefined) data.webDescription = body.webDescription ? sanitizeHtml(body.webDescription, 100_000) || null : null;
    if (body.imageOrder !== undefined) data.imageOrder = (Array.isArray(body.imageOrder) ? body.imageOrder : []).map(String).slice(0, 50);
    if (body.badges !== undefined) data.badges = (Array.isArray(body.badges) ? body.badges : []).map((b: unknown) => String(b).trim().slice(0, 20)).filter(Boolean).slice(0, 3);
    if (body.relatedProductIds !== undefined) data.relatedProductIds = (Array.isArray(body.relatedProductIds) ? body.relatedProductIds : []).map(String).filter((x: string) => x !== productId).slice(0, 12);
    if (body.compareAtPrice !== undefined) data.compareAtPrice = money(body.compareAtPrice);
    if (body.tabs !== undefined) data.tabs = json((Array.isArray(body.tabs) ? body.tabs : []).slice(0, 5).map((t: any) => ({ title: String(t?.title ?? '').trim().slice(0, 60), html: sanitizeHtml(t?.html ?? '', 20_000) })).filter((t: { title: string }) => t.title));
    if (body.sizeChart !== undefined) data.sizeChart = body.sizeChart ? json({ title: String(body.sizeChart.title ?? 'Size chart').slice(0, 60), html: sanitizeHtml(body.sizeChart.html ?? '', 20_000) }) : Prisma.DbNull;
    await this.prisma.storeProduct.upsert({
      where: { storeId_productId: { storeId: ctx.store.id, productId } },
      create: { storeId: ctx.store.id, tenantId: ctx.tenantId, productId, handle: (data.handle as string) ?? oldHandle, ...(data as any) },
      update: data,
    });
    if (data.handle) await this.addRedirect(ctx, `/products/${oldHandle}`, `/products/${data.handle}`, 'HANDLE');
    this.changed(ctx, ['products', 'collections', `product:${productId}`]);
    return this.product(user, id, productId);
  }

  async bulkProducts(user: AuthenticatedUser, id: string, body: { action?: string; productIds?: string[] }) {
    const ctx = await this.writable(user, id);
    const action = String(body?.action ?? '');
    if (!['show', 'hide', 'show_in_stock'].includes(action)) throw new BadRequestException('Kaam sahi nahi');
    let ids: string[];
    if (action === 'show_in_stock') {
      const stocked: Prisma.ProductWhereInput = ctx.shopId ? { shopStocks: { some: { shopId: ctx.shopId, stock: { gt: 0 } } } } : { stock: { gt: 0 } };
      ids = (await this.prisma.product.findMany({ where: { tenantId: ctx.tenantId, isActive: true, isRawMaterial: false, price: { gt: 0 }, ...stocked }, select: { id: true }, take: 50_000 })).map((p) => p.id);
    } else {
      const wanted = (Array.isArray(body?.productIds) ? body.productIds : []).map(String).slice(0, 5000);
      ids = (await this.prisma.product.findMany({ where: { tenantId: ctx.tenantId, id: { in: wanted } }, select: { id: true } })).map((p) => p.id);
    }
    const visible = action !== 'hide';
    const names = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    for (let i = 0; i < names.length; i += 1000) {
      const chunk = names.slice(i, i + 1000);
      await this.prisma.storeProduct.createMany({
        data: chunk.map((p) => ({ storeId: ctx.store.id, tenantId: ctx.tenantId, productId: p.id, handle: defaultProductHandle(p.name, p.id), visible })),
        skipDuplicates: true,
      });
      await this.prisma.storeProduct.updateMany({ where: { storeId: ctx.store.id, productId: { in: chunk.map((p) => p.id) } }, data: { visible } });
    }
    this.changed(ctx, ['products', 'collections']);
    return { updated: ids.length };
  }

  // ═══════════════════════════════════════════════════════════
  // SHIPPING, CHECKOUT, PAYMENTS
  // ═══════════════════════════════════════════════════════════

  async shipping(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    return readShipping(ctx.store.shipping);
  }

  async saveShipping(user: AuthenticatedUser, id: string, body: unknown) {
    const ctx = await this.writable(user, id);
    const s = readShipping(body);
    if (!s.zones.length) throw new BadRequestException('Kam az kam ek delivery zone rakhein');
    await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data: { shipping: json(s) } });
    this.changed(ctx);
    return s;
  }

  cities() {
    return pkCityList();
  }

  async checkout(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    return readCheckout(ctx.store.checkout);
  }

  async saveCheckout(user: AuthenticatedUser, id: string, body: Record<string, any>) {
    const ctx = await this.writable(user, id, true);
    const cur = readCheckout(ctx.store.checkout) as unknown as Record<string, any>;
    const merged: Record<string, any> = { ...cur };
    for (const [k, v] of Object.entries(body ?? {})) merged[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(cur[k] ?? {}), ...v } : v;
    const next = readCheckout(merged);
    await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data: { checkout: json(next) } });
    this.changed(ctx);
    return next;
  }

  async paymentStatus(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const c = readCheckout(ctx.store.checkout);
    const [accounts, controls] = await Promise.all([this.payments.accounts(user), loadControls(this.prisma)]);
    return {
      cod: { enabled: c.payments.cod, allowed: controls.payments.COD },
      gateways: accounts.map((a: any) => ({
        code: a.code, name: a.name, connected: a.connected, active: a.active, env: a.env, methods: a.methods,
        enabledOnStore: !!c.payments[a.code as keyof typeof c.payments], allowed: controls.payments[a.code as keyof typeof controls.payments] ?? false,
      })).filter((g) => g.code in PAY_GATEWAYS),
      setupLink: '/online-store/payments',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // COUPONS (kept on the store channel like the order-form coupons)
  // ═══════════════════════════════════════════════════════════

  async coupons(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    return { items: readForm(ctx.integration.config).coupons };
  }

  async saveCoupons(user: AuthenticatedUser, id: string, body: { items?: unknown[] }) {
    const ctx = await this.writable(user, id);
    const cfg = (ctx.integration.config ?? {}) as Record<string, any>;
    const cur = readForm(cfg);
    const seen = new Set<string>();
    const items: Coupon[] = (Array.isArray(body?.items) ? body.items : []).slice(0, 50).map((c: any) => {
      const code = String(c?.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
      if (code.length < 3) throw new BadRequestException('Coupon code kam az kam 3 harf / number');
      if (seen.has(code)) throw new BadRequestException(`${code} do dafa likha hai`);
      seen.add(code);
      const type = c?.type === 'FLAT' ? 'FLAT' : 'PERCENT';
      const value = Number(c?.value);
      if (!(value > 0) || (type === 'PERCENT' && value > 90)) throw new BadRequestException(type === 'PERCENT' ? `${code}: discount 1–90% ho` : `${code}: discount Rs 1 se zyada ho`);
      return {
        code, type, value: Math.round(value),
        minOrder: c?.minOrder ? Math.max(0, Math.round(Number(c.minOrder))) || null : null,
        maxUses: c?.maxUses ? Math.max(1, Math.round(Number(c.maxUses))) || null : null,
        uses: cur.coupons.find((x) => x.code === code)?.uses ?? 0,
        active: c?.active !== false,
      };
    });
    await this.prisma.integration.update({ where: { id: ctx.integration.id }, data: { config: { ...cfg, form: { ...(cfg.form ?? {}), coupons: items } } as Prisma.InputJsonValue } });
    this.access.invalidate(ctx.store.id);
    return { items };
  }

  // ═══════════════════════════════════════════════════════════
  // CUSTOMERS
  // ═══════════════════════════════════════════════════════════

  async customers(user: AuthenticatedUser, id: string, q: { search?: string; page?: string }) {
    const ctx = await this.access.requireStore(user, id);
    const page = Math.max(1, Math.floor(n(q.page) || 1));
    const search = String(q.search ?? '').trim().slice(0, 80);
    const where: Prisma.StoreCustomerWhereInput = {
      storeId: ctx.store.id,
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }] }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.storeCustomer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 50, take: 50 }),
      this.prisma.storeCustomer.count({ where }),
    ]);
    const phones = rows.map((r) => r.phone).filter(Boolean) as string[];
    const orders = phones.length
      ? await this.prisma.channelOrder.groupBy({ by: ['customerPhone'], where: { integrationId: ctx.integration.id, customerPhone: { in: phones }, deletedAt: null, orderStatus: { notIn: CLOSED_ORDERS } }, _count: { _all: true }, _sum: { total: true }, _max: { receivedAt: true } })
      : [];
    const byPhone = new Map(orders.map((o) => [o.customerPhone, o]));
    return {
      items: rows.map((r) => {
        const o = r.phone ? byPhone.get(r.phone) : undefined;
        return { id: r.id, name: r.name, phone: r.phone, email: r.email, acceptsMarketing: r.acceptsMarketing, orders: o?._count._all ?? 0, spent: n(o?._sum.total), lastOrderAt: o?._max.receivedAt?.toISOString() ?? null, source: r.source, customerId: r.customerId };
      }),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / 50)),
    };
  }

  /** Store address helper for other services. */
  static subdomain(slug: string) {
    return subdomainHost(slug);
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export { PolicyKind };
