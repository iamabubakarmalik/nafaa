import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SHOP_SCOPE_REQUEST_KEY } from './shop-scope.constants';
import { ALL_SHOPS, SHOP_HEADER, ShopScope } from './shop-scope.types';

interface CacheEntry {
  ids: Set<string>;
  expires: number;
}

/**
 * Resolves the branch scope for every authenticated request, once, before the
 * controller runs.
 *
 * Rules:
 *  - OWNER / SUPER_ADMIN — may target any shop of their own tenant, or send
 *    `all` (or nothing at all) for the consolidated view.
 *  - MANAGER / CASHIER / STAFF — always locked to their assigned shop; the
 *    header is ignored entirely, so a tampered client gains nothing.
 *
 * A missing header resolves to "all shops", which is the pre-multishop
 * behaviour — older clients and internal callers keep working unchanged.
 */
@Injectable()
export class ShopScopeInterceptor implements NestInterceptor {
  /** tenantId → active shop ids, refreshed lazily. */
  private readonly cache = new Map<string, CacheEntry>();
  private static readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request?.user;

    if (!user?.tenantId) {
      request[SHOP_SCOPE_REQUEST_KEY] = new ShopScope(null, true);
      return next.handle();
    }

    request[SHOP_SCOPE_REQUEST_KEY] = await this.resolve(user, request);
    return next.handle();
  }

  private async resolve(
    user: AuthenticatedUser,
    request: any,
  ): Promise<ShopScope> {
    const isOwner =
      user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN;

    // ─── Staff: hard-locked to their own branch ───────────────
    if (!isOwner) {
      if (!user.shopId) {
        // No shop assigned yet — tenant-wide read, same as before. Writes that
        // need a concrete shop will fail loudly via ShopScope.require().
        return new ShopScope(null, true);
      }
      return new ShopScope(user.shopId, false);
    }

    // ─── Owner: honour the header ─────────────────────────────
    const raw = this.readHeader(request);
    if (!raw || raw === ALL_SHOPS) return new ShopScope(null, true);

    let valid = await this.tenantShopIds(user.tenantId);
    if (!valid.has(raw)) {
      // A shop created seconds ago won't be in the cached set yet, and the
      // user switches to it straight after creating it. Re-read once before
      // refusing, so a fresh branch never looks broken for a minute.
      valid = await this.tenantShopIds(user.tenantId, true);
      if (!valid.has(raw)) {
        throw new ForbiddenException('Ye shop aapke account mein maujood nahi hai');
      }
    }
    return new ShopScope(raw, false);
  }

  private readHeader(request: any): string | null {
    const value = request?.headers?.[SHOP_HEADER];
    const first = Array.isArray(value) ? value[0] : value;
    const trimmed = typeof first === 'string' ? first.trim() : '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private async tenantShopIds(
    tenantId: string,
    force = false,
  ): Promise<Set<string>> {
    const hit = this.cache.get(tenantId);
    if (!force && hit && hit.expires > Date.now()) return hit.ids;

    const shops = await this.prisma.shop.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const ids = new Set(shops.map((s) => s.id));
    this.cache.set(tenantId, {
      ids,
      expires: Date.now() + ShopScopeInterceptor.TTL_MS,
    });
    return ids;
  }

  /** Called when shops are created/deleted so the next request sees them. */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }
}
