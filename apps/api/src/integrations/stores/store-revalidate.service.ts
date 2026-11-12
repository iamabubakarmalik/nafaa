/**
 * Tells the storefront app which cached pages are stale (Next.js on-demand
 * revalidation by tag). Calls are batched per store for 10 seconds. Product,
 * price and stock changes reach here from the stock events and a 2-minute
 * sweep of recently updated products.
 * Off with DISABLE_STORE_REVALIDATE=1 or when STOREFRONT_URL is not set.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '../../core/system-control/cron.decorator';
import { StockChanged, stockEvents } from '../../common/shop-scope/stock-events';

const BATCH_MS = 10_000;

@Injectable()
export class StoreRevalidateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoreRevalidateService.name);
  private readonly pending = new Map<string, Set<string>>();
  private timer: NodeJS.Timeout | null = null;
  private lastSweep = new Date();
  private readonly onStock = (e: StockChanged) => void this.productChanged(e.tenantId, [e.productId]).catch(() => null);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    stockEvents.on('changed', this.onStock);
  }

  onModuleDestroy() {
    stockEvents.off('changed', this.onStock);
    if (this.timer) clearTimeout(this.timer);
  }

  enabled() {
    return process.env.DISABLE_STORE_REVALIDATE !== '1' && !!process.env.STOREFRONT_URL;
  }

  /** Queue tags for a store; 'all' = every page of the store. */
  touch(storeId: string, kinds: Array<'all' | 'products' | 'collections' | 'pages' | 'blog' | `product:${string}`> = ['all']) {
    if (!this.enabled()) return;
    const set = this.pending.get(storeId) ?? new Set<string>();
    for (const k of kinds) set.add(k === 'all' ? `store:${storeId}` : `store:${storeId}:${k}`);
    this.pending.set(storeId, set);
    if (!this.timer) this.timer = setTimeout(() => void this.flush(), BATCH_MS);
  }

  async productChanged(tenantId: string, productIds: string[]) {
    if (!this.enabled()) return;
    const stores = await this.prisma.nafaaStore.findMany({ where: { tenantId, status: { in: ['LIVE', 'PASSWORD'] } }, select: { id: true } });
    for (const s of stores) this.touch(s.id, ['products', 'collections', ...productIds.slice(0, 50).map((id) => `product:${id}` as const)]);
  }

  /** Products edited in Nafaa (name, price, pictures) since the last sweep. */
  @Cron('40 */2 * * * *')
  async sweep() {
    if (!this.enabled()) return;
    const since = this.lastSweep;
    this.lastSweep = new Date();
    const stores = await this.prisma.nafaaStore.findMany({ where: { status: { in: ['LIVE', 'PASSWORD'] } }, select: { tenantId: true } });
    const tenants = [...new Set(stores.map((s) => s.tenantId))];
    if (!tenants.length) return;
    const changed = await this.prisma.product.findMany({ where: { tenantId: { in: tenants }, updatedAt: { gte: since } }, select: { id: true, tenantId: true }, take: 2000 });
    const byTenant = new Map<string, string[]>();
    for (const p of changed) byTenant.set(p.tenantId, [...(byTenant.get(p.tenantId) ?? []), p.id]);
    for (const [t, ids] of byTenant) await this.productChanged(t, ids);
  }

  async flush() {
    this.timer = null;
    const batch = [...this.pending.entries()];
    this.pending.clear();
    for (const [storeId, tags] of batch) await this.send(storeId, [...tags]);
  }

  /** Sends at once (admin "revalidate", theme publish). Returns false when off or failed. */
  async send(storeId: string, tags: string[] = [`store:${storeId}`]): Promise<boolean> {
    if (!this.enabled()) return false;
    const body = JSON.stringify({ storeId, tags, at: new Date().toISOString() });
    const sig = crypto.createHmac('sha256', process.env.STOREFRONT_REVALIDATE_SECRET || '').update(body).digest('hex');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${process.env.STOREFRONT_URL!.replace(/\/+$/, '')}/api/revalidate`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-nafaa-signature': sig }, body, signal: ctrl.signal,
      }).finally(() => clearTimeout(t));
      if (!res.ok) this.logger.warn(`Revalidate ${storeId}: HTTP ${res.status}`);
      return res.ok;
    } catch (e: any) {
      this.logger.warn(`Revalidate ${storeId}: ${e?.message}`);
      return false;
    }
  }
}
