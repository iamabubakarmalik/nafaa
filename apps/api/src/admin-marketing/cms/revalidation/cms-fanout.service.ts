/**
 * Which site cache tags a change touches (ARCH 7.4). Publishing calls
 * `entryTags`; plan changes call `textMatchTags` for pages whose text holds
 * price tokens; count tokens are handled the same way.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { REVALIDATION, cacheTags, type CmsEntryType } from '../contract/cms-contract';

type Db = PrismaService | Prisma.TransactionClient;

/** Entry types counted by `{{count:<key>}}` tokens, with the key. */
const COUNT_KEY_BY_TYPE: Partial<Record<CmsEntryType, string>> = {
  INDUSTRY: 'industries',
  CITY: 'cities',
  INTEGRATION: 'integrations',
  GLOSSARY_TERM: 'glossary',
  BLOG_POST: 'posts',
};

export interface EntryTagInput {
  id: string;
  type: CmsEntryType;
  locale: string;
  /** Every path the change affects (old and new live paths, moved descendants). Without locale prefix. */
  paths: readonly (string | null | undefined)[];
  /** True when the entry went live, went offline or changed feature status (count tokens move). */
  liveStateChanged?: boolean;
}

@Injectable()
export class CmsFanoutService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tags for a publish, unpublish or scheduled publish of one entry. */
  async entryTags(input: EntryTagInput, db: Db = this.prisma): Promise<string[]> {
    const { id, type, locale } = input;
    const tags = new Set<string>([cacheTags.type(locale, type), cacheTags.sitemap, cacheTags.llms]);
    for (const p of input.paths) if (p) tags.add(cacheTags.page(locale, p));

    const addRows = (rows: { locale: string; publishedPath: string | null }[]) => {
      for (const r of rows) if (r.publishedPath) tags.add(cacheTags.page(r.locale, r.publishedPath));
    };

    // Entries that show this entry: relation index, tree neighbours, authored pages.
    const [inbound, tree, people] = await Promise.all([
      db.cmsEntryRelation.findMany({ where: { toId: id }, select: { from: { select: { locale: true, publishedPath: true } } } }),
      db.cmsEntry.findMany({
        where: { publishedPath: { not: null }, OR: [{ parentId: id }, { children: { some: { id } } }] },
        select: { locale: true, publishedPath: true },
      }),
      type === 'PERSON'
        ? db.cmsEntry.findMany({ where: { publishedPath: { not: null }, OR: [{ authorId: id }, { reviewerId: id }] }, select: { locale: true, publishedPath: true } })
        : Promise.resolve([]),
    ]);
    addRows(inbound.map((r) => r.from));
    addRows(tree);
    addRows(people);

    // Menus that name the entry or list its type automatically.
    const menus = await db.cmsMenu.findMany({ where: { locale }, select: { items: true } });
    if (menus.some((m) => { const text = JSON.stringify(m.items); return text.includes(`"${id}"`) || text.includes(`"entryType":"${type}"`); })) {
      tags.add(cacheTags.layout(locale));
    }

    const countKey = COUNT_KEY_BY_TYPE[type];
    if (input.liveStateChanged && countKey) {
      for (const t of await this.textMatchTags(`count:${countKey}`, db)) tags.add(t);
    }

    const list = [...tags];
    return list.length > REVALIDATION.maxTags ? [cacheTags.all] : list;
  }

  /**
   * Page tags of live entries whose published content contains `needle`
   * (e.g. "price:" or "count:industries"), plus FAQ tags and the pages of
   * FAQs whose live answer contains it.
   */
  async textMatchTags(needle: string, db: Db = this.prisma): Promise<string[]> {
    const like = `%${needle.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const entries = await db.$queryRaw<{ locale: string; publishedPath: string }[]>`
      SELECT "locale", "publishedPath" FROM "CmsEntry"
      WHERE "publishedPath" IS NOT NULL AND "published"::text LIKE ${like}`;
    const faqs = await db.$queryRaw<{ id: string; locale: string }[]>`
      SELECT "id", "locale" FROM "CmsFaq"
      WHERE "status" = 'PUBLISHED' AND ("publishedAnswer" LIKE ${like} OR "publishedQuestion" LIKE ${like})`;
    const tags = new Set<string>(entries.map((e) => cacheTags.page(e.locale, e.publishedPath)));
    if (faqs.length > 0) {
      for (const f of faqs) tags.add(cacheTags.faq(f.locale));
      const users = await db.cmsEntryFaq.findMany({
        where: { faqId: { in: faqs.map((f) => f.id) } },
        select: { entry: { select: { locale: true, publishedPath: true } } },
      });
      for (const u of users) if (u.entry.publishedPath) tags.add(cacheTags.page(u.entry.locale, u.entry.publishedPath));
    }
    return [...tags];
  }
}
