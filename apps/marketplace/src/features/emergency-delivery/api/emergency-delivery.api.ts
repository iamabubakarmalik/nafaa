import { marketplaceClient, unwrap } from '@/api/client';

export const emergencyDeliveryApi = {
  request: (orderId: string) =>
    marketplaceClient.post('/emergency-delivery/request', { orderId }).then(unwrap<any>),
};
