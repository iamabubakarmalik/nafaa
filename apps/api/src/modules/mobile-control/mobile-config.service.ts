/**
 * Remote app settings and announcements.
 *
 * The public payload is read on every app start, so the stored settings, the
 * live announcements and each business's plan/industry are cached in memory
 * for a short time. Saving from the admin panel clears the cache.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type MobileAnnouncement } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppearanceService } from '../appearance/appearance.service';
import {
  DEFAULT_MOBILE_CONFIG, FLAG_CATALOG, resolveFlags, sanitizeConfig, updateStateFor,
  type MobileConfig,
} from './mobile-config.schema';
import {
  isLive, matchesTarget, sanitizeTarget, sanitizeText,
  type LocalizedText, type ViewerContext,
} from './mobile-targeting';

const CONFIG_KEY = 'mobile:config';
const CONFIG_TTL_MS = 30_000;
const TENANT_TTL_MS = 5 * 60_000;
const TONES = ['info', 'success', 'warning', 'critical'] as const;

interface Cached<T> { at: number; value: T }

export interface ConfigViewer {
  platform?: string | null;
  version?: string | null;
  tenantId?: string | null;
}

@Injectable()
export class MobileConfigService {
  private config: Cached<{ config: MobileConfig; updatedAt: Date | null }> | null = null;
  private announcements: Cached<MobileAnnouncement[]> | null = null;
  private appearance: Cached<unknown> | null = null;
  private tenants = new Map<string, Cached<{ planSlug: string | null; industry: string | null }>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly appearanceSvc: AppearanceService,
  ) {}

  // ─── Settings ─────────────────────────────────────────────────────

  async getConfig() {
    if (this.config && Date.now() - this.config.at < CONFIG_TTL_MS) return this.config.value;
    const row = await this.prisma.systemSetting.findUnique({ where: { key: CONFIG_KEY } });
    let parsed: unknown = null;
    try { parsed = row ? JSON.parse(row.value) : null; } catch { parsed = null; }
    const value = { config: sanitizeConfig(parsed), updatedAt: row?.updatedAt ?? null };
    this.config = { at: Date.now(), value };
    return value;
  }

  async adminConfig() {
    const { config, updatedAt } = await this.getConfig();
    return { config, updatedAt, catalog: FLAG_CATALOG, defaults: DEFAULT_MOBILE_CONFIG };
  }

  async saveConfig(adminId: string, input: unknown) {
    const config = sanitizeConfig(input);
    const value = JSON.stringify(config);
    await this.prisma.systemSetting.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value, category: 'mobile', isPublic: false, updatedById: adminId, description: 'Mobile app remote settings' },
      update: { value, updatedById: adminId },
    });
    this.config = null;
    return this.adminConfig();
  }

  // ─── Public payload ───────────────────────────────────────────────

  /** Everything the app needs at start. Works signed out; a known business adds targeted announcements. */
  async publicConfig(viewer: ConfigViewer) {
    const [{ config, updatedAt }, appearance, ctx] = await Promise.all([
      this.getConfig(),
      this.platformAppearance(),
      this.viewerContext(viewer),
    ]);
    const now = new Date();
    const platform = viewer.platform === 'ios' || viewer.platform === 'android' ? viewer.platform : null;
    const state = updateStateFor(config, platform, viewer.version);
    const rel = platform ? config.releases[platform] : null;
    const maintenanceOn = config.maintenance.enabled
      && (!config.maintenance.platforms.length || (!!platform && config.maintenance.platforms.includes(platform)));

    const announcements = (await this.liveAnnouncements())
      .filter((a) => isLive(a.startsAt, a.endsAt, now) && matchesTarget(sanitizeTarget(a), ctx))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: a.title as unknown as LocalizedText,
        body: a.body as unknown as LocalizedText,
        tone: a.tone,
        ctaLabel: (a.ctaLabel as unknown as LocalizedText | null) ?? null,
        ctaLink: a.ctaLink,
        dismissible: a.dismissible,
        endsAt: a.endsAt,
        // Changes when the text changes, so an edited banner shows again after dismissal.
        revision: a.updatedAt.getTime(),
      }));

    return {
      configVersion: updatedAt ? updatedAt.getTime() : 0,
      serverTime: now.toISOString(),
      update: {
        state,
        latestVersion: rel?.latestVersion ?? null,
        minVersion: rel?.minVersion ?? null,
        storeUrl: rel?.storeUrl ?? null,
        title: state === 'force' ? config.releases.forceUpdate.title : config.releases.softUpdate.title,
        message: state === 'force' ? config.releases.forceUpdate.message : config.releases.softUpdate.message,
        remindAfterHours: config.releases.softUpdate.remindAfterHours,
        notes: config.releases.notes.filter((n) => n.platform === 'all' || n.platform === platform).slice(0, 5),
      },
      maintenance: {
        active: maintenanceOn,
        title: config.maintenance.title,
        message: config.maintenance.message,
        until: config.maintenance.until,
      },
      flags: resolveFlags(config),
      appearance,
      announcements,
    };
  }

  private async platformAppearance() {
    if (this.appearance && Date.now() - this.appearance.at < CONFIG_TTL_MS) return this.appearance.value;
    const value = (await this.appearanceSvc.platform()) ?? {};
    this.appearance = { at: Date.now(), value };
    return value;
  }

  private async viewerContext(viewer: ConfigViewer): Promise<ViewerContext> {
    const base: ViewerContext = { platform: viewer.platform ?? null, version: viewer.version ?? null };
    if (!viewer.tenantId) return base;
    const hit = this.tenants.get(viewer.tenantId);
    if (hit && Date.now() - hit.at < TENANT_TTL_MS) return { ...base, tenantId: viewer.tenantId, ...hit.value };
    const value = await this.tenantProfile(viewer.tenantId);
    if (this.tenants.size > 5000) this.tenants.clear();
    this.tenants.set(viewer.tenantId, { at: Date.now(), value });
    return { ...base, tenantId: viewer.tenantId, ...value };
  }

  /** The business's current plan slug and industry. */
  async tenantProfile(tenantId: string) {
    const [tenant, sub] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessType: true } }),
      this.prisma.subscription.findFirst({
        where: { tenantId, status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } },
        orderBy: { createdAt: 'desc' },
        select: { plan: { select: { slug: true } } },
      }),
    ]);
    return { planSlug: sub?.plan.slug ?? null, industry: tenant?.businessType ?? null };
  }

  private async liveAnnouncements() {
    if (this.announcements && Date.now() - this.announcements.at < CONFIG_TTL_MS) return this.announcements.value;
    const value = await this.prisma.mobileAnnouncement.findMany({
      where: { isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    this.announcements = { at: Date.now(), value };
    return value;
  }

  // ─── Announcements (admin) ────────────────────────────────────────

  /**
   * Without paging params this returns the plain list (old behavior). With
   * `page` it returns one page plus counts by state, searched on the English title.
   */
  async listAnnouncements(q?: { page?: number; limit?: number; search?: string; status?: string }) {
    const orderBy: Prisma.MobileAnnouncementOrderByWithRelationInput[] = [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }];
    if (!q?.page) return this.prisma.mobileAnnouncement.findMany({ orderBy, take: 200 });
    const now = new Date();
    const live: Prisma.MobileAnnouncementWhereInput = { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] };
    const scheduled: Prisma.MobileAnnouncementWhereInput = { isActive: true, startsAt: { gt: now } };
    const ended: Prisma.MobileAnnouncementWhereInput = { isActive: true, endsAt: { lte: now } };
    const off: Prisma.MobileAnnouncementWhereInput = { isActive: false };
    const byStatus: Record<string, Prisma.MobileAnnouncementWhereInput> = { live, scheduled, ended, off };
    const where: Prisma.MobileAnnouncementWhereInput = {
      ...(q.status && byStatus[q.status] ? byStatus[q.status] : {}),
      ...(q.search?.trim() ? { title: { path: ['en'], string_contains: q.search.trim(), mode: 'insensitive' } } : {}),
    };
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const page = Math.max(1, q.page);
    const [items, total, nLive, nScheduled, nEnded, nOff] = await Promise.all([
      this.prisma.mobileAnnouncement.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.mobileAnnouncement.count({ where }),
      this.prisma.mobileAnnouncement.count({ where: live }),
      this.prisma.mobileAnnouncement.count({ where: scheduled }),
      this.prisma.mobileAnnouncement.count({ where: ended }),
      this.prisma.mobileAnnouncement.count({ where: off }),
    ]);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), counts: { live: nLive, scheduled: nScheduled, ended: nEnded, off: nOff } };
  }

  async createAnnouncement(adminId: string, input: unknown) {
    const row = await this.prisma.mobileAnnouncement.create({ data: { ...this.announcementData(input), createdById: adminId } });
    this.announcements = null;
    return row;
  }

  async updateAnnouncement(id: string, input: unknown) {
    await this.findAnnouncement(id);
    const row = await this.prisma.mobileAnnouncement.update({ where: { id }, data: this.announcementData(input) });
    this.announcements = null;
    return row;
  }

  async deleteAnnouncement(id: string) {
    await this.findAnnouncement(id);
    await this.prisma.mobileAnnouncement.delete({ where: { id } });
    this.announcements = null;
    return { ok: true };
  }

  private async findAnnouncement(id: string) {
    const row = await this.prisma.mobileAnnouncement.findUnique({ where: { id }, select: { id: true } });
    if (!row) throw new NotFoundException('Announcement not found');
  }

  private announcementData(input: unknown) {
    const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const title = sanitizeText(src.title, 120);
    const body = sanitizeText(src.body, 600);
    if (!title || !body) throw new BadRequestException('English title and message are required');
    const date = (v: unknown) => {
      if (typeof v !== 'string' || !v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const ctaLabel = sanitizeText(src.ctaLabel, 40);
    const ctaLink = typeof src.ctaLink === 'string' && src.ctaLink.trim() ? src.ctaLink.trim().slice(0, 300) : null;
    const priority = Number(src.priority);
    return {
      ...sanitizeTarget(src),
      title: title as unknown as Prisma.InputJsonValue,
      body: body as unknown as Prisma.InputJsonValue,
      tone: (TONES as readonly unknown[]).includes(src.tone) ? (src.tone as string) : 'info',
      ctaLabel: ctaLabel && ctaLink ? (ctaLabel as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      ctaLink: ctaLabel && ctaLink ? ctaLink : null,
      startsAt: date(src.startsAt),
      endsAt: date(src.endsAt),
      dismissible: typeof src.dismissible === 'boolean' ? src.dismissible : true,
      isActive: typeof src.isActive === 'boolean' ? src.isActive : true,
      priority: Number.isFinite(priority) ? Math.max(-100, Math.min(100, Math.round(priority))) : 0,
    };
  }
}
