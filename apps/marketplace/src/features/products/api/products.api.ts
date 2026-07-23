import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const productsApi = {
  search: (params: any) =>
    marketplaceClient.get('/products', { params }).then(unwrap<any>),
  detail: (id: string) => marketplaceClient.get(`/products/${id}`).then(unwrap<any>),
  reviews: (id: string, params: any) =>
    marketplaceClient.get(`/products/${id}/reviews`, { params }).then(unwrap<any>),
  categories: () => marketplaceClient.get('/products/categories').then(unwrap<any>),
  priceCompare: (id: string) =>
    marketplaceClient.get(`/products/${id}/price-compare`).then(unwrap<any>),
};
