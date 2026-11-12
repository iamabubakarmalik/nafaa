/**
 * Theme versions: one DRAFT the editor saves into, one PUBLISHED that the
 * storefront shows, older ones ARCHIVED for rollback (kept, never removed).
 */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StoreThemeVersion } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { StoreAccessService, StoreCtx } from './store-access.service';
import { StoreRevalidateService } from './store-revalidate.service';
import { ThemeDoc, ThemeDocError, ThemeId, THEME_IDS, carryContent, cleanThemeDoc } from './theme/theme-doc';
import { PRESETS, presetDoc } from './theme/presets';
import { FONTS, SECTIONS, TEMPLATE_KEYS, TEMPLATE_LABELS, FIXED_SECTION, allowedIn } from './theme/section-schema';
import { loadControls } from './store-controls';

const json = (d: ThemeDoc) => d as unknown as Prisma.InputJsonValue;

@Injectable()
export class StoreThemeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly revalidate: StoreRevalidateService,
  ) {}

  async schema() {
    const controls = await loadControls(this.prisma);
    return {
      sections: SECTIONS,
      templates: Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, {
        label: TEMPLATE_LABELS[k],
        allowed: SECTIONS.filter((s) => allowedIn(s, k) || s.type === FIXED_SECTION[k]).map((s) => s.type),
        fixed: FIXED_SECTION[k] ? [FIXED_SECTION[k]] : [],
      }])),
      fonts: FONTS,
      themes: PRESETS.filter((p) => controls.themes[p.id].enabled).map((p) => ({
        id: p.id, name: p.name, description: p.description, industries: p.industries, tokens: p.tokens, previewImage: null, featured: controls.themes[p.id].featured,
      })),
    };
  }

  /** Creates the first draft + published version for a new store. */
  async seed(tx: Prisma.TransactionClient, store: { id: string; tenantId: string }, themeId: ThemeId, userId: string) {
    const doc = presetDoc(themeId);
    await tx.storeThemeVersion.create({ data: { storeId: store.id, tenantId: store.tenantId, version: 1, status: 'PUBLISHED', themeId, doc: json(doc), publishedAt: new Date(), publishedById: userId, note: 'Start' } });
    await tx.storeThemeVersion.create({ data: { storeId: store.id, tenantId: store.tenantId, version: 2, status: 'DRAFT', themeId, doc: json(doc) } });
  }

  private present(v: StoreThemeVersion | null) {
    return v ? { id: v.id, version: v.version, status: v.status, doc: v.doc as unknown as ThemeDoc, updatedAt: v.updatedAt.toISOString() } : null;
  }

  async draft(storeId: string) {
    let d = await this.prisma.storeThemeVersion.findFirst({ where: { storeId, status: 'DRAFT' }, orderBy: { version: 'desc' } });
    if (!d) {
      const pub = await this.published(storeId);
      const store = await this.prisma.nafaaStore.findUniqueOrThrow({ where: { id: storeId } });
      const doc = (pub?.doc as Prisma.InputJsonValue) ?? json(presetDoc(store.themeId as ThemeId));
      d = await this.prisma.storeThemeVersion.create({ data: { storeId, tenantId: store.tenantId, version: (await this.maxVersion(storeId)) + 1, status: 'DRAFT', themeId: pub?.themeId ?? store.themeId, doc } });
    }
    return d;
  }

  published(storeId: string) {
    return this.prisma.storeThemeVersion.findFirst({ where: { storeId, status: 'PUBLISHED' }, orderBy: { version: 'desc' } });
  }

  private async maxVersion(storeId: string) {
    const r = await this.prisma.storeThemeVersion.aggregate({ where: { storeId }, _max: { version: true } });
    return r._max.version ?? 0;
  }

  async get(user: AuthenticatedUser, id: string) {
    const ctx = await this.access.requireStore(user, id);
    const [draft, published, versions] = await Promise.all([
      this.draft(ctx.store.id),
      this.published(ctx.store.id),
      this.prisma.storeThemeVersion.findMany({ where: { storeId: ctx.store.id }, orderBy: { version: 'desc' }, take: 30, select: { id: true, version: true, status: true, note: true, publishedAt: true, publishedById: true, updatedAt: true, themeId: true } }),
    ]);
    return { draft: this.present(draft), published: this.present(published), versions: await this.withNames(versions) };
  }

  async withNames<T extends { publishedById: string | null; publishedAt: Date | null; updatedAt: Date }>(rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.publishedById).filter(Boolean) as string[])];
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } }) : [];
    const name = new Map(users.map((u) => [u.id, u.fullName]));
    return rows.map(({ publishedById, ...r }) => ({ ...r, publishedAt: r.publishedAt?.toISOString() ?? null, updatedAt: r.updatedAt.toISOString(), publishedBy: publishedById ? name.get(publishedById) ?? null : null }));
  }

  /** Public: published theme, or the draft with a valid preview token. */
  async publicTheme(ctx: StoreCtx) {
    const v = ctx.preview ? await this.draft(ctx.store.id) : await this.published(ctx.store.id);
    if (!v) throw new NotFoundException('Theme not found');
    return { theme: v.doc as unknown as ThemeDoc, version: ctx.preview ? -1 : v.version, draftUpdatedAt: ctx.preview ? v.updatedAt.toISOString() : null };
  }

  async saveDraft(user: AuthenticatedUser, id: string, body: { doc?: unknown; baseUpdatedAt?: string }) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    const draft = await this.draft(ctx.store.id);
    if (body?.baseUpdatedAt && Date.parse(body.baseUpdatedAt) + 1 < draft.updatedAt.getTime()) {
      throw new ConflictException('Theme kisi aur jagah se save hua hai — page dobara kholein');
    }
    const doc = this.clean(body?.doc, draft.doc as unknown as ThemeDoc);
    const saved = await this.prisma.storeThemeVersion.update({ where: { id: draft.id }, data: { doc: json(doc), themeId: doc.themeId } });
    return this.present(saved)!;
  }

  private clean(raw: unknown, fallback: ThemeDoc): ThemeDoc {
    try {
      return cleanThemeDoc(raw, fallback);
    } catch (e) {
      if (e instanceof ThemeDocError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  async publish(user: AuthenticatedUser, id: string, body: { note?: string }) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    const draft = await this.draft(ctx.store.id);
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) || null : null;
    const out = await this.prisma.$transaction(async (tx) => {
      await tx.storeThemeVersion.updateMany({ where: { storeId: ctx.store.id, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } });
      const published = await tx.storeThemeVersion.update({ where: { id: draft.id }, data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: user.id, note } });
      const max = await tx.storeThemeVersion.aggregate({ where: { storeId: ctx.store.id }, _max: { version: true } });
      const next = await tx.storeThemeVersion.create({ data: { storeId: ctx.store.id, tenantId: ctx.tenantId, version: (max._max.version ?? 0) + 1, status: 'DRAFT', themeId: published.themeId, doc: published.doc as Prisma.InputJsonValue } });
      await tx.nafaaStore.update({ where: { id: ctx.store.id }, data: { themeId: published.themeId } });
      return { published, draft: next };
    });
    this.access.invalidate(ctx.store.id);
    void this.revalidate.send(ctx.store.id);
    return { published: this.present(out.published), draft: this.present(out.draft) };
  }

  async rollback(user: AuthenticatedUser, id: string, body: { versionId?: string; publish?: boolean }) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    const old = await this.prisma.storeThemeVersion.findFirst({ where: { id: String(body?.versionId ?? ''), storeId: ctx.store.id } });
    if (!old) throw new NotFoundException('Ye version nahi mila');
    const draft = await this.draft(ctx.store.id);
    await this.prisma.storeThemeVersion.update({ where: { id: draft.id }, data: { doc: old.doc as Prisma.InputJsonValue, themeId: old.themeId } });
    if (body?.publish) return this.publish(user, id, { note: `Version ${old.version} wapas` });
    return { published: this.present(await this.published(ctx.store.id)), draft: this.present(await this.draft(ctx.store.id)) };
  }

  async switchTheme(user: AuthenticatedUser, id: string, body: { themeId?: string; keep?: string }) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    const themeId = String(body?.themeId ?? '') as ThemeId;
    if (!THEME_IDS.includes(themeId)) throw new BadRequestException('Ye theme nahi mila');
    const controls = await loadControls(this.prisma);
    if (!controls.themes[themeId].enabled && ctx.store.themeId !== themeId) throw new BadRequestException('Ye theme abhi band hai');
    const draft = await this.draft(ctx.store.id);
    const preset = presetDoc(themeId);
    const doc = body?.keep === 'nothing' ? preset : carryContent(draft.doc as unknown as ThemeDoc, preset);
    const saved = await this.prisma.storeThemeVersion.update({ where: { id: draft.id }, data: { doc: json(this.clean(doc, preset)), themeId } });
    return { draft: this.present(saved) };
  }
}
