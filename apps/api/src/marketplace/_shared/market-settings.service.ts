/**
 * Platform settings for the Market (SystemSetting MARKET_CONFIG_KEY), the
 * home curation (MARKET_HOME_KEY) and the public config the customer apps
 * read on start. Both are edited from the admin panel.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HomeCuration, MARKET_HOME_KEY, readHomeCuration } from './market-home';
import { GATE_DEFINITIONS, MARKET_CONFIG_KEY, MarketGate, MarketPlatformConfig, gateForBusinessType, readPlatformConfig, resolveFlow, resolveGate } from './market-config';

const CACHE_MS = 30_000;

@Injectable()
export class MarketSettingsService {
  private cache: { at: number; value: MarketPlatformConfig } | null = null;
  private homeCache: { at: number; value: HomeCuration } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async platform(): Promise<MarketPlatformConfig> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MARKET_CONFIG_KEY }, select: { value: true } }).catch(() => null);
    const value = readPlatformConfig(row?.value);
    this.cache = { at: Date.now(), value };
    return value;
  }

  async home(): Promise<HomeCuration> {
    if (this.homeCache && Date.now() - this.homeCache.at < CACHE_MS) return this.homeCache.value;
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MARKET_HOME_KEY }, select: { value: true } }).catch(() => null);
    const value = readHomeCuration(row?.value);
    this.homeCache = { at: Date.now(), value };
    return value;
  }

  /** Drops the cached values after an admin save (this process; others refresh within CACHE_MS). */
  clearCache() {
    this.cache = null;
    this.homeCache = null;
  }

  /** GET marketplace/config: gates in platform order with merged labels, payments and cities. */
  async publicConfig() {
    const cfg = await this.platform();
    return {
      gates: cfg.gates.map((id) => {
        const g = GATE_DEFINITIONS[id];
        return {
          id,
          label: { ...g.label, ...(cfg.labels[id] ?? {}) },
          tagline: g.tagline,
          mode: g.mode,
          businessOnly: !!g.businessOnly,
          filters: g.filters,
          defaults: g.defaults,
        };
      }),
      payments: Object.entries(cfg.payments).filter(([, on]) => on).map(([k]) => k),
      launchCities: cfg.launchCities,
    };
  }

  /** Gate, sub-filter and resolved flow for a shop profile. */
  shopGate(profile: { gate?: string | null; flowSettings?: unknown; tenant?: { businessType?: string | null } | null }) {
    const businessType = profile.tenant?.businessType ?? null;
    const gate: MarketGate = resolveGate(profile.gate, businessType);
    const auto = gateForBusinessType(businessType);
    return { gate, gateFilter: auto.gate === gate ? auto.filter : null, flow: resolveFlow(gate, profile.flowSettings) };
  }
}
