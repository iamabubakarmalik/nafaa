import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const checkoutApi = {
  preview: (data: any) =>
    marketplaceClient.post('/checkout/preview', data).then(unwrap<any>),
  placeOrder: (data: any) =>
    marketplaceClient.post('/checkout/place-order', data).then(unwrap<any>),
  slots: (shopId?: string) =>
    marketplaceClient.get('/checkout/delivery-slots', { params: { shopId } }).then(unwrap<any>),
};
