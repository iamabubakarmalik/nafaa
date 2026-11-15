/**
 * Platform settings for the Market (SystemSetting MARKET_CONFIG_KEY) and the
 * public config the customer apps read on start.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GATE_DEFINITIONS, MARKET_CONFIG_KEY, MarketGate, MarketPlatformConfig, gateForBusinessType, readPlatformConfig, resolveFlow, resolveGate } from './market-config';

const CACHE_MS = 30_000;

@Injectable()
export class MarketSettingsService {
  private cache: { at: number; value: MarketPlatformConfig } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async platform(): Promise<MarketPlatformConfig> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    const row = await this.prisma.systemSetting.findUnique({ where: { key: MARKET_CONFIG_KEY }, select: { value: true } }).catch(() => null);
    const value = readPlatformConfig(row?.value);
    this.cache = { at: Date.now(), value };
    return value;
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
