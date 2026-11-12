/**
 * Theme files: "Shopify theme laayein" (the merchant's downloaded Shopify
 * theme zip) and the Nafaa theme file (backup / move between stores).
 *
 * An import only ever writes a new DRAFT version. The merchant's previous
 * draft is kept as an ARCHIVED version (so "Chhor dein" restores it) and the
 * published version is never read for writing. Logo, favicon and social
 * links from the file are held in the report and applied to the store only
 * when the merchant presses "Live karein" here.
 *
 * The last import report lives in NafaaStore.migration.themeImport (next to
 * the Shopify migration run), so no new column is needed.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, StoreThemeVersion } from '@prisma/client';
import * as dns from 'dns';
import * as net from 'net';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { UploadsService } from '../../modules/uploads/uploads.service';
import { ShopifyService } from '../online-orders/shopify.service';
import { StoreAccessService, StoreCtx } from './store-access.service';
import { StoreRevalidateService } from './store-revalidate.service';
import { StoreThemeService } from './store-theme.service';
import { mergeSettings } from './store-settings';
import { ThemeDoc, ThemeDocError, ThemeId, cleanThemeDoc, themeRefs } from './theme/theme-doc';
import { presetDoc } from './theme/presets';
import {
  MappedTheme, Skip, ThemeImportError, ZIP_LIMITS, mapShopifyTheme, readThemeZip, readZipAssets, resolveRefs,
} from './theme/shopify-theme-import';
import { NafaaThemeFileError, buildNafaaThemeFile, readNafaaThemeFile } from './theme/nafaa-theme-file';

export interface ThemeImportReport {
  id: string;
  source: 'shopify' | 'nafaa';
  status: 'draft' | 'published' | 'discarded';
  fileName: string | null;
  themeName: string;
  themeVersion: string | null;
  basePreset: ThemeId;
  importedAt: string;
  importedBy: string | null;
  imported: {
    sections: Array<{ template: string; from: string; to: string }>;
    images: number;
    colours: Array<{ token: string; value: string }>;
    fonts: Array<{ from: string; to: string; exact: boolean; role: 'heading' | 'body' }>;
  };
  skipped: Skip[];
  /** Store settings from the file, applied on "Live karein". */
  pending: { logoUrl: string | null; faviconUrl: string | null; logoWidth: number | null; social: Record<string, string> };
  settingsApplied: boolean;
  draftVersionId: string;
  previousDraftVersionId: string | null;
  previousDraftNote: string | null;
}

const MAX_REMOTE_IMAGES = 40;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const IMAGE_BUDGET_MS = 60_000;
const json = (v: unknown) => v as Prisma.InputJsonValue;
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});

/** Short form of the last theme import for the Nafaa admin panel. */
export function themeImportSummary(migration: unknown): { importedAt: string; source: 'shopify' | 'nafaa'; themeName: string; themeVersion: string | null; status: string; skipped: number; sections: number } | null {
  const r = obj(obj(migration).themeImport);
  if (!r.id || !r.importedAt) return null;
  return {
    importedAt: String(r.importedAt), source: r.source === 'nafaa' ? 'nafaa' : 'shopify', themeName: String(r.themeName ?? ''), themeVersion: r.themeVersion ?? null,
    status: String(r.status ?? 'draft'), skipped: Array.isArray(r.skipped) ? r.skipped.length : 0, sections: Array.isArray(obj(r.imported).sections) ? obj(r.imported).sections.length : 0,
  };
}

/** Image type from the first bytes (the file name is not trusted). */
export function sniffImage(b: Uint8Array): string | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  const head = new TextDecoder().decode(b.subarray(0, 512)).trimStart().toLowerCase();
  if ((head.startsWith('<svg') || head.startsWith('<?xml')) && head.includes('<svg')) return 'image/svg+xml';
  return null;
}

/** Comparable key of an image file name: lower case, no Shopify size suffix, no extension. */
export function imageKey(name: string): string {
  let n = name;
  try { n = decodeURIComponent(name); } catch { /* keep as is */ }
  return n.toLowerCase().replace(/\.(png|jpe?g|gif|webp|svg)$/i, '').replace(/_(\d+x\d*|\d*x\d+|small|medium|large|grande|compact|master)(@\dx)?$/i, '');
}

/** Image URLs on a Shopify storefront page, by file key. */
export function shopifyImageUrls(html: string, pageHost: string): Map<string, string> {
  const out = new Map<string, string>();
  const host = pageHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:https?:)?//(cdn\\.shopify\\.com/s/files/[\\w/.-]+?/files/|${host}/cdn/shop/files/)([^"'\\s?)<>]+)(\\?[^"'\\s)<>]*)?`, 'gi');
  for (const m of html.matchAll(re)) {
    const file = m[2];
    const v = /[?&]v=(\d+)/.exec(m[3] ?? '')?.[1];
    const url = `https://${m[1]}${file}${v ? `?v=${v}` : ''}`;
    const key = imageKey(file.split('/').pop() ?? file);
    if (!out.has(key)) out.set(key, url);
  }
  return out;
}

const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^22[4-9]\./, /^2[3-5]\d\./];
function publicAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return !PRIVATE_V4.some((r) => r.test(ip));
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return publicAddress(v6.slice(7));
  return !(v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80'));
}

/** HTTPS GET to a public host only, following at most 3 redirects, with a size cap. */
async function safeGet(url: string, maxBytes: number, timeoutMs = 15_000): Promise<{ body: Buffer; type: string; finalUrl: string } | null> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    let u: URL;
    try { u = new URL(current); } catch { return null; }
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
    const host = u.hostname.toLowerCase();
    if (net.isIP(host) || host === 'localhost' || /\.(local|internal|localhost|lan)$/.test(host) || !host.includes('.')) return null;
    const addrs = await dns.promises.lookup(host, { all: true }).catch(() => []);
    if (!addrs.length || !addrs.every((a) => publicAddress(a.address))) return null;
    let res: Response;
    try {
      res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'Nafaa-Stores/1.0 (theme import)', Accept: '*/*' } });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return null;
      current = new URL(loc, u).toString();
      continue;
    }
    if (!res.ok || !res.body) return null;
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > maxBytes) return null;
    const chunks: Buffer[] = [];
    let total = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) { await reader.cancel().catch(() => null); return null; }
      chunks.push(Buffer.from(value));
    }
    return { body: Buffer.concat(chunks), type: res.headers.get('content-type') ?? '', finalUrl: u.toString() };
  }
  return null;
}

/** "mystore.myshopify.com", "https://www.shop.pk/…" → a bare hostname, or null. */
export function cleanShopHost(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  let host: string;
  try { host = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname; } catch { return null; }
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && !net.isIP(host) ? host : null;
}

@Injectable()
export class StoreThemeImportService {
  private readonly logger = new Logger(StoreThemeImportService.name);
  private readonly busy = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly theme: StoreThemeService,
    private readonly uploads: UploadsService,
    private readonly shopify: ShopifyService,
    private readonly revalidate: StoreRevalidateService,
  ) {}

  // ─── reads ───

  async last(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const report = this.reportOf(ctx.store.migration);
    const channel = await this.prisma.integration.findFirst({ where: { tenantId: ctx.tenantId, type: 'SHOPIFY', isActive: true }, orderBy: { createdAt: 'asc' } });
    return {
      last: report ? await this.withState(report) : null,
      shopify: { connected: !!channel, shop: (channel?.credentials as any)?.shopifyShop ?? null },
      limits: { shopifyZipMb: Math.round(ZIP_LIMITS.maxZipBytes / 1048576), nafaaFileMb: 2 },
    };
  }

  reportOf(migration: unknown): ThemeImportReport | null {
    const r = obj(obj(migration).themeImport);
    return r.id && r.draftVersionId ? (r as ThemeImportReport) : null;
  }

  /** The draft may have been published or replaced from the theme editor since the import. */
  private async withState(report: ThemeImportReport) {
    const row = await this.prisma.storeThemeVersion.findUnique({ where: { id: report.draftVersionId }, select: { status: true } });
    const state = report.status !== 'draft' ? report.status : row?.status === 'PUBLISHED' || (row?.status === 'ARCHIVED' && report.status === 'draft') ? 'published' : 'draft';
    const { pending, ...rest } = report;
    return { ...rest, state, pending: { logo: !!pending.logoUrl, favicon: !!pending.faviconUrl, social: Object.keys(pending.social ?? {}) } };
  }

  // ─── Shopify theme zip ───

  async importShopify(user: AuthenticatedUser, id: string, file: Express.Multer.File | undefined, body: { shopUrl?: string }) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    if (!file?.buffer?.length) throw new BadRequestException('Theme file chunein');
    if (this.busy.has(ctx.store.id)) throw new BadRequestException('Ek theme pehle se aa rahi hai — thora intezar karein');
    this.busy.add(ctx.store.id);
    try {
      const buf = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
      let mapped: MappedTheme;
      let root: string;
      try {
        const files = readThemeZip(buf);
        root = files.root;
        mapped = mapShopifyTheme(files, { currentThemeId: ctx.store.themeId });
      } catch (e) {
        if (e instanceof ThemeImportError) throw new BadRequestException(e.message);
        throw e;
      }

      // Images: the zip's assets, then Shopify Files (connection), then the shop's public page.
      const urls = await this.resolveImages(user, ctx, mapped.images, buf, root, body?.shopUrl);
      const missing = mapped.images.filter((n) => !urls.has(n));
      const skipped: Skip[] = [...mapped.skipped];
      for (const n of missing) skipped.push({ code: 'image_missing', what: n, why: 'Tasveer nahi mili — wahan khaali jagah hai, khud laga dein' });

      // Collections are matched by handle.
      const have = await this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id, handle: { in: mapped.collections } }, select: { handle: true } });
      const known = new Set(have.map((c) => c.handle));
      for (const h of mapped.collections) if (!known.has(h)) skipped.push({ code: 'collection_missing', what: h, why: 'Ye collection Nafaa par nahi mili — khaali chhor di (sab products dikhenge)' });

      let doc: ThemeDoc;
      try {
        doc = cleanThemeDoc(resolveRefs(mapped.doc, urls, known), presetDoc(mapped.basePreset));
      } catch (e) {
        if (e instanceof ThemeDocError) throw new BadRequestException(e.message);
        throw e;
      }
      const logo = mapped.settings.logo ? urls.get(mapped.settings.logo.replace(/^shopify:\/\/shop_images\//, '')) ?? (mapped.settings.logo.startsWith('https://') ? mapped.settings.logo : null) : null;
      const favicon = mapped.settings.favicon ? urls.get(mapped.settings.favicon.replace(/^shopify:\/\/shop_images\//, '')) ?? null : null;

      return await this.writeDraft(user, ctx, doc, {
        source: 'shopify',
        fileName: (file.originalname ?? '').slice(0, 120) || null,
        themeName: mapped.themeName,
        themeVersion: mapped.themeVersion,
        basePreset: mapped.basePreset,
        imported: { sections: mapped.sections, images: urls.size, colours: mapped.colours, fonts: mapped.fonts },
        skipped: skipped.slice(0, 200),
        pending: { logoUrl: logo, faviconUrl: favicon, logoWidth: mapped.settings.logoWidth, social: mapped.settings.social },
      });
    } finally {
      this.busy.delete(ctx.store.id);
    }
  }

  private async resolveImages(user: AuthenticatedUser, ctx: StoreCtx, names: string[], zip: Uint8Array, root: string, shopUrl?: string): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (!names.length) return out;
    const deadline = Date.now() + IMAGE_BUDGET_MS;
    const store = async (name: string, data: Uint8Array) => {
      const type = sniffImage(data);
      if (!type || data.length > MAX_IMAGE_BYTES) return;
      try {
        const rec = await this.uploads.uploadOne(user, { buffer: Buffer.from(data), mimetype: type, originalname: name.slice(0, 120), size: data.length } as Express.Multer.File, 'website');
        if (rec?.url) out.set(name, rec.url);
      } catch (e: any) {
        this.logger.warn(`Theme import: upload of ${name} failed: ${e?.message}`);
      }
    };

    // 1. Inside the zip.
    const assets = readZipAssets(zip, root, names);
    for (const [name, data] of assets) await store(name, data);

    let left = names.filter((n) => !out.has(n)).slice(0, MAX_REMOTE_IMAGES);
    if (!left.length) return out;
    const found = new Map<string, string>();
    const allowedHosts = new Set<string>(['cdn.shopify.com']);

    // 2. Shopify Files through the existing connection (needs read_files).
    const channel = await this.prisma.integration.findFirst({ where: { tenantId: ctx.tenantId, type: 'SHOPIFY', isActive: true }, orderBy: { createdAt: 'asc' } });
    const shopHost = cleanShopHost((channel?.credentials as any)?.shopifyShop);
    if (channel && shopHost) {
      allowedHosts.add(shopHost);
      const client = await this.shopify.client(channel).catch(() => null);
      const scopes = client ? (await client.accessScopes()).scopes : [];
      if (client && (scopes.includes('read_files') || scopes.includes('write_files'))) {
        for (let i = 0; i < left.length && Date.now() < deadline; i += 10) {
          const chunk = left.slice(i, i + 10);
          const q = chunk.map((n) => `filename:'${n.replace(/['\\]/g, '')}'`).join(' OR ');
          try {
            const data: any = await client.graphql(`query($q: String!) { files(first: 50, query: $q) { nodes { ... on MediaImage { image { url } } ... on GenericFile { url } } } }`, { q });
            for (const node of data?.files?.nodes ?? []) {
              const url: string | undefined = node?.image?.url ?? node?.url;
              if (!url) continue;
              const key = imageKey(decodeURIComponent(new URL(url).pathname.split('/').pop() ?? ''));
              for (const n of chunk) if (imageKey(n) === key && !found.has(n)) found.set(n, url);
            }
          } catch (e: any) {
            this.logger.warn(`Theme import: Shopify files query failed: ${e?.message}`);
            break;
          }
        }
      }
    }

    // 3. The shop's public home page.
    left = left.filter((n) => !found.has(n));
    const pageHost = shopHost ?? cleanShopHost(shopUrl);
    if (left.length && pageHost && Date.now() < deadline) {
      const page = await safeGet(`https://${pageHost}/`, MAX_HTML_BYTES);
      if (page && /html/i.test(page.type)) {
        const finalHost = new URL(page.finalUrl).hostname;
        allowedHosts.add(finalHost);
        const onPage = shopifyImageUrls(page.body.toString('utf8'), finalHost);
        for (const n of left) { const u = onPage.get(imageKey(n)); if (u) found.set(n, u); }
      }
    }

    // Download what was found and keep a copy in Nafaa's storage.
    for (const [name, url] of found) {
      if (Date.now() > deadline) break;
      let host: string;
      try { host = new URL(url).hostname; } catch { continue; }
      if (!allowedHosts.has(host)) continue;
      const got = await safeGet(url, MAX_IMAGE_BYTES);
      if (got) await store(name, got.body);
    }
    return out;
  }

  // ─── Nafaa theme file ───

  async exportFile(user: AuthenticatedUser, id: string, which?: string) {
    const ctx = await this.access.requireStore(user, id);
    const v = which === 'draft' ? await this.theme.draft(ctx.store.id) : (await this.theme.published(ctx.store.id)) ?? (await this.theme.draft(ctx.store.id));
    const s = ctx.settings;
    const file = buildNafaaThemeFile({ storeName: ctx.store.name, doc: v.doc as unknown as ThemeDoc, settings: { logoUrl: s.logoUrl, faviconUrl: s.faviconUrl, logoWidth: s.logoWidth, social: { ...s.social, whatsapp: undefined } } });
    const date = new Date().toISOString().slice(0, 10);
    return { fileName: `${ctx.store.slug}-${date}.nafaa-theme.json`, which: v.status === 'PUBLISHED' ? 'live' : 'draft', file };
  }

  async importNafaa(user: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    if (!file?.buffer?.length) throw new BadRequestException('Theme file chunein');
    let parsed: ReturnType<typeof readNafaaThemeFile>;
    try {
      parsed = readNafaaThemeFile(new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength));
    } catch (e) {
      if (e instanceof NafaaThemeFileError) throw new BadRequestException(e.message);
      throw e;
    }
    const refs = themeRefs(parsed.doc);
    const have = await this.prisma.storeCollection.findMany({ where: { storeId: ctx.store.id, handle: { in: refs.collections } }, select: { handle: true } });
    const known = new Set(have.map((c) => c.handle));
    const skipped: Skip[] = refs.collections.filter((h) => !known.has(h)).map((h) => ({ code: 'collection_missing', what: h, why: 'Ye collection Nafaa par nahi mili — khaali chhor di (sab products dikhenge)' }));
    if (refs.products.length) skipped.push({ code: 'product_ref', what: `${refs.products.length}`, why: 'Chune hue products is store ke nahi ho sakte — check kar lein' });
    const doc = cleanThemeDoc(resolveRefs(parsed.doc, new Map(), known), presetDoc(parsed.doc.themeId));
    return this.writeDraft(user, ctx, doc, {
      source: 'nafaa',
      fileName: (file.originalname ?? '').slice(0, 120) || null,
      themeName: parsed.storeName || 'Nafaa theme',
      themeVersion: parsed.exportedAt ? parsed.exportedAt.slice(0, 10) : null,
      basePreset: doc.themeId,
      imported: {
        sections: Object.entries(doc.templates).flatMap(([k, t]) => t.sections.map((s) => ({ template: k, from: s.type, to: s.type }))),
        images: 0,
        colours: Object.entries(doc.tokens.colors).map(([token, value]) => ({ token, value })),
        fonts: [{ from: doc.tokens.fonts.heading, to: doc.tokens.fonts.heading, exact: true, role: 'heading' }, { from: doc.tokens.fonts.body, to: doc.tokens.fonts.body, exact: true, role: 'body' }],
      },
      skipped,
      pending: parsed.settings,
    });
  }

  // ─── draft, publish, discard ───

  /**
   * Keeps the current draft as an ARCHIVED version and adds the imported
   * doc as the new DRAFT. The PUBLISHED version is not touched.
   */
  async writeDraft(user: AuthenticatedUser, ctx: StoreCtx, doc: ThemeDoc, r: Omit<ThemeImportReport, 'id' | 'status' | 'importedAt' | 'importedBy' | 'settingsApplied' | 'draftVersionId' | 'previousDraftVersionId' | 'previousDraftNote'>) {
    const current = await this.theme.draft(ctx.store.id);
    const label = r.source === 'shopify' ? `Shopify theme: ${r.themeName}${r.themeVersion ? ` ${r.themeVersion}` : ''}` : `Theme file: ${r.themeName}`;
    const { created, report } = await this.prisma.$transaction(async (tx) => {
      await tx.storeThemeVersion.update({ where: { id: current.id }, data: { status: 'ARCHIVED', note: 'Theme laane se pehle ka draft' } });
      const max = await tx.storeThemeVersion.aggregate({ where: { storeId: ctx.store.id }, _max: { version: true } });
      const created = await tx.storeThemeVersion.create({
        data: { storeId: ctx.store.id, tenantId: ctx.tenantId, version: (max._max.version ?? 0) + 1, status: 'DRAFT', themeId: doc.themeId, doc: json(doc), note: label.slice(0, 200) },
      });
      const report: ThemeImportReport = {
        ...r,
        id: `ti${Date.now().toString(36)}`,
        status: 'draft',
        importedAt: new Date().toISOString(),
        importedBy: user.id,
        settingsApplied: false,
        draftVersionId: created.id,
        previousDraftVersionId: current.id,
        previousDraftNote: current.note,
      };
      const fresh = await tx.nafaaStore.findUnique({ where: { id: ctx.store.id }, select: { migration: true } });
      await tx.nafaaStore.update({ where: { id: ctx.store.id }, data: { migration: json({ ...obj(fresh?.migration), themeImport: report }) } });
      return { created, report };
    });
    return { report: await this.withState(report), draft: this.present(created) };
  }

  private present(v: StoreThemeVersion) {
    return { id: v.id, version: v.version, status: v.status, doc: v.doc as unknown as ThemeDoc, updatedAt: v.updatedAt.toISOString() };
  }

  private async saveReport(storeId: string, report: ThemeImportReport) {
    const fresh = await this.prisma.nafaaStore.findUnique({ where: { id: storeId }, select: { migration: true } });
    await this.prisma.nafaaStore.update({ where: { id: storeId }, data: { migration: json({ ...obj(fresh?.migration), themeImport: report }) } });
  }

  /** "Live karein": publishes the imported draft (the usual publish) and applies the logo/links from the file. */
  async publish(user: AuthenticatedUser, id: string) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    const report = this.reportOf(ctx.store.migration);
    if (!report || report.status === 'discarded') throw new NotFoundException('Laayi hui theme nahi mili');
    const row = await this.prisma.storeThemeVersion.findUnique({ where: { id: report.draftVersionId }, select: { status: true } });
    if (row?.status === 'DRAFT') await this.theme.publish(user, id, { note: report.source === 'shopify' ? `Shopify theme: ${report.themeName}` : `Theme file: ${report.themeName}` });
    if (!report.settingsApplied) {
      const p = report.pending;
      const patch: Record<string, unknown> = {};
      if (p.logoUrl) patch.logoUrl = p.logoUrl;
      if (p.faviconUrl) patch.faviconUrl = p.faviconUrl;
      if (p.logoWidth) patch.logoWidth = p.logoWidth;
      if (Object.keys(p.social ?? {}).length) patch.social = p.social;
      if (Object.keys(patch).length) {
        const store = await this.prisma.nafaaStore.findUniqueOrThrow({ where: { id: ctx.store.id }, select: { settings: true } });
        await this.prisma.nafaaStore.update({ where: { id: ctx.store.id }, data: { settings: json(mergeSettings(store.settings, patch)) } });
        this.access.invalidate(ctx.store.id);
        void this.revalidate.send(ctx.store.id);
      }
    }
    const next: ThemeImportReport = { ...report, status: 'published', settingsApplied: true };
    await this.saveReport(ctx.store.id, next);
    return { report: await this.withState(next) };
  }

  /** "Chhor dein": the draft from before the import comes back; nothing is removed. */
  async discard(user: AuthenticatedUser, id: string) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    const report = this.reportOf(ctx.store.migration);
    if (!report || report.status !== 'draft') throw new BadRequestException('Chhorne ke liye koi laayi hui theme nahi');
    const row = await this.prisma.storeThemeVersion.findUnique({ where: { id: report.draftVersionId } });
    if (!row || row.status !== 'DRAFT') throw new BadRequestException('Ye design live ho chuka hai — History se purana design wapas laayein');
    const prev = report.previousDraftVersionId ? await this.prisma.storeThemeVersion.findFirst({ where: { id: report.previousDraftVersionId, storeId: ctx.store.id } }) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.storeThemeVersion.update({ where: { id: row.id }, data: { status: 'ARCHIVED', note: `${row.note ?? 'Theme'} (chhor diya)`.slice(0, 200) } });
      if (prev && prev.status === 'ARCHIVED') {
        await tx.storeThemeVersion.update({ where: { id: prev.id }, data: { status: 'DRAFT', note: report.previousDraftNote } });
      }
    });
    // Without the old draft row the next read makes a fresh draft from the published version.
    const draft = await this.theme.draft(ctx.store.id);
    const next: ThemeImportReport = { ...report, status: 'discarded' };
    await this.saveReport(ctx.store.id, next);
    return { report: await this.withState(next), draft: this.present(draft) };
  }
}
