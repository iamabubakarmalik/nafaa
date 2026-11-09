/**
 * Creates tenant products from ready-made catalog rows (Quick Setup and the
 * product library). Brands, categories and tags are created on first use,
 * every active branch gets a ShopStock row, and the opening stock lands in
 * one branch as an OPENING_BALANCE movement.
 *
 * One importer keeps its caches across calls to `run`, so a large import can
 * be fed in chunks without reloading the tenant's names and barcodes. Rows
 * whose name is already a product are skipped, which makes a repeat import
 * safe. A barcode another product already uses is dropped from the new
 * product, never moved.
 */

import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { applyStockDelta, roundStock } from '../../../common/shop-scope';
import { ean13CheckDigit } from '../barcode-labels/barcode.helper';

export interface CatalogImportRow {
  /** Catalog id, passed back to `afterCreate`. */
  key: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  categoryColor?: string | null;
  tags?: string[];
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  barcode?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  /** Opening stock in the target branch; 0 when empty. */
  stock?: number;
}

export interface CatalogImportOptions {
  /** Branch for the opening stock; the main shop when empty or not found. */
  shopId?: string | null;
  /** Give rows without a barcode an in-store EAN-13 (starts with 2). */
  generateBarcodes?: boolean;
  /** Runs in the product's transaction right after it is created. */
  afterCreate?: (tx: Prisma.TransactionClient, productId: string, row: CatalogImportRow) => Promise<void>;
  /** Note on the opening stock movement. */
  stockNote?: string;
}

export interface CatalogImportTally {
  created: number;
  skipped: number;
  brandsCreated: number;
  categoriesCreated: number;
  tagsCreated: number;
  /** Rows whose barcode another product already had; the product was made without it. */
  barcodeDuplicates: number;
  barcodesGenerated: number;
  errors: Array<{ name: string; error: string }>;
}

const lower = (s: string) => s.toLowerCase().trim();
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
const suffix = () => Math.random().toString(36).slice(2, 6);

/** Products are written in transactions of this many rows. */
const TX_BATCH = 20;

export class CatalogImporter {
  private readonly logger = new Logger(CatalogImporter.name);
  private ready: Promise<void> | null = null;
  private shopId: string | null = null;
  private shops: Array<{ id: string; isMain: boolean }> = [];
  private readonly brands = new Map<string, string>();
  private readonly categories = new Map<string, string>();
  private readonly tags = new Map<string, string>();
  private readonly names = new Set<string>();
  private readonly barcodes = new Set<string>();
  private barcodeSeq = 0;
  private barcodeStem = `2${Date.now().toString().slice(-6)}`;

  readonly tally: CatalogImportTally = {
    created: 0, skipped: 0, brandsCreated: 0, categoriesCreated: 0, tagsCreated: 0,
    barcodeDuplicates: 0, barcodesGenerated: 0, errors: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantId: string,
    private readonly userId: string | null,
    private readonly opts: CatalogImportOptions = {},
  ) {}

  /** Whether a product with this name already exists (or was made by this importer). */
  async hasName(name: string) {
    await this.load();
    return this.names.has(lower(name));
  }

  /** Branch the opening stock goes to. */
  async targetShopId() {
    await this.load();
    return this.shopId;
  }

  /** Creates the rows that are not products yet. Returns what this call added to the tally. */
  async run(rows: CatalogImportRow[]): Promise<CatalogImportTally> {
    await this.load();
    const before = { ...this.tally, errors: this.tally.errors.length };
    const fresh: CatalogImportRow[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const k = lower(r.name);
      if (!k || this.names.has(k) || seen.has(k)) { this.tally.skipped++; continue; }
      seen.add(k);
      fresh.push(r);
    }
    if (fresh.length) {
      await this.ensureLookups(fresh);
      for (let i = 0; i < fresh.length; i += TX_BATCH) await this.writeBatch(fresh.slice(i, i + TX_BATCH));
    }
    return {
      created: this.tally.created - before.created,
      skipped: this.tally.skipped - before.skipped,
      brandsCreated: this.tally.brandsCreated - before.brandsCreated,
      categoriesCreated: this.tally.categoriesCreated - before.categoriesCreated,
      tagsCreated: this.tally.tagsCreated - before.tagsCreated,
      barcodeDuplicates: this.tally.barcodeDuplicates - before.barcodeDuplicates,
      barcodesGenerated: this.tally.barcodesGenerated - before.barcodesGenerated,
      errors: this.tally.errors.slice(before.errors),
    };
  }

  private load() {
    this.ready ??= this.loadOnce();
    return this.ready;
  }

  private async loadOnce() {
    const tenantId = this.tenantId;
    const [shops, brands, categories, tags, products, variants] = await Promise.all([
      this.prisma.shop.findMany({ where: { tenantId, isActive: true }, select: { id: true, isMain: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.tag.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.product.findMany({ where: { tenantId }, select: { name: true, barcode: true } }),
      this.prisma.productVariant.findMany({ where: { product: { tenantId }, barcode: { not: null } }, select: { barcode: true } }),
    ]);
    this.shops = shops.map((s) => ({ id: s.id, isMain: s.isMain }));
    const wanted = this.opts.shopId ? shops.find((s) => s.id === this.opts.shopId) : undefined;
    this.shopId = (wanted ?? shops.find((s) => s.isMain) ?? shops[0])?.id ?? null;
    for (const b of brands) this.brands.set(lower(b.name), b.id);
    for (const c of categories) this.categories.set(lower(c.name), c.id);
    for (const t of tags) this.tags.set(lower(t.name), t.id);
    for (const p of products) {
      this.names.add(lower(p.name));
      if (p.barcode) this.barcodes.add(p.barcode.trim());
    }
    for (const v of variants) if (v.barcode) this.barcodes.add(v.barcode.trim());
  }

  /** Brands, categories and tags the rows need, created once each. */
  private async ensureLookups(rows: CatalogImportRow[]) {
    const tenantId = this.tenantId;
    const brandNames = new Map<string, string>();
    const catNames = new Map<string, string | null>();
    const tagNames = new Map<string, string>();
    for (const r of rows) {
      if (r.brand?.trim() && !this.brands.has(lower(r.brand))) brandNames.set(lower(r.brand), r.brand.trim());
      if (r.category?.trim() && !this.categories.has(lower(r.category))) catNames.set(lower(r.category), r.categoryColor ?? null);
      for (const t of r.tags ?? []) if (t.trim() && !this.tags.has(lower(t))) tagNames.set(lower(t), t.trim());
    }
    for (const [key, name] of brandNames) {
      try {
        const b = await this.prisma.brand.create({ data: { tenantId, name, slug: `${slugOf(name)}-${suffix()}` } });
        this.brands.set(key, b.id);
        this.tally.brandsCreated++;
      } catch (e: any) {
        this.logger.warn(`Brand ${name} failed: ${e?.message}`);
      }
    }
    for (const [key, color] of catNames) {
      const name = rows.find((r) => r.category && lower(r.category) === key)!.category!.trim();
      try {
        const c = await this.prisma.category.create({ data: { tenantId, name, color: color ?? '#64748b' } });
        this.categories.set(key, c.id);
        this.tally.categoriesCreated++;
      } catch (e: any) {
        this.logger.warn(`Category ${name} failed: ${e?.message}`);
      }
    }
    for (const [key, name] of tagNames) {
      try {
        const t = await this.prisma.tag.create({ data: { tenantId, name, color: '#16a34a' } });
        this.tags.set(key, t.id);
        this.tally.tagsCreated++;
      } catch {
        // A tag is a nicety; the product is still created without it.
      }
    }
  }

  /** Next in-store EAN-13 no product of the tenant uses yet. */
  private nextBarcode() {
    for (;;) {
      if (this.barcodeSeq > 99_999) {
        this.barcodeSeq = 0;
        this.barcodeStem = `2${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
      }
      const body = `${this.barcodeStem}${(this.barcodeSeq++).toString().padStart(5, '0')}`;
      const code = body + ean13CheckDigit(body);
      if (!this.barcodes.has(code)) return code;
    }
  }

  private pickBarcode(row: CatalogImportRow): string | null {
    const given = row.barcode?.trim();
    if (given) {
      if (!this.barcodes.has(given)) return given;
      this.tally.barcodeDuplicates++;
    }
    if (!this.opts.generateBarcodes) return null;
    this.tally.barcodesGenerated++;
    return this.nextBarcode();
  }

  private async writeBatch(batch: CatalogImportRow[]) {
    const tenantId = this.tenantId;
    const made: Array<{ name: string; barcode: string | null }> = [];
    const tallyBefore = { dup: this.tally.barcodeDuplicates, gen: this.tally.barcodesGenerated };
    try {
      await this.prisma.$transaction(async (tx) => {
        made.length = 0;
        this.tally.barcodeDuplicates = tallyBefore.dup;
        this.tally.barcodesGenerated = tallyBefore.gen;
        const pending = new Set<string>();
        for (const row of batch) {
          let barcode = this.pickBarcode(row);
          if (barcode && pending.has(barcode)) { barcode = null; this.tally.barcodeDuplicates++; }
          if (barcode) pending.add(barcode);
          const created = await tx.product.create({
            data: {
              tenantId,
              name: row.name.trim(),
              slug: `${slugOf(row.name)}-${suffix()}`,
              brandId: row.brand ? this.brands.get(lower(row.brand)) : undefined,
              categoryId: row.category ? this.categories.get(lower(row.category)) : undefined,
              unit: row.unit || 'pcs',
              price: row.price,
              costPrice: row.costPrice,
              wholesalePrice: row.wholesalePrice ?? null,
              stock: 0,
              lowStockAlert: 5,
              barcode,
              description: row.description ?? undefined,
              weight: row.weight ?? undefined,
              weightUnit: row.weightUnit ?? undefined,
              isActive: true,
              isFeatured: false,
            },
            select: { id: true },
          });
          const tagIds = (row.tags ?? []).map((t) => this.tags.get(lower(t))).filter(Boolean) as string[];
          if (tagIds.length) {
            await tx.productTag.createMany({ data: tagIds.map((tagId) => ({ productId: created.id, tagId })), skipDuplicates: true });
          }
          if (row.imageUrl) {
            await tx.productImage.create({ data: { productId: created.id, url: row.imageUrl, isPrimary: true, sortOrder: 0 } });
          }
          if (this.shops.length) {
            await tx.shopStock.createMany({
              data: this.shops.map((s) => ({ tenantId, shopId: s.id, productId: created.id, variantId: null, stock: 0, isActive: true, lowStockAlert: 5 })),
              skipDuplicates: true,
            });
          }
          const stock = roundStock(Number(row.stock ?? 0));
          if (stock > 0 && this.shopId) {
            await applyStockDelta({
              tx, tenantId, shopId: this.shopId, productId: created.id, delta: stock,
              movementType: 'OPENING_BALANCE', reference: 'OPENING', note: this.opts.stockNote ?? 'Library opening stock', userId: this.userId,
            });
          }
          if (this.opts.afterCreate) await this.opts.afterCreate(tx, created.id, row);
          made.push({ name: row.name, barcode });
        }
      }, { timeout: 60_000 });
    } catch (e: any) {
      // One bad row rolls back its batch; retry the rows one at a time so the rest still land.
      this.tally.barcodeDuplicates = tallyBefore.dup;
      this.tally.barcodesGenerated = tallyBefore.gen;
      if (batch.length > 1) {
        for (const row of batch) await this.writeBatch([row]);
        return;
      }
      this.tally.errors.push({ name: batch[0].name, error: e?.message ?? String(e) });
      this.logger.warn(`Catalog import ${batch[0].name} failed: ${e?.message}`);
      return;
    }
    for (const m of made) {
      this.names.add(lower(m.name));
      if (m.barcode) this.barcodes.add(m.barcode);
    }
    this.tally.created += made.length;
  }
}
