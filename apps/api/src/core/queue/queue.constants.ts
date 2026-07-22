export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  SMS: 'sms-queue',
  PUSH: 'push-queue',
  WHATSAPP: 'whatsapp-queue',
  NOTIFICATION: 'notification-queue',
  ORDER: 'order-queue',
  BARGAIN: 'bargain-queue',
  AUCTION: 'auction-queue',
  GROUP_BUY: 'group-buy-queue',
  LIVE_SHOP: 'live-shop-queue',
  CART_RECOVERY: 'cart-recovery-queue',
  IMAGE_PROCESSING: 'image-processing-queue',
  REPORT_GENERATION: 'report-queue',
  ANALYTICS: 'analytics-queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
