/**
 * Branch (shop) scoping shared between the API client, the auth store and the
 * shop switcher.
 */

/** Header the API reads to decide which branch a request is about. */
export const SHOP_HEADER = 'x-shop-id';

/** Sentinel stored in `currentShopId` for the owner's consolidated view. */
export const ALL_SHOPS = 'all';

/** True when the owner is looking at every branch at once. */
export function isAllShops(shopId: string | null | undefined): boolean {
  return shopId === ALL_SHOPS;
}

/**
 * The shop id to send as a query param / request body field.
 * `All Shops` and "nothing picked yet" both become `undefined`, which the API
 * reads as tenant-wide.
 */
export function shopParam(shopId: string | null | undefined): string | undefined {
  return !shopId || shopId === ALL_SHOPS ? undefined : shopId;
}

/**
 * Branch stamp the API attaches to records that belong to one shop
 * (purchases, expenses, khata entries, returns, stock movements).
 * `null` means the record predates branches or was made by a background job.
 */
export interface ShopStamp {
  id: string;
  name: string;
  isMain?: boolean;
}
