/**
 * Resolves and checks entry content against live data:
 * - `check`: publish issues for tokens (UNKNOWN_TOKEN), entry links
 *   (BROKEN_LINK) and Markdown headings (HEADING_LEVEL);
 * - `resolve`: a copy with `entry:` links turned into paths, tokens replaced
 *   and, optionally, CTA keywords turned into real links.
 *
 * Publishing (A1) and the public API (A2) call these; they never parse
 * tokens or links themselves.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_LOCALE, type CmsEntryType, type CmsStatus, type Issue } from '../contract/cms-contract';
import { localizedPath } from '../paths/cms-paths';
import { CmsTokenService } from './cms-token.service';
import {
  collectEntryLinks,
  inspectContent,
  resolveContent,
  type CtaTargets,
  type FoundEntryLink,
  type LinkTarget,
} from './entry-links';
import { headingProblemMessage, markdownHeadingProblems } from './markdown';
import { tokenProblemMessage, type TokenContext } from './tokens';

type Db = PrismaService | Prisma.TransactionClient;

/** What the link resolver knows about a linked entry. */
export interface LinkedEntry {
  id: string;
  type: CmsEntryType;
  locale: string;
  title: string;
  status: CmsStatus;
  /** Draft path. */
  path: string;
  /** Live path, or null when not published. */
  publishedPath: string | null;
}

export interface CheckContentInput {
  /** Values to check, each with its issue field prefix: `{ blocks }`, `{ data }`, `{ summary }`. */
  fields: Record<string, unknown>;
  locale?: string;
  /** Block array, so issues under `blocks[...]` carry the block id. */
  blocks?: readonly { id?: unknown }[];
  /** Reuse an already loaded context (one load per publish). */
  tokens?: TokenContext;
}

export interface ResolveInput<T> {
  value: T;
  locale?: string;
  /** `published` (public responses) or `draft` (preview: unpublished targets use their draft path). */
  mode: 'published' | 'draft';
  tokens?: TokenContext;
  /** Pass site settings values to turn `signup` / `demo` / `whatsapp` into links. */
  cta?: CtaTargets;
  fieldPrefix?: string;
}

/** Markdown keys checked for heading levels. Inline fields cannot hold headings. */
const MARKDOWN_KEYS = new Set(['markdown', 'body', 'methodology', 'example', 'answer']);

function blockIdFor(field: string, blocks?: readonly { id?: unknown }[]): string | undefined {
  const m = /^blocks\[(\d+)\]/.exec(field);
  if (!m || !blocks) return undefined;
  const id = blocks[Number(m[1])]?.id;
  return typeof id === 'string' ? id : undefined;
}

@Injectable()
export class CmsContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: CmsTokenService,
  ) {}

  /** Loads the linked entries by id (any status). */
  async loadLinkedEntries(ids: readonly string[], db: Db = this.prisma): Promise<Map<string, LinkedEntry>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await db.cmsEntry.findMany({
      where: { id: { in: unique } },
      select: { id: true, type: true, locale: true, title: true, status: true, path: true, publishedPath: true },
    });
    return new Map(rows.map((r) => [r.id, r]));
  }

  /**
   * Publish checks for the given fields. Returns UNKNOWN_TOKEN, BROKEN_LINK
   * (target missing or not live) and HEADING_LEVEL issues, all hard errors.
   */
  async check(input: CheckContentInput, db: Db = this.prisma): Promise<Issue[]> {
    const locale = input.locale ?? DEFAULT_LOCALE;
    const ctx = input.tokens ?? (await this.tokens.loadContext(locale, db));
    const issues: Issue[] = [];
    const links: FoundEntryLink[] = [];

    for (const [prefix, value] of Object.entries(input.fields)) {
      const found = inspectContent(value, { fieldPrefix: prefix, tokens: ctx });
      for (const p of found.tokenProblems) {
        const blockId = blockIdFor(p.field, input.blocks);
        issues.push({ code: 'UNKNOWN_TOKEN', severity: 'error', field: p.field, ...(blockId ? { blockId } : {}), message: tokenProblemMessage(p) });
      }
      links.push(...found.links);
      issues.push(...this.headingIssues(value, prefix, input.blocks));
    }

    const targets = await this.loadLinkedEntries(links.map((l) => l.id), db);
    for (const link of links) {
      const target = targets.get(link.id);
      if (target && target.publishedPath !== null) continue;
      const blockId = blockIdFor(link.field, input.blocks);
      issues.push({
        code: 'BROKEN_LINK',
        severity: 'error',
        field: link.field,
        ...(blockId ? { blockId } : {}),
        message: target
          ? `Link "${target.title}" par hai jo abhi publish nahi hua (${target.path})`
          : `Link wali entry mojood nahi (entry:${link.id})`,
      });
    }
    return issues;
  }

  /** HEADING_LEVEL issues for every Markdown field in a value. */
  headingIssues(value: unknown, prefix: string, blocks?: readonly { id?: unknown }[]): Issue[] {
    const issues: Issue[] = [];
    const visit = (v: unknown, field: string, key: string | null): void => {
      if (typeof v === 'string') {
        if (key === null || !MARKDOWN_KEYS.has(key)) return;
        if (!v.includes('#') && !/\n\s{0,3}[=-]+\s*(\n|$)/.test(v)) return; // no heading syntax at all
        for (const p of markdownHeadingProblems(v)) {
          const blockId = blockIdFor(field, blocks);
          issues.push({ code: 'HEADING_LEVEL', severity: 'error', field, ...(blockId ? { blockId } : {}), message: headingProblemMessage(p) });
        }
      } else if (Array.isArray(v)) {
        v.forEach((item, i) => visit(item, `${field}[${i}]`, key));
      } else if (v && typeof v === 'object') {
        for (const [k, child] of Object.entries(v as Record<string, unknown>)) visit(child, field ? `${field}.${k}` : k, k);
      }
    };
    visit(value, prefix, prefix && !prefix.includes('.') && !prefix.includes('[') ? prefix : null);
    return issues;
  }

  /** Entry ids linked anywhere in a value. */
  linkedIds(value: unknown): string[] {
    return [...new Set(collectEntryLinks(value).map((l) => l.id))];
  }

  /**
   * Returns a resolved copy of `value`. In `published` mode a link to an
   * entry that is not live becomes plain text in Markdown, and its draft path
   * in href fields (the site's redirect table may still catch it).
   */
  async resolve<T>(input: ResolveInput<T>, db: Db = this.prisma): Promise<T> {
    const locale = input.locale ?? DEFAULT_LOCALE;
    const ctx = input.tokens ?? (await this.tokens.loadContext(locale, db));
    const targets = await this.loadLinkedEntries(this.linkedIds(input.value), db);

    const linkTarget = (id: string): LinkTarget | null => {
      const t = targets.get(id);
      if (!t) return null;
      const path = input.mode === 'published' ? t.publishedPath : t.publishedPath ?? t.path;
      return path === null ? null : { path: localizedPath(t.locale, path) };
    };
    const brokenHref = (id: string): string => {
      const t = targets.get(id);
      return t ? localizedPath(t.locale, t.path) : '/';
    };

    return resolveContent(input.value, {
      ...(input.fieldPrefix !== undefined ? { fieldPrefix: input.fieldPrefix } : {}),
      tokens: ctx,
      onUnresolvedToken: input.mode === 'published' ? 'remove' : 'keep',
      linkTarget,
      brokenHref,
      ...(input.cta ? { cta: input.cta } : {}),
    }).value;
  }
}
