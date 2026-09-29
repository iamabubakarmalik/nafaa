import { apiClient } from '@core/api/client';
import type {
AvailableIntegration,
IntegrationItem,
ChannelOrderItem,
SyncLogItem,
} from '../types/integration.types';

export type {
AvailableIntegration,
IntegrationItem,
ChannelOrderItem,
SyncLogItem,
} from '../types/integration.types';

/** Normalize backend response: {data:{data:X}} | {data:X} | X → X */
function unwrap<T>(r: any): T {
if (r?.data?.data !== undefined) return r.data.data as T;
if (r?.data !== undefined) return r.data as T;
return r as T;
}

export const integrationsApi = {
// ═══ Catalog & Dashboard ═══
available: () =>
apiClient.get('/integrations/available').then((r) => unwrap<AvailableIntegration[]>(r)),

dashboard: () =>
apiClient.get('/integrations/dashboard').then((r) => unwrap<any>(r)),

// ═══ CRUD ═══
list: (category?: string) =>
apiClient
.get('/integrations', { params: category ? { category } : {} })
.then((r) => unwrap<{ items: IntegrationItem[]; total: number }>(r)),

get: (id: string) =>
apiClient.get(`/integrations/${id}`).then((r) => unwrap<IntegrationItem>(r)),

create: (data: any) =>
apiClient.post('/integrations', data).then((r) => unwrap<IntegrationItem>(r)),

update: (id: string, data: any) =>
apiClient.patch(`/integrations/${id}`, data).then((r) => unwrap<IntegrationItem>(r)),

disconnect: (id: string) =>
apiClient.post(`/integrations/${id}/disconnect`).then((r) => unwrap<any>(r)),

reconnect: (id: string) =>
apiClient.post(`/integrations/${id}/reconnect`).then((r) => unwrap<any>(r)),

remove: (id: string) =>
apiClient.delete(`/integrations/${id}`).then((r) => unwrap<any>(r)),

// ═══ Channel Orders ═══
listOrders: (integrationId: string, status?: string, limit = 20, offset = 0) =>
apiClient
.get(`/integrations/${integrationId}/orders`, { params: { status, limit, offset } })
.then((r) =>
unwrap<{ items: ChannelOrderItem[]; total: number; counts: Record<string, number> }>(r),
),

convertOrder: (channelOrderId: string) =>
apiClient.post(`/integrations/orders/${channelOrderId}/convert`).then((r) => unwrap<any>(r)),

// ═══ Foodpanda ═══
syncFoodpanda: (id: string) =>
apiClient.post(`/integrations/foodpanda/${id}/sync`).then((r) => unwrap<any>(r)),

acceptFoodpandaOrder: (id: string, externalOrderId: string) =>
apiClient
.post(`/integrations/foodpanda/${id}/orders/${externalOrderId}/accept`)
.then((r) => unwrap<any>(r)),

rejectFoodpandaOrder: (id: string, externalOrderId: string, reason: string) =>
apiClient
.post(`/integrations/foodpanda/${id}/orders/${externalOrderId}/reject`, { reason })
.then((r) => unwrap<any>(r)),

// ═══ Generic sync dispatcher ═══
sync: (integration: IntegrationItem): Promise<any> => {
if (integration.type === 'FOODPANDA') return integrationsApi.syncFoodpanda(integration.id);
return Promise.reject(new Error('Manual sync available nahi'));
},

// ═══ Sync logs ═══
listSyncLogs: (integrationId: string) =>
apiClient
.get(`/integrations/${integrationId}`)
.then((r) => unwrap<IntegrationItem>(r))
.then((i) => i.syncLogs ?? []),

// ═══ Testing ═══
testConnection: (id: string) =>
apiClient.post(`/integrations/${id}/test-connection`).then((r) =>
unwrap<{
success: boolean;
message: string;
fixSteps?: string[];
details?: any;
error?: string;
}>(r),
),

createDemoOrder: (id: string) =>
apiClient.post(`/integrations/${id}/demo-order`).then((r) =>
unwrap<{
success: boolean;
message: string;
channelOrderId: string;
}>(r),
),

// ═══ Product mappings ═══
listProductMappings: (integrationId: string) =>
apiClient.get(`/integrations/${integrationId}/product-mappings`).then((r) => unwrap<any[]>(r)),

upsertProductMapping: (
integrationId: string,
body: { productId: string; externalSku?: string; externalProductId?: string },
) =>
apiClient
.post(`/integrations/${integrationId}/product-mappings`, body)
.then((r) => unwrap<any>(r)),

deleteProductMapping: (integrationId: string, mappingId: string) =>
apiClient
.delete(`/integrations/${integrationId}/product-mappings/${mappingId}`)
.then((r) => unwrap<any>(r)),

// ═══ Product Sync ═══
syncProducts: (id: string) =>
apiClient.post(`/integrations/${id}/sync-products`).then((r) =>
unwrap<{
success: boolean;
message: string;
imported: number;
updated: number;
failed: number;
}>(r),
),

pushProduct: (integrationId: string, productId: string) =>
apiClient
.post(`/integrations/${integrationId}/push-product`, { productId })
.then((r) =>
unwrap<{
success: boolean;
message: string;
externalId?: string;
}>(r),
),

// ═══ Order status ═══
updateOrderStatus: (orderId: string, status: string, reason?: string) =>
apiClient
.post(`/integrations/orders/${orderId}/update-status`, { status, reason })
.then((r) => unwrap<any>(r)),

bulkUpdateOrderStatus: (ids: string[], status: string) =>
apiClient
.post(`/integrations/orders/bulk-update-status`, { ids, status })
.then((r) => unwrap<any>(r)),
};
