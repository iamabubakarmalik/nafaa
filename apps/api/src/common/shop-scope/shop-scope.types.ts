import { ForbiddenException } from '@nestjs/common';

/**
 * Header the web/desktop client sends on every request to say which branch
 * the user is currently looking at. Value is a Shop id, or the literal
 * `all` for the owner's consolidated view.
 */
export const SHOP_HEADER = 'x-shop-id';
export const ALL_SHOPS = 'all';

/**
 * Resolved branch scope for one request.
 *
 * Every tenant-scoped query should narrow with `.where` on top of the usual
 * `tenantId` filter. When the owner picks "All Shops", `.where` is empty and
 * the query stays tenant-wide — which is exactly the pre-multishop behaviour,
 * so anything not yet migrated keeps working.
 */
export class ShopScope {
  constructor(
    /** Concrete branch, or null when the scope is "all shops". */
    readonly shopId: string | null,
    /** True when the caller asked for a consolidated, cross-branch view. */
    readonly isAll: boolean,
  ) {}

  /** Prisma `where` fragment — `{}` for all-shops, `{ shopId }` otherwise. */
  get where(): { shopId?: string } {
    return this.shopId ? { shopId: this.shopId } : {};
  }

  /**
   * Same as `.where` but also matches rows that were never tagged with a shop
   * (legacy data, or records created by background jobs). Use on read paths
   * where hiding untagged history would look like data loss.
   */
  get whereLoose(): { OR?: Array<{ shopId: string | null }> } {
    return this.shopId
      ? { OR: [{ shopId: this.shopId }, { shopId: null }] }
      : {};
  }

  /**
   * For writes that must land in exactly one branch — POS sales, cash
   * register, stock transfers, purchases. Refuses the "All Shops" view.
   */
  require(action = 'Ye kaam'): string {
    if (!this.shopId) {
      throw new ForbiddenException(
        `${action} karne ke liye ek shop select karna zaroori hai. Upar dropdown se shop chunein.`,
      );
    }
    return this.shopId;
  }
}
