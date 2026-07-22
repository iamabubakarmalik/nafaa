export interface IntegrationDefinition {
  type: string;
  name: string;
  category: 'GOVT' | 'MARKETPLACE' | 'DELIVERY' | 'MESSAGING' | 'ANALYTICS' | 'PAYMENT' | 'AUTOMATION' | 'HARDWARE';
  icon: string;
  color: string;
  description: string;
  status: 'AVAILABLE' | 'BETA' | 'COMING_SOON';
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'select' | 'json';
    placeholder?: string;
    required?: boolean;
    options?: string[];
    hint?: string;
  }>;
  docsUrl?: string;
}

export const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    type: 'FBR_POS',
    name: 'FBR POS Integration',
    category: 'GOVT',
    icon: '🇵🇰',
    color: '#065f46',
    description: 'Pakistan FBR PRAL POS integration — real-time invoice reporting',
    status: 'BETA',
    fields: [
      { key: 'posId', label: 'POS ID', type: 'text', required: true, placeholder: 'FBR issued POS ID' },
      { key: 'token', label: 'API Token', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'select', options: ['SANDBOX', 'PRODUCTION'], required: true },
    ],
    docsUrl: 'https://iris.fbr.gov.pk',
  },
  {
    type: 'DARAZ',
    name: 'Daraz Marketplace',
    category: 'MARKETPLACE',
    icon: '🛍️',
    color: '#f57224',
    description: 'Auto-sync products & orders with Daraz.pk',
    status: 'BETA',
    fields: [
      { key: 'appKey', label: 'App Key', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
      { key: 'sellerId', label: 'Seller ID', type: 'text', required: true },
    ],
  },
  {
    type: 'FOODPANDA',
    name: 'FoodPanda',
    category: 'DELIVERY',
    icon: '🐼',
    color: '#e91b57',
    description: 'Sync menu, receive orders from FoodPanda',
    status: 'BETA',
    fields: [
      { key: 'vendorId', label: 'Vendor ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    type: 'CHEETAY',
    name: 'Cheetay',
    category: 'DELIVERY',
    icon: '🚴',
    color: '#00a651',
    description: 'Cheetay delivery marketplace',
    status: 'COMING_SOON',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
  {
    type: 'CAREEM',
    name: 'Careem Food',
    category: 'DELIVERY',
    icon: '🚗',
    color: '#00c48c',
    description: 'Careem NOW food delivery',
    status: 'COMING_SOON',
    fields: [
      { key: 'partnerId', label: 'Partner ID', type: 'text' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
  {
    type: 'WHATSAPP_BUSINESS',
    name: 'WhatsApp Business API',
    category: 'MESSAGING',
    icon: '💬',
    color: '#25d366',
    description: 'Send receipts & notifications via WhatsApp',
    status: 'AVAILABLE',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'businessAccountId', label: 'Business Account ID', type: 'text' },
    ],
  },
  {
    type: 'META_PIXEL',
    name: 'Meta (Facebook) Pixel',
    category: 'ANALYTICS',
    icon: '📊',
    color: '#1877f2',
    description: 'Track conversions for Facebook/Instagram ads',
    status: 'AVAILABLE',
    fields: [
      { key: 'pixelId', label: 'Pixel ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Conversions API Token', type: 'password' },
    ],
  },
  {
    type: 'GOOGLE_ANALYTICS',
    name: 'Google Analytics 4',
    category: 'ANALYTICS',
    icon: '📈',
    color: '#e37400',
    description: 'Track shop performance in GA4',
    status: 'AVAILABLE',
    fields: [
      { key: 'measurementId', label: 'Measurement ID', type: 'text', required: true, placeholder: 'G-XXXXXXXXXX' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
  },
  {
    type: 'MAILCHIMP',
    name: 'Mailchimp',
    category: 'MESSAGING',
    icon: '📧',
    color: '#ffe01b',
    description: 'Sync customers for email marketing',
    status: 'AVAILABLE',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'listId', label: 'Audience/List ID', type: 'text', required: true },
    ],
  },
  {
    type: 'STRIPE',
    name: 'Stripe Payments',
    category: 'PAYMENT',
    icon: '💳',
    color: '#635bff',
    description: 'Accept card payments online',
    status: 'AVAILABLE',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
    ],
  },
  {
    type: 'JAZZCASH_MERCHANT',
    name: 'JazzCash Merchant',
    category: 'PAYMENT',
    icon: '📱',
    color: '#ff6b35',
    description: 'Accept JazzCash payments',
    status: 'AVAILABLE',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'password', label: 'Merchant Password', type: 'password', required: true },
      { key: 'integritySalt', label: 'Integrity Salt', type: 'password', required: true },
    ],
  },
  {
    type: 'EASYPAISA_MERCHANT',
    name: 'EasyPaisa Merchant',
    category: 'PAYMENT',
    icon: '💚',
    color: '#00b04f',
    description: 'Accept EasyPaisa payments',
    status: 'AVAILABLE',
    fields: [
      { key: 'storeId', label: 'Store ID', type: 'text', required: true },
      { key: 'hashKey', label: 'Hash Key', type: 'password', required: true },
    ],
  },
  {
    type: 'SMS_GATEWAY',
    name: 'SMS Gateway',
    category: 'MESSAGING',
    icon: '📨',
    color: '#0891b2',
    description: 'Send SMS receipts & OTP',
    status: 'AVAILABLE',
    fields: [
      { key: 'provider', label: 'Provider', type: 'select', options: ['JAZZ', 'TELENOR', 'ZONG', 'TWILIO', 'CUSTOM'], required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'senderId', label: 'Sender ID', type: 'text', placeholder: 'e.g. NAFAA' },
    ],
  },
  {
    type: 'PRINTER_NODE',
    name: 'Cloud Printer',
    category: 'HARDWARE',
    icon: '🖨️',
    color: '#64748b',
    description: 'PrintNode cloud printing for receipts & KOT',
    status: 'AVAILABLE',
    fields: [
      { key: 'apiKey', label: 'PrintNode API Key', type: 'password', required: true },
      { key: 'defaultPrinterId', label: 'Default Printer ID', type: 'text' },
      { key: 'kitchenPrinterId', label: 'Kitchen Printer ID', type: 'text' },
    ],
  },
  {
    type: 'ZAPIER',
    name: 'Zapier',
    category: 'AUTOMATION',
    icon: '⚡',
    color: '#ff4a00',
    description: 'Connect with 5000+ apps via Zapier',
    status: 'AVAILABLE',
    fields: [
      { key: 'webhookUrl', label: 'Zapier Webhook URL', type: 'url', required: true },
    ],
  },
  {
    type: 'CUSTOM_WEBHOOK',
    name: 'Custom Webhook',
    category: 'AUTOMATION',
    icon: '🔗',
    color: '#7c3aed',
    description: 'Send events to your own endpoint',
    status: 'AVAILABLE',
    fields: [
      { key: 'url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'secret', label: 'Signing Secret', type: 'password' },
      { key: 'events', label: 'Events (comma-separated)', type: 'text', placeholder: 'sale.created,customer.created' },
    ],
  },
];

export const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  GOVT: { label: 'Government', color: 'emerald', icon: '🇵🇰' },
  MARKETPLACE: { label: 'Marketplaces', color: 'orange', icon: '🛍️' },
  DELIVERY: { label: 'Delivery', color: 'rose', icon: '🚴' },
  MESSAGING: { label: 'Messaging', color: 'blue', icon: '💬' },
  ANALYTICS: { label: 'Analytics', color: 'violet', icon: '📊' },
  PAYMENT: { label: 'Payments', color: 'amber', icon: '💳' },
  AUTOMATION: { label: 'Automation', color: 'purple', icon: '⚡' },
  HARDWARE: { label: 'Hardware', color: 'slate', icon: '🖨️' },
};
