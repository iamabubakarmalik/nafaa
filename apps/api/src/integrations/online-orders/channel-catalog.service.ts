import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Integration } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../common/shop-scope';
import { WebsiteSetupService } from './website-setup.service';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { readWebsiteConfig } from './website-config';
import { mappingKey } from './mapping-key';
import { numericId } from './shopify.client';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { fetchIndoljMenu, IndoljCreds } from './indolj.client';

/**
 * Channel ka "Products" safha:
 *
 *  • Website ke products + har variant (size/color) live laana
 *  • Har variant ke saamne: kis Nafaa product/variant se jura hai, ya salah (SKU/barcode/naam)
 *  • Jorna / hatana / sab salahen ek saath qubool
 *  • Website ke products Nafaa me (variants ke saath) — ya Nafaa ke website par
 *
 * Stock ka malik Nafaa hai: jore hue variant ka stock Nafaa se website par jata hai.
 */

export interface RemoteVariant {
  externalVariantId: string | null;   // simple WooCommerce product: null
  title: string;                      // "Small / Red", "Default"
  sku: string | null;
  barcode: string | null;
  price: number;
  stock: number | null;
  image: string | null;
}

export interface RemoteProduct {
  externalProductId: string;
  title: string;
  image: string | null;
  status: string;
  hasVariants: boolean;
  variants: RemoteVariant[];
}

const CACHE_MS = 2 * 60_000;

@Injectable()
export class ChannelCatalogService {
  private readonly logger = new Logger(ChannelCatalogService.name);
  private cache = new Map<string, { at: number; data: RemoteProduct[] }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
  ) {}

  private kind(i: Integration): 'woocommerce' | 'shopify' | 'indolj' | null {
    if (this.woo.isConnected(i)) return 'woocommerce';
    if (this.shopify.isConnected(i)) return 'shopify';
    if (this.indoljCreds(i)) return 'indolj';
    return null;
  }

  /* ─── Indolj (restaurant ordering platform) — menu ke liye keys ─── */

  private indoljCreds(i: Integration): IndoljCreds | null {
    const c = (i.config as any)?.indolj;
    if (!c?.activationToken || !c?.secret) return null;
    const secret = decrypt(c.secret);
    return secret ? { baseUrl: c.baseUrl || 'https://console.indolj.io', activationToken: c.activationToken, merchantId: String(c.merchantId ?? ''), secret, branchId: c.branchId ?? null } : null;
  }

  async connectIndolj(user: AuthenticatedUser, channelId: string, body: { baseUrl?: string; activationToken?: string; merchantId?: string; secret?: string; branchId?: string }) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const prev = (integration.config as any)?.indolj ?? {};
    const baseUrl = String(body.baseUrl || prev.baseUrl || 'https://console.indolj.io').trim().replace(/\/+$/, '');
    if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(baseUrl)) throw new BadRequestException('Indolj ka URL https:// wala hona chahiye');
    const activationToken = String(body.activationToken ?? prev.activationToken ?? '').trim();
    const merchantId = String(body.merchantId ?? prev.merchantId ?? '').trim();
    const secret = String(body.secret ?? '').trim() || (prev.secret ? decrypt(prev.secret) ?? '' : '');
    if (!activationToken || !secret) throw new BadRequestException('Activation token aur JWT secret key zaroori (Indolj team se milte hain)');
    const creds: IndoljCreds = { baseUrl, activationToken, merchantId, secret, branchId: String(body.branchId ?? prev.branchId ?? '').trim() || null };
    // Pehle check: menu aata hai?
    const products = await fetchIndoljMenu(creds).catch((e) => { throw new BadRequestException(e?.message ?? 'Indolj se menu nahi aaya'); });
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: integration.id }, select: { config: true } });
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { config: { ...((fresh.config as any) ?? {}), indolj: { baseUrl, activationToken, merchantId, branchId: creds.branchId, secret: encrypt(secret), connectedAt: prev.connectedAt ?? new Date().toISOString() } } as any },
    });
    this.cache.delete(integration.id);
    return { ok: true, items: products.length };
  }

  async disconnectIndolj(user: AuthenticatedUser, channelId: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const { indolj: _x, ...rest } = ((integration.config as any) ?? {});
    await this.prisma.integration.update({ where: { id: integration.id }, data: { config: rest as any } });
    this.cache.delete(integration.id);
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // WEBSITE KE PRODUCTS (live)
  // ═══════════════════════════════════════════════════════════

  async remoteProducts(integration: Integration, refresh = false): Promise<RemoteProduct[]> {
    const hit = this.cache.get(integration.id);
    if (!refresh && hit && Date.now() - hit.at < CACHE_MS) return hit.data;
    const kind = this.kind(integration);
    const data = kind === 'woocommerce' ? await this.wooProducts(integration)
      : kind === 'shopify' ? await this.shopifyProducts(integration)
        : kind === 'indolj' ? await fetchIndoljMenu(this.indoljCreds(integration)!)
          : [];
    this.cache.set(integration.id, { at: Date.now(), data });
    return data;
  }

  private async wooProducts(integration: Integration): Promise<RemoteProduct[]> {
    const client = this.woo.client(integration);
    if (!client) return [];
    const products = await client.all<any>('/products', {
      status: 'any',
      _fields: 'id,name,type,status,sku,price,regular_price,stock_quantity,manage_stock,images',
    }, 20);
    const out: RemoteProduct[] = [];
    for (const p of products) {
      const image = p.images?.[0]?.src ?? null;
      if (p.type === 'variable') {
        const vars = await client.all<any>(`/products/${p.id}/variations`, {
          _fields: 'id,sku,price,regular_price,stock_quantity,manage_stock,attributes,image',
        }, 3).catch(() => []);
        out.push({
          externalProductId: String(p.id), title: p.name, image, status: p.status, hasVariants: true,
          variants: vars.map((v: any) => ({
            externalVariantId: String(v.id),
            title: (v.attributes ?? []).map((a: any) => a.option).filter(Boolean).join(' / ') || `#${v.id}`,
            sku: v.sku || null,
            barcode: null,
            price: Number(v.regular_price || v.price || 0),
            stock: v.manage_stock ? Number(v.stock_quantity ?? 0) : null,
            image: v.image?.src ?? image,
          })),
        });
      } else {
        out.push({
          externalProductId: String(p.id), title: p.name, image, status: p.status, hasVariants: false,
          variants: [{
            externalVariantId: null, title: 'Default', sku: p.sku || null, barcode: null,
            price: Number(p.regular_price || p.price || 0),
            stock: p.manage_stock ? Number(p.stock_quantity ?? 0) : null, image,
          }],
        });
      }
    }
    return out;
  }

  private async shopifyProducts(integration: Integration): Promise<RemoteProduct[]> {
    const client = await this.shopify.client(integration);
    if (!client) return [];
    const products = await client.paginate<any>(`query($after: String) {
      products(first: 50, after: $after) {
        nodes {
          id title status
          featuredMedia { preview { image { url } } }
          variants(first: 100) { nodes { id title sku barcode price inventoryQuantity image { url } } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`, 'products', {}, 20);
    return products.map((p: any) => {
      const vars: any[] = p.variants?.nodes ?? [];
      const image = p.featuredMedia?.preview?.image?.url ?? null;
      const single = vars.length <= 1 && (vars[0]?.title === 'Default Title' || !vars[0]);
      return {
        externalProductId: numericId(p.id),
        title: p.title,
        image,
        status: String(p.status ?? '').toLowerCase(),
        hasVariants: !single,
        variants: vars.map((v) => ({
          externalVariantId: numericId(v.id),
          title: v.title === 'Default Title' ? 'Default' : v.title,
          sku: v.sku || null,
          barcode: v.barcode || null,
          price: Number(v.price ?? 0),
          stock: v.inventoryQuantity ?? null,
          image: v.image?.url ?? image,
        })),
      };
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CATALOG + LINKS — Products safhe ka data
  // ═══════════════════════════════════════════════════════════

  async catalog(user: AuthenticatedUser, channelId: string, refresh = false) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const kind = this.kind(integration);
    const cfg = readWebsiteConfig(integration.config);
    const shopId = cfg.shopId ?? integration.shopId;

    let remote: RemoteProduct[] = [];
    let remoteError: string | null = null;
    if (kind) {
      try {
        remote = await this.remoteProducts(integration, refresh);
      } catch (e: any) {
        remoteError = e?.message ?? 'Website ke products nahi aaye';
      }
    }

    // Purane test orders ne "TEST-…" link banaye the — wo asli nahi, saaf kar do
    await this.prisma.productChannelMapping.deleteMany({
      where: { integrationId: integration.id, externalProductId: { startsWith: 'TEST-' } },
    });

    const mappings = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: integration.id },
      include: {
        product: { select: { id: true, name: true, sku: true, price: true, isActive: true, images: { take: 1, select: { url: true } } } },
        variant: { select: { id: true, name: true, sku: true, price: true } },
      },
    });

    // Nafaa ka branch stock — jore hue items ke liye
    const stockRows = shopId && mappings.length
      ? await this.prisma.shopStock.findMany({
          where: { shopId, productId: { in: [...new Set(mappings.map((m) => m.productId))] } },
          select: { productId: true, variantId: true, stock: true },
        })
      : [];
    const stockOf = (productId: string, variantId: string | null) =>
      Number(stockRows.find((r) => r.productId === productId && (r.variantId ?? null) === (variantId ?? null))?.stock ?? 0);

    // Salah ke liye Nafaa ke SKU/barcode/naam
    const allSkus = remote.flatMap((p) => p.variants.flatMap((v) => [v.sku, v.barcode])).filter(Boolean) as string[];
    const [skuProducts, skuVariants, nameProducts] = await Promise.all([
      allSkus.length
        ? this.prisma.product.findMany({
            where: { tenantId: user.tenantId, isActive: true, OR: [{ sku: { in: allSkus } }, { barcode: { in: allSkus } }] },
            select: { id: true, name: true, sku: true, barcode: true, hasVariants: true },
          })
        : [],
      allSkus.length
        ? this.prisma.productVariant.findMany({
            where: { isActive: true, product: { tenantId: user.tenantId, isActive: true }, OR: [{ sku: { in: allSkus } }, { barcode: { in: allSkus } }] },
            select: { id: true, name: true, sku: true, barcode: true, product: { select: { id: true, name: true } } },
          })
        : [],
      remote.length
        ? this.prisma.product.findMany({
            where: { tenantId: user.tenantId, isActive: true, name: { in: [...new Set(remote.map((p) => p.title))], mode: 'insensitive' } },
            select: { id: true, name: true, hasVariants: true },
          })
        : [],
    ]);

    const findLink = (p: RemoteProduct, v: RemoteVariant) =>
      mappings.find((m) => v.externalVariantId
        ? m.externalVariantId === v.externalVariantId
        : m.externalProductId === p.externalProductId && !m.externalVariantId);

    let linked = 0;
    let suggested = 0;
    let unlinked = 0;
    const usedMappingIds = new Set<string>();

    const rows = remote.map((p) => ({
      ...p,
      variants: p.variants.map((v) => {
        const m = findLink(p, v);
        if (m) {
          usedMappingIds.add(m.id);
          linked++;
          return {
            ...v,
            link: {
              mappingId: m.id,
              productId: m.productId,
              variantId: m.variantId,
              name: m.product?.name ?? '—',
              variantName: m.variant?.name ?? null,
              sku: m.variant?.sku ?? m.product?.sku ?? null,
              price: Number(m.variant?.price ?? m.product?.price ?? 0),
              stock: stockOf(m.productId, m.variantId),
              image: m.product?.images?.[0]?.url ?? null,
              inactive: m.product ? !m.product.isActive : true,
            },
            suggestion: null,
          };
        }
        // Salah: variant SKU → product SKU → bilkul same naam (simple product)
        const key = [v.sku, v.barcode].filter(Boolean) as string[];
        const sv = skuVariants.find((x) => key.includes(x.sku ?? '') || key.includes(x.barcode ?? ''));
        const sp = !sv ? skuProducts.find((x) => !x.hasVariants && (key.includes(x.sku ?? '') || key.includes(x.barcode ?? ''))) : undefined;
        const np = !sv && !sp && !p.hasVariants
          ? nameProducts.filter((x) => !x.hasVariants && x.name.toLowerCase() === p.title.toLowerCase())
          : [];
        const suggestion = sv
          ? { productId: sv.product.id, variantId: sv.id, name: sv.product.name, variantName: sv.name, reason: 'sku' as const }
          : sp
            ? { productId: sp.id, variantId: null, name: sp.name, variantName: null, reason: 'sku' as const }
            : np.length === 1
              ? { productId: np[0].id, variantId: null, name: np[0].name, variantName: null, reason: 'name' as const }
              : null;
        if (suggestion) suggested++;
        else unlinked++;
        return { ...v, link: null, suggestion };
      }),
    }));

    // Jo link website par ab nahi mila (product delete ho gaya) — alag dikhao
    const orphans = mappings
      .filter((m) => !usedMappingIds.has(m.id) && remote.length > 0)
      .map((m) => ({
        mappingId: m.id,
        externalProductId: m.externalProductId,
        externalVariantId: m.externalVariantId,
        externalTitle: m.externalTitle ?? m.externalSku ?? m.externalProductId,
        name: m.product?.name ?? '—',
        variantName: m.variant?.name ?? null,
      }));

    const nafaaUnlisted = await this.prisma.product.count({
      where: { tenantId: user.tenantId, isActive: true, channelMappings: { none: { integrationId: integration.id } } },
    });

    return {
      kind,
      canFetch: !!kind,
      remoteError,
      fetchedAt: new Date().toISOString(),
      stats: { products: remote.length, variants: linked + suggested + unlinked, linked, suggested, unlinked, nafaaUnlisted, orphans: orphans.length },
      products: rows,
      orphans,
      // Custom website: website ke products hum nahi dekh sakte — sirf bane hue links
      links: kind ? [] : mappings.map((m) => ({
        mappingId: m.id, externalProductId: m.externalProductId, externalVariantId: m.externalVariantId, externalSku: m.externalSku,
        externalTitle: m.externalTitle, name: m.product?.name ?? '—', variantName: m.variant?.name ?? null,
        stock: stockOf(m.productId, m.variantId),
      })),
    };
  }

  /** Nafaa ke products jo is channel par abhi nahi (website par bhejne ke liye) */
  async nafaaUnlisted(user: AuthenticatedUser, channelId: string, search?: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readWebsiteConfig(integration.config);
    const shopId = cfg.shopId ?? integration.shopId;
    const items = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        channelMappings: { none: { integrationId: integration.id } },
        ...(search?.trim() && {
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { sku: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true, name: true, sku: true, price: true, hasVariants: true,
        images: { take: 1, select: { url: true } },
        category: { select: { name: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, sku: true, price: true } },
        ...(shopId && { shopStocks: { where: { shopId }, select: { variantId: true, stock: true } } }),
      },
    });
    return items.map((p: any) => ({
      id: p.id, name: p.name, sku: p.sku, price: Number(p.price), image: p.images?.[0]?.url ?? null,
      category: p.category?.name ?? null,
      variants: p.variants.map((v: any) => ({ id: v.id, name: v.name, sku: v.sku, price: Number(v.price) })),
      stock: (p.shopStocks ?? []).reduce((s: number, r: any) => s + Number(r.stock ?? 0), 0),
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // JORNA / HATANA
  // ═══════════════════════════════════════════════════════════

  async saveLinks(user: AuthenticatedUser, channelId: string, links: Array<{
    externalProductId: string; externalVariantId?: string | null; productId: string; variantId?: string | null;
    externalTitle?: string | null; externalImage?: string | null; externalSku?: string | null;
  }>) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    if (!Array.isArray(links) || !links.length) throw new BadRequestException('Kuch chuna nahi');

    // Sirf apni dukaan ke products/variants
    const productIds = [...new Set(links.map((l) => l.productId))];
    const variantIds = [...new Set(links.map((l) => l.variantId).filter(Boolean))] as string[];
    const [okProducts, okVariants] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true, hasVariants: true } }),
      variantIds.length
        ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds }, product: { tenantId: user.tenantId } }, select: { id: true, productId: true } })
        : [],
    ]);

    let saved = 0;
    const errors: string[] = [];
    for (const l of links.slice(0, 500)) {
      const p = okProducts.find((x) => x.id === l.productId);
      if (!p) { errors.push(`${l.externalTitle ?? l.externalProductId}: Nafaa product nahi mila`); continue; }
      if (l.variantId && !okVariants.find((v) => v.id === l.variantId && v.productId === l.productId)) {
        errors.push(`${l.externalTitle ?? l.externalProductId}: variant is product ka nahi`); continue;
      }
      const externalVariantId = l.externalVariantId || null;
      // Ek website variant ek hi Nafaa cheez se — purana link (agar kisi aur se tha) hatao
      await this.prisma.productChannelMapping.deleteMany({
        where: {
          integrationId: integration.id,
          ...(externalVariantId
            ? { externalVariantId }
            : { externalProductId: String(l.externalProductId), externalVariantId: null }),
          NOT: { linkKey: mappingKey(l.productId, l.variantId) },
        },
      });
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_linkKey: { integrationId: integration.id, linkKey: mappingKey(l.productId, l.variantId) } },
        create: {
          integrationId: integration.id, linkKey: mappingKey(l.productId, l.variantId),
          productId: l.productId, variantId: l.variantId || null,
          externalProductId: String(l.externalProductId), externalVariantId,
          externalSku: l.externalSku ?? null, externalTitle: l.externalTitle?.slice(0, 250) ?? null, externalImage: l.externalImage ?? null,
          syncStatus: 'SUCCESS', lastSyncedAt: new Date(),
        },
        update: {
          externalProductId: String(l.externalProductId), externalVariantId,
          externalSku: l.externalSku ?? null, externalTitle: l.externalTitle?.slice(0, 250) ?? null, externalImage: l.externalImage ?? null,
          syncStatus: 'SUCCESS', lastSyncedAt: new Date(),
        },
      });
      saved++;
    }
    return { saved, errors };
  }

  async removeLink(user: AuthenticatedUser, channelId: string, mappingId: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    await this.prisma.productChannelMapping.deleteMany({ where: { id: mappingId, integrationId: integration.id } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // WEBSITE → NAFAA (chune hue, variants ke saath)
  // ═══════════════════════════════════════════════════════════

  async importSelected(user: AuthenticatedUser, channelId: string, externalProductIds: string[]) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const cfg = readWebsiteConfig(integration.config);
    const shopId = cfg.shopId ?? integration.shopId;
    const remote = await this.remoteProducts(integration);
    const pick = remote.filter((p) => externalProductIds.includes(p.externalProductId)).slice(0, 200);
    if (!pick.length) throw new BadRequestException('Koi product nahi chuna');

    let created = 0;
    let linkedExisting = 0;
    const errors: string[] = [];

    for (const p of pick) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const firstSku = p.variants[0]?.sku ?? null;
          // SKU pehle se Nafaa me ho to naya mat banao — jor do
          const existing = !p.hasVariants && firstSku
            ? await tx.product.findFirst({ where: { tenantId: user.tenantId, OR: [{ sku: firstSku }, { barcode: firstSku }] }, select: { id: true } })
            : null;

          if (existing) {
            await this.linkTx(tx, integration.id, existing.id, null, p, p.variants[0]);
            linkedExisting++;
            return;
          }

          const product = await tx.product.create({
            data: {
              tenantId: user.tenantId,
              name: p.title.slice(0, 250),
              sku: p.hasVariants ? null : firstSku,
              barcode: p.hasVariants ? null : p.variants[0]?.barcode ?? null,
              price: Number(p.variants[0]?.price ?? 0),
              costPrice: 0,
              hasVariants: p.hasVariants,
              isActive: true,
              description: `${integration.displayName} se aaya`,
            },
            select: { id: true },
          });
          if (p.image) {
            await tx.productImage.create({ data: { productId: product.id, url: p.image, sortOrder: 0, isPrimary: true } }).catch(() => null);
          }

          if (!p.hasVariants) {
            const v = p.variants[0];
            if (shopId) {
              await applyStockDelta({
                tx, tenantId: user.tenantId, shopId, productId: product.id, delta: Math.max(0, Number(v?.stock ?? 0)),
                movementType: 'OPENING_BALANCE', reference: 'WEBSITE-IMPORT', note: `${integration.displayName} se import`,
              });
            }
            await this.linkTx(tx, integration.id, product.id, null, p, v);
          } else {
            let order = 0;
            for (const v of p.variants) {
              const variant = await tx.productVariant.create({
                data: {
                  productId: product.id, name: v.title.slice(0, 120), sku: v.sku, barcode: v.barcode,
                  price: v.price, costPrice: 0, sortOrder: order++, imageUrl: v.image, isActive: true,
                },
                select: { id: true },
              });
              if (shopId) {
                await applyStockDelta({
                  tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: variant.id,
                  delta: Math.max(0, Number(v.stock ?? 0)), movementType: 'OPENING_BALANCE',
                  reference: 'WEBSITE-IMPORT', note: `${integration.displayName} se import`,
                });
              }
              await this.linkTx(tx, integration.id, product.id, variant.id, p, v);
            }
          }
          created++;
        });
      } catch (e: any) {
        if (errors.length < 20) errors.push(`${p.title}: ${e?.message ?? 'Error'}`);
      }
    }
    return { created, linkedExisting, failed: errors.length, errors };
  }

  private async linkTx(tx: any, integrationId: string, productId: string, variantId: string | null, p: RemoteProduct, v?: RemoteVariant) {
    const key = mappingKey(productId, variantId);
    await tx.productChannelMapping.upsert({
      where: { integrationId_linkKey: { integrationId, linkKey: key } },
      create: {
        integrationId, linkKey: key, productId, variantId,
        externalProductId: p.externalProductId, externalVariantId: v?.externalVariantId ?? null,
        externalSku: v?.sku ?? null, externalTitle: v && p.hasVariants ? `${p.title} — ${v.title}` : p.title,
        externalImage: v?.image ?? p.image, syncStatus: 'SUCCESS', lastSyncedAt: new Date(),
      },
      update: {
        externalProductId: p.externalProductId, externalVariantId: v?.externalVariantId ?? null,
        externalSku: v?.sku ?? null, syncStatus: 'SUCCESS', lastSyncedAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // NAFAA → WEBSITE (chune hue)
  // ═══════════════════════════════════════════════════════════

  async exportSelected(user: AuthenticatedUser, channelId: string, productIds: string[]) {
    const integration = await this.setup.requireChannel(user.tenantId, channelId);
    const kind = this.kind(integration);
    if (!kind) throw new BadRequestException('Is website par seedha nahi bhej sakte — CSV istemal karein');
    if (kind === 'indolj') throw new BadRequestException('Indolj par menu Indolj ke panel se banta hai — Nafaa se wahan product nahi bhej sakte');
    if (!productIds?.length) throw new BadRequestException('Koi product nahi chuna');
    const res = kind === 'woocommerce'
      ? await this.woo.exportToWoo(user, channelId, { productIds })
      : await this.shopify.exportToShopify(user, channelId, { productIds });
    this.cache.delete(integration.id);
    return res;
  }
}
