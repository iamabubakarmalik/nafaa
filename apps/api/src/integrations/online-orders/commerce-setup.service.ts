import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { COURIER_APIS } from './courier-api/registry';
import { CourierRulesService } from './courier-rules.service';
import { CommerceGrowthService } from './commerce-growth.service';
import { AutomationService } from './automation.service';
import { assertManager } from './order-costs.service';
import { RECIPE_KEYS, RecipeKey } from './automation';
import { SetupProfile, defaultsFor, emptyProfile, normalizeAnswers, normalizeProfile } from './commerce-setup';

const key = (tenantId: string) => `commerce_setup:${tenantId}`;

/**
 * The online store's first-run setup and its later settings: the seller's
 * answers, and the defaults they set (dashboard tiles, board tiles, sidebar,
 * recipes, auto-booking fallback, confirm message).
 */
@Injectable()
export class CommerceSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: CourierRulesService,
    private readonly growth: CommerceGrowthService,
    private readonly automation: AutomationService,
  ) {}

  async profile(tenantId: string): Promise<SetupProfile> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: key(tenantId) } });
    if (!row) return emptyProfile();
    try { return normalizeProfile(JSON.parse(row.value)); } catch { return emptyProfile(); }
  }

  private async write(tenantId: string, p: SetupProfile) {
    const value = JSON.stringify(p);
    await this.prisma.systemSetting.upsert({
      where: { key: key(tenantId) },
      create: { key: key(tenantId), value, category: 'online_orders', isPublic: false },
      update: { value },
    });
  }

  private async apiCouriers(tenantId: string) {
    const configs = await this.prisma.courierConfig.findMany({ where: { tenantId, isActive: true }, select: { provider: true } });
    return configs.map((c) => c.provider as string).filter((c) => !!COURIER_APIS[c]);
  }

  async get(user: AuthenticatedUser) {
    const [p, connected] = await Promise.all([this.profile(user.tenantId), this.apiCouriers(user.tenantId)]);
    return { ...p, connectedCouriers: connected, preview: p.answers ? defaultsFor(p.answers, connected) : null };
  }

  /** What the answers would set, before saving (the wizard's last screen). */
  async preview(user: AuthenticatedUser, body: { answers?: unknown }) {
    const connected = await this.apiCouriers(user.tenantId);
    return defaultsFor(normalizeAnswers(body?.answers), connected);
  }

  /**
   * Saves the answers and applies their defaults. `recipes` lists the
   * recipes the seller kept ticked; `autoBooking` switches auto booking on
   * (otherwise its on/off switch stays as it was).
   */
  async finish(user: AuthenticatedUser, body: { answers?: unknown; recipes?: string[]; autoBooking?: boolean }) {
    assertManager(user);
    const answers = normalizeAnswers(body?.answers);
    const connected = await this.apiCouriers(user.tenantId);
    const d = defaultsFor(answers, connected);
    const prev = await this.profile(user.tenantId);
    await this.write(user.tenantId, {
      ...prev, answers, doneAt: new Date().toISOString(), skippedAt: null,
      homeTiles: d.homeTiles, hiddenTiles: d.hiddenTiles, hiddenNav: d.hiddenNav, pinnedNav: d.pinnedNav,
    });

    const keep = Array.isArray(body?.recipes) ? body.recipes.filter((k): k is RecipeKey => (RECIPE_KEYS as readonly string[]).includes(k)) : d.recipes.map((r) => r.key);
    const switched: string[] = [];
    for (const r of d.recipes.filter((x) => keep.includes(x.key))) {
      await this.automation.setRecipe(user.tenantId, user.id, r.key, true, r.params as Record<string, unknown>);
      switched.push(r.key);
    }

    const current = await this.rules.get(user);
    let autoBooking: string = current.rules.trigger;
    if (d.courierFallback || body?.autoBooking) {
      const next = { ...current.rules, fallback: current.rules.fallback ?? d.courierFallback, trigger: body?.autoBooking ? (current.rules.trigger === 'OFF' ? 'ACCEPT' : current.rules.trigger) : current.rules.trigger };
      await this.rules.save(user, next);
      autoBooking = next.trigger;
    }

    let confirmText = false;
    if (d.confirmText) {
      const saved = await this.growth.waTemplates(user.tenantId);
      if (!saved.templates.confirm) {
        await this.growth.saveWaTemplates(user, { ...saved.templates, confirm: d.confirmText });
        confirmText = true;
      }
    }
    return { ok: true, profile: await this.get(user), applied: { recipes: switched, autoBooking, confirmText, fallback: d.courierFallback } };
  }

  async skip(user: AuthenticatedUser) {
    const prev = await this.profile(user.tenantId);
    if (!prev.doneAt) await this.write(user.tenantId, { ...prev, skippedAt: new Date().toISOString() });
    return this.get(user);
  }

  /** Dashboard tiles, hidden board tiles and the sidebar, edited later in Online store settings. */
  async savePrefs(user: AuthenticatedUser, body: Partial<Pick<SetupProfile, 'homeTiles' | 'hiddenTiles' | 'hiddenNav' | 'pinnedNav'>>) {
    assertManager(user);
    const prev = await this.profile(user.tenantId);
    const next = normalizeProfile({ ...prev, ...Object.fromEntries(Object.entries(body ?? {}).filter(([k]) => ['homeTiles', 'hiddenTiles', 'hiddenNav', 'pinnedNav'].includes(k))) });
    await this.write(user.tenantId, next);
    return this.get(user);
  }
}
