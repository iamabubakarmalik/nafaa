/**
 * Product import from Excel / CSV for every industry.
 *
 * Two modes:
 *  - New products: rows with the same name and a variant (size / colour)
 *    become one product with variants; a row may carry one pack (carton,
 *    dozen) and a batch / expiry for its opening stock. Names and codes
 *    already in the shop are skipped, unknown categories and brands are
 *    created. Products are made through the shared products, variants and
 *    pack services, so opening stock is booked as OPENING_BALANCE movements
 *    in the chosen branch.
 *  - Price update: rows are matched to a product, variant or pack by SKU or
 *    barcode (or by exact name when the row has no code) and only price and
 *    cost change.
 *
 * `check*` validates without writing (dry run). `run*` imports one chunk;
 * the first chunk opens a BulkImportJob and the last one closes it, so the
 * job keeps the totals, the failed rows and the price changes.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BulkJobType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ShopScope, addToBatch, assertShopAccess, resolveWriteShopId } from '../../../../common/shop-scope';
import { ProductUnitsService } from '../../../../industries/retail/product-units/product-units.service';
import { ProductVariantsService } from '../../product-variants/product-variants.service';
import { UpsertVariantDto } from '../../product-variants/dto/upsert-variant.dto';
import { ProductsService } from '../products.service';
import { ImportCheckDto, ImportRowDto, ImportRunDto } from './product-import.dto';
import { keyOf, packType, parsePriceRow, parseRow, type ParsedRow } from './import-values';

type CreateStatus = 'new' | 'skip' | 'error';
type PriceStatus = 'change' | 'same' | 'error';

export interface CreateRowCheck {
  row: number;
  name: string;
  status: CreateStatus;
  errors: string[];
  warnings: string[];
}

export interface PriceRowCheck {
  row: number;
  name: string;
  status: PriceStatus;
  errors: string[];
  warnings: string[];
  target?: { kind: 'product' | 'variant' | 'pack'; id: string; label: string };
  price?: { from: number; to: number };
  costPrice?: { from: number; to: number };
}

interface Group {
  key: string;
  rows: ParsedRow[];
  status: CreateStatus;
}

interface CatalogIndex {
  names: Map<string, { name: string; isActive: boolean }>;
  codes: Map<string, string>;
  categories: Map<string, string>;
  brands: Map<string, string>;
}

interface PriceTarget {
  kind: 'product' | 'variant' | 'pack';
  id: string;
  label: string;
  price: number;
  costPrice: number;
  hasVariants?: boolean;
}

interface PriceIndex {
  byCode: Map<string, PriceTarget[]>;
  byName: Map<string, PriceTarget[]>;
}

interface JobError { row: number; name: string; error: string }

const MAX_SAVED_ERRORS = 5000;
const MAX_SAVED_CHANGES = 10_000;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Short reason for a failed write; raw database errors are not shown. */
function writeError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  if (/Unique constraint/i.test(msg)) return 'Ye naam ya code pehle se kisi aur cheez par hai';
  if (msg && msg.length < 200 && !/prisma|invocation/i.test(msg)) return msg;
  return 'Save nahi hua — is line ko dobara check karein';
}

@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly variants: ProductVariantsService,
    private readonly units: ProductUnitsService,
  ) {}

  // ─── New products ─────────────────────────────────────────

  async checkCreate(user: AuthenticatedUser, scope: ShopScope, dto: ImportCheckDto) {
    const index = await this.catalogIndex(user.tenantId);
    const groups = this.analyse(dto.rows, index);
    const shop = await this.stockShop(user, scope, groups, dto.shopId);

    const ready = groups.filter((g) => g.status === 'new');
    const newCategories = new Set<string>();
    const newBrands = new Set<string>();
    let variants = 0;
    let packs = 0;
    let openingQty = 0;
    let stockCost = 0;
    let saleValue = 0;
    for (const g of ready) {
      const first = g.rows[0];
      if (first.category && !index.categories.has(keyOf(first.category))) newCategories.add(first.category);
      if (first.brand && !index.brands.has(keyOf(first.brand))) newBrands.add(first.brand);
      for (const r of g.rows) {
        variants += r.variants.length;
        if (r.pack) packs++;
        const qty = r.stock ?? 0;
        openingQty += qty;
        stockCost += qty * (r.costPrice ?? 0);
        saleValue += qty * (r.price ?? 0);
      }
    }

    const rows = this.rowChecks(groups);
    return {
      rows,
      shop,
      summary: {
        total: rows.length,
        ready: rows.filter((r) => r.status === 'new').length,
        skip: rows.filter((r) => r.status === 'skip').length,
        error: rows.filter((r) => r.status === 'error').length,
        products: ready.length,
        variants,
        packs,
        newCategories: [...newCategories],
        newBrands: [...newBrands],
        openingQty: r2(openingQty),
        stockCost: r2(stockCost),
        saleValue: r2(saleValue),
      },
    };
  }

  async runCreate(user: AuthenticatedUser, scope: ShopScope, dto: ImportRunDto) {
    const job = await this.openJob(user, 'PRODUCTS', dto);
    const index = await this.catalogIndex(user.tenantId);
    const groups = this.analyse(dto.rows, index);
    const shop = await this.stockShop(user, scope, groups, dto.shopId);

    const results: Array<CreateRowCheck & { productId?: string }> = [];
    for (const g of groups) {
      if (g.status !== 'new') {
        results.push(...this.rowChecks([g]));
        continue;
      }
      try {
        const { productId, warnings } = await this.createGroupWithRetry(user, scope, g, index, shop?.id ?? null);
        for (const r of g.rows) results.push({ row: r.row, name: r.name, status: 'new', errors: [], warnings: [...r.warnings, ...warnings], productId });
      } catch (e) {
        this.logger.warn(`Import row ${g.rows[0].row} failed: ${(e as Error)?.message}`);
        const reason = writeError(e);
        for (const r of g.rows) results.push({ row: r.row, name: r.name, status: 'error', errors: [reason], warnings: r.warnings });
      }
    }
    results.sort((a, b) => a.row - b.row);

    const tally = {
      success: results.filter((r) => r.status === 'new').length,
      skip: results.filter((r) => r.status === 'skip').length,
      error: results.filter((r) => r.status === 'error').length,
    };
    const errors: JobError[] = results
      .filter((r) => r.status !== 'new')
      .map((r) => ({ row: r.row, name: r.name, error: (r.status === 'skip' ? r.warnings : r.errors).join(' · ') }));
    const saved = await this.closeChunk(job, dto, tally, errors);
    return { jobId: job.id, job: saved, shop, results };
  }

  /**
   * Rows grouped into products and judged against the shop's catalogue and
   * the rest of the file. A group is imported whole or not at all.
   */
  private analyse(input: ImportRowDto[], index: CatalogIndex): Group[] {
    const groups = new Map<string, Group>();
    const order: Group[] = [];
    const seenCodes = new Map<string, number>();

    for (const raw of input) {
      const r = parseRow(raw);
      let key = r.name ? keyOf(r.name) : `#${r.row}`;
      // A repeated name joins its product only as another variant; any other
      // repeat stands alone with an error, so the first line still imports.
      const first = groups.get(key)?.rows[0];
      if (first && !index.names.has(key) && (!first.variants.length || !r.variants.length)) {
        r.errors.push(first.variants.length
          ? `Line ${first.row} me is product ka variant hai, is line me nahi — size/color/variant likhein`
          : `Ye naam line ${first.row} par bhi hai`);
        key = `#${r.row}`;
      }
      let g = groups.get(key);
      if (!g) {
        g = { key, rows: [], status: 'new' };
        groups.set(key, g);
        order.push(g);
      }
      g.rows.push(r);

      // Codes must be unique across the file and the shop.
      const own = new Set<string>();
      for (const [label, c] of [['SKU', r.sku], ['Barcode', r.barcode], ['Pack barcode', r.pack?.barcode ?? null]] as const) {
        if (!c) continue;
        const k = keyOf(c);
        if (own.has(k)) continue;
        own.add(k);
        const owner = index.codes.get(k);
        const line = seenCodes.get(k);
        if (owner) r.errors.push(`${label} ${c} pehle se ${owner} par hai`);
        else if (line !== undefined) r.errors.push(`${label} ${c} line ${line} par bhi hai`);
        if (line === undefined) seenCodes.set(k, r.row);
      }

      if (r.variants.length > 1 && ((r.stock ?? 0) > 0 || r.sku || r.barcode || r.batchNumber || r.expiry)) {
        r.errors.push('Ek line me kai variants hon to stock, SKU, barcode aur batch nahi de sakte — har variant ki alag line banayein');
      }
      if (r.variants.length && r.pack) r.errors.push('Variant wale product ka pack file se nahi lagta — product page se lagayein');
      if (!r.errors.length && (r.price === null || r.price === 0)) r.warnings.push('Price khaali/0 hai — POS par 0 me bikega, baad me price daal dein');
      if (r.price && r.costPrice && r.costPrice > r.price) r.warnings.push('Cost price se zyada hai — har sale par loss');
      if (r.price && r.wholesalePrice && r.wholesalePrice > r.price) r.warnings.push('Wholesale price retail price se zyada hai');
      if ((r.batchNumber || r.expiry) && !((r.stock ?? 0) > 0)) r.warnings.push('Stock 0 hai — batch/expiry nahi banega');
      if (r.expiry && r.expiry.getTime() < Date.now()) r.warnings.push('Expiry guzar chuki hai');
      if (r.pack && r.pack.price && r.price && r.pack.price > r.price * r.pack.qty + 0.5) {
        r.warnings.push(`${r.pack.name} ki price ${r.pack.qty} khule se mehngi hai`);
      }
    }

    for (const g of order) {
      // Already in the shop: skipped, so problems in its lines do not matter.
      const existing = g.key.startsWith('#') ? undefined : index.names.get(g.key);
      if (existing) {
        g.status = 'skip';
        const note = `"${existing.name}" pehle se products me hai${existing.isActive ? '' : ' (band hai)'} — chhor diya`;
        for (const r of g.rows) {
          r.errors = [];
          r.warnings = [note];
        }
        continue;
      }

      const labels = new Map<string, number>();
      for (const r of g.rows) {
        for (const v of r.variants) {
          const at = labels.get(keyOf(v));
          if (at !== undefined) r.errors.push(`Variant "${v}" line ${at} par bhi hai`);
          else labels.set(keyOf(v), r.row);
        }
      }
      const bad = g.rows.find((r) => r.errors.length);
      if (bad) {
        g.status = 'error';
        for (const r of g.rows) if (!r.errors.length) r.errors.push(`Line ${bad.row} ki ghalti theek karein — ye product usi ke saath banega`);
      }
    }
    return order;
  }

  private rowChecks(groups: Group[]): CreateRowCheck[] {
    return groups
      .flatMap((g) => g.rows.map((r) => ({ row: r.row, name: r.name, status: g.status, errors: r.errors, warnings: r.warnings })))
      .sort((a, b) => a.row - b.row);
  }

  /**
   * A busy database can time out a transaction. The product is then rolled
   * back, so when no product of that name exists the group is tried once more.
   */
  private async createGroupWithRetry(user: AuthenticatedUser, scope: ShopScope, g: Group, index: CatalogIndex, shopId: string | null) {
    try {
      return await this.createGroup(user, scope, g, index, shopId);
    } catch (e) {
      const msg = (e as { message?: string; code?: string })?.message ?? '';
      const code = (e as { code?: string })?.code ?? '';
      if (!/P2028|P2024/.test(code) && !/transaction|timed out|timeout/i.test(msg)) throw e;
      const made = await this.prisma.product.count({ where: { tenantId: user.tenantId, name: { equals: g.rows[0].name, mode: 'insensitive' } } });
      if (made) throw e;
      return this.createGroup(user, scope, g, index, shopId);
    }
  }

  /** One product with its variants, pack and opening batches. */
  private async createGroup(user: AuthenticatedUser, scope: ShopScope, g: Group, index: CatalogIndex, shopId: string | null) {
    const first = g.rows[0];
    const withVariants = first.variants.length > 0;
    const categoryId = first.category ? await this.categoryId(user.tenantId, first.category, index) : undefined;
    const brandId = first.brand ? await this.brandId(user.tenantId, first.brand, index) : undefined;
    const tracksExpiry = g.rows.some((r) => r.expiry);
    const prices = g.rows.map((r) => r.price ?? 0);

    const product = await this.products.create(user, {
      name: first.name,
      sku: withVariants ? undefined : first.sku ?? undefined,
      barcode: withVariants ? undefined : first.barcode ?? undefined,
      categoryId,
      brandId,
      unit: first.unit ?? undefined,
      description: first.description ?? undefined,
      price: withVariants ? Math.min(...prices) : first.price ?? 0,
      costPrice: first.costPrice ?? undefined,
      wholesalePrice: first.wholesalePrice ?? undefined,
      taxRate: first.taxRate ?? undefined,
      lowStockAlert: first.lowStockAlert ?? undefined,
      stock: withVariants ? 0 : first.stock ?? 0,
      shopId: shopId ?? undefined,
      ...(tracksExpiry && { expiryTracked: true }),
    }, scope);

    // Names and codes now taken, so later rows in this run see them.
    index.names.set(g.key, { name: first.name, isActive: true });
    for (const r of g.rows) {
      for (const c of [r.sku, r.barcode, r.pack?.barcode]) if (c) index.codes.set(keyOf(c), `product "${first.name}"`);
    }

    const warnings: string[] = [];
    const batches: Array<{ row: ParsedRow; variantId: string | null }> = [];

    if (withVariants) {
      const lines: Array<{ dto: UpsertVariantDto; row: ParsedRow }> = [];
      for (const r of g.rows) {
        const single = r.variants.length === 1;
        for (const label of r.variants) {
          lines.push({
            row: r,
            dto: {
              name: label,
              size: r.size ?? undefined,
              color: r.color ?? undefined,
              sku: single ? r.sku ?? undefined : undefined,
              barcode: single ? r.barcode ?? undefined : undefined,
              unit: first.unit ?? undefined,
              price: r.price ?? 0,
              costPrice: r.costPrice ?? first.costPrice ?? undefined,
              wholesalePrice: r.wholesalePrice ?? undefined,
              stock: single ? r.stock ?? 0 : 0,
              lowStockAlert: r.lowStockAlert ?? first.lowStockAlert ?? undefined,
            },
          });
        }
      }
      const made = await this.variants.bulkCreate(user, product.id, lines.map((l) => l.dto), scope, shopId ?? undefined);
      const idByName = new Map(made.items.map((v) => [keyOf(v.name), v.id]));
      for (const l of lines) {
        if (l.row.variants.length === 1) batches.push({ row: l.row, variantId: idByName.get(keyOf(l.dto.name)) ?? null });
      }
    } else {
      batches.push({ row: first, variantId: null });
    }

    if (first.pack && !withVariants) {
      try {
        await this.units.create(user, {
          productId: product.id,
          unitName: first.pack.name,
          unitLabel: `${first.pack.name} (${first.pack.qty} ${first.unit ?? 'pcs'})`,
          conversionType: packType(first.pack.name),
          conversionRate: first.pack.qty,
          price: first.pack.price ?? undefined,
          barcode: first.pack.barcode ?? undefined,
        });
      } catch (e) {
        warnings.push(`Product ban gaya magar ${first.pack.name} nahi laga: ${writeError(e)}`);
      }
    }

    // Opening stock is already booked; the batch records where it came from.
    for (const { row, variantId } of batches) {
      const qty = row.stock ?? 0;
      if (!shopId || !(qty > 0) || !(row.batchNumber || row.expiry)) continue;
      try {
        await this.prisma.$transaction((tx) => addToBatch(tx, {
          tenantId: user.tenantId, shopId, productId: product.id, variantId,
          batchNumber: row.batchNumber ?? 'OPENING',
          expiryDate: row.expiry,
          costPrice: row.costPrice ?? first.costPrice ?? 0,
          quantity: qty,
          notes: 'Opening stock (import)',
        }));
      } catch (e) {
        warnings.push(`Batch nahi bana: ${writeError(e)}`);
      }
    }

    return { productId: product.id, warnings };
  }

  private async categoryId(tenantId: string, name: string, index: CatalogIndex) {
    const k = keyOf(name);
    const known = index.categories.get(k);
    if (known) return known;
    const found = await this.prisma.category.findFirst({ where: { tenantId, name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
    const id = found?.id ?? (await this.prisma.category.create({ data: { tenantId, name }, select: { id: true } })).id;
    index.categories.set(k, id);
    return id;
  }

  private async brandId(tenantId: string, name: string, index: CatalogIndex) {
    const k = keyOf(name);
    const known = index.brands.get(k);
    if (known) return known;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'brand';
    const created = await this.prisma.brand.create({
      data: { tenantId, name, slug: `${slug}-${Date.now().toString(36)}` },
      select: { id: true },
    });
    index.brands.set(k, created.id);
    return created.id;
  }

  /** Branch for the opening stock, or null when no row brings stock. */
  private async stockShop(user: AuthenticatedUser, scope: ShopScope, groups: Group[], shopId?: string) {
    const needs = groups.some((g) => g.status === 'new' && g.rows.some((r) => (r.stock ?? 0) > 0));
    if (!needs && !shopId) return null;
    const id = await resolveWriteShopId(this.prisma, user.tenantId, scope, shopId);
    assertShopAccess(user, id, 'Opening stock');
    const shop = await this.prisma.shop.findUnique({ where: { id }, select: { id: true, name: true } });
    return shop;
  }

  private async catalogIndex(tenantId: string): Promise<CatalogIndex> {
    const [products, variants, units, combos, categories, brands] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId }, select: { name: true, sku: true, barcode: true, isActive: true } }),
      this.prisma.productVariant.findMany({
        where: { product: { tenantId }, OR: [{ sku: { not: null } }, { barcode: { not: null } }] },
        select: { name: true, sku: true, barcode: true, product: { select: { name: true } } },
      }),
      this.prisma.productUnit.findMany({
        where: { tenantId, OR: [{ sku: { not: null } }, { barcode: { not: null } }] },
        select: { unitName: true, sku: true, barcode: true, product: { select: { name: true } } },
      }),
      this.prisma.productCombo.findMany({ where: { tenantId, barcode: { not: null } }, select: { name: true, barcode: true } }),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);

    const names = new Map<string, { name: string; isActive: boolean }>();
    const codes = new Map<string, string>();
    const addCode = (c: string | null, owner: string) => {
      if (c?.trim() && !codes.has(keyOf(c))) codes.set(keyOf(c), owner);
    };
    for (const p of products) {
      if (!names.has(keyOf(p.name))) names.set(keyOf(p.name), { name: p.name, isActive: p.isActive });
      addCode(p.sku, `product "${p.name}"`);
      addCode(p.barcode, `product "${p.name}"`);
    }
    for (const v of variants) {
      addCode(v.sku, `"${v.product.name} (${v.name})"`);
      addCode(v.barcode, `"${v.product.name} (${v.name})"`);
    }
    for (const u of units) {
      addCode(u.sku, `"${u.product.name}" ki ${u.unitName}`);
      addCode(u.barcode, `"${u.product.name}" ki ${u.unitName}`);
    }
    for (const c of combos) addCode(c.barcode, `combo "${c.name}"`);

    return {
      names,
      codes,
      categories: new Map(categories.map((c) => [keyOf(c.name), c.id])),
      brands: new Map(brands.map((b) => [keyOf(b.name), b.id])),
    };
  }

  // ─── Price update ─────────────────────────────────────────

  async checkPrices(user: AuthenticatedUser, dto: ImportCheckDto) {
    const rows = this.matchPrices(dto.rows, await this.priceIndex(user.tenantId));
    return { rows, summary: this.priceSummary(rows) };
  }

  async runPrices(user: AuthenticatedUser, dto: ImportRunDto) {
    const job = await this.openJob(user, 'PRICE_UPDATE', dto);
    const rows = this.matchPrices(dto.rows, await this.priceIndex(user.tenantId));
    const changes: Array<Record<string, unknown>> = [];

    for (const r of rows) {
      if (r.status !== 'change' || !r.target) continue;
      const data: { price?: number; costPrice?: number } = {};
      if (r.price) data.price = r.price.to;
      if (r.costPrice) data.costPrice = r.costPrice.to;
      try {
        if (r.target.kind === 'product') {
          await this.prisma.product.updateMany({ where: { id: r.target.id, tenantId: user.tenantId }, data });
        } else if (r.target.kind === 'variant') {
          await this.prisma.productVariant.updateMany({ where: { id: r.target.id, product: { tenantId: user.tenantId } }, data });
        } else {
          await this.prisma.productUnit.updateMany({ where: { id: r.target.id, tenantId: user.tenantId }, data });
        }
        changes.push({ row: r.row, kind: r.target.kind, id: r.target.id, name: r.target.label, price: r.price, costPrice: r.costPrice });
      } catch (e) {
        r.status = 'error';
        r.errors.push(writeError(e));
      }
    }

    const tally = {
      success: rows.filter((r) => r.status === 'change').length,
      skip: rows.filter((r) => r.status === 'same').length,
      error: rows.filter((r) => r.status === 'error').length,
    };
    const errors: JobError[] = rows
      .filter((r) => r.status === 'error')
      .map((r) => ({ row: r.row, name: r.name, error: r.errors.join(' · ') }));
    const saved = await this.closeChunk(job, dto, tally, errors, changes);
    return { jobId: job.id, job: saved, results: rows };
  }

  /** Every active product, variant and pack with its codes and prices: the sheet for a price update. */
  async priceSheet(user: AuthenticatedUser) {
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, hasVariants: true,
        category: { select: { name: true } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { name: true, sku: true, barcode: true, price: true, costPrice: true } },
        units: { where: { isActive: true, isBase: false, variantId: null }, orderBy: { sortOrder: 'asc' }, select: { unitName: true, sku: true, barcode: true, price: true, costPrice: true } },
      },
    });
    const rows: Array<{ name: string; variant: string; packName: string; category: string; sku: string; barcode: string; price: number; costPrice: number }> = [];
    for (const p of products) {
      const category = p.category?.name ?? '';
      if (!p.hasVariants || !p.variants.length) {
        rows.push({ name: p.name, variant: '', packName: '', category, sku: p.sku ?? '', barcode: p.barcode ?? '', price: p.price, costPrice: p.costPrice });
      }
      for (const v of p.variants) {
        rows.push({ name: p.name, variant: v.name, packName: '', category, sku: v.sku ?? '', barcode: v.barcode ?? '', price: v.price, costPrice: v.costPrice });
      }
      for (const u of p.units) {
        rows.push({ name: p.name, variant: '', packName: u.unitName, category, sku: u.sku ?? '', barcode: u.barcode ?? '', price: u.price, costPrice: u.costPrice });
      }
    }
    return { rows };
  }

  private matchPrices(input: ImportRowDto[], index: PriceIndex): PriceRowCheck[] {
    const seen = new Map<string, number>();
    return input.map((raw) => {
      const r = parsePriceRow(raw);
      const errors = r.errors;
      const warnings: string[] = [];
      const out: PriceRowCheck = { row: r.row, name: r.name, status: 'error', errors, warnings };
      if (errors.length) return out;

      let target: PriceTarget | null = null;
      const codes = [r.sku, r.barcode].filter((c): c is string => !!c);
      if (codes.length) {
        const hits = new Map<string, PriceTarget>();
        for (const c of codes) for (const t of index.byCode.get(keyOf(c)) ?? []) hits.set(`${t.kind}:${t.id}`, t);
        if (hits.size > 1) {
          errors.push(`Ye code ${hits.size} cheezon par hai — ${[...hits.values()].slice(0, 3).map((t) => t.label).join(', ')}`);
          return out;
        }
        target = [...hits.values()][0] ?? null;
        if (!target) {
          errors.push(`SKU/barcode ${codes.join(' / ')} kisi product par nahi mila`);
          return out;
        }
      } else if (r.name) {
        const sub = r.variant ?? r.packName;
        const key = sub ? `${keyOf(r.name)}|${keyOf(sub)}` : keyOf(r.name);
        const hits = index.byName.get(key) ?? [];
        if (hits.length > 1) {
          errors.push(`"${r.name}" naam ki ${hits.length} cheezein hain — SKU ya barcode likhein`);
          return out;
        }
        target = hits[0] ?? null;
        if (!target) {
          errors.push(`"${r.name}${sub ? ` (${sub})` : ''}" nahi mila — naam bilkul wesa likhein jaisa products me hai, ya SKU/barcode dein`);
          return out;
        }
      } else {
        errors.push('SKU, barcode ya naam me se kuch to likhein');
        return out;
      }

      out.target = { kind: target.kind, id: target.id, label: target.label };
      out.name = r.name || target.label;
      const key = `${target.kind}:${target.id}`;
      const dup = seen.get(key);
      if (dup !== undefined) {
        errors.push(`${target.label} line ${dup} par bhi hai`);
        return out;
      }

      if (r.price === null && r.costPrice === null) {
        errors.push('Nayi price ya cost likhein');
        return out;
      }
      if (r.price === 0) {
        errors.push('Price 0 nahi ho sakti');
        return out;
      }
      if (r.price !== null && r2(r.price) !== r2(target.price)) out.price = { from: target.price, to: r2(r.price) };
      if (r.costPrice !== null && r2(r.costPrice) !== r2(target.costPrice)) out.costPrice = { from: target.costPrice, to: r2(r.costPrice) };

      const price = out.price?.to ?? target.price;
      const cost = out.costPrice?.to ?? target.costPrice;
      if (price > 0 && cost > price) warnings.push('Cost price se zyada ho jayegi — har sale par loss');
      if (out.price && target.price > 0) {
        const pct = Math.round(((out.price.to - target.price) / target.price) * 100);
        if (Math.abs(pct) >= 50) warnings.push(`Price ${pct > 0 ? '+' : ''}${pct}% badal rahi hai — dobara dekh lein`);
      }
      if (target.kind === 'product' && target.hasVariants) warnings.push('Is product ke variants hain — POS variant ki price leta hai');

      out.status = out.price || out.costPrice ? 'change' : 'same';
      seen.set(key, r.row);
      return out;
    });
  }

  private priceSummary(rows: PriceRowCheck[]) {
    return {
      total: rows.length,
      change: rows.filter((r) => r.status === 'change').length,
      same: rows.filter((r) => r.status === 'same').length,
      error: rows.filter((r) => r.status === 'error').length,
    };
  }

  private async priceIndex(tenantId: string): Promise<PriceIndex> {
    const [products, variants, units] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId },
        select: { id: true, name: true, sku: true, barcode: true, price: true, costPrice: true, hasVariants: true },
      }),
      this.prisma.productVariant.findMany({
        where: { product: { tenantId } },
        select: { id: true, name: true, sku: true, barcode: true, price: true, costPrice: true, product: { select: { name: true } } },
      }),
      this.prisma.productUnit.findMany({
        where: { tenantId, isBase: false },
        select: { id: true, unitName: true, sku: true, barcode: true, price: true, costPrice: true, product: { select: { name: true } } },
      }),
    ]);

    const byCode = new Map<string, PriceTarget[]>();
    const byName = new Map<string, PriceTarget[]>();
    const add = (map: Map<string, PriceTarget[]>, k: string | null | undefined, t: PriceTarget) => {
      if (!k?.trim()) return;
      const list = map.get(keyOf(k)) ?? [];
      if (!list.some((x) => x.kind === t.kind && x.id === t.id)) list.push(t);
      map.set(keyOf(k), list);
    };
    for (const p of products) {
      const t: PriceTarget = { kind: 'product', id: p.id, label: p.name, price: p.price, costPrice: p.costPrice, hasVariants: p.hasVariants };
      add(byCode, p.sku, t);
      add(byCode, p.barcode, t);
      add(byName, p.name, t);
    }
    for (const v of variants) {
      const t: PriceTarget = { kind: 'variant', id: v.id, label: `${v.product.name} (${v.name})`, price: v.price, costPrice: v.costPrice };
      add(byCode, v.sku, t);
      add(byCode, v.barcode, t);
      add(byName, `${v.product.name}|${v.name}`, t);
    }
    for (const u of units) {
      const t: PriceTarget = { kind: 'pack', id: u.id, label: `${u.product.name} — ${u.unitName}`, price: u.price, costPrice: u.costPrice };
      add(byCode, u.sku, t);
      add(byCode, u.barcode, t);
      add(byName, `${u.product.name}|${u.unitName}`, t);
    }
    return { byCode, byName };
  }

  // ─── Jobs ─────────────────────────────────────────────────

  private async openJob(user: AuthenticatedUser, jobType: BulkJobType, dto: ImportRunDto) {
    if (dto.jobId) {
      const job = await this.prisma.bulkImportJob.findFirst({ where: { id: dto.jobId, tenantId: user.tenantId, jobType } });
      if (!job) throw new NotFoundException('Import nahi mila');
      if (job.status !== 'PROCESSING') throw new BadRequestException('Ye import pehle hi mukammal ho chuka hai — naya import shuru karein');
      return job;
    }
    return this.prisma.bulkImportJob.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        jobType,
        fileName: dto.fileName,
        totalRows: dto.totalRows || dto.rows.length,
        status: 'PROCESSING',
        startedAt: new Date(),
        metadata: { shopId: dto.shopId ?? null },
      },
    });
  }

  private async closeChunk(
    job: { id: string; startedAt: Date | null; errors: Prisma.JsonValue; metadata: Prisma.JsonValue },
    dto: ImportRunDto,
    tally: { success: number; skip: number; error: number },
    errors: JobError[],
    changes?: Array<Record<string, unknown>>,
  ) {
    const oldErrors = Array.isArray(job.errors) ? (job.errors as unknown as JobError[]) : [];
    const meta = (job.metadata && typeof job.metadata === 'object' && !Array.isArray(job.metadata) ? job.metadata : {}) as Record<string, unknown>;
    const oldChanges = Array.isArray(meta.changes) ? (meta.changes as unknown[]) : [];

    const updated = await this.prisma.bulkImportJob.update({
      where: { id: job.id },
      data: {
        processedRows: { increment: dto.rows.length },
        successCount: { increment: tally.success },
        skipCount: { increment: tally.skip },
        errorCount: { increment: tally.error },
        errors: [...oldErrors, ...errors].slice(0, MAX_SAVED_ERRORS) as unknown as Prisma.InputJsonValue,
        ...(changes?.length && {
          metadata: { ...meta, changes: [...oldChanges, ...changes].slice(0, MAX_SAVED_CHANGES) } as Prisma.InputJsonValue,
        }),
      },
    });
    if (!dto.done) return this.jobView(updated);

    const status = updated.errorCount === 0 ? 'COMPLETED' : updated.successCount === 0 ? 'FAILED' : 'PARTIAL';
    const closed = await this.prisma.bulkImportJob.update({
      where: { id: job.id },
      data: {
        status,
        completedAt: new Date(),
        duration: job.startedAt ? Date.now() - job.startedAt.getTime() : null,
      },
    });
    return this.jobView(closed);
  }

  private jobView(j: { id: string; jobType: BulkJobType; fileName: string; totalRows: number; processedRows: number; successCount: number; errorCount: number; skipCount: number; status: string; startedAt: Date | null; completedAt: Date | null; createdAt: Date; updatedAt: Date }) {
    return {
      id: j.id, jobType: j.jobType, fileName: j.fileName, totalRows: j.totalRows, processedRows: j.processedRows,
      successCount: j.successCount, errorCount: j.errorCount, skipCount: j.skipCount, status: j.status,
      startedAt: j.startedAt, completedAt: j.completedAt, createdAt: j.createdAt, updatedAt: j.updatedAt,
    };
  }

  /** Recent product and price imports with who ran them. */
  async listJobs(user: AuthenticatedUser) {
    const jobs = await this.prisma.bulkImportJob.findMany({
      where: { tenantId: user.tenantId, jobType: { in: ['PRODUCTS', 'PRICE_UPDATE'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(jobs.map((j) => j.userId))] }, tenantId: user.tenantId },
      select: { id: true, fullName: true },
    });
    const nameOf = new Map(users.map((u) => [u.id, u.fullName]));
    return jobs.map((j) => ({ ...this.jobView(j), userName: nameOf.get(j.userId) ?? null }));
  }

  /** One job with its failed rows and, for a price update, every change made. */
  async getJob(user: AuthenticatedUser, id: string) {
    const job = await this.prisma.bulkImportJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Import nahi mila');
    const meta = (job.metadata && typeof job.metadata === 'object' && !Array.isArray(job.metadata) ? job.metadata : {}) as Record<string, unknown>;
    return {
      ...this.jobView(job),
      errors: Array.isArray(job.errors) ? job.errors : [],
      changes: Array.isArray(meta.changes) ? meta.changes : [],
    };
  }
}
