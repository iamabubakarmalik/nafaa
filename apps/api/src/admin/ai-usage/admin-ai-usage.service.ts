import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { dateKeyTz, subDaysTz, startOfDayTz, addDaysTz } from '../../common/helpers/business-time.helper';

const ALLOWED_DAYS = [7, 14, 30, 90];

/** Model ids are internal; admins see the Nafaa AI tier only. */
function tierOf(model: string | null): string {
  const m = (model ?? '').toLowerCase();
  if (m.includes('haiku') || m.includes('mini') || m.includes('flash')) return 'Fast';
  if (m.includes('opus')) return 'Advanced';
  if (!m) return 'Unknown';
  return 'Standard';
}

/**
 * Nafaa AI usage and cost across all shops: per-day totals, the shops that use
 * it most, and the split by model tier. Costs are stored in millionths of a
 * US dollar (AiUsageDaily.costMicros, AiChatMessage.costMicros).
 */
@Injectable()
export class AdminAiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(daysInput?: number) {
    const days = ALLOWED_DAYS.includes(Number(daysInput)) ? Number(daysInput) : 30;
    const now = new Date();
    const from = startOfDayTz(subDaysTz(now, days - 1));
    const prevFrom = subDaysTz(from, days);
    const fromKey = dateKeyTz(from);
    const prevKey = dateKeyTz(prevFrom);

    const [rows, prev, byShop, byModel] = await Promise.all([
      this.prisma.aiUsageDaily.groupBy({ by: ['date'], where: { date: { gte: fromKey } }, _sum: { messages: true, tokens: true, costMicros: true } }),
      this.prisma.aiUsageDaily.aggregate({ where: { date: { gte: prevKey, lt: fromKey } }, _sum: { messages: true, tokens: true, costMicros: true } }),
      this.prisma.aiUsageDaily.groupBy({
        by: ['tenantId'], where: { date: { gte: fromKey } }, _sum: { messages: true, tokens: true, costMicros: true },
        orderBy: { _sum: { costMicros: 'desc' } }, take: 15,
      }),
      this.prisma.aiChatMessage.groupBy({
        by: ['model'], where: { createdAt: { gte: from } }, _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true, cachedTokens: true, costMicros: true },
      }),
    ]);

    const names = await this.prisma.tenant.findMany({ where: { id: { in: byShop.map((s) => s.tenantId) } }, select: { id: true, name: true, slug: true } });
    const nameOf = new Map(names.map((n) => [n.id, n]));
    const byDate = new Map(rows.map((r) => [r.date, r._sum]));
    const usd = (micros: number | null | undefined) => Math.round((micros ?? 0) / 10_000) / 100;

    const daily = Array.from({ length: days }, (_, i) => {
      const date = dateKeyTz(addDaysTz(from, i));
      const s = byDate.get(date);
      return { date, messages: s?.messages ?? 0, tokens: s?.tokens ?? 0, costUsd: usd(s?.costMicros) };
    });
    const sum = daily.reduce((a, d) => ({ messages: a.messages + d.messages, tokens: a.tokens + d.tokens, costUsd: a.costUsd + d.costUsd }), { messages: 0, tokens: 0, costUsd: 0 });

    const tiers = new Map<string, { tier: string; messages: number; inputTokens: number; outputTokens: number; cachedTokens: number; costUsd: number }>();
    for (const m of byModel) {
      const tier = tierOf(m.model);
      const t = tiers.get(tier) ?? { tier, messages: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 };
      t.messages += m._count._all;
      t.inputTokens += m._sum.inputTokens ?? 0;
      t.outputTokens += m._sum.outputTokens ?? 0;
      t.cachedTokens += m._sum.cachedTokens ?? 0;
      t.costUsd += usd(m._sum.costMicros);
      tiers.set(tier, t);
    }

    return {
      range: { days, from: fromKey, to: dateKeyTz(now) },
      totals: { ...sum, costUsd: Math.round(sum.costUsd * 100) / 100, shops: byShop.length },
      previous: { messages: prev._sum.messages ?? 0, tokens: prev._sum.tokens ?? 0, costUsd: usd(prev._sum.costMicros) },
      daily,
      topShops: byShop.map((s) => ({
        tenantId: s.tenantId, name: nameOf.get(s.tenantId)?.name ?? 'Deleted shop', slug: nameOf.get(s.tenantId)?.slug ?? null,
        messages: s._sum.messages ?? 0, tokens: s._sum.tokens ?? 0, costUsd: usd(s._sum.costMicros),
      })),
      tiers: [...tiers.values()].sort((a, b) => b.costUsd - a.costUsd).map((t) => ({ ...t, costUsd: Math.round(t.costUsd * 100) / 100 })),
    };
  }
}
