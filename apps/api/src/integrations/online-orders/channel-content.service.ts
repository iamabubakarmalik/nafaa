import { Injectable } from '@nestjs/common';
import { Integration } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { readWebsiteConfig, PushContent } from './website-config';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { numericId } from './shopify.client';
import { friendlySyncError, markLinks } from './link-sync';
import { mappingKey } from './mapping-key';

export interface ContentResult {
  sent: number;
  failed: number;
  addedSizes: number;
  errors: string[];
  /** Set when the channel cannot take this kind of push */
  note: string | null;
}

/** Daraz needs category attributes for content; only stock and price go there for now. */
export const DARAZ_CONTENT_NOTE = 'Daraz par title/tasveer/description bhejna Coming soon — Stock aur Price ja rahe hain';

type NafaaProduct = {
  id: string; name: string; description: string | null; weight: number | null; weightUnit: string | null; barcode: string | null; sku: string | null; price: number;
  images: { url: string }[];
  variants: { id: string; name: string; sku: string | null; barcode: string | null; weight: number | null; price: number; size: string | null; color: string | null }[];
};

type Link = { id: string; productId: string; variantId: string | null; externalProductId: string | null; externalVariantId: string | null; listed: boolean };

const SHOPIFY_WEIGHT: Record<string, string> = { g: 'GRAMS', gm: 'GRAMS', gram: 'GRAMS', grams: 'GRAMS', lb: 'POUNDS', lbs: 'POUNDS', oz: 'OUNCES' };

const html = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');

/**
 * Nafaa → channel content: title, description, images, SKU/barcode, weight,
 * listed (active/draft), and sizes made in Nafaa that the channel does not
 * have yet. Prices and sale prices go with the price push; stock with the
 * stock push.
 */
@Injectable()
export class ChannelContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
  ) {}

  /** Content and listed status for these products on one channel. */
  async push(i: Integration, productIds: string[], only?: { statusOnly?: boolean }): Promise<ContentResult> {
    const out: ContentResult = { sent: 0, failed: 0, addedSizes: 0, errors: [], note: null };
    if (i.type === 'DARAZ') {
      // Unlisted on Daraz = stock 0, done by the stock push.
      out.note = only?.statusOnly ? null : DARAZ_CONTENT_NOTE;
      return out;
    }
    if (i.type !== 'SHOPIFY' && i.type !== 'WOOCOMMERCE') return out;
    const links = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, productId: { in: productIds }, externalProductId: { not: null } },
      select: { id: true, productId: true, variantId: true, externalProductId: true, externalVariantId: true, listed: true },
    });
    if (!links.length) return out;
    const products = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(links.map((l) => l.productId))] }, tenantId: i.tenantId },
      select: {
        id: true, name: true, description: true, weight: true, weightUnit: true, barcode: true, sku: true, price: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 6, select: { url: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, sku: true, barcode: true, weight: true, price: true, size: true, color: true } },
      },
    });
    const cfg = readWebsiteConfig(i.config);
    const fields: PushContent = only?.statusOnly
      ? { title: false, description: false, images: false, compareAt: false, sku: false, weight: false }
      : cfg.pushContent;

    // One channel listing at a time; a product can sit on more than one listing.
    const groups = new Map<string, Link[]>();
    for (const l of links) groups.set(String(l.externalProductId), [...(groups.get(String(l.externalProductId)) ?? []), l]);
    for (const [externalProductId, group] of groups) {
      const p = products.find((x) => x.id === group[0].productId) as NafaaProduct | undefined;
      if (!p) continue;
      const what = only?.statusOnly ? (['status'] as const) : (['content', 'status'] as const);
      try {
        const added = i.type === 'SHOPIFY'
          ? await this.shopifyProduct(i, externalProductId, p, group, fields, !only?.statusOnly)
          : await this.wooProduct(i, externalProductId, p, group, fields, !only?.statusOnly);
        out.addedSizes += added;
        out.sent++;
        await markLinks(this.prisma, i.id, { id: { in: group.map((l) => l.id) } }, true, undefined, [...what]);
      } catch (e) {
        out.failed++;
        if (out.errors.length < 20) out.errors.push(`${p.name}: ${friendlySyncError(e)}`);
        await markLinks(this.prisma, i.id, { id: { in: group.map((l) => l.id) } }, false, e, [...what]);
      }
    }
    return out;
  }

  // ─────────────────────────── Shopify ───────────────────────────

  private async shopifyProduct(i: Integration, externalProductId: string, p: NafaaProduct, group: Link[], f: PushContent, addSizes: boolean) {
    if (this.shopify.planBlocked(i)) throw new Error('Pehle Shopify me Nafaa ka plan chunein');
    const client = await this.shopify.client(i);
    if (!client) throw new Error('Shopify jura nahi — pehle "Shopify se jorein" dabayein');
    const pid = `gid://shopify/Product/${externalProductId}`;
    const info = await client.graphql<any>(`query($id: ID!) { product(id: $id) { id mediaCount { count } options { name } variants(first: 250) { nodes { id } } } }`, { id: pid });
    if (!info?.product) throw new Error('Ye product Shopify par nahi mila — dobara jorein');

    const listed = group.some((l) => l.listed);
    const product: Record<string, unknown> = { id: pid, status: listed ? 'ACTIVE' : 'DRAFT' };
    if (f.title) product.title = p.name;
    if (f.description && p.description) product.descriptionHtml = html(p.description);
    const media = f.images && !Number(info.product.mediaCount?.count) && p.images.length
      ? p.images.slice(0, 6).map((im) => ({ originalSource: im.url, mediaContentType: 'IMAGE' }))
      : undefined;
    await client.mutate(`mutation($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
      productUpdate(product: $product, media: $media) { product { id } userErrors { field message } }
    }`, { product, media }, 'productUpdate');

    // Size-level fields
    const weightOf = (w: number | null | undefined) => (w && w > 0 ? { weight: { value: w, unit: SHOPIFY_WEIGHT[String(p.weightUnit ?? '').toLowerCase()] ?? 'KILOGRAMS' } } : null);
    const updates = group.filter((l) => l.externalVariantId).map((l) => {
      const v = l.variantId ? p.variants.find((x) => x.id === l.variantId) : null;
      const sku = v ? v.sku : p.sku;
      const barcode = v ? v.barcode : p.barcode;
      const weight = weightOf(v?.weight ?? p.weight);
      const inventoryItem: Record<string, unknown> = {};
      if (f.sku && sku) inventoryItem.sku = sku;
      if (f.weight && weight) inventoryItem.measurement = weight;
      return { id: `gid://shopify/ProductVariant/${l.externalVariantId}`, ...(f.sku && barcode ? { barcode } : {}), ...(Object.keys(inventoryItem).length ? { inventoryItem } : {}) };
    }).filter((u) => Object.keys(u).length > 1);
    if (updates.length) {
      await client.mutate(`mutation($pid: ID!, $v: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $pid, variants: $v) { productVariants { id } userErrors { field message } }
      }`, { pid, v: updates }, 'productVariantsBulkUpdate');
    }

    // Sizes made in Nafaa after the listing: added under the listing's single option.
    if (!addSizes || !p.variants.length) return 0;
    const linked = new Set(group.map((l) => l.variantId).filter(Boolean));
    const missing = p.variants.filter((v) => !linked.has(v.id));
    const options: string[] = (info.product.options ?? []).map((o: any) => o.name);
    if (!missing.length || options.length !== 1 || options[0] === 'Title') return 0;
    const made = await client.mutate<any>(`mutation($pid: ID!, $v: [ProductVariantsBulkCreateInput!]!) {
      productVariantsBulkCreate(productId: $pid, variants: $v) { productVariants { id sku title } userErrors { field message } }
    }`, {
      pid,
      v: missing.map((v) => ({ optionValues: [{ optionName: options[0], name: v.name }], price: String(v.price), inventoryItem: { tracked: true, ...(v.sku ? { sku: v.sku } : {}) } })),
    }, 'productVariantsBulkCreate');
    let added = 0;
    for (const v of missing) {
      const sv = (made?.productVariants ?? []).find((x: any) => (v.sku && x.sku === v.sku) || x.title === v.name);
      if (!sv) continue;
      await this.saveLink(i.id, p, v, externalProductId, numericId(sv.id), v.sku);
      added++;
    }
    return added;
  }

  // ─────────────────────────── WooCommerce ───────────────────────────

  private async wooProduct(i: Integration, externalProductId: string, p: NafaaProduct, group: Link[], f: PushContent, addSizes: boolean) {
    const client = this.woo.client(i);
    if (!client) throw new Error('WooCommerce jura nahi — pehle connect karein');
    const listed = group.some((l) => l.listed);
    const simple = group.every((l) => !l.externalVariantId);
    const body: Record<string, unknown> = { status: listed ? 'publish' : 'draft' };
    if (f.title) body.name = p.name;
    if (f.description && p.description) body.description = html(p.description);
    if (f.images && p.images.length) body.images = p.images.slice(0, 6).map((im) => ({ src: im.url }));
    if (simple && f.sku && p.sku) body.sku = p.sku;
    if (simple && f.weight && p.weight) body.weight = String(p.weight);
    await client.request('PUT', `/products/${externalProductId}`, { body, timeoutMs: 60_000 });

    const vars = group.filter((l) => l.externalVariantId).map((l) => {
      const v = p.variants.find((x) => x.id === l.variantId);
      const u: Record<string, unknown> = { id: Number(l.externalVariantId) };
      if (f.sku && v?.sku) u.sku = v.sku;
      if (f.weight && (v?.weight ?? p.weight)) u.weight = String(v?.weight ?? p.weight);
      return u;
    }).filter((u) => Object.keys(u).length > 1);
    if (vars.length) await client.request('POST', `/products/${externalProductId}/variations/batch`, { body: { update: vars }, timeoutMs: 60_000 });

    if (!addSizes || simple || !p.variants.length) return 0;
    const linked = new Set(group.map((l) => l.variantId).filter(Boolean));
    const missing = p.variants.filter((v) => !linked.has(v.id));
    if (!missing.length) return 0;
    const parent = await client.request<any>('GET', `/products/${externalProductId}`, { query: { _fields: 'attributes' } });
    const attrs: any[] = parent?.attributes ?? [];
    const varAttrs = attrs.filter((a) => a.variation);
    if (varAttrs.length !== 1) return 0;
    const attr = varAttrs[0];
    // The new size names join the attribute first, then the variations are made.
    const options = [...new Set([...(attr.options ?? []), ...missing.map((v) => v.name)])];
    await client.request('PUT', `/products/${externalProductId}`, {
      body: { attributes: attrs.map((a) => (a === attr ? { ...a, options } : a)) },
      timeoutMs: 60_000,
    });
    const made = await client.request<any>('POST', `/products/${externalProductId}/variations/batch`, {
      body: {
        create: missing.map((v) => ({
          ...(v.sku ? { sku: v.sku } : {}), regular_price: String(v.price), manage_stock: true, stock_quantity: 0,
          attributes: [{ ...(attr.id ? { id: attr.id } : { name: attr.name }), option: v.name }],
        })),
      },
      timeoutMs: 60_000,
    });
    let added = 0;
    const created: any[] = made?.create ?? [];
    for (let k = 0; k < missing.length; k++) {
      if (!created[k]?.id) continue;
      await this.saveLink(i.id, p, missing[k], externalProductId, String(created[k].id), missing[k].sku);
      added++;
    }
    return added;
  }

  private async saveLink(integrationId: string, p: NafaaProduct, v: NafaaProduct['variants'][number], externalProductId: string, externalVariantId: string, sku: string | null) {
    const linkKey = mappingKey(p.id, v.id);
    await this.prisma.productChannelMapping.upsert({
      where: { integrationId_linkKey: { integrationId, linkKey } },
      create: {
        integrationId, linkKey, productId: p.id, variantId: v.id, externalProductId, externalVariantId, externalSku: sku,
        externalTitle: `${p.name} — ${v.name}`.slice(0, 250), syncStatus: 'SUCCESS', lastSyncedAt: new Date(),
        lastPush: { at: new Date().toISOString(), what: ['publish'], ok: true, error: null },
      },
      update: { externalProductId, externalVariantId, externalSku: sku },
    });
  }
}
