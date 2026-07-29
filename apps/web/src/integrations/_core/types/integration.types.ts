export type IntegrationCategory = 'SALES_CHANNEL' | 'COURIER' | 'PAYMENT' | 'ACCOUNTING';
export type IntegrationStatus = 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SUSPENDED';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface IntegrationField {
  key: string;
  label: string;
  required: boolean;
  default?: string;
  type?: 'text' | 'password' | 'select';
  options?: { value: string; label: string }[];
  help?: string;
}

export interface AvailableIntegration {
  type: string;
  category: IntegrationCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  docs: string;
  popular?: boolean;
  comingSoon?: boolean;
  fields: IntegrationField[];
  setupSteps?: string[];
  portalUrl?: string;
}

export interface IntegrationItem {
  id: string;
  type: string;
  category: IntegrationCategory;
  displayName: string;
  status: IntegrationStatus;
  isActive: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  totalOrdersSynced: number;
  totalProductsSynced: number;
  totalErrors: number;
  apiKey?: string;
  webhookUrl?: string;
  webhookVerified?: boolean;
  credentials?: Record<string, any>;
  config?: Record<string, any>;
  syncLogs?: SyncLogItem[];
  _count?: { channelOrders: number; syncLogs: number; productMappings?: number };
}

export interface SyncLogItem {
  id: string;
  operation: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
  status: SyncStatus;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  integration?: { type: string; displayName: string };
}

export interface ChannelOrderItem {
  id: string;
  integrationId: string;
  externalOrderId: string;
  externalOrderNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  items: { name: string; sku?: string; quantity: number; price: number; variant?: string }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: string;
  orderStatus: string;
  nafaaSaleId?: string;
  receivedAt: string;
  processedAt?: string;
  integration?: { type: string; displayName: string };
}
