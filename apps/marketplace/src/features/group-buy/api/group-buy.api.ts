import { marketplaceClient } from '@api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const groupBuyApi = {
  list: (params?: any) => marketplaceClient.get('/group-buys', { params }).then(unwrap<any>),
  active: () => marketplaceClient.get('/group-buys/active').then(unwrap<any>),
  detail: (id: string) => marketplaceClient.get(`/group-buys/${id}`).then(unwrap<any>),
  join: (id: string, quantity: number) =>
    marketplaceClient.post(`/group-buys/${id}/join`, { quantity }).then(unwrap<any>),
  leave: (id: string) => marketplaceClient.post(`/group-buys/${id}/leave`).then(unwrap<any>),
  myParticipations: () => marketplaceClient.get('/group-buys/my-participations').then(unwrap<any>),
};
