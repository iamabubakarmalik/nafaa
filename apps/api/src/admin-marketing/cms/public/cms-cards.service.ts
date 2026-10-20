/**
 * Builds `EntryCard` / `PersonCard` lists from live entries: one token
 * context load and one media query per list, whatever its length.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_LOCALE, type EntryCard, type PersonCard, type PublicMedia } from '../contract/cms-contract';
import { CmsContentService, CmsTokenService, type TokenContext } from '../content';
import { absoluteUrl } from '../paths/cms-paths';
import { CmsPathService } from '../paths/cms-path.service';
import { PUBLIC_MEDIA_SELECT, toPublicMedia } from './cms-media-view';
import { ENTRY_ROW_SELECT, LIVE_WHERE, dataString, publishedContent, type EntryContent, type EntryRow } from './cms-snapshot';

/** A live entry with its published content. */
export interface LiveEntry {
  row: EntryRow;
  content: EntryContent;
}

@Injectable()
export class CmsCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paths: CmsPathService,
    private readonly content: CmsContentService,
    private readonly tokens: CmsTokenService,
  ) {}

  siteUrl(): Promise<string> {
    return this.paths.siteUrl();
  }

  tokenContext(locale: string = DEFAULT_LOCALE): Promise<TokenContext> {
    return this.tokens.loadContext(locale);
  }

  /** Live entries matching `where`, with their published content (rows without a snapshot are skipped). */
  async live(where: Prisma.CmsEntryWhereInput, orderBy?: Prisma.CmsEntryOrderByWithRelationInput[]): Promise<LiveEntry[]> {
    const rows = await this.prisma.cmsEntry.findMany({
      where: { AND: [where, LIVE_WHERE] },
      select: ENTRY_ROW_SELECT,
      ...(orderBy ? { orderBy } : {}),
    });
    const out: LiveEntry[] = [];
    for (const row of rows) {
      const content = publishedContent(row);
      if (content) out.push({ row, content });
    }
    return out;
  }

  /** Live entries by id, keeping the order of `ids` and dropping ids that are not live. */
  async liveByIds(ids: readonly string[]): Promise<LiveEntry[]> {
    if (ids.length === 0) return [];
    const found = await this.live({ id: { in: [...new Set(ids)] } });
    const byId = new Map(found.map((e) => [e.row.id, e]));
    return ids.map((id) => byId.get(id)).filter((e): e is LiveEntry => e !== undefined);
  }

  async mediaMap(ids: Iterable<string>, locale: string): Promise<Map<string, PublicMedia>> {
    const list = [...new Set(ids)].filter(Boolean);
    if (list.length === 0) return new Map();
    const rows = await this.prisma.cmsMedia.findMany({ where: { id: { in: list }, deletedAt: null }, select: PUBLIC_MEDIA_SELECT });
    return new Map(rows.map((r) => [r.id, toPublicMedia(r, locale)]));
  }

  /** Cards for live entries; summaries get tokens resolved. */
  async cards(entries: readonly LiveEntry[], locale: string = DEFAULT_LOCALE, ctx?: TokenContext): Promise<EntryCard[]> {
    if (entries.length === 0) return [];
    const [siteUrl, tokens, media] = await Promise.all([
      this.siteUrl(),
      ctx ? Promise.resolve(ctx) : this.tokenContext(locale),
      this.mediaMap(entries.map((e) => e.content.imageId).filter((x): x is string => x !== null), locale),
    ]);
    const summaries = await this.content.resolve({
      value: entries.map((e) => e.content.summary),
      locale,
      mode: 'published',
      tokens,
    });
    return entries.map((e, i) => this.card(e, siteUrl, summaries[i] ?? null, media));
  }

  async personCards(entries: readonly LiveEntry[], locale: string = DEFAULT_LOCALE): Promise<PersonCard[]> {
    const base = await this.cards(entries, locale);
    const photos = await this.mediaMap(entries.map((e) => dataString(e.content, 'photoMediaId')).filter((x): x is string => !!x), locale);
    return base.map((card, i) => {
      const content = (entries[i] as LiveEntry).content;
      const photoId = dataString(content, 'photoMediaId');
      const sameAs = Array.isArray(content.data.sameAs) ? content.data.sameAs.filter((x): x is string => typeof x === 'string') : [];
      const role = dataString(content, 'role');
      return { ...card, ...(role ? { role } : {}), photo: (photoId && photos.get(photoId)) || null, sameAs };
    });
  }

  card(entry: LiveEntry, siteUrl: string, summary: string | null, media: Map<string, PublicMedia>): EntryCard {
    const { row, content } = entry;
    const path = row.publishedPath as string;
    const card: EntryCard = {
      id: row.id,
      type: row.type,
      locale: row.locale,
      path,
      url: absoluteUrl(siteUrl, row.locale, path),
      title: content.title,
      summary,
      image: (content.imageId && media.get(content.imageId)) || null,
      contentUpdatedAt: (row.contentUpdatedAt ?? row.publishedAt)?.toISOString() ?? null,
    };
    for (const key of ['icon', 'color', 'group', 'shortName'] as const) {
      const v = dataString(content, key);
      if (v) card[key] = v;
    }
    if (content.featureStatus) card.status = content.featureStatus;
    return card;
  }
}
