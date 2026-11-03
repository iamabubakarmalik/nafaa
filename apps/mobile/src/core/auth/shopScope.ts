/** Branch scoping, same rules as the web core/lib/shopScope.ts. */

/** Header the API reads to decide which branch a request is about. */
export const SHOP_HEADER = 'x-shop-id';

/** Sentinel stored in `currentShopId` for the owner's consolidated view. */
export const ALL_SHOPS = 'all';

export const isAllShops = (shopId: string | null | undefined) => shopId === ALL_SHOPS;

/** Shop id for query params / bodies: undefined for All shops or none picked. */
export const shopParam = (shopId: string | null | undefined): string | undefined =>
  !shopId || shopId === ALL_SHOPS ? undefined : shopId;
