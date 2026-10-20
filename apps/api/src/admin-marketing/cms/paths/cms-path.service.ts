/**
 * Database side of the path rules: loads the parent chain, guards against
 * cycles, checks that a path is free, suggests free slugs and computes the
 * path updates a subtree needs after its root moves.
 *
 * Entries (A1) call `resolvePath` on create and on every save that touches
 * `slug` or `parentId`, and `descendantUpdates` when a live parent moves.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CmsEntryType } from '../contract/cms-contract';
import {
  computeEntryPath,
  descendantPaths,
  resolveSiteUrl,
  slugCandidate,
  slugify,
  type PathParent,
  type PathProblem,
  type PathResult,
} from './cms-paths';

/** Guard against corrupt trees when walking parents. */
const MAX_ANCESTOR_HOPS = 32;

type Db = PrismaService | Prisma.TransactionClient;

export interface ResolvePathInput {
  type: CmsEntryType;
  locale: string;
  slug: string;
  parentId: string | null;
  /** The entry being saved (skips itself in the uniqueness check and cycle walk). */
  entryId?: string;
}

/** Thrown by `resolvePathOrThrow`; the body carries the problems for the admin. */
export class CmsPathException extends BadRequestException {
  constructor(public readonly problems: PathProblem[]) {
    super({ statusCode: 400, message: problems[0]?.message ?? 'Path theek nahi', error: 'Bad Request', problems });
  }
}

@Injectable()
export class CmsPathService {
  constructor(private readonly prisma: PrismaService) {}

  /** Site base URL for absolute URLs and preview links (no trailing slash). */
  async siteUrl(db: Db = this.prisma): Promise<string> {
    const row = await db.cmsSetting.findUnique({
      where: { key_locale: { key: 'site', locale: 'en' } },
      select: { value: true },
    });
    const value = row?.value as { baseUrl?: unknown } | null | undefined;
    const baseUrl = typeof value?.baseUrl === 'string' ? value.baseUrl : null;
    return resolveSiteUrl(process.env.SITE_PUBLIC_URL, baseUrl);
  }

  /**
   * Computes and checks the path: parent rules, cycles, reserved paths and
   * uniqueness against other entries' draft and live paths in the locale.
   */
  async resolvePath(input: ResolvePathInput, db: Db = this.prisma): Promise<PathResult> {
    let parent: PathParent | null = null;
    if (input.parentId) {
      const row = await db.cmsEntry.findUnique({
        where: { id: input.parentId },
        select: { id: true, type: true, locale: true, slug: true, path: true },
      });
      if (!row) {
        return { ok: false, problems: [{ code: 'PARENT_NOT_FOUND', field: 'parentId', message: 'Parent entry nahi mili' }] };
      }
      if (input.entryId && (await this.isAncestorOrSelf(input.entryId, row.id, db))) {
        return {
          ok: false,
          problems: [{ code: 'PARENT_CYCLE', field: 'parentId', message: 'Entry apne hi neeche wali entry ko parent nahi bana sakti' }],
        };
      }
      parent = row;
    }

    const result = computeEntryPath({ type: input.type, locale: input.locale, slug: input.slug, parent });
    if (!result.ok) return result;

    const taken = await this.pathTakenBy(result.path, input.locale, input.entryId, db);
    if (taken) {
      return {
        ok: false,
        problems: [{ code: 'PATH_TAKEN', field: 'slug', message: `Yeh path pehle se "${taken.title}" ke paas hai: ${result.path}` }],
      };
    }
    return result;
  }

  /** Same as `resolvePath`, but throws `CmsPathException` (400) on problems. */
  async resolvePathOrThrow(input: ResolvePathInput, db: Db = this.prisma): Promise<string> {
    const result = await this.resolvePath(input, db);
    if (!result.ok) throw new CmsPathException(result.problems);
    return result.path;
  }

  /**
   * The entry that already uses `path` as its draft or live path in this
   * locale, other than `excludeId`.
   */
  async pathTakenBy(
    path: string,
    locale: string,
    excludeId: string | undefined,
    db: Db = this.prisma,
  ): Promise<{ id: string; title: string } | null> {
    return db.cmsEntry.findFirst({
      where: {
        locale,
        OR: [{ path }, { publishedPath: path }],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, title: true },
    });
  }

  /**
   * A free slug for a new or duplicated entry: slugify(title), then -2, -3, ...
   * Returns null when the title gives no usable slug or nothing free is found.
   */
  async suggestSlug(
    input: Omit<ResolvePathInput, 'slug'> & { title: string },
    db: Db = this.prisma,
  ): Promise<string | null> {
    const base = slugify(input.title);
    if (!base) return null;
    for (let attempt = 1; attempt <= 50; attempt += 1) {
      const slug = slugCandidate(base, attempt);
      const result = await this.resolvePath({ ...input, slug }, db);
      if (result.ok) return slug;
      if (result.problems.some((p) => p.code !== 'PATH_TAKEN')) return null;
    }
    return null;
  }

  /**
   * Draft path updates for every descendant of `rootId` once its path becomes
   * `rootNewPath`. The caller applies them (in its own transaction) and runs
   * the usual redirect logic for live descendants at publish.
   */
  async descendantUpdates(rootId: string, rootNewPath: string, db: Db = this.prisma): Promise<{ id: string; path: string }[]> {
    const subtree: { id: string; parentId: string | null; slug: string; path: string }[] = [];
    let frontier = [rootId];
    for (let depth = 0; depth < MAX_ANCESTOR_HOPS && frontier.length > 0; depth += 1) {
      const rows = await db.cmsEntry.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true, parentId: true, slug: true, path: true },
      });
      subtree.push(...rows);
      frontier = rows.map((r) => r.id);
    }
    return descendantPaths(rootId, rootNewPath, subtree);
  }

  /** True when `entryId` is `candidateParentId` or one of its ancestors. */
  private async isAncestorOrSelf(entryId: string, candidateParentId: string, db: Db): Promise<boolean> {
    let current: string | null = candidateParentId;
    for (let hops = 0; current && hops < MAX_ANCESTOR_HOPS; hops += 1) {
      if (current === entryId) return true;
      const row: { parentId: string | null } | null = await db.cmsEntry.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      current = row?.parentId ?? null;
    }
    return current !== null; // still climbing after the hop limit: treat as a cycle
  }
}
