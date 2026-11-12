/**
 * "Shopify se aayein": copies a Shopify store's web content into a Nafaa
 * Store through the existing Shopify connection, read-only. Products are
 * already imported by Online products; this brings their URL handles,
 * collections (custom + smart rules), shop details and policies, plus pages,
 * blog posts, menus, redirects and customers when the connection has those
 * scopes. Anything a scope does not allow is listed, never faked.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopifyService } from '../online-orders/shopify.service';
import { ShopifyClient, numericId } from '../online-orders/shopify.client';
import { StoreAccessService, StoreCtx } from './store-access.service';
import { StoresService } from './stores.service';
import { StoreRevalidateService } from './store-revalidate.service';
import { cleanHandle, uniqueHandle } from './lib/handle';
import { sanitizeHtml } from './lib/sanitize-html';
import { CollectionRules, RuleCondition } from './lib/collection-rules';
import { MenuItem } from './lib/menus';
import { POLICY_KINDS, PolicyKind, mergeSettings } from './store-settings';

export type MigrateKey = 'products' | 'handles' | 'collections' | 'redirects' | 'shop' | 'policies' | 'pages' | 'blogs' | 'menus' | 'customers';
const KEYS: MigrateKey[] = ['products', 'handles', 'collections', 'shop', 'policies', 'pages', 'blogs', 'menus', 'redirects', 'customers'];
const NEEDS: Partial<Record<MigrateKey, string[]>> = {
  handles: ['read_products'], collections: ['read_products'], pages: ['read_content'], blogs: ['read_content'],
  menus: ['read_online_store_navigation'], redirects: ['read_online_store_navigation'], customers: ['read_customers'],
};
const LABEL: Record<MigrateKey, string> = {
  products: 'Products', handles: 'Product URLs', collections: 'Collections', shop: 'Store name, logo and colours', policies: 'Policies',
  pages: 'Pages', blogs: 'Blog posts', menus: 'Menus', redirects: 'URL redirects', customers: 'Customers',
};

export interface Step { key: MigrateKey; status: 'waiting' | 'running' | 'done' | 'skipped' | 'failed'; imported: number; skipped: number; note: string | null }
export interface Run { id: string; status: 'RUNNING' | 'DONE' | 'FAILED'; channelId: string; startedAt: string; finishedAt: string | null; steps: Step[] }

const has = (granted: string[], need: string[] = []) => need.every((s) => granted.includes(s) || granted.includes(s.replace('read_', 'write_')));

@Injectable()
export class StoreShopifyImportService {
  private readonly logger = new Logger(StoreShopifyImportService.name);
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly shopify: ShopifyService,
    private readonly stores: StoresService,
    private readonly revalidate: StoreRevalidateService,
  ) {}

  private channels(tenantId: string) {
    return this.prisma.integration.findMany({ where: { tenantId, type: 'SHOPIFY', isActive: true }, orderBy: { createdAt: 'asc' } });
  }

  async info(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const channels = await this.channels(ctx.tenantId);
    const first = channels[0] ?? null;
    const client = first ? await this.shopify.client(first).catch(() => null) : null;
    const scopes = client ? await client.accessScopes() : { status: 0, scopes: [] as string[] };
    const products = first ? await this.prisma.productChannelMapping.count({ where: { integrationId: first.id } }) : 0;
    const wanted = [...new Set(Object.values(NEEDS).flat())] as string[];
    return {
      channels: channels.map((c) => ({ id: c.id, name: c.displayName, shop: (c.credentials as any)?.shopifyShop ?? null, connected: c.status === 'CONNECTED' })),
      scopes: { granted: scopes.scopes, missing: wanted.filter((s) => !has(scopes.scopes, [s])) },
      items: KEYS.map((k) => {
        const ok = !!client && has(scopes.scopes, NEEDS[k]);
        return {
          key: k, label: LABEL[k], available: ok,
          reason: !first ? 'Shopify jura nahi' : !client ? 'Shopify connection dobara jorein' : ok ? null : `Shopify permission "${NEEDS[k]!.join(', ')}" chahiye — abhi ye nahi milti`,
          count: k === 'products' ? products : null,
        };
      }),
      lastRun: (ctx.store.migration as unknown as Run) ?? null,
    };
  }

  async status(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    return { run: (ctx.store.migration as unknown as Run) ?? null };
  }

  async start(user: AuthenticatedUser, id: string, body: { channelId?: string; include?: string[] }) {
    await this.access.assertWrite(user);
    this.access.assertManager(user);
    const ctx = await this.access.requireStore(user, id);
    if (this.running.has(ctx.store.id)) throw new BadRequestException('Import pehle se chal raha hai');
    const channel = await this.prisma.integration.findFirst({ where: { id: String(body?.channelId ?? ''), tenantId: ctx.tenantId, type: 'SHOPIFY' } });
    if (!channel) throw new NotFoundException('Shopify store nahi mila');
    const client = await this.shopify.client(channel);
    if (!client) throw new BadRequestException('Shopify connection dobara jorein');
    const include = KEYS.filter((k) => (Array.isArray(body?.include) ? body.include : KEYS).includes(k));
    const run: Run = { id: `m${Date.now().toString(36)}`, status: 'RUNNING', channelId: channel.id, startedAt: new Date().toISOString(), finishedAt: null, steps: include.map((key) => ({ key, status: 'waiting', imported: 0, skipped: 0, note: null })) };
    await this.save(ctx.store.id, run);
    this.running.add(ctx.store.id);
    void this.execute(ctx, channel, client, run, user).finally(() => this.running.delete(ctx.store.id));
    return { run };
  }

  private save(storeId: string, run: Run) {
    return this.prisma.nafaaStore.update({ where: { id: storeId }, data: { migration: run as unknown as Prisma.InputJsonValue } });
  }

  private async execute(ctx: StoreCtx, channel: Integration, client: ShopifyClient, run: Run, user: AuthenticatedUser) {
    const scopes = (await client.accessScopes()).scopes;
    const productMap = await this.productMap(channel.id);
    for (const step of run.steps) {
      if (!has(scopes, NEEDS[step.key])) {
        step.status = 'skipped';
        step.note = `Shopify permission "${NEEDS[step.key]!.join(', ')}" nahi mili`;
        continue;
      }
      step.status = 'running';
      await this.save(ctx.store.id, run).catch(() => null);
      try {
        const r = await this.runStep(step.key, ctx, client, productMap, user);
        Object.assign(step, { status: 'done', ...r });
      } catch (e: any) {
        step.status = 'failed';
        step.note = String(e?.message ?? 'Failed').slice(0, 300);
        this.logger.warn(`Shopify import ${step.key}: ${e?.message}`);
      }
      await this.save(ctx.store.id, run).catch(() => null);
    }
    run.status = run.steps.some((s) => s.status === 'failed') && !run.steps.some((s) => s.status === 'done') ? 'FAILED' : 'DONE';
    run.finishedAt = new Date().toISOString();
    await this.save(ctx.store.id, run).catch(() => null);
    this.access.invalidate(ctx.store.id);
    void this.revalidate.send(ctx.store.id);
  }

  /** Shopify product id (numeric) → Nafaa product id, from the existing links. */
  private async productMap(integrationId: string) {
    const rows = await this.prisma.productChannelMapping.findMany({ where: { integrationId, externalProductId: { not: null } }, select: { externalProductId: true, productId: true } });
    return new Map(rows.map((r) => [numericId(r.externalProductId!), r.productId]));
  }

  private async *paged<T>(client: ShopifyClient, query: string, field: string, limit = 5000): AsyncGenerator<T> {
    let after: string | null = null;
    let seen = 0;
    do {
      const data: any = await client.graphql(query, { after });
      const conn = data?.[field];
      for (const n of conn?.nodes ?? []) {
        if (seen++ >= limit) return;
        yield n as T;
      }
      after = conn?.pageInfo?.hasNextPage ? conn.pageInfo.endCursor : null;
    } while (after);
  }

  private async runStep(key: MigrateKey, ctx: StoreCtx, client: ShopifyClient, productMap: Map<string, string>, user: AuthenticatedUser): Promise<{ imported: number; skipped: number; note: string | null }> {
    switch (key) {
      case 'products':
        return { imported: productMap.size, skipped: 0, note: 'Products Online products se pehle hi Nafaa me hain' };
      case 'handles': return this.handles(ctx, client, productMap);
      case 'collections': return this.collections(ctx, client, productMap);
      case 'shop': return this.shop(ctx, client);
      case 'policies': return this.policies(ctx, client);
      case 'pages': return this.pages(ctx, client);
      case 'blogs': return this.blogs(ctx, client);
      case 'menus': return this.menus(ctx, client, productMap);
      case 'redirects': return this.redirects(ctx, client);
      case 'customers': return this.customers(ctx, client);
    }
  }

  private async handles(ctx: StoreCtx, client: ShopifyClient, productMap: Map<string, string>) {
    let imported = 0;
    let skipped = 0;
    const q = `query($after: String) { products(first: 250, after: $after) { nodes { id handle seo { title description } } pageInfo { hasNextPage endCursor } } }`;
    for await (const p of this.paged<{ id: string; handle: string; seo?: { title?: string; description?: string } }>(client, q, 'products', 50_000)) {
      const productId = productMap.get(numericId(p.id));
      const handle = cleanHandle(p.handle);
      if (!productId || !handle) { skipped++; continue; }
      const clash = await this.prisma.storeProduct.findUnique({ where: { storeId_handle: { storeId: ctx.store.id, handle } }, select: { productId: true } });
      if (clash && clash.productId !== productId) { skipped++; continue; }
      await this.prisma.storeProduct.upsert({
        where: { storeId_productId: { storeId: ctx.store.id, productId } },
        create: { storeId: ctx.store.id, tenantId: ctx.tenantId, productId, handle, visible: true, seoTitle: p.seo?.title?.slice(0, 70) || null, seoDescription: p.seo?.description?.slice(0, 320) || null },
        update: { handle, ...(p.seo?.title && { seoTitle: p.seo.title.slice(0, 70) }), ...(p.seo?.description && { seoDescription: p.seo.description.slice(0, 320) }) },
      });
      imported++;
    }
    return { imported, skipped, note: skipped ? 'Kuch products Nafaa se jure nahi the — pehle Online products me import karein' : null };
  }

  private async collections(ctx: StoreCtx, client: ShopifyClient, productMap: Map<string, string>) {
    const q = `query($after: String) { collections(first: 50, after: $after) { nodes { id handle title descriptionHtml sortOrder image { url } seo { title description }
      ruleSet { appliedDisjunctively rules { column relation condition } } products(first: 250) { nodes { id } } } pageInfo { hasNextPage endCursor } } }`;
    const [tags, cats, brands] = await Promise.all([
      this.prisma.tag.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true } }),
      this.prisma.category.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true } }),
      this.prisma.brand.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true } }),
    ]);
    const byName = (list: Array<{ id: string; name: string }>, name: string) => list.find((x) => x.name.toLowerCase() === name.toLowerCase())?.id ?? null;
    const taken = new Set((await this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id }, select: { handle: true, externalId: true } })).map((c) => c.handle));
    let imported = 0;
    let skipped = 0;
    let sortOrder = 100;
    for await (const c of this.paged<any>(client, q, 'collections', 1000)) {
      const ids = (c.products?.nodes ?? []).map((p: { id: string }) => productMap.get(numericId(p.id))).filter(Boolean) as string[];
      let rules: CollectionRules | null = null;
      if (c.ruleSet?.rules?.length) {
        const conds: RuleCondition[] = [];
        for (const r of c.ruleSet.rules as Array<{ column: string; relation: string; condition: string }>) {
          const neg = r.relation === 'NOT_EQUALS';
          if (r.column === 'TITLE' && r.relation === 'CONTAINS') conds.push({ field: 'title', op: 'contains', value: r.condition });
          else if (r.column === 'TAG' && byName(tags, r.condition)) conds.push({ field: 'tag', op: neg ? 'is_not' : 'is', value: byName(tags, r.condition)! });
          else if (r.column === 'TYPE' && byName(cats, r.condition)) conds.push({ field: 'category', op: neg ? 'is_not' : 'is', value: byName(cats, r.condition)! });
          else if (r.column === 'VENDOR' && byName(brands, r.condition)) conds.push({ field: 'brand', op: neg ? 'is_not' : 'is', value: byName(brands, r.condition)! });
          else if (r.column === 'VARIANT_PRICE' && (r.relation === 'GREATER_THAN' || r.relation === 'LESS_THAN')) conds.push({ field: 'price', op: r.relation === 'GREATER_THAN' ? 'gt' : 'lt', value: Number(r.condition) || 0 });
          else if (r.column === 'VARIANT_INVENTORY' && r.relation === 'GREATER_THAN' && Number(r.condition) <= 0) conds.push({ field: 'stock', op: 'in_stock', value: 1 });
          else { conds.length = 0; break; }
        }
        if (conds.length) rules = { match: c.ruleSet.appliedDisjunctively ? 'any' : 'all', conditions: conds };
      }
      const existing = await this.prisma.storeCollection.findFirst({ where: { storeId: ctx.store.id, externalId: numericId(c.id) } });
      const sort = ({ BEST_SELLING: 'best_selling', CREATED_DESC: 'newest', PRICE_ASC: 'price_asc', PRICE_DESC: 'price_desc', ALPHA_ASC: 'title_asc', ALPHA_DESC: 'title_desc', MANUAL: 'manual' } as Record<string, string>)[c.sortOrder] ?? (rules ? 'best_selling' : 'manual');
      const data = {
        title: String(c.title ?? 'Collection').slice(0, 120), descriptionHtml: sanitizeHtml(c.descriptionHtml ?? '', 50_000), imageUrl: c.image?.url ?? null,
        kind: rules ? 'AUTOMATIC' : 'MANUAL', rules: rules ? (rules as unknown as Prisma.InputJsonValue) : Prisma.DbNull, sort: rules && sort === 'manual' ? 'best_selling' : sort,
        seoTitle: c.seo?.title?.slice(0, 70) || null, seoDescription: c.seo?.description?.slice(0, 320) || null,
      };
      if (!rules && !ids.length) { skipped++; continue; }
      let row;
      if (existing) row = await this.prisma.storeCollection.update({ where: { id: existing.id }, data });
      else {
        const handle = taken.has(c.handle) ? uniqueHandle(c.handle, taken) : cleanHandle(c.handle) ?? uniqueHandle(c.title, taken);
        taken.add(handle);
        row = await this.prisma.storeCollection.create({ data: { storeId: ctx.store.id, tenantId: ctx.tenantId, handle, externalId: numericId(c.id), sortOrder: sortOrder++, ...data } });
        if (handle !== cleanHandle(c.handle)) await this.stores.addRedirect(ctx, `/collections/${c.handle}`, `/collections/${handle}`, 'SHOPIFY');
      }
      if (!rules) {
        await this.prisma.storeCollectionProduct.deleteMany({ where: { collectionId: row.id } });
        await this.prisma.storeCollectionProduct.createMany({ data: ids.map((pid, i) => ({ collectionId: row.id, productId: pid, position: i + 1 })), skipDuplicates: true });
      }
      imported++;
    }
    return { imported, skipped, note: skipped ? 'Jin collections ke products Nafaa me nahi the, wo chhor di' : null };
  }

  private async shop(ctx: StoreCtx, client: ShopifyClient) {
    let data: any;
    try {
      data = await client.graphql(`{ shop { name email contactEmail description brand { slogan shortDescription logo { image { url } } squareLogo { image { url } } colors { primary { background foreground } secondary { background } } } } }`);
    } catch {
      data = await client.graphql(`{ shop { name email contactEmail description } }`);
    }
    const s = data?.shop ?? {};
    const brand = s.brand ?? {};
    const patch: Record<string, unknown> = {
      ...(brand.logo?.image?.url && { logoUrl: brand.logo.image.url }),
      ...(brand.squareLogo?.image?.url && { faviconUrl: brand.squareLogo.image.url }),
      ...((brand.slogan || brand.shortDescription) && { tagline: brand.slogan ?? brand.shortDescription }),
      contact: { email: s.contactEmail ?? s.email ?? null },
      seo: { description: s.description ?? null },
    };
    await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data: { settings: mergeSettings(ctx.store.settings, patch) as unknown as Prisma.InputJsonValue } });
    const primary = brand.colors?.primary?.[0]?.background;
    if (primary && /^#[0-9a-f]{6}$/i.test(primary)) {
      const draft = await this.prisma.storeThemeVersion.findFirst({ where: { storeId: ctx.store.id, status: 'DRAFT' }, orderBy: { version: 'desc' } });
      if (draft) {
        const doc = draft.doc as any;
        doc.tokens.colors.primary = primary.toLowerCase();
        await this.prisma.storeThemeVersion.update({ where: { id: draft.id }, data: { doc } });
      }
    }
    return { imported: 1, skipped: 0, note: primary ? 'Rang theme draft me lag gaya — publish karein' : null };
  }

  private async policies(ctx: StoreCtx, client: ShopifyClient) {
    const data: any = await client.graphql(`{ shop { shopPolicies { type title body } } }`);
    const map: Record<string, PolicyKind> = { REFUND_POLICY: 'refund', PRIVACY_POLICY: 'privacy', TERMS_OF_SERVICE: 'terms', SHIPPING_POLICY: 'shipping' };
    const current = (ctx.store.policies ?? {}) as Record<string, unknown>;
    let imported = 0;
    for (const p of data?.shop?.shopPolicies ?? []) {
      const kind = map[p.type];
      if (!kind || !POLICY_KINDS.includes(kind) || !p.body) continue;
      current[kind] = { title: String(p.title ?? kind).slice(0, 120), bodyHtml: sanitizeHtml(p.body), updatedAt: new Date().toISOString() };
      imported++;
    }
    if (imported) await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data: { policies: current as Prisma.InputJsonValue } });
    return { imported, skipped: 0, note: imported ? null : 'Shopify par policies khali thi' };
  }

  private async pages(ctx: StoreCtx, client: ShopifyClient) {
    const q = `query($after: String) { pages(first: 100, after: $after) { nodes { title handle body isPublished bodySummary } pageInfo { hasNextPage endCursor } } }`;
    let imported = 0;
    for await (const p of this.paged<any>(client, q, 'pages', 500)) {
      const handle = cleanHandle(p.handle);
      if (!handle) continue;
      await this.prisma.storePage.upsert({
        where: { storeId_handle: { storeId: ctx.store.id, handle } },
        create: { storeId: ctx.store.id, tenantId: ctx.tenantId, handle, title: String(p.title).slice(0, 120), bodyHtml: sanitizeHtml(p.body ?? ''), isPublished: p.isPublished !== false },
        update: { title: String(p.title).slice(0, 120), bodyHtml: sanitizeHtml(p.body ?? ''), archivedAt: null },
      });
      imported++;
    }
    return { imported, skipped: 0, note: null };
  }

  private async blogs(ctx: StoreCtx, client: ShopifyClient) {
    const q = `query($after: String) { articles(first: 100, after: $after) { nodes { id title handle body summary tags publishedAt isPublished image { url } author { name } blog { handle } } pageInfo { hasNextPage endCursor } } }`;
    let imported = 0;
    for await (const a of this.paged<any>(client, q, 'articles', 2000)) {
      const handle = cleanHandle(a.handle);
      const blog = cleanHandle(a.blog?.handle) ?? 'news';
      if (!handle) continue;
      const data = {
        title: String(a.title).slice(0, 160), bodyHtml: sanitizeHtml(a.body ?? ''), excerpt: a.summary ? sanitizeHtml(a.summary).replace(/<[^>]*>/g, '').slice(0, 400) : null,
        imageUrl: a.image?.url ?? null, tags: (a.tags ?? []).slice(0, 20), author: a.author?.name ?? null, isPublished: a.isPublished !== false,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null, externalId: numericId(a.id),
      };
      await this.prisma.storeBlogPost.upsert({
        where: { storeId_blog_handle: { storeId: ctx.store.id, blog, handle } },
        create: { storeId: ctx.store.id, tenantId: ctx.tenantId, blog, handle, ...data },
        update: { ...data, archivedAt: null },
      });
      imported++;
    }
    return { imported, skipped: 0, note: null };
  }

  private async menus(ctx: StoreCtx, client: ShopifyClient, productMap: Map<string, string>) {
    const data: any = await client.graphql(`{ menus(first: 20) { nodes { handle title items { title type url resourceId items { title type url resourceId items { title type url resourceId } } } } } }`);
    const [collections, pages] = await Promise.all([
      this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id }, select: { id: true, externalId: true, handle: true } }),
      this.prisma.storePage.findMany({ where: { storeId: ctx.store.id }, select: { id: true, handle: true } }),
    ]);
    let n = 0;
    const map = (items: any[]): MenuItem[] => (items ?? []).map((i): MenuItem => {
      const id = `s${++n}`;
      const children = map(i.items ?? []);
      const path = String(i.url ?? '').replace(/^https?:\/\/[^/]+/, '');
      const rid = i.resourceId ? numericId(i.resourceId) : null;
      if (i.type === 'FRONTPAGE') return { id, title: i.title, type: 'home', ref: null, url: null, children };
      if (i.type === 'COLLECTION' && rid) {
        const c = collections.find((x) => x.externalId === rid);
        if (c) return { id, title: i.title, type: 'collection', ref: c.id, url: null, children };
      }
      if (i.type === 'COLLECTIONS') return { id, title: i.title, type: 'collections', ref: null, url: null, children };
      if (i.type === 'CATALOG') return { id, title: i.title, type: 'collection', ref: 'all', url: null, children };
      if (i.type === 'PRODUCT' && rid && productMap.get(rid)) return { id, title: i.title, type: 'product', ref: productMap.get(rid)!, url: null, children };
      if (i.type === 'PAGE') {
        const h = path.split('/').pop();
        const p = pages.find((x) => x.handle === h);
        if (p) return { id, title: i.title, type: 'page', ref: p.id, url: null, children };
      }
      if (i.type === 'SEARCH') return { id, title: i.title, type: 'search', ref: null, url: null, children };
      return { id, title: i.title, type: 'url', ref: null, url: path || i.url || '/', children };
    });
    let imported = 0;
    for (const m of data?.menus?.nodes ?? []) {
      const handle = cleanHandle(m.handle);
      if (!handle) continue;
      await this.prisma.storeMenu.upsert({
        where: { storeId_handle: { storeId: ctx.store.id, handle } },
        create: { storeId: ctx.store.id, tenantId: ctx.tenantId, handle, title: String(m.title).slice(0, 80), items: map(m.items) as unknown as Prisma.InputJsonValue },
        update: { title: String(m.title).slice(0, 80), items: map(m.items) as unknown as Prisma.InputJsonValue },
      });
      imported++;
    }
    return { imported, skipped: 0, note: null };
  }

  private async redirects(ctx: StoreCtx, client: ShopifyClient) {
    const q = `query($after: String) { urlRedirects(first: 250, after: $after) { nodes { path target } pageInfo { hasNextPage endCursor } } }`;
    let imported = 0;
    let skipped = 0;
    for await (const r of this.paged<{ path: string; target: string }>(client, q, 'urlRedirects', 20_000)) {
      if (await this.stores.addRedirect(ctx, r.path, r.target, 'SHOPIFY')) imported++;
      else skipped++;
    }
    return { imported, skipped, note: null };
  }

  private async customers(ctx: StoreCtx, client: ShopifyClient) {
    const q = `query($after: String) { customers(first: 250, after: $after) { nodes { id firstName lastName defaultEmailAddress { emailAddress marketingState } defaultPhoneNumber { phoneNumber } } pageInfo { hasNextPage endCursor } } }`;
    let imported = 0;
    let skipped = 0;
    for await (const c of this.paged<any>(client, q, 'customers', 50_000)) {
      const email = c.defaultEmailAddress?.emailAddress?.toLowerCase() ?? null;
      let phone: string | null = String(c.defaultPhoneNumber?.phoneNumber ?? '').replace(/\D/g, '') || null;
      if (phone?.startsWith('92')) phone = `0${phone.slice(2)}`;
      if (!email && !phone) { skipped++; continue; }
      const exists = await this.prisma.storeCustomer.findFirst({ where: { storeId: ctx.store.id, OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] }, select: { id: true } });
      if (exists) { skipped++; continue; }
      await this.prisma.storeCustomer.create({
        data: {
          storeId: ctx.store.id, tenantId: ctx.tenantId, name: [c.firstName, c.lastName].filter(Boolean).join(' ') || null, phone, email,
          // Marketing consent carries over only when Shopify says the customer subscribed.
          acceptsMarketing: c.defaultEmailAddress?.marketingState === 'SUBSCRIBED', source: 'SHOPIFY', externalId: numericId(c.id),
        },
      }).then(() => imported++).catch(() => skipped++);
    }
    return { imported, skipped, note: null };
  }
}
