/**
 * Public storefront content that is not products or carts: the layout
 * bootstrap (settings, theme, menus, policies, payments), pages, policies,
 * blog, redirects and the password unlock.
 */
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentLinksService } from '../online-orders/payment-links.service';
import { PublicAccess, StoreAccessService, StoreCtx } from './store-access.service';
import { StoreCatalogService } from './store-catalog.service';
import { StoreThemeService } from './store-theme.service';
import { POLICY_HANDLES, POLICY_KINDS, policyKindOf, publicCheckout, readCheckout, readPolicies, readShipping } from './store-settings';
import { checkSecret, signToken } from './lib/tokens';
import { cleanPath } from './lib/handle';
import { htmlToText } from './lib/sanitize-html';
import { menuRefs, readMenuItems, resolveMenu } from './lib/menus';
import { loadControls } from './store-controls';

@Injectable()
export class StorePublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly catalog: StoreCatalogService,
    private readonly theme: StoreThemeService,
    private readonly payments: PaymentLinksService,
  ) {}

  async bootstrap(storeId: string, access: PublicAccess) {
    const ctx = await this.access.publicStore(storeId, access, true);
    const controls = await loadControls(this.prisma);
    const s = ctx.settings;
    const platform = {
      banner: controls.banner.enabled && controls.banner.message ? { message: controls.banner.message, tone: controls.banner.tone } : null,
      checkoutPaused: controls.checkout.paused,
      checkoutMessage: controls.checkout.paused ? controls.checkout.message : null,
    };
    const store = {
      id: ctx.store.id, slug: ctx.store.slug, name: ctx.store.name, status: ctx.store.status, locked: ctx.locked,
      url: await this.access.storeUrl(ctx.store), primaryHost: await this.access.primaryHost(ctx.store), themeId: ctx.store.themeId, updatedAt: ctx.store.updatedAt.toISOString(),
    };
    if (ctx.locked) {
      return {
        store,
        settings: { logoUrl: s.logoUrl, faviconUrl: s.faviconUrl, logoWidth: s.logoWidth, password: s.password, languages: s.languages, tracking: s.tracking, seo: { ...s.seo, noindex: true }, contact: s.contact, social: s.social },
        theme: null, themeVersion: 0, menus: {}, policies: [], checkout: null, payments: [], shipping: null, reviews: null, platform,
      };
    }
    const checkout = readCheckout(ctx.store.checkout);
    const shipping = readShipping(ctx.store.shipping);
    const [theme, menus, active, reviews] = await Promise.all([
      this.theme.publicTheme(ctx),
      this.menus(ctx),
      this.payments.activeGateways(ctx.tenantId).catch(() => []),
      this.catalog.ratingSummary(ctx.tenantId),
    ]);
    const policies = readPolicies(ctx.store.policies);
    return {
      store,
      settings: s,
      theme: theme.theme,
      themeVersion: theme.version,
      menus,
      policies: POLICY_KINDS.filter((k) => policies[k]).map((k) => ({ kind: k, title: policies[k]!.title, handle: POLICY_HANDLES[k] })),
      checkout: publicCheckout(checkout),
      payments: [
        ...(checkout.payments.cod && controls.payments.COD ? [{ code: 'COD', name: 'Cash on delivery', methods: ['Cash'] }] : []),
        ...active.filter((g) => checkout.payments[g.code as 'SAFEPAY'] && controls.payments[g.code as 'SAFEPAY']),
      ],
      shipping: { freeShippingThreshold: shipping.freeShippingThreshold, defaultEta: shipping.defaultEta, codAvailable: checkout.payments.cod && shipping.zones.some((z) => z.codEnabled) },
      reviews: { enabled: reviews.count > 0, ...reviews },
      platform,
    };
  }

  async menus(ctx: StoreCtx) {
    const rows = await this.prisma.storeMenu.findMany({ where: { storeId: ctx.store.id } });
    const parsed = rows.map((r) => ({ handle: r.handle, items: readMenuItems(r.items) }));
    const refs = menuRefs(parsed.map((p) => p.items));
    const [collections, pages, products] = await Promise.all([
      this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id, archivedAt: null, isPublished: true, OR: [{ id: { in: refs.collections } }, { handle: { in: refs.collections } }] }, select: { id: true, handle: true } }),
      this.prisma.storePage.findMany({ where: { storeId: ctx.store.id, archivedAt: null, isPublished: true, OR: [{ id: { in: refs.pages } }, { handle: { in: refs.pages } }] }, select: { id: true, handle: true } }),
      this.prisma.product.findMany({ where: { tenantId: ctx.tenantId, isActive: true, id: { in: refs.products } }, select: { id: true, name: true } }),
    ]);
    const productHandles = await this.catalog.handlesFor(ctx.store.id, products);
    const look = {
      collections: new Map(collections.flatMap((c) => [[c.id, c.handle], [c.handle, c.handle]] as Array<[string, string]>)),
      pages: new Map(pages.flatMap((p) => [[p.id, p.handle], [p.handle, p.handle]] as Array<[string, string]>)),
      products: productHandles,
    };
    return Object.fromEntries(parsed.map((p) => [p.handle, resolveMenu(p.items, look)]));
  }

  async unlock(storeId: string, password: string) {
    const store = await this.prisma.nafaaStore.findUnique({ where: { id: String(storeId ?? '') }, select: { id: true, passwordHash: true } });
    if (!store || !store.passwordHash || !checkSecret(String(password ?? '').trim(), store.passwordHash)) throw new UnauthorizedException('Wrong password');
    const t = signToken('access', { s: store.id }, 12 * 3_600_000);
    return { accessToken: t.token, expiresAt: t.expiresAt.toISOString() };
  }

  async page(storeId: string, access: PublicAccess, handle: string) {
    const ctx = await this.access.publicStore(storeId, access);
    const p = await this.prisma.storePage.findUnique({ where: { storeId_handle: { storeId: ctx.store.id, handle: String(handle ?? '').toLowerCase().slice(0, 140) } } });
    if (!p || p.archivedAt || (!p.isPublished && !ctx.preview)) throw new NotFoundException('Page not found');
    const base = await this.access.storeBase(ctx.store);
    return {
      id: p.id, handle: p.handle, title: p.title, kind: p.kind, bodyHtml: p.bodyHtml,
      seo: { title: p.seoTitle || p.title, description: p.seoDescription || htmlToText(p.bodyHtml, 160), canonical: `${base}/pages/${p.handle}` },
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async policy(storeId: string, access: PublicAccess, raw: string) {
    const ctx = await this.access.publicStore(storeId, access);
    const kind = policyKindOf(raw);
    const p = kind ? readPolicies(ctx.store.policies)[kind] : null;
    if (!kind || !p) throw new NotFoundException('Policy not found');
    return { kind, handle: POLICY_HANDLES[kind], title: p.title, bodyHtml: p.bodyHtml, updatedAt: p.updatedAt };
  }

  async blog(storeId: string, access: PublicAccess, blog: string, pageRaw: unknown) {
    const ctx = await this.access.publicStore(storeId, access);
    const b = String(blog ?? 'news').toLowerCase().slice(0, 60);
    const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
    const where = { storeId: ctx.store.id, blog: b, archivedAt: null, isPublished: true };
    const [rows, total] = await Promise.all([
      this.prisma.storeBlogPost.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * 12, take: 12 }),
      this.prisma.storeBlogPost.count({ where }),
    ]);
    return {
      blog: { handle: b, title: b === 'news' ? 'News' : b.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) },
      items: rows.map((p) => ({ handle: p.handle, title: p.title, excerpt: p.excerpt ?? htmlToText(p.bodyHtml, 200), image: p.imageUrl, publishedAt: (p.publishedAt ?? p.createdAt).toISOString(), tags: p.tags, url: `/blogs/${p.blog}/${p.handle}` })),
      page,
      pages: Math.max(1, Math.ceil(total / 12)),
    };
  }

  async post(storeId: string, access: PublicAccess, blog: string, handle: string) {
    const ctx = await this.access.publicStore(storeId, access);
    const p = await this.prisma.storeBlogPost.findUnique({ where: { storeId_blog_handle: { storeId: ctx.store.id, blog: String(blog).toLowerCase(), handle: String(handle).toLowerCase() } } });
    if (!p || p.archivedAt || (!p.isPublished && !ctx.preview)) throw new NotFoundException('Post not found');
    const base = await this.access.storeBase(ctx.store);
    const url = `/blogs/${p.blog}/${p.handle}`;
    return {
      handle: p.handle, title: p.title, bodyHtml: p.bodyHtml, image: p.imageUrl, publishedAt: (p.publishedAt ?? p.createdAt).toISOString(), tags: p.tags, author: p.author,
      seo: { title: p.seoTitle || p.title, description: p.seoDescription || p.excerpt || htmlToText(p.bodyHtml, 160), canonical: `${base}${url}`, image: p.imageUrl },
      url,
    };
  }

  /** Imported/handle redirects; counts hits. Null when there is none. */
  async redirect(storeId: string, path: string) {
    const from = cleanPath(path);
    if (!from) return null;
    const store = await this.prisma.nafaaStore.findUnique({ where: { id: String(storeId ?? '') }, select: { id: true } });
    if (!store) throw new NotFoundException('Store not found');
    const r = (await this.prisma.storeRedirect.findUnique({ where: { storeId_fromPath: { storeId: store.id, fromPath: from } } }))
      ?? (from.includes('?') ? await this.prisma.storeRedirect.findUnique({ where: { storeId_fromPath: { storeId: store.id, fromPath: from.split('?')[0] } } }) : null);
    if (!r) return null;
    await this.prisma.storeRedirect.update({ where: { id: r.id }, data: { hits: { increment: 1 } } }).catch(() => null);
    return { to: r.toPath, permanent: true };
  }
}
