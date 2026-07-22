import type { IndustryPack } from '../types/industry-pack';
import type { AuthTenant } from '@core/stores/auth.store';

/**
 * IndustryRegistry — central registry for all industry packs.
 *
 * Resolution uses `pack.priority` (higher wins) to handle overlaps,
 * so Carpet beats Mobile which beats Restaurant which beats Retail
 * which beats Standard when a tenant matches multiple.
 */
class IndustryRegistryImpl {
  private packs: IndustryPack[] = [];
  private byId = new Map<string, IndustryPack>();

  register(pack: IndustryPack | IndustryPack[]): void {
    const list = Array.isArray(pack) ? pack : [pack];
    for (const p of list) {
      if (this.byId.has(p.id)) {
        this.packs = this.packs.filter((x) => x.id !== p.id);
      }
      this.packs.push(p);
      this.byId.set(p.id, p);
    }
  }

  all(): IndustryPack[] {
    return [...this.packs];
  }

  get(id: string): IndustryPack | undefined {
    return this.byId.get(id);
  }

  /**
   * Resolve THE active pack for a tenant.
   * Multiple packs may match — the one with highest `priority` wins.
   * If tie, first-registered wins.
   */
  resolve(tenant: AuthTenant | null): IndustryPack | undefined {
    let winner: IndustryPack | undefined;
    let winnerPriority = -Infinity;

    for (const pack of this.packs) {
      try {
        if (!pack.matches(tenant)) continue;
        const pr = pack.priority ?? 100;
        if (pr > winnerPriority) {
          winner = pack;
          winnerPriority = pr;
        }
      } catch (err) {
        console.warn(`[IndustryRegistry] matches() threw for pack "${pack.id}"`, err);
      }
    }
    return winner;
  }

  resolveAll(tenant: AuthTenant | null): IndustryPack[] {
    return this.packs
      .filter((p) => {
        try { return p.matches(tenant); } catch { return false; }
      })
      .sort((a, b) => (b.priority ?? 100) - (a.priority ?? 100));
  }

  clear(): void {
    this.packs = [];
    this.byId.clear();
  }
}

export const IndustryRegistry = new IndustryRegistryImpl();
