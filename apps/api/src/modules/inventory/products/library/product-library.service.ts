/**
 * Product library: ready-made products for every industry (DRAP medicines,
 * the grocery catalog, starter packs), searched in memory and imported as
 * normal tenant products in a background job.
 *
 * Pharmacy imports also write the medicine record (DRAP registration, form,
 * pack, company) and link the salts, so substitutes by formula work at once.
 * Jobs live in memory on the API instance that runs them.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CatalogImporter, type CatalogImportRow } from '../catalog-import';
import { formulaKeyFromLabel, normSaltName, parseStrength } from '../../../../industries/pharmacy/common/strength';
import { LIBRARY_LABELS, libraryKeyFor, loadLibraries, searchText, type LibraryBook, type LibraryItem } from './library-data';

export interface LibraryFilters {
  library?: string;
  q?: string;
  category?: string;
  brand?: string;
  manufacturer?: string;
  formula?: string;
  form?: string;
}

export interface LibraryImportBody {
  library?: string;
  ids?: string[];
  all?: LibraryFilters;
  /** Pharmacy: cost = MRP × (1 − margin%). Others: cost for rows without one. */
  marginPercent?: number;
  /** Round the computed cost to this step (e.g. 1 or 0.5). */
  roundTo?: number;
  shopId?: string;
  openingStock?: number;
  /** Prices typed in the library, by item id; required for rows that need a price. */
  prices?: Record<string, { price?: number; costPrice?: number }>;
  /** Barcode to put on a picked item, by item id (a scan that matched no product). */
  barcodes?: Record<string, string>;
  /** Give rows without a barcode a Nafaa in-store barcode. */
  generateBarcodes?: boolean;
}

export interface LibraryImportJob {
  id: string;
  tenantId: string;
  library: string;
  status: 'running' | 'done' | 'failed';
  total: number;
  done: number;
  created: number;
  /** Already in the shop. */
  skipped: number;
  /** Rows that need a price the user did not type. */
  needsPrice: number;
  /** Imported without their barcode because another product has it. */
  barcodeDuplicates: number;
  barcodesGenerated: number;
  brandsCreated: number;
  categoriesCreated: number;
  saltsCreated: number;
  errors: Array<{ name: string; error: string }>;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

const PHARMACY_MARGIN = 15;
const CHUNK = 500;
const JOB_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_PAGE = 200;

const lower = (s: string | null | undefined) => (s ?? '').toLowerCase().trim();
const round = (n: number, step: number) => Math.round(Math.round(n / step) * step * 100) / 100;

interface BookMeta {
  categories: Array<{ name: string; count: number }>;
  companies: Array<{ name: string; count: number }>;
  forms: Array<{ name: string; count: number }>;
  needsPrice: number;
  withBarcode: number;
  /** Medicines per salt set, for the "same formula" count. */
  formulaCounts: Map<string, number>;
}

function counts(values: Array<string | null | undefined>, limit?: number) {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  const list = [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return limit ? list.slice(0, limit) : list;
}

@Injectable()
export class ProductLibraryService {
  private readonly logger = new Logger(ProductLibraryService.name);
  private books: Map<string, LibraryBook> | null = null;
  private readonly metaCache = new Map<string, BookMeta>();
  private readonly jobs = new Map<string, LibraryImportJob>();

  private library() {
    this.books ??= loadLibraries(this.logger);
    return this.books;
  }

  /** The tenant's own library key from its business type. */
  private async tenantKey(tenantId: string) {
    const [tenant, settings] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessType: true } }),
      this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { businessType: true } }),
    ]);
    const businessType = tenant?.businessType || settings?.businessType || null;
    return { businessType, key: libraryKeyFor(businessType) };
  }

  /** The asked-for library, else the tenant's own. */
  private async book(user: AuthenticatedUser, asked?: string) {
    const own = await this.tenantKey(user.tenantId);
    const key = asked?.trim() || own.key;
    return { ...own, key, book: this.library().get(key) ?? null };
  }

  private bookMeta(book: LibraryBook): BookMeta {
    let m = this.metaCache.get(book.key);
    if (!m) {
      m = {
        categories: counts(book.items.map((i) => i.category)),
        companies: counts(book.items.map((i) => i.company), 300),
        forms: book.kind === 'pharmacy' ? counts(book.items.map((i) => i.form)) : [],
        needsPrice: book.items.filter((i) => i.needsPrice).length,
        withBarcode: book.items.filter((i) => i.barcode).length,
        formulaCounts: new Map(),
      };
      for (const i of book.items) if (i.formulaKey) m.formulaCounts.set(i.formulaKey, (m.formulaCounts.get(i.formulaKey) ?? 0) + 1);
      this.metaCache.set(book.key, m);
    }
    return m;
  }

  constructor(private readonly prisma: PrismaService) {}

  async meta(user: AuthenticatedUser, library?: string) {
    const { businessType, key, book } = await this.book(user, library);
    const libraries = [...this.library().values()]
      .map((b) => ({ key: b.key, label: LIBRARY_LABELS[b.key] ?? b.key, count: b.items.length, kind: b.kind }))
      .sort((a, b) => Number(b.key === key) - Number(a.key === key) || b.count - a.count);
    if (!book) {
      return { library: key, label: LIBRARY_LABELS[key] ?? key, businessType, available: false, libraries };
    }
    const m = this.bookMeta(book);
    return {
      library: key,
      label: LIBRARY_LABELS[key] ?? key,
      businessType,
      available: true,
      kind: book.kind,
      total: book.items.length,
      categories: m.categories,
      companies: m.companies,
      forms: m.forms,
      needsPrice: m.needsPrice,
      withBarcode: m.withBarcode,
      estimates: book.estimates,
      source: book.source,
      updated: book.updated,
      openFoodFacts: book.openFoodFacts,
      defaultMargin: book.kind === 'pharmacy' ? PHARMACY_MARGIN : null,
      libraries,
    };
  }

  /** Indexes of the items that match, best first when there is a search. */
  private match(book: LibraryBook, f: LibraryFilters): LibraryItem[] {
    const q = (f.q ?? '').trim();
    if (/^\d{8,14}$/.test(q)) {
      const hits = book.byBarcode.get(q);
      if (hits?.length) return hits;
    }
    const tokens = q ? searchText(q).split(' ').filter(Boolean) : [];
    const category = lower(f.category);
    const company = lower(f.manufacturer || f.brand);
    const form = lower(f.form);
    // A formula is a key from an item, or a generic label typed elsewhere ("Ceftriaxone 1gm").
    const rawFormula = f.formula?.trim() || '';
    const formula = rawFormula && !rawFormula.includes('@') ? formulaKeyFromLabel(rawFormula) ?? rawFormula : rawFormula;
    const first = tokens[0] ?? '';
    const scored: Array<{ it: LibraryItem; score: number }> = [];
    for (let i = 0; i < book.items.length; i++) {
      const it = book.items[i];
      if (category && lower(it.category) !== category) continue;
      if (company && lower(it.company) !== company) continue;
      if (form && lower(it.form) !== form) continue;
      if (formula && it.formulaKey !== formula) continue;
      if (tokens.length) {
        const h = book.haystack[i];
        if (!tokens.every((t) => h.includes(t))) continue;
        const name = it.name.toLowerCase();
        scored.push({ it, score: name.startsWith(first) ? 0 : name.includes(first) ? 1 : 2 });
      } else {
        scored.push({ it, score: 0 });
      }
    }
    if (tokens.length) scored.sort((a, b) => a.score - b.score);
    return scored.map((s) => s.it);
  }

  /** Which of these items the tenant already has, by name, barcode or DRAP registration + pack. */
  private async addedIds(tenantId: string, items: LibraryItem[]): Promise<Set<string>> {
    if (!items.length) return new Set();
    const names = [...new Set(items.map((i) => i.name))];
    const barcodes = [...new Set(items.map((i) => i.barcode).filter(Boolean) as string[])];
    const regNos = [...new Set(items.map((i) => i.regNo).filter(Boolean) as string[])];
    const [products, medicines] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, OR: [{ name: { in: names, mode: 'insensitive' } }, ...(barcodes.length ? [{ barcode: { in: barcodes } }] : [])] },
        select: { name: true, barcode: true },
      }),
      regNos.length
        ? this.prisma.pharmacyMedicine.findMany({ where: { tenantId, registrationNumber: { in: regNos } }, select: { registrationNumber: true, packSize: true } })
        : Promise.resolve([]),
    ]);
    const haveNames = new Set(products.map((p) => lower(p.name)));
    const haveCodes = new Set(products.map((p) => p.barcode).filter(Boolean));
    const haveRegs = new Set(medicines.map((m) => `${m.registrationNumber}|${lower(m.packSize)}`));
    return new Set(items.filter((i) => haveNames.has(lower(i.name))
      || (i.barcode && haveCodes.has(i.barcode))
      || (i.regNo && haveRegs.has(`${i.regNo}|${lower(i.pack)}`))).map((i) => i.id));
  }

  async items(user: AuthenticatedUser, f: LibraryFilters & { page?: number | string; pageSize?: number | string }) {
    const { key, book } = await this.book(user, f.library);
    if (!book) return { library: key, items: [], total: 0, page: 1, pageSize: 0, pages: 0 };
    const pageSize = Math.min(MAX_PAGE, Math.max(1, Number(f.pageSize) || 50));
    const all = this.match(book, f);
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    const page = Math.min(pages, Math.max(1, Number(f.page) || 1));
    const slice = all.slice((page - 1) * pageSize, page * pageSize);
    const added = await this.addedIds(user.tenantId, slice);
    const { formulaCounts } = this.bookMeta(book);
    return {
      library: key,
      total: all.length,
      page,
      pageSize,
      pages,
      items: slice.map((it) => ({
        ...it,
        alreadyAdded: added.has(it.id),
        ...(it.formulaKey && { sameFormula: formulaCounts.get(it.formulaKey) ?? 1 }),
      })),
    };
  }

  /** Items whose barcode is this code, in every library (POS and product-create scans). */
  async byBarcode(user: AuthenticatedUser, code: string) {
    const c = code.trim();
    if (!c) return { items: [] };
    const own = (await this.tenantKey(user.tenantId)).key;
    const hits: Array<LibraryItem & { library: string }> = [];
    for (const b of this.library().values()) for (const it of b.byBarcode.get(c) ?? []) hits.push({ ...it, library: b.key });
    hits.sort((a, b) => Number(b.library === own) - Number(a.library === own));
    return { items: hits.slice(0, 10) };
  }

  // ─── Import ──────────────────────────────────────────────

  startImport(user: AuthenticatedUser, body: LibraryImportBody) {
    for (const [id, j] of this.jobs) if (Date.now() - Date.parse(j.startedAt) > JOB_TTL_MS && j.status !== 'running') this.jobs.delete(id);
    const running = [...this.jobs.values()].find((j) => j.tenantId === user.tenantId && j.status === 'running');
    if (running) return running;
    const margin = body.marginPercent;
    if (margin != null && (!Number.isFinite(Number(margin)) || Number(margin) < 0 || Number(margin) >= 100)) {
      throw new BadRequestException('Margin 0 se 99 ke darmiyan honi chahiye');
    }
    if (!body.ids?.length && !body.all) throw new BadRequestException('Koi product chuna nahi');
    const job: LibraryImportJob = {
      id: randomUUID(), tenantId: user.tenantId, library: body.library ?? '', status: 'running', total: 0, done: 0,
      created: 0, skipped: 0, needsPrice: 0, barcodeDuplicates: 0, barcodesGenerated: 0, brandsCreated: 0, categoriesCreated: 0,
      saltsCreated: 0, errors: [], startedAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, job);
    setImmediate(() => {
      this.runImport(user, body, job).catch((e: any) => {
        job.status = 'failed';
        job.error = e?.message ?? String(e);
        job.finishedAt = new Date().toISOString();
        this.logger.error(`Library import ${job.id} failed: ${job.error}`);
      });
    });
    return job;
  }

  getJob(user: AuthenticatedUser, jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.tenantId !== user.tenantId) throw new NotFoundException('Import nahi mila');
    return job;
  }

  private async runImport(user: AuthenticatedUser, body: LibraryImportBody, job: LibraryImportJob) {
    const { key, book } = await this.book(user, body.library);
    job.library = key;
    if (!book) throw new BadRequestException('Is business ke liye library abhi tayyar nahi');
    const picked = body.ids?.length
      ? [...new Set(body.ids)].map((id) => book.byId.get(id)).filter(Boolean) as LibraryItem[]
      : this.match(book, body.all ?? {});
    job.total = picked.length;

    const pharmacy = book.kind === 'pharmacy';
    const margin = Number(body.marginPercent ?? PHARMACY_MARGIN);
    const step = Number(body.roundTo) > 0 ? Number(body.roundTo) : 0.01;
    const stock = Math.max(0, Number(body.openingStock) || 0);
    const prices = body.prices ?? {};

    const salts = new Map<string, string>();
    const regs = new Set<string>();
    if (pharmacy) {
      const [have, meds] = await Promise.all([
        this.prisma.salt.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
        this.prisma.pharmacyMedicine.findMany({ where: { tenantId: user.tenantId, registrationNumber: { not: null } }, select: { registrationNumber: true, packSize: true } }),
      ]);
      for (const s of have) salts.set(normSaltName(s.name), s.id);
      for (const m of meds) regs.add(`${m.registrationNumber}|${lower(m.packSize)}`);
    }

    const byKey = new Map(picked.map((it) => [it.id, it]));
    const importer = new CatalogImporter(this.prisma, user.tenantId, user.id, {
      shopId: body.shopId,
      generateBarcodes: !!body.generateBarcodes,
      stockNote: 'Library opening stock',
      afterCreate: pharmacy ? (tx, productId, row) => this.linkMedicine(tx, user.tenantId, productId, byKey.get(row.key)!, salts) : undefined,
    });

    for (let i = 0; i < picked.length; i += CHUNK) {
      const chunk = picked.slice(i, i + CHUNK);
      const rows: CatalogImportRow[] = [];
      for (const it of chunk) {
        if (pharmacy && it.regNo && regs.has(`${it.regNo}|${lower(it.pack)}`)) { job.skipped++; continue; }
        const typed = prices[it.id] ?? {};
        const price = Number(typed.price) > 0 ? Number(typed.price) : it.needsPrice ? 0 : it.price;
        if (!(price > 0) && it.needsPrice) { job.needsPrice++; continue; }
        const cost = typed.costPrice != null && Number(typed.costPrice) >= 0
          ? Number(typed.costPrice)
          : pharmacy || it.costPrice == null ? round(price * (1 - margin / 100), step) : it.costPrice;
        rows.push({
          key: it.id,
          name: it.name,
          brand: it.company,
          category: it.category,
          categoryColor: it.categoryColor ?? null,
          tags: it.tags,
          unit: it.unit,
          price,
          costPrice: cost,
          wholesalePrice: it.wholesalePrice ?? null,
          barcode: body.barcodes?.[it.id]?.trim() || it.barcode || null,
          imageUrl: it.imageUrl ?? null,
          description: it.description ?? null,
          weight: it.weight ?? null,
          weightUnit: it.weightUnit ?? null,
          stock,
        });
      }
      // Rows already in the shop by name are skipped before their salts are made.
      const fresh: CatalogImportRow[] = [];
      for (const r of rows) {
        if (await importer.hasName(r.name)) job.skipped++;
        else fresh.push(r);
      }
      if (pharmacy) job.saltsCreated += await this.ensureSalts(user.tenantId, fresh.map((r) => byKey.get(r.key)!), salts);
      const t = await importer.run(fresh);
      job.created += t.created;
      job.skipped += t.skipped;
      job.barcodeDuplicates += t.barcodeDuplicates;
      job.barcodesGenerated += t.barcodesGenerated;
      job.brandsCreated += t.brandsCreated;
      job.categoriesCreated += t.categoriesCreated;
      if (t.errors.length && job.errors.length < 20) job.errors.push(...t.errors.slice(0, 20 - job.errors.length));
      job.done = Math.min(job.total, i + chunk.length);
    }
    job.status = 'done';
    job.finishedAt = new Date().toISOString();
    this.logger.log(`Library import ${job.id} (${key}): ${job.created} created, ${job.skipped} skipped of ${job.total}`);
  }

  /** Creates the tenant salts these medicines need; returns how many were new. */
  private async ensureSalts(tenantId: string, items: LibraryItem[], salts: Map<string, string>) {
    const missing = new Map<string, string>();
    for (const it of items) {
      for (const s of it.salts ?? []) {
        const k = normSaltName(s.name);
        if (k && !salts.has(k) && !missing.has(k)) missing.set(k, s.name.replace(/\s+/g, ' ').trim());
      }
    }
    if (!missing.size) return 0;
    const res = await this.prisma.salt.createMany({ data: [...missing.values()].map((name) => ({ tenantId, name })), skipDuplicates: true });
    const rows = await this.prisma.salt.findMany({ where: { tenantId, name: { in: [...missing.values()] } }, select: { id: true, name: true } });
    for (const r of rows) salts.set(normSaltName(r.name), r.id);
    return res.count;
  }

  /** Medicine record and salt links for a product made from a DRAP row. */
  private async linkMedicine(tx: Prisma.TransactionClient, tenantId: string, productId: string, it: LibraryItem, salts: Map<string, string>) {
    await tx.pharmacyMedicine.create({
      data: {
        tenantId,
        productId,
        registrationNumber: it.regNo ?? null,
        dosageForm: it.form ?? null,
        packSize: it.pack ?? null,
        packUnit: it.unit,
        manufacturer: it.company ?? null,
        isRefrigerated: it.form === 'Vaccine',
      },
    });
    const seen = new Set<string>();
    const links = (it.salts ?? []).flatMap((s) => {
      const saltId = salts.get(normSaltName(s.name));
      if (!saltId || seen.has(saltId)) return [];
      seen.add(saltId);
      const p = parseStrength(s.strength);
      return [{ productId, saltId, strength: s.strength ?? '', strengthValue: p.value, strengthUnit: p.unit, isMainSalt: seen.size === 1 }];
    });
    if (links.length) await tx.productSalt.createMany({ data: links, skipDuplicates: true });
  }
}
