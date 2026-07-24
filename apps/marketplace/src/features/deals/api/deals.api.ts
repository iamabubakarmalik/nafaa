import { marketplaceClient, unwrap } from '@/api/client';

export const dealsApi = {
  flashSales: () =>
    marketplaceClient.get('/promotions/marketplace/flash-sales').then(unwrap<any[]>),

  active: (city?: string) =>
    marketplaceClient.get('/promotions/marketplace/active', { params: { city } }).then(unwrap<any[]>),

  applyCoupon: (code: string, orderSubtotal: number, shopId?: string) =>
    marketplaceClient.post('/promotions/validate-coupon', { code, orderSubtotal, shopId }).then(unwrap<any>),
};
