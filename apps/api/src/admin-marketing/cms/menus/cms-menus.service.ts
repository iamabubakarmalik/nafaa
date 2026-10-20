/**
 * Header, footer, legal and mobile menus (API-CONTRACT 5.2, 8.6).
 *
 * Items point at entries by id, so a slug change never breaks a menu. The
 * resolver turns the stored tree into `MenuItemResolved` for the public
 * layout: entry items take the live path (and are dropped when the entry is
 * not live), auto items expand into live entries, url items get CTA keywords
 * and `entry:` links resolved.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_LOCALE,
  MENU_KEYS,
  cacheTags,
  isCtaKeyword,
  menuKeySchema,
  menuItemsSchema,
  parseEntryLink,
  type AdminMenu,
  type AdminMenuDetail,
  type MenuItem,
  type MenuItemResolved,
  type MenuKey,
  type PutMenuBody,
} from '../contract/cms-contract';
import { resolveCtaKeyword, type CtaTargets } from '../content';
import { localizedPath, typeHubPath } from '../paths/cms-paths';
import { CmsCardsService, type LiveEntry } from '../public/cms-cards.service';
import { parseOr400 } from '../public/cms-http';
import { CmsSiteEvents } from '../public/cms-site-events.service';
import { dataString } from '../public/cms-snapshot';
import { subjectKey, writeSubjectRevision } from '../public/cms-subject-revision';
import { CmsSettingsService } from '../settings/cms-settings.service';

export interface MenuWarning {
  itemId: string;
  message: string;
}

const EXTERNAL = /^https?:\/\//i;

@Injectable()
export class CmsMenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cards: CmsCardsService,
    private readonly settings: CmsSettingsService,
    private readonly events: CmsSiteEvents,
  ) {}

  private toAdmin(row: { key: string; locale: string; title: string; items: Prisma.JsonValue; updatedAt: Date }): AdminMenu {
    const parsed = menuItemsSchema.safeParse(row.items);
    return {
      key: row.key as MenuKey,
      locale: row.locale,
      title: row.title,
      items: parsed.success ? parsed.data : [],
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** All four menus for a locale; a menu never saved comes back empty. */
  async list(locale: string = DEFAULT_LOCALE): Promise<AdminMenu[]> {
    const rows = await this.prisma.cmsMenu.findMany({ where: { locale } });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return MENU_KEYS.map((key) => {
      const row = byKey.get(key);
      return row ? this.toAdmin(row) : { key, locale, title: key, items: [], updatedAt: '' };
    });
  }

  async detail(keyParam: string, locale: string = DEFAULT_LOCALE): Promise<AdminMenuDetail & { warnings: MenuWarning[] }> {
    const key = parseOr400(menuKeySchema, keyParam, 'key');
    const row = await this.prisma.cmsMenu.findUnique({ where: { key_locale: { key, locale } } });
    const menu = row ? this.toAdmin(row) : { key, locale, title: key, items: [], updatedAt: '' };
    const warnings: MenuWarning[] = [];
    const resolved = await this.resolve(menu.items, locale, warnings);
    return { ...menu, resolved, warnings };
  }

  async put(keyParam: string, body: PutMenuBody, userId: string | null): Promise<AdminMenu & { revalidation: { ok: boolean; error?: string } }> {
    const key = parseOr400(menuKeySchema, keyParam, 'key');
    const locale = body.locale ?? DEFAULT_LOCALE;
    const items = body.items as unknown as Prisma.InputJsonValue;
    const { row, revisionId } = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.cmsMenu.upsert({
        where: { key_locale: { key, locale } },
        create: { key, locale, title: body.title, items, updatedById: userId },
        update: { title: body.title, items, updatedById: userId },
      });
      const revId = await writeSubjectRevision(tx, {
        subject: 'MENU',
        key: subjectKey(key, locale),
        action: 'SAVE',
        snapshot: { title: body.title, items: body.items },
        userId,
      });
      return { row: saved, revisionId: revId };
    });
    const revalidation = await this.events.changed({ tags: [cacheTags.layout(locale)], reason: 'menu', revisionId });
    return { ...this.toAdmin(row), revalidation };
  }

  /** The four menus of a locale, resolved for the public layout. */
  async publicMenus(locale: string): Promise<Record<MenuKey, MenuItemResolved[]>> {
    const rows = await this.prisma.cmsMenu.findMany({ where: { locale: { in: [locale, DEFAULT_LOCALE] } } });
    const out = {} as Record<MenuKey, MenuItemResolved[]>;
    for (const key of MENU_KEYS) {
      const row = rows.find((r) => r.key === key && r.locale === locale) ?? rows.find((r) => r.key === key && r.locale === DEFAULT_LOCALE);
      const parsed = row ? menuItemsSchema.safeParse(row.items) : null;
      out[key] = parsed?.success ? await this.resolve(parsed.data, locale) : [];
    }
    return out;
  }

  /** Resolves a menu tree. `warnings` collects items dropped because their entry is not live. */
  async resolve(items: readonly MenuItem[], locale: string, warnings?: MenuWarning[]): Promise<MenuItemResolved[]> {
    const entryIds = new Set<string>();
    const walk = (list: readonly MenuItem[]): void => {
      for (const item of list) {
        if (item.kind === 'entry' && item.entryId) entryIds.add(item.entryId);
        const link = item.url ? parseEntryLink(item.url) : null;
        if (link) entryIds.add(link.id);
        if (item.children) walk(item.children);
      }
    };
    walk(items);

    const [live, site] = await Promise.all([this.cards.liveByIds([...entryIds]), this.settings.get('site', locale)]);
    const liveById = new Map(live.map((e) => [e.row.id, e]));
    const cta: CtaTargets = { signupUrl: site?.signupUrl ?? null, demoPath: site?.demoPath ?? null, whatsapp: site?.whatsapp ?? null };
    const hubPaths = await this.livePagePaths(locale);

    const hrefOf = (entry: LiveEntry, anchor?: string | null): string =>
      `${localizedPath(entry.row.locale, entry.row.publishedPath as string)}${anchor ? `#${anchor}` : ''}`;

    const resolveList = async (list: readonly MenuItem[]): Promise<MenuItemResolved[]> => {
      const out: MenuItemResolved[] = [];
      for (const item of list) {
        const children = item.children?.length ? await resolveList(item.children) : undefined;
        const extras = {
          ...(item.description ? { description: item.description } : {}),
          ...(item.icon ? { icon: item.icon } : {}),
        };
        if (item.kind === 'entry') {
          const entry = item.entryId ? liveById.get(item.entryId) : undefined;
          if (!entry) {
            warnings?.push({ itemId: item.id, message: `Menu item "${item.label ?? item.id}" ki entry live nahi, is liye site par nahi dikhega` });
            continue;
          }
          out.push({ id: item.id, label: item.label ?? dataString(entry.content, 'shortName') ?? entry.content.title, href: hrefOf(entry), ...extras, ...(children?.length ? { children } : {}) });
        } else if (item.kind === 'url') {
          const raw = (item.url ?? '').trim();
          let href: string | null = raw;
          const link = parseEntryLink(raw);
          if (link) {
            const entry = liveById.get(link.id);
            href = entry ? hrefOf(entry, link.anchor) : null;
          } else if (isCtaKeyword(raw)) {
            href = resolveCtaKeyword(raw, cta);
          }
          if (!href) {
            warnings?.push({ itemId: item.id, message: `Menu item "${item.label ?? item.id}" ka link abhi kaam nahi karta` });
            continue;
          }
          out.push({ id: item.id, label: item.label ?? href, href, ...(EXTERNAL.test(href) ? { external: true } : {}), ...extras, ...(children?.length ? { children } : {}) });
        } else if (item.kind === 'group') {
          out.push({ id: item.id, label: item.label ?? '', href: '', ...extras, ...(children?.length ? { children } : {}) });
        } else if (item.kind === 'auto' && item.auto) {
          const auto = item.auto;
          const where: Prisma.CmsEntryWhereInput = { type: auto.entryType, locale };
          if (auto.featured !== undefined) where.featured = auto.featured;
          const entries = (await this.cards.live(where, [{ sortOrder: 'asc' }, { title: 'asc' }]))
            .filter((e) => !auto.group || dataString(e.content, 'group') === auto.group)
            .sort((a, b) => (auto.sort === 'title' ? a.content.title.localeCompare(b.content.title) : 0))
            .slice(0, auto.limit);
          const autoItems: MenuItemResolved[] = entries.map((e) => {
            const icon = dataString(e.content, 'icon');
            return {
              id: `${item.id}-${e.row.id}`,
              label: dataString(e.content, 'shortName') ?? e.content.title,
              href: hrefOf(e),
              ...(icon ? { icon } : {}),
            };
          });
          if (item.label) {
            const hub = typeHubPath(auto.entryType);
            const hubHref = hub && hubPaths.has(hub) ? localizedPath(locale, hub) : '';
            out.push({ id: item.id, label: item.label, href: hubHref, ...extras, children: autoItems });
          } else {
            out.push(...autoItems);
          }
        }
      }
      return out;
    };
    return resolveList(items);
  }

  /** Live PAGE paths of a locale (to link auto groups to their hub only when the hub exists). */
  private async livePagePaths(locale: string): Promise<Set<string>> {
    const rows = await this.prisma.cmsEntry.findMany({
      where: { type: 'PAGE', locale, publishedPath: { not: null }, status: { in: ['PUBLISHED', 'SCHEDULED'] } },
      select: { publishedPath: true },
    });
    return new Set(rows.map((r) => r.publishedPath as string));
  }
}
