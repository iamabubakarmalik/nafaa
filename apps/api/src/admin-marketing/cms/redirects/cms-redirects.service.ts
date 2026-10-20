/**
 * Redirect rules (API-CONTRACT 8.5, ARCH 7.5).
 *
 * On save, chains are flattened (A → B plus B → C becomes A → C, and older
 * rules that pointed at the new rule's source are repointed) and loops are
 * rejected with 422. A rule with `entryId` follows that entry: the public
 * list serves the entry's current live path.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CmsRedirectSource, Prisma, type CmsRedirect } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_LOCALE,
  KNOWN_LOCALES,
  cacheTags,
  createRedirectBodySchema,
  redirectImportRowSchema,
  type AdminRedirect,
  type CreateRedirectBody,
  type Paginated,
  type PatchRedirectBody,
  type PublicRedirect,
  type PublicRedirectsResponse,
  type RedirectImportBody,
  type RedirectImportResult,
  type RedirectStatus,
  type RedirectTestResult,
  type RedirectWarning,
} from '../contract/cms-contract';
import { localizedPath } from '../paths/cms-paths';
import { checksFailed, iso } from '../public/cms-http';
import { CmsSiteEvents } from '../public/cms-site-events.service';
import { paginated, parsePagination } from '../../_shared/helpers/pagination.helper';
import { RedirectMatcher, csvCell, looksLikePattern, normalizeRedirectPath, type RedirectRule } from './redirect-match';

type Db = PrismaService | Prisma.TransactionClient;

export interface RedirectsQuery {
  q?: string | undefined;
  source?: CmsRedirectSource | undefined;
  active?: boolean | undefined;
  pattern?: boolean | undefined;
  page: number;
  limit: number;
}

/** Site routes that are not CMS entries but exist (not reported as `target_404`). */
const SITE_ROUTES = new Set(['/faq', '/blog/feed.xml', '/sitemap.xml', '/robots.txt', '/llms.txt', '/llms-full.txt']);

const EXTERNAL = /^https?:\/\//i;

/** Splits "/ur/x" into locale "ur" and path "/x"; other paths are the default locale. */
export function splitLocalePath(path: string): { locale: string; path: string } {
  const m = /^\/([a-z]{2})(\/.*)?$/.exec(path);
  if (m?.[1] && m[1] !== DEFAULT_LOCALE && (KNOWN_LOCALES as readonly string[]).includes(m[1])) {
    return { locale: m[1], path: m[2] ?? '/' };
  }
  return { locale: DEFAULT_LOCALE, path };
}

interface LivePaths {
  /** Localized live paths ("/ur/x" for ur). */
  paths: Set<string>;
  /** entry id → localized live path. */
  byId: Map<string, string>;
  /** localized live path → entry. */
  byPath: Map<string, { id: string; title: string }>;
}

@Injectable()
export class CmsRedirectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CmsSiteEvents,
  ) {}

  private async livePaths(db: Db = this.prisma): Promise<LivePaths> {
    const rows = await db.cmsEntry.findMany({
      where: { publishedPath: { not: null }, status: { in: ['PUBLISHED', 'SCHEDULED'] } },
      select: { id: true, locale: true, publishedPath: true, title: true },
    });
    const out: LivePaths = { paths: new Set(), byId: new Map(), byPath: new Map() };
    for (const r of rows) {
      const p = localizedPath(r.locale, r.publishedPath as string);
      out.paths.add(p);
      out.byId.set(r.id, p);
      out.byPath.set(p, { id: r.id, title: r.title });
    }
    return out;
  }

  /** The rule's effective target: the live path of its entry when it has one. */
  private effectiveTarget(rule: Pick<CmsRedirect, 'toPath' | 'entryId' | 'statusCode'>, live: LivePaths): string | null {
    if (rule.statusCode === 410) return null;
    if (rule.entryId) return live.byId.get(rule.entryId) ?? rule.toPath;
    return rule.toPath;
  }

  private async activeRules(db: Db = this.prisma, live?: LivePaths): Promise<RedirectRule[]> {
    const rows = await db.cmsRedirect.findMany({
      where: { isActive: true },
      select: { id: true, fromPath: true, toPath: true, statusCode: true, isPattern: true, entryId: true },
    });
    const lp = live ?? (await this.livePaths(db));
    return rows.map((r) => ({ ...r, toPath: this.effectiveTarget(r, lp) }));
  }

  private warningsFor(row: CmsRedirect, matcher: RedirectMatcher, live: LivePaths): RedirectWarning[] {
    const warnings: RedirectWarning[] = [];
    if (row.statusCode === 410) return warnings;
    if (row.entryId && !live.byId.has(row.entryId)) warnings.push('target_unpublished');
    const target = this.effectiveTarget(row, live);
    if (!target || EXTERNAL.test(target) || row.isPattern) return warnings;
    const t = normalizeRedirectPath(target);
    const next = matcher.match(t);
    if (next) {
      const followed = matcher.follow(t);
      warnings.push(followed.loop || followed.hops.includes(normalizeRedirectPath(row.fromPath)) ? 'loop' : 'chain');
    } else if (!live.paths.has(t) && !SITE_ROUTES.has(splitLocalePath(t).path) && !row.entryId) {
      warnings.push('target_404');
    }
    return warnings;
  }

  private toAdmin(row: CmsRedirect, warnings: RedirectWarning[]): AdminRedirect {
    return {
      id: row.id,
      fromPath: row.fromPath,
      toPath: row.toPath,
      statusCode: row.statusCode as RedirectStatus,
      isPattern: row.isPattern,
      isActive: row.isActive,
      source: row.source,
      entryId: row.entryId,
      hits: row.hits,
      lastHitAt: iso(row.lastHitAt),
      note: row.note,
      createdById: row.createdById,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      warnings,
    };
  }

  private async adminViews(rows: CmsRedirect[]): Promise<AdminRedirect[]> {
    const live = await this.livePaths();
    const matcher = new RedirectMatcher(await this.activeRules(this.prisma, live));
    return rows.map((r) => this.toAdmin(r, this.warningsFor(r, matcher, live)));
  }

  async list(query: RedirectsQuery): Promise<Paginated<AdminRedirect>> {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.CmsRedirectWhereInput = {};
    if (query.source) where.source = query.source;
    if (query.active !== undefined) where.isActive = query.active;
    if (query.pattern !== undefined) where.isPattern = query.pattern;
    if (query.q) {
      where.OR = [
        { fromPath: { contains: query.q, mode: 'insensitive' } },
        { toPath: { contains: query.q, mode: 'insensitive' } },
        { note: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.cmsRedirect.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      this.prisma.cmsRedirect.count({ where }),
    ]);
    return paginated(await this.adminViews(rows), total, page, limit);
  }

  private async findOrThrow(id: string): Promise<CmsRedirect> {
    const row = await this.prisma.cmsRedirect.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Redirect nahi mila');
    return row;
  }

  /**
   * Normalises a rule and flattens it against the other active rules.
   * Throws 422 on a loop. Returns the final fields to store.
   */
  private async prepare(
    input: { fromPath: string; toPath: string | null; statusCode: number; isPattern: boolean; entryId: string | null },
    excludeId: string | null,
    db: Db,
  ): Promise<{ fromPath: string; toPath: string | null; isPattern: boolean; entryId: string | null }> {
    const fromPath = input.isPattern ? input.fromPath.trim() : normalizeRedirectPath(input.fromPath);
    let toPath = input.toPath && input.statusCode !== 410 ? input.toPath.trim() : null;
    let entryId = input.statusCode === 410 ? null : input.entryId;
    const live = await this.livePaths(db);

    if (entryId) {
      const entry = await db.cmsEntry.findUnique({ where: { id: entryId }, select: { locale: true, path: true, publishedPath: true } });
      if (!entry) throw checksFailed([{ code: 'BROKEN_LINK', severity: 'error', field: 'entryId', message: 'Target entry mojood nahi' }], 'Redirect target ghalat hai');
      if (!toPath) toPath = localizedPath(entry.locale, entry.publishedPath ?? entry.path);
    }
    if (toPath && !EXTERNAL.test(toPath) && !input.isPattern) toPath = normalizeRedirectPath(toPath);

    if (toPath && !EXTERNAL.test(toPath) && !input.isPattern) {
      const others = (await this.activeRules(db, live)).filter((r) => r.id !== excludeId);
      const followed = new RedirectMatcher(others).follow(toPath);
      if (followed.loop || followed.hops.includes(fromPath) || followed.finalPath === fromPath || toPath === fromPath) {
        throw checksFailed(
          [{ code: 'BROKEN_LINK', severity: 'error', field: 'toPath', message: `Redirect loop: ${fromPath} → ${toPath} wapas ${fromPath} par aata hai` }],
          'Redirect loop',
        );
      }
      // Flatten: point straight at the end of the chain (unless the chain ends in a 410 or an entry rule).
      if (followed.hops.length > 0 && followed.finalPath && !entryId) toPath = followed.finalPath;
    }
    return { fromPath, toPath, isPattern: input.isPattern, entryId };
  }

  /** Repoints exact rules whose target is `fromPath` to the new rule's target (A → B, B → C ⇒ A → C). */
  private async repointChainsTo(fromPath: string, toPath: string | null, statusCode: number, selfId: string, db: Db): Promise<number> {
    if (statusCode === 410 || !toPath) return 0;
    const res = await db.cmsRedirect.updateMany({
      where: { toPath: fromPath, isPattern: false, entryId: null, id: { not: selfId }, fromPath: { not: toPath } },
      data: { toPath },
    });
    return res.count;
  }

  async create(body: CreateRedirectBody, userId: string | null, source: CmsRedirectSource = CmsRedirectSource.MANUAL): Promise<AdminRedirect> {
    const isPattern = body.isPattern ?? looksLikePattern(body.fromPath);
    const row = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.prepare(
        { fromPath: body.fromPath, toPath: body.toPath ?? null, statusCode: body.statusCode, isPattern, entryId: body.entryId ?? null },
        null,
        tx,
      );
      const exists = await tx.cmsRedirect.findUnique({ where: { fromPath: prepared.fromPath }, select: { id: true } });
      if (exists) throw new ConflictException(`Is path ka redirect pehle se hai: ${prepared.fromPath}`);
      const created = await tx.cmsRedirect.create({
        data: { ...prepared, statusCode: body.statusCode, note: body.note ?? null, source, createdById: userId },
      });
      await this.repointChainsTo(created.fromPath, created.toPath, created.statusCode, created.id, tx);
      return created;
    });
    await this.events.changed({ tags: [cacheTags.redirects], reason: 'redirects' });
    return (await this.adminViews([row]))[0] as AdminRedirect;
  }

  async update(id: string, body: PatchRedirectBody): Promise<AdminRedirect> {
    const current = await this.findOrThrow(id);
    const statusCode = body.statusCode ?? current.statusCode;
    const fromPath = body.fromPath ?? current.fromPath;
    const isPattern = body.isPattern ?? (body.fromPath !== undefined ? looksLikePattern(fromPath) : current.isPattern);
    const merged = {
      fromPath,
      toPath: body.toPath !== undefined ? body.toPath : current.toPath,
      statusCode,
      isPattern,
      entryId: body.entryId !== undefined ? body.entryId : current.entryId,
    };
    const check = createRedirectBodySchema.safeParse({ ...merged, toPath: merged.toPath ?? undefined, entryId: merged.entryId ?? undefined });
    if (!check.success) {
      throw checksFailed(
        check.error.issues.map((i) => ({ code: 'BROKEN_LINK' as const, severity: 'error' as const, field: i.path.join('.'), message: i.message })),
        'Redirect theek nahi',
      );
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.prepare(merged, id, tx);
      if (prepared.fromPath !== current.fromPath) {
        const exists = await tx.cmsRedirect.findUnique({ where: { fromPath: prepared.fromPath }, select: { id: true } });
        if (exists) throw new ConflictException(`Is path ka redirect pehle se hai: ${prepared.fromPath}`);
      }
      const saved = await tx.cmsRedirect.update({
        where: { id },
        data: {
          ...prepared,
          statusCode,
          ...(body.note !== undefined ? { note: body.note } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
      if (saved.isActive) await this.repointChainsTo(saved.fromPath, saved.toPath, saved.statusCode, saved.id, tx);
      return saved;
    });
    await this.events.changed({ tags: [cacheTags.redirects], reason: 'redirects' });
    return (await this.adminViews([row]))[0] as AdminRedirect;
  }

  async remove(id: string): Promise<void> {
    await this.findOrThrow(id);
    await this.prisma.cmsRedirect.delete({ where: { id } });
    await this.events.changed({ tags: [cacheTags.redirects], reason: 'redirects' });
  }

  /** CSV or JSON import. Existing sources are updated; identical rows are skipped. */
  async import(body: RedirectImportBody, userId: string | null): Promise<RedirectImportResult> {
    const result: RedirectImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    const dryRun = body.dryRun === true;
    const seen = new Set<string>();

    await this.prisma.$transaction(
      async (tx) => {
        for (const [index, raw] of body.rows.entries()) {
          const rowNo = index + 1;
          const parsedRow = redirectImportRowSchema.safeParse(raw);
          if (!parsedRow.success) {
            result.errors.push({ row: rowNo, message: parsedRow.error.issues[0]?.message ?? 'Row theek nahi' });
            continue;
          }
          const r = parsedRow.data;
          const statusCode = r.status;
          const candidate = { fromPath: r.from, toPath: statusCode === 410 ? undefined : r.to, statusCode, ...(r.note ? { note: r.note } : {}) };
          const valid = createRedirectBodySchema.safeParse(candidate);
          if (!valid.success) {
            result.errors.push({ row: rowNo, message: valid.error.issues[0]?.message ?? 'Row theek nahi' });
            continue;
          }
          const isPattern = looksLikePattern(r.from);
          let prepared: Awaited<ReturnType<CmsRedirectsService['prepare']>>;
          try {
            prepared = await this.prepare({ fromPath: r.from, toPath: r.to ?? null, statusCode, isPattern, entryId: null }, null, tx);
          } catch (err: unknown) {
            const resp = (err as { getResponse?: () => unknown }).getResponse?.() as { message?: string } | undefined;
            result.errors.push({ row: rowNo, message: resp?.message ?? (err instanceof Error ? err.message : 'Row theek nahi') });
            continue;
          }
          if (seen.has(prepared.fromPath)) {
            result.errors.push({ row: rowNo, message: `Is file me ${prepared.fromPath} do baar hai` });
            continue;
          }
          seen.add(prepared.fromPath);
          const existing = await tx.cmsRedirect.findUnique({ where: { fromPath: prepared.fromPath } });
          if (existing) {
            if (existing.toPath === prepared.toPath && existing.statusCode === statusCode && existing.isActive) {
              result.skipped++;
              continue;
            }
            if (!dryRun) {
              await tx.cmsRedirect.update({
                where: { id: existing.id },
                data: { toPath: prepared.toPath, statusCode, isPattern: prepared.isPattern, isActive: true, note: r.note ?? existing.note },
              });
            }
            result.updated++;
          } else {
            if (!dryRun) {
              const created = await tx.cmsRedirect.create({
                data: { ...prepared, statusCode, note: r.note ?? null, source: CmsRedirectSource.IMPORT, createdById: userId },
              });
              await this.repointChainsTo(created.fromPath, created.toPath, created.statusCode, created.id, tx);
            }
            result.created++;
          }
        }
      },
      { timeout: 120_000 },
    );
    if (!dryRun && result.created + result.updated > 0) {
      await this.events.changed({ tags: [cacheTags.redirects], reason: 'redirects' });
    }
    return result;
  }

  async exportCsv(): Promise<string> {
    const rows = await this.prisma.cmsRedirect.findMany({ orderBy: { fromPath: 'asc' } });
    const lines = ['from,to,status,note,active,source,hits'];
    for (const r of rows) {
      lines.push([r.fromPath, r.toPath, r.statusCode, r.note, r.isActive ? 'yes' : 'no', r.source, r.hits].map(csvCell).join(','));
    }
    return `${lines.join('\n')}\n`;
  }

  async test(path: string): Promise<RedirectTestResult> {
    const live = await this.livePaths();
    const matcher = new RedirectMatcher(await this.activeRules(this.prisma, live));
    const followed = matcher.follow(path);
    const matchedRow = followed.first ? await this.prisma.cmsRedirect.findUnique({ where: { id: followed.first.rule.id } }) : null;
    const finalPath = followed.first ? followed.finalPath : normalizeRedirectPath(path);
    const served = finalPath && !EXTERNAL.test(finalPath) ? live.byPath.get(finalPath) ?? null : null;
    return {
      matched: matchedRow ? this.toAdmin(matchedRow, this.warningsFor(matchedRow, matcher, live)) : null,
      finalPath,
      hops: followed.hops,
      servesEntry: served,
    };
  }

  // ─── Public ───

  async publicRules(): Promise<PublicRedirectsResponse> {
    const [rows, live] = await Promise.all([
      this.prisma.cmsRedirect.findMany({ where: { isActive: true }, orderBy: { fromPath: 'asc' } }),
      this.livePaths(),
    ]);
    const rules: PublicRedirect[] = [];
    let updatedAt = new Date(0);
    for (const r of rows) {
      if (r.updatedAt > updatedAt) updatedAt = r.updatedAt;
      const status = r.statusCode as RedirectStatus;
      const to = this.effectiveTarget(r, live);
      if (status !== 410 && !to) continue;
      rules.push({ id: r.id, from: r.fromPath, to: status === 410 ? null : to, status, pattern: r.isPattern });
    }
    return { rules, updatedAt: updatedAt.toISOString() };
  }

  /**
   * Counts a hit (fire-and-forget from the site). Unknown ids are ignored.
   * Raw SQL so `updatedAt` stays put: a hit is not a content change and must
   * not empty the public cache.
   */
  async hit(id: string): Promise<void> {
    await this.prisma.$executeRaw`UPDATE "CmsRedirect" SET "hits" = "hits" + 1, "lastHitAt" = now() WHERE "id" = ${id}`.catch(
      () => undefined,
    );
  }
}
