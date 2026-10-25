/**
 * Product import from Excel / CSV for every industry.
 *
 * Two modes:
 *  - Products: rows with the same name and a variant (size / colour) become
 *    one product with variants; a row may carry one pack (carton, dozen), a
 *    batch / expiry for its opening stock, and phone IMEIs. Unknown
 *    categories and brands are created. Products are made through the shared
 *    products, variants, pack and IMEI services, so opening stock is booked
 *    as OPENING_BALANCE movements in the chosen branch.
 *    A row whose product is already in the shop (same SKU / barcode, else the
 *    same name) follows the `existing` options: its stock is added (opening
 *    stock), set to the file's number (an adjustment for the difference) or
 *    left alone, and its price / cost may be updated. Stock is only ever
 *    changed through the stock adjustment and IMEI services.
 *  - Price update: rows are matched to a product, variant or pack by SKU or
 *    barcode (or by exact name when the row has no code) and only price and
 *    cost change.
 *
 * `check*` validates without writing (dry run). `run*` imports one chunk;
 * the first chunk opens a BulkImportJob and the last one closes it, so the
 * job keeps the totals, the failed rows, the products touched and the price
 * changes.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BulkJobType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS, hasPermission } from '../../../../common/constants/permissions.constants';
import {
  ShopScope, addToBatch, assertShopAccess, isServiceProduct, readShopStock, resolveWriteShopId,
} from '../../../../common/shop-scope';
import { ProductUnitsService } from '../../../../industries/retail/product-units/product-units.service';
import { ImeiService } from '../../../../industries/mobile/imei/imei.service';
import { StockAdjustmentsService } from '../../stock-adjustments/stock-adjustments.service';
import { ProductVariantsService } from '../../product-variants/product-variants.service';
import { UpsertVariantDto } from '../../product-variants/dto/upsert-variant.dto';
import { ProductsService } from '../products.service';
import { ExistingOptionsDto, ImportCheckDto, ImportRowDto, ImportRunDto } from './product-import.dto';
import {
  addError, keyOf, packType, parsePriceRow, parseRow, type ImportField, type ParsedRow,
} from './import-values';

type CreateStatus = 'new' | 'update' | 'skip' | 'error';
type PriceStatus = 'change' | 'same' | 'error';
type FieldErrors = Partial<Record<ImportField, string>>;

export interface CreateRowCheck {
  row: number;
  name: string;
  status: CreateStatus;
  errors: string[];
  warnings: string[];
  fieldErrors: FieldErrors;
  /** Stock units this row adds (negative: removes) in the branch. */
  stockQty?: number;
  /** The product (and variant) an existing row updates. */
  match?: string;
}

export interface PriceRowCheck {
  row: number;
  name: string;
  status: PriceStatus;
  errors: string[];
  warnings: string[];
  fieldErrors: FieldErrors;
  target?: { kind: 'product' | 'variant' | 'pack'; id: string; label: string };
  price?: { from: number; to: number };
  costPrice?: { from: number; to: number };
}

interface ExistingVariant { id: string; name: string; size: string | null; color: string | null; price: number; costPrice: number }

interface ExistingProduct {
  id: string;
  name: string;
  isActive: boolean;
  hasVariants: boolean;
  service: boolean;
  /** Stock follows the phone's IMEIs. */
  imei: boolean;
  price: number;
  costPrice: number;
  variants: ExistingVariant[];
}

/** What an existing row changes. */
interface RowPlan {
  product: ExistingProduct;
  variantId: string | null;
  label: string;
  /** add: quantity to add; set: the new branch stock. */
  stock: number | null;
  /** Branch stock now (filled once the branch is known). */
  current?: number;
  imeis: string[];
  price?: number;
  costPrice?: number;
}

interface Group {
  key: string;
  rows: ParsedRow[];
  status: CreateStatus;
  /** Set for rows of a product already in the shop; each row is judged on its own. */
  existing?: ExistingProduct;
  plans?: Map<number, RowPlan>;
  rowStatus?: Map<number, CreateStatus>;
  /** Variant a row's SKU / barcode points to. */
  codeVariant?: Map<number, string>;
}

interface CatalogIndex {
  names: Map<string, ExistingProduct[]>;
  byId: Map<string, ExistingProduct>;
  /** Every code in the shop with who holds it, for new rows. */
  codes: Map<string, string>;
  /** Product and variant codes an existing row can be matched by. */
  codeTargets: Map<string, { productId: string; variantId: string | null }>;
  categories: Map<string, string>;
  brands: Map<string, string>;
}

interface Options {
  stock: ExistingOptionsDto['stock'];
  prices: boolean;
  canStock: boolean;
  canPrices: boolean;
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

/** Totals one chunk adds to the job's metadata. */
interface ChunkExtra {
  productIds?: string[];
  created?: number;
  updated?: number;
  stockUnits?: number;
  changes?: Array<Record<string, unknown>>;
  /** Failed rows as they were sent, so they can be fixed and imported again later. */
  failedRows?: Array<ImportRowDto & { error: string }>;
}

/** Input rows of the failed results, with their reason. */
function failedInputs(input: ImportRowDto[], results: Array<{ row: number; status: string; errors: string[] }>) {
  const reason = new Map(results.filter((r) => r.status === 'error').map((r) => [r.row, r.errors.join(' · ')]));
  return input.filter((r) => reason.has(r.row)).map((r) => ({ ...r, error: reason.get(r.row) ?? '' }));
}

const MAX_SAVED_ERRORS = 5000;
const MAX_SAVED_CHANGES = 10_000;
const MAX_SAVED_PRODUCTS = 20_000;
const MAX_SAVED_FAILED = 5000;
const IMPORT_REASON = 'Excel import';
const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10_000) / 10_000;

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
    private readonly adjustments: StockAdjustmentsService,
    private readonly imeiService: ImeiService,
  ) {}

  // ─── Products (new and existing) ──────────────────────────

  private options(user: AuthenticatedUser, existing?: ExistingOptionsDto): Options {
    return {
      stock: existing?.stock ?? 'skip',
      prices: !!existing?.prices,
      canStock: hasPermission(user.role, user.permissions, PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE),
      canPrices: hasPermission(user.role, user.permissions, PERMISSIONS.PRODUCTS_EDIT),
    };
  }

  /** Parses, groups and judges the rows, then reads branch stock for existing rows. */
  private async plan(user: AuthenticatedUser, scope: ShopScope, rows: ImportRowDto[], shopId: string | undefined, opts: Options) {
    const index = await this.catalogIndex(user.tenantId);
    const parsed = rows.map(parseRow);
    const taken = await this.takenImeis(user.tenantId, parsed);
    const groups = this.analyse(parsed, index, opts, taken);
    const shop = await this.stockShop(user, scope, groups, shopId);
    if (shop) await this.readCurrentStock(shop.id, groups, opts);
    return { index, groups, shop };
  }

  async checkCreate(user: AuthenticatedUser, scope: ShopScope, dto: ImportCheckDto) {
    const opts = this.options(user, dto.existing);
    const { index, groups, shop } = await this.plan(user, scope, dto.rows, dto.shopId, opts);

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

    const rows = this.rowChecks(groups, opts);
    const stockUp = rows.reduce((s, r) => s + Math.max(0, r.stockQty ?? 0), 0);
    const stockDown = rows.reduce((s, r) => s + Math.max(0, -(r.stockQty ?? 0)), 0);
    return {
      rows,
      shop,
      summary: {
        total: rows.length,
        ready: rows.filter((r) => r.status === 'new').length,
        update: rows.filter((r) => r.status === 'update').length,
        skip: rows.filter((r) => r.status === 'skip').length,
        error: rows.filter((r) => r.status === 'error').length,
        products: ready.length,
        variants,
        packs,
        newCategories: [...newCategories],
        newBrands: [...newBrands],
        openingQty: r2(openingQty),
        stockUp: r2(stockUp),
        stockDown: r2(stockDown),
        stockCost: r2(stockCost),
        saleValue: r2(saleValue),
      },
    };
  }

  async runCreate(user: AuthenticatedUser, scope: ShopScope, dto: ImportRunDto) {
    const job = await this.openJob(user, 'PRODUCTS', dto);
    const opts = this.options(user, dto.existing);
    const { index, groups, shop } = await this.plan(user, scope, dto.rows, dto.shopId, opts);

    const results: Array<CreateRowCheck & { productId?: string }> = [];
    for (const g of groups) {
      if (g.existing) {
        for (const r of g.rows) {
          const check = this.rowCheck(g, r, opts);
          const plan = g.plans?.get(r.row);
          const movesStock = !!plan && (plan.stock !== null || plan.imeis.length > 0);
          if (check.status !== 'update' || !plan || (movesStock && !shop)) {
            results.push(check);
            continue;
          }
          try {
            const { stockQty, warnings } = await this.applyExisting(user, scope, shop?.id ?? null, r, plan, opts, dto.fileName);
            results.push({ ...check, stockQty, warnings: [...check.warnings, ...warnings], productId: plan.product.id });
          } catch (e) {
            this.logger.warn(`Import row ${r.row} (existing) failed: ${(e as Error)?.message}`);
            results.push({ ...check, status: 'error', stockQty: 0, errors: [writeError(e)] });
          }
        }
        continue;
      }
      if (g.status !== 'new') {
        results.push(...g.rows.map((r) => this.rowCheck(g, r, opts)));
        continue;
      }
      try {
        const { productId, warnings } = await this.createGroupWithRetry(user, scope, g, index, shop?.id ?? null);
        for (const r of g.rows) {
          results.push({ ...this.rowCheck(g, r, opts), warnings: [...r.warnings, ...warnings], productId });
        }
      } catch (e) {
        this.logger.warn(`Import row ${g.rows[0].row} failed: ${(e as Error)?.message}`);
        const reason = writeError(e);
        for (const r of g.rows) results.push({ ...this.rowCheck(g, r, opts), status: 'error', stockQty: 0, errors: [reason] });
      }
    }
    results.sort((a, b) => a.row - b.row);

    const created = results.filter((r) => r.status === 'new').length;
    const updated = results.filter((r) => r.status === 'update').length;
    const tally = {
      success: created + updated,
      skip: results.filter((r) => r.status === 'skip').length,
      error: results.filter((r) => r.status === 'error').length,
    };
    const errors: JobError[] = results
      .filter((r) => r.status === 'skip' || r.status === 'error')
      .map((r) => ({ row: r.row, name: r.name, error: (r.status === 'skip' ? r.warnings : r.errors).join(' · ') }));
    const saved = await this.closeChunk(job, dto, tally, errors, {
      productIds: [...new Set(results.map((r) => r.productId).filter((id): id is string => !!id))],
      created,
      updated,
      stockUnits: r2(results.reduce((s, r) => s + (r.status === 'error' ? 0 : r.stockQty ?? 0), 0)),
      failedRows: failedInputs(dto.rows, results),
    });
    return { jobId: job.id, job: saved, shop, results };
  }

  /** IMEIs in the file that the shop already has. */
  private async takenImeis(tenantId: string, rows: ParsedRow[]) {
    const all = [...new Set(rows.flatMap((r) => r.imeis))];
    if (!all.length) return new Set<string>();
    const hits = await this.prisma.productImei.findMany({
      where: { tenantId, OR: [{ imei1: { in: all } }, { imei2: { in: all } }] },
      select: { imei1: true, imei2: true },
    });
    return new Set(hits.flatMap((h) => [h.imei1, h.imei2]).filter((x): x is string => !!x));
  }

  /**
   * Rows grouped into products and judged against the shop's catalogue and
   * the rest of the file. A new product is imported whole or not at all; a
   * row of an existing product stands on its own.
   */
  private analyse(parsed: ParsedRow[], index: CatalogIndex, opts: Options, takenImeis: Set<string>): Group[] {
    const groups = new Map<string, Group>();
    const order: Group[] = [];
    const seenCodes = new Map<string, number>();
    const seenImeis = new Map<string, number>();

    for (const r of parsed) {
      // IMEIs must be new to the shop and to the file.
      for (const imei of r.imeis) {
        const line = seenImeis.get(imei);
        if (takenImeis.has(imei)) addError(r, 'imei', `IMEI ${imei} pehle se stock record me hai`);
        else if (line !== undefined) addError(r, 'imei', `IMEI ${imei} line ${line} par bhi hai`);
        else seenImeis.set(imei, r.row);
      }

      const hit = this.findExisting(r, index);
      if (hit) {
        const key = `@${hit.product.id}`;
        let g = groups.get(key);
        if (!g) {
          g = { key, rows: [], status: 'update', existing: hit.product, plans: new Map(), rowStatus: new Map(), codeVariant: new Map() };
          groups.set(key, g);
          order.push(g);
        }
        if (hit.variantId) g.codeVariant!.set(r.row, hit.variantId);
        g.rows.push(r);
        continue;
      }

      let key = r.name ? keyOf(r.name) : `#${r.row}`;
      // A repeated name joins its product only as another variant; any other
      // repeat stands alone with an error, so the first line still imports.
      const first = groups.get(key)?.rows[0];
      if (first && (!first.variants.length || !r.variants.length)) {
        addError(r, first.variants.length ? 'variant' : 'name', first.variants.length
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
      for (const [label, field, c] of [['SKU', 'sku', r.sku], ['Barcode', 'barcode', r.barcode], ['Pack barcode', 'packBarcode', r.pack?.barcode ?? null]] as const) {
        if (!c) continue;
        const k = keyOf(c);
        if (own.has(k)) continue;
        own.add(k);
        const owner = index.codes.get(k);
        const line = seenCodes.get(k);
        if (owner) addError(r, field, `${label} ${c} pehle se ${owner} par hai`);
        else if (line !== undefined) addError(r, field, `${label} ${c} line ${line} par bhi hai`);
        if (line === undefined) seenCodes.set(k, r.row);
      }

      if (r.variants.length > 1 && ((r.stock ?? 0) > 0 || r.sku || r.barcode || r.batchNumber || r.expiry || r.imeis.length)) {
        addError(r, 'variant', 'Ek line me kai variants hon to stock, SKU, barcode, IMEI aur batch nahi de sakte — har variant ki alag line banayein');
      }
      if (r.variants.length && r.pack) addError(r, 'packName', 'Variant wale product ka pack file se nahi lagta — product page se lagayein');
      if (!r.errors.length && (r.price === null || r.price === 0)) r.warnings.push('Price khaali/0 hai — POS par 0 me bikega, baad me price daal dein');
      this.priceWarnings(r);
      if ((r.batchNumber || r.expiry) && !((r.stock ?? 0) > 0)) r.warnings.push('Stock 0 hai — batch/expiry nahi banega');
      if (r.expiry && r.expiry.getTime() < Date.now()) r.warnings.push('Expiry guzar chuki hai');
      if (r.pack && r.pack.price && r.price && r.pack.price > r.price * r.pack.qty + 0.5) {
        r.warnings.push(`${r.pack.name} ki price ${r.pack.qty} khule se mehngi hai`);
      }
    }

    for (const g of order) {
      if (g.existing) {
        this.judgeExisting(g, opts);
        continue;
      }
      const labels = new Map<string, number>();
      for (const r of g.rows) {
        for (const v of r.variants) {
          const at = labels.get(keyOf(v));
          if (at !== undefined) addError(r, 'variant', `Variant "${v}" line ${at} par bhi hai`);
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

  private priceWarnings(r: ParsedRow) {
    if (r.price && r.costPrice && r.costPrice > r.price) r.warnings.push('Cost price se zyada hai — har sale par loss');
    if (r.price && r.wholesalePrice && r.wholesalePrice > r.price) r.warnings.push('Wholesale price retail price se zyada hai');
  }

  /** The shop's product for a row: by SKU / barcode first, then by exact name. */
  private findExisting(r: ParsedRow, index: CatalogIndex): { product: ExistingProduct; variantId: string | null } | null {
    for (const c of [r.sku, r.barcode]) {
      const t = c ? index.codeTargets.get(keyOf(c)) : undefined;
      const product = t ? index.byId.get(t.productId) : undefined;
      if (t && product) return { product, variantId: t.variantId };
    }
    if (!r.name) return null;
    const list = index.names.get(keyOf(r.name));
    if (!list?.length) return null;
    if (list.length > 1) {
      // Two products share the name; without a code the row cannot pick one.
      addError(r, 'name', `"${r.name}" naam ke ${list.length} products hain — SKU ya barcode likhein`);
    }
    return { product: list[0], variantId: null };
  }

  /** Each row of an existing product: which item it is and what changes. */
  private judgeExisting(g: Group, opts: Options) {
    const p = g.existing!;
    const seen = new Map<string, number>();
    for (const r of g.rows) {
      const status = (s: CreateStatus) => g.rowStatus!.set(r.row, s);
      // A new product's details (pack, description, category…) are not used here, so their problems do not count.
      const ignored: ImportField[] = ['packName', 'packQty', 'packPrice', 'packBarcode', 'description', 'category', 'brand', 'unit', 'wholesalePrice', 'taxRate', 'lowStockAlert'];
      const drop = new Set(ignored.map((f) => r.fieldErrors[f]).filter(Boolean));
      r.errors = r.errors.filter((e) => !drop.has(e));
      for (const f of ignored) delete r.fieldErrors[f];

      let variantId: string | null = null;
      let label = p.name;
      let variant: ExistingVariant | undefined;
      if (p.hasVariants) {
        const coded = g.codeVariant?.get(r.row);
        variant = coded ? p.variants.find((v) => v.id === coded) : this.matchVariant(p, r);
        if (r.variants.length > 1) addError(r, 'variant', 'Ek line me ek hi variant likhein');
        else if (!variant && !r.variants.length) addError(r, 'variant', `"${p.name}" ke variants hain — Size/Color/Variant likhein`);
        else if (!variant) addError(r, 'variant', `Variant "${r.variants[0]}" is product me nahi — pehle product page par variant banayein`);
        if (variant) {
          variantId = variant.id;
          label = `${p.name} (${variant.name})`;
        }
      } else if (r.variants.length) {
        addError(r, 'variant', `"${p.name}" bina variant ke bana hua hai — Size/Color/Variant khaali karein`);
      }

      const itemKey = `${p.id}:${variantId ?? ''}`;
      const dup = seen.get(itemKey);
      if (dup !== undefined && !r.errors.length) addError(r, 'name', `${label} line ${dup} par bhi hai`);
      seen.set(itemKey, r.row);

      const note = `"${label}" pehle se products me hai${p.isActive ? '' : ' (band hai)'}`;
      if (r.errors.length) {
        status('error');
        continue;
      }

      // Matched by code under another name: the shop's name stays.
      if (r.name && keyOf(r.name) !== keyOf(p.name)) r.warnings.push(`SKU/barcode se "${p.name}" mila — naam nahi badlega`);
      const plan: RowPlan = { product: p, variantId, label, stock: null, imeis: [] };
      const reasons: string[] = [];

      // Stock.
      const typed = r.imeis.length ? null : r.stock;
      if (r.imeis.length) {
        if (opts.stock === 'skip') reasons.push('stock chhorne ka chuna gaya');
        else if (!opts.canStock) r.warnings.push('Stock badalne ki ijazat nahi (Stock adjustments) — stock nahi badlega');
        else plan.imeis = r.imeis;
      } else if (typed !== null && opts.stock !== 'skip') {
        if (!opts.canStock) r.warnings.push('Stock badalne ki ijazat nahi (Stock adjustments) — stock nahi badlega');
        else if (p.service) r.warnings.push('Service ka stock nahi hota — stock chhor diya');
        else if (p.imei) addError(r, 'stock', 'Is phone ka stock IMEI se chalta hai — Stock khaali karein aur IMEI column me naye IMEI likhein');
        else if (opts.stock === 'add' && typed <= 0) reasons.push('stock 0 hai');
        else plan.stock = typed;
      } else if (typed !== null) {
        reasons.push('stock chhorne ka chuna gaya');
      }

      // Price and cost.
      if (opts.prices && (r.price !== null || r.costPrice !== null)) {
        if (!opts.canPrices) r.warnings.push('Price badalne ki ijazat nahi (Products edit) — price nahi badlegi');
        else if (r.price === 0) addError(r, 'price', 'Price 0 nahi ho sakti');
        else {
          const nowPrice = variant ? variant.price : p.price;
          const nowCost = variant ? variant.costPrice : p.costPrice;
          if (r.price !== null && r2(r.price) !== r2(nowPrice)) plan.price = r2(r.price);
          if (r.costPrice !== null && r2(r.costPrice) !== r2(nowCost)) plan.costPrice = r2(r.costPrice);
          const price = plan.price ?? nowPrice;
          const cost = plan.costPrice ?? nowCost;
          if (price > 0 && cost > price) r.warnings.push('Cost price se zyada ho jayegi — har sale par loss');
        }
      }

      if (r.errors.length) {
        status('error');
        continue;
      }
      g.plans!.set(r.row, plan);
      const changes = plan.stock !== null || plan.imeis.length || plan.price !== undefined || plan.costPrice !== undefined;
      if (changes) {
        status('update');
      } else {
        status('skip');
        r.warnings.unshift(`${note} — ${reasons.length ? reasons.join(', ') : 'kuch nahi badla'}`);
      }
    }
  }

  /** Variant by its name ("M / White", "M-White") or by size and colour. */
  private matchVariant(p: ExistingProduct, r: ParsedRow): ExistingVariant | undefined {
    const label = r.variants[0] ? keyOf(r.variants[0]) : null;
    const norm = (s: string) => keyOf(s).replace(/[\s/\-_,]+/g, ' ').trim();
    return p.variants.find((v) => (label && (keyOf(v.name) === label || norm(v.name) === norm(label))))
      ?? (r.size || r.color
        ? p.variants.find((v) => (!r.size || keyOf(v.size ?? '') === keyOf(r.size)) && (!r.color || keyOf(v.color ?? '') === keyOf(r.color)) && (v.size || v.color))
        : undefined);
  }

  /** Branch stock of every existing row; a "set" to the same number changes nothing. */
  private async readCurrentStock(shopId: string, groups: Group[], opts: Options) {
    const plans = groups.flatMap((g) => (g.plans ? [...g.plans.entries()].map(([row, plan]) => ({ g, row, plan })) : []));
    const ids = [...new Set(plans.map((x) => x.plan.product.id))];
    if (!ids.length) return;
    const stock = await this.prisma.shopStock.findMany({
      where: { shopId, productId: { in: ids } },
      select: { productId: true, variantId: true, stock: true },
    });
    const at = new Map(stock.map((s) => [`${s.productId}:${s.variantId ?? ''}`, Number(s.stock) || 0]));
    for (const { g, row, plan } of plans) {
      plan.current = at.get(`${plan.product.id}:${plan.variantId ?? ''}`) ?? 0;
      // IMEIs set the branch stock to the phone count, so typed stock already there would be lost.
      if (plan.imeis.length && !plan.product.imei && plan.current > 0) {
        const r = g.rows.find((x) => x.row === row)!;
        addError(r, 'imei', `"${plan.label}" ka stock IMEI ke baghair ${plan.current} hai — iske IMEI IMEI stock page se lagayein`);
        g.rowStatus?.set(row, 'error');
        g.plans?.delete(row);
        continue;
      }
      if (opts.stock === 'set' && plan.stock !== null && Math.abs(plan.stock - plan.current) < 0.0001) {
        plan.stock = null;
        const r = g.rows.find((x) => x.row === row)!;
        if (plan.price === undefined && plan.costPrice === undefined && !plan.imeis.length && g.rowStatus?.get(row) === 'update') {
          g.rowStatus.set(row, 'skip');
          r.warnings.unshift(`"${plan.label}" ka stock pehle hi ${plan.current} hai — kuch nahi badla`);
        }
      }
    }
  }

  /** Stock units a row moves in the branch (negative: out). */
  private stockQtyOf(g: Group, r: ParsedRow, opts: Options): number {
    if (!g.existing) return g.status === 'new' ? r.stock ?? 0 : 0;
    const plan = g.plans?.get(r.row);
    if (!plan || g.rowStatus?.get(r.row) !== 'update') return 0;
    if (plan.imeis.length) return plan.imeis.length;
    if (plan.stock === null) return 0;
    return opts.stock === 'set' ? r4(plan.stock - (plan.current ?? 0)) : plan.stock;
  }

  private rowCheck(g: Group, r: ParsedRow, opts: Options): CreateRowCheck {
    const status = g.rowStatus?.get(r.row) ?? g.status;
    const plan = g.plans?.get(r.row);
    return {
      row: r.row,
      name: r.name,
      status,
      errors: r.errors,
      warnings: r.warnings,
      fieldErrors: r.fieldErrors,
      stockQty: status === 'error' ? 0 : this.stockQtyOf(g, r, opts),
      ...(plan && { match: plan.label }),
    };
  }

  private rowChecks(groups: Group[], opts: Options): CreateRowCheck[] {
    return groups.flatMap((g) => g.rows.map((r) => this.rowCheck(g, r, opts))).sort((a, b) => a.row - b.row);
  }

  /**
   * Changes one existing product or variant: IMEIs or stock through the IMEI
   * and stock adjustment services, then price and cost.
   */
  private async applyExisting(
    user: AuthenticatedUser, scope: ShopScope, shopId: string | null, r: ParsedRow, plan: RowPlan, opts: Options, fileName: string,
  ): Promise<{ stockQty: number; warnings: string[] }> {
    const warnings: string[] = [];
    const { product, variantId } = plan;
    let stockQty = 0;
    const note = `${fileName} · line ${r.row}`;

    if (plan.imeis.length && shopId) {
      await this.imeiService.bulkCreate(user, {
        shopId, productId: product.id, variantId: variantId ?? undefined,
        costPrice: r.costPrice ?? undefined,
        imeis: plan.imeis.map((imei1) => ({ imei1 })),
      }, { inType: 'OPENING_BALANCE', reference: 'IMPORT', note: `${IMPORT_REASON}: ${plan.imeis.length} IMEI · ${note}` });
      stockQty = plan.imeis.length;
    } else if (plan.stock !== null && shopId) {
      const batch = {
        ...(r.batchNumber && { batchNumber: r.batchNumber }),
        ...(r.expiry && { expiryDate: r.expiry.toISOString().slice(0, 10), batchNumber: r.batchNumber ?? 'OPENING' }),
      };
      const opening = (quantity: number) => this.adjustments.batch(user, scope, {
        shopId, reason: IMPORT_REASON, note,
        items: [{ productId: product.id, variantId: variantId ?? undefined, type: 'OPENING_BALANCE', quantity, ...batch }],
      });
      if (opts.stock === 'add') {
        await opening(plan.stock);
        stockQty = plan.stock;
      } else {
        const current = await readShopStock(this.prisma, shopId, product.id, variantId);
        const diff = r4(plan.stock - current);
        if (Math.abs(diff) >= 0.0001) {
          const history = diff > 0
            ? await this.prisma.stockMovement.count({ where: { tenantId: user.tenantId, productId: product.id, variantId } })
            : 1;
          // First stock of an item is opening stock; anything else is an adjustment.
          if (!history) await opening(diff);
          else await this.adjustments.count(user, scope, { shopId, reason: IMPORT_REASON, note, items: [{ productId: product.id, variantId: variantId ?? undefined, counted: plan.stock }] });
          stockQty = diff;
        }
      }
    }

    if (plan.price !== undefined || plan.costPrice !== undefined) {
      const data = {
        ...(plan.price !== undefined && { price: plan.price }),
        ...(plan.costPrice !== undefined && { costPrice: plan.costPrice }),
      };
      try {
        if (variantId) await this.prisma.productVariant.updateMany({ where: { id: variantId, product: { tenantId: user.tenantId } }, data });
        else await this.prisma.product.updateMany({ where: { id: product.id, tenantId: user.tenantId }, data });
      } catch (e) {
        warnings.push(`Stock ho gaya magar price nahi badli: ${writeError(e)}`);
      }
    }
    return { stockQty, warnings };
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

  /** One product with its variants, pack, opening batches and IMEIs. */
  private async createGroup(user: AuthenticatedUser, scope: ShopScope, g: Group, index: CatalogIndex, shopId: string | null) {
    const first = g.rows[0];
    const withVariants = first.variants.length > 0;
    const categoryId = first.category ? await this.categoryId(user.tenantId, first.category, index) : undefined;
    const brandId = first.brand ? await this.brandId(user.tenantId, first.brand, index) : undefined;
    const tracksExpiry = g.rows.some((r) => r.expiry);
    const prices = g.rows.map((r) => r.price ?? 0);
    // Phones with IMEIs get their stock from the IMEIs, booked after the product exists.
    const typedStock = (r: ParsedRow) => (r.imeis.length ? 0 : r.stock ?? 0);

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
      stock: withVariants ? 0 : typedStock(first),
      shopId: shopId ?? undefined,
      ...(tracksExpiry && { expiryTracked: true }),
    }, scope);

    // Names and codes now taken, so later rows in this run see them.
    const made: ExistingProduct = {
      id: product.id, name: first.name, isActive: true, hasVariants: withVariants, service: false, imei: false,
      price: first.price ?? 0, costPrice: first.costPrice ?? 0, variants: [],
    };
    index.names.set(g.key, [made]);
    index.byId.set(product.id, made);
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
              stock: single ? typedStock(r) : 0,
              lowStockAlert: r.lowStockAlert ?? first.lowStockAlert ?? undefined,
            },
          });
        }
      }
      const created = await this.variants.bulkCreate(user, product.id, lines.map((l) => l.dto), scope, shopId ?? undefined);
      const idByName = new Map(created.items.map((v) => [keyOf(v.name), v.id]));
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

    for (const { row, variantId } of batches) {
      // Phones: the IMEIs are the stock, booked as opening stock.
      if (row.imeis.length) {
        if (!shopId) continue;
        try {
          await this.imeiService.bulkCreate(user, {
            shopId, productId: product.id, variantId: variantId ?? undefined,
            costPrice: row.costPrice ?? first.costPrice ?? undefined,
            imeis: row.imeis.map((imei1) => ({ imei1 })),
          }, { inType: 'OPENING_BALANCE', reference: 'IMPORT', note: `${IMPORT_REASON}: ${row.imeis.length} IMEI` });
        } catch (e) {
          warnings.push(`Product ban gaya magar IMEI nahi lage: ${writeError(e)}`);
        }
        continue;
      }
      // Opening stock is already booked; the batch records where it came from.
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

  /** Branch for the stock, or null when no row moves stock and none was picked. */
  private async stockShop(user: AuthenticatedUser, scope: ShopScope, groups: Group[], shopId?: string) {
    const needs = groups.some((g) => (g.existing
      ? [...(g.plans?.values() ?? [])].some((p) => p.stock !== null || p.imeis.length)
      : g.status === 'new' && g.rows.some((r) => (r.stock ?? 0) > 0)));
    if (!needs && !shopId) return null;
    const id = await resolveWriteShopId(this.prisma, user.tenantId, scope, shopId);
    assertShopAccess(user, id, 'Opening stock');
    const shop = await this.prisma.shop.findUnique({ where: { id }, select: { id: true, name: true } });
    return shop;
  }

  private async catalogIndex(tenantId: string): Promise<CatalogIndex> {
    const [products, variants, units, combos, categories, brands, phones] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId },
        select: { id: true, name: true, sku: true, barcode: true, isActive: true, hasVariants: true, productType: true, unit: true, price: true, costPrice: true },
      }),
      this.prisma.productVariant.findMany({
        where: { product: { tenantId } },
        select: { id: true, productId: true, name: true, size: true, color: true, sku: true, barcode: true, price: true, costPrice: true, product: { select: { name: true } } },
      }),
      this.prisma.productUnit.findMany({
        where: { tenantId, OR: [{ sku: { not: null } }, { barcode: { not: null } }] },
        select: { unitName: true, sku: true, barcode: true, product: { select: { name: true } } },
      }),
      this.prisma.productCombo.findMany({ where: { tenantId, barcode: { not: null } }, select: { name: true, barcode: true } }),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.productImei.findMany({ where: { tenantId }, distinct: ['productId'], select: { productId: true } }),
    ]);

    const imeiProducts = new Set(phones.map((p) => p.productId));
    const names = new Map<string, ExistingProduct[]>();
    const byId = new Map<string, ExistingProduct>();
    const codes = new Map<string, string>();
    const codeTargets = new Map<string, { productId: string; variantId: string | null }>();
    const addCode = (c: string | null, owner: string, target?: { productId: string; variantId: string | null }) => {
      if (!c?.trim() || codes.has(keyOf(c))) return;
      codes.set(keyOf(c), owner);
      if (target) codeTargets.set(keyOf(c), target);
    };
    for (const p of products) {
      const item: ExistingProduct = {
        id: p.id, name: p.name, isActive: p.isActive, hasVariants: p.hasVariants,
        service: isServiceProduct(p), imei: imeiProducts.has(p.id),
        price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0, variants: [],
      };
      byId.set(p.id, item);
      const list = names.get(keyOf(p.name)) ?? [];
      list.push(item);
      names.set(keyOf(p.name), list);
      addCode(p.sku, `product "${p.name}"`, { productId: p.id, variantId: null });
      addCode(p.barcode, `product "${p.name}"`, { productId: p.id, variantId: null });
    }
    for (const v of variants) {
      byId.get(v.productId)?.variants.push({
        id: v.id, name: v.name, size: v.size, color: v.color, price: Number(v.price) || 0, costPrice: Number(v.costPrice) || 0,
      });
      addCode(v.sku, `"${v.product.name} (${v.name})"`, { productId: v.productId, variantId: v.id });
      addCode(v.barcode, `"${v.product.name} (${v.name})"`, { productId: v.productId, variantId: v.id });
    }
    for (const u of units) {
      addCode(u.sku, `"${u.product.name}" ki ${u.unitName}`);
      addCode(u.barcode, `"${u.product.name}" ki ${u.unitName}`);
    }
    for (const c of combos) addCode(c.barcode, `combo "${c.name}"`);

    return {
      names,
      byId,
      codes,
      codeTargets,
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
    const saved = await this.closeChunk(job, dto, tally, errors, { changes, failedRows: failedInputs(dto.rows, rows) });
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
      const out: PriceRowCheck = { row: r.row, name: r.name, status: 'error', errors, warnings, fieldErrors: r.fieldErrors };
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
          addError(out, r.sku ? 'sku' : 'barcode', `SKU/barcode ${codes.join(' / ')} kisi product par nahi mila`);
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
          addError(out, 'name', `"${r.name}${sub ? ` (${sub})` : ''}" nahi mila — naam bilkul wesa likhein jaisa products me hai, ya SKU/barcode dein`);
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
        addError(out, 'price', 'Price 0 nahi ho sakti');
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
    extra: ChunkExtra = {},
  ) {
    const oldErrors = Array.isArray(job.errors) ? (job.errors as unknown as JobError[]) : [];
    // Re-read: an earlier chunk may have written metadata after this job row was loaded.
    const fresh = await this.prisma.bulkImportJob.findUnique({ where: { id: job.id }, select: { metadata: true } });
    const source = fresh?.metadata ?? job.metadata;
    const meta = (source && typeof source === 'object' && !Array.isArray(source) ? source : {}) as Record<string, unknown>;
    const oldChanges = Array.isArray(meta.changes) ? (meta.changes as unknown[]) : [];
    const oldIds = Array.isArray(meta.productIds) ? (meta.productIds as string[]) : [];
    const num = (v: unknown) => (typeof v === 'number' ? v : 0);
    const nextMeta: Record<string, unknown> = { ...meta };
    if (extra.changes?.length) nextMeta.changes = [...oldChanges, ...extra.changes].slice(0, MAX_SAVED_CHANGES);
    if (extra.productIds?.length) nextMeta.productIds = [...new Set([...oldIds, ...extra.productIds])].slice(0, MAX_SAVED_PRODUCTS);
    if (extra.created !== undefined) nextMeta.created = num(meta.created) + extra.created;
    if (extra.updated !== undefined) nextMeta.updated = num(meta.updated) + extra.updated;
    if (extra.stockUnits !== undefined) nextMeta.stockUnits = r2(num(meta.stockUnits) + extra.stockUnits);
    if (extra.failedRows?.length) {
      const old = Array.isArray(meta.failedRows) ? (meta.failedRows as unknown[]) : [];
      nextMeta.failedRows = [...old, ...extra.failedRows].slice(0, MAX_SAVED_FAILED);
    }

    const updated = await this.prisma.bulkImportJob.update({
      where: { id: job.id },
      data: {
        processedRows: { increment: dto.rows.length },
        successCount: { increment: tally.success },
        skipCount: { increment: tally.skip },
        errorCount: { increment: tally.error },
        errors: [...oldErrors, ...errors].slice(0, MAX_SAVED_ERRORS) as unknown as Prisma.InputJsonValue,
        metadata: nextMeta as Prisma.InputJsonValue,
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

  private jobView(j: { id: string; jobType: BulkJobType; fileName: string; totalRows: number; processedRows: number; successCount: number; errorCount: number; skipCount: number; status: string; startedAt: Date | null; completedAt: Date | null; createdAt: Date; updatedAt: Date; metadata?: Prisma.JsonValue }) {
    const meta = (j.metadata && typeof j.metadata === 'object' && !Array.isArray(j.metadata) ? j.metadata : {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
    return {
      created: num(meta.created), updated: num(meta.updated), stockUnits: num(meta.stockUnits),
      productCount: Array.isArray(meta.productIds) ? meta.productIds.length : 0,
      failedSaved: Array.isArray(meta.failedRows) ? meta.failedRows.length : 0,
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
      take: 100,
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
      failedRows: Array.isArray(meta.failedRows) ? meta.failedRows : [],
    };
  }
}
