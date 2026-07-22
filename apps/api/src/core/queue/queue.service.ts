import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PUSH) private readonly pushQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP) private readonly whatsappQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION) private readonly notifQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ORDER) private readonly orderQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BARGAIN) private readonly bargainQueue: Queue,
    @InjectQueue(QUEUE_NAMES.AUCTION) private readonly auctionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.GROUP_BUY) private readonly groupBuyQueue: Queue,
    @InjectQueue(QUEUE_NAMES.LIVE_SHOP) private readonly liveShopQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CART_RECOVERY) private readonly cartQueue: Queue,
    @InjectQueue(QUEUE_NAMES.IMAGE_PROCESSING) private readonly imageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private readonly reportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ANALYTICS) private readonly analyticsQueue: Queue,
  ) {}

  sendEmail(payload: {
    templateSlug: string; toEmail: string; toName?: string;
    variables?: Record<string, any>; tenantId?: string;
  }, opts?: JobsOptions) {
    return this.emailQueue.add('send', payload, opts);
  }

  sendSms(payload: { toPhone: string; message: string; tenantId?: string }, opts?: JobsOptions) {
    return this.smsQueue.add('send', payload, opts);
  }

  sendPush(payload: {
    customerId?: string; userId?: string; tokens?: string[];
    title: string; body: string; data?: any; imageUrl?: string;
  }, opts?: JobsOptions) {
    return this.pushQueue.add('send', payload, opts);
  }

  sendWhatsapp(payload: {
    toPhone: string; templateName?: string; message?: string; variables?: any;
  }, opts?: JobsOptions) {
    return this.whatsappQueue.add('send', payload, opts);
  }

  createNotification(payload: {
    customerId?: string; tenantId?: string;
    type: string; title: string; body: string;
    imageUrl?: string; actionUrl?: string; data?: any;
    channels?: ('PUSH' | 'SMS' | 'EMAIL' | 'IN_APP' | 'WHATSAPP')[];
  }, opts?: JobsOptions) {
    return this.notifQueue.add('dispatch', payload, opts);
  }

  scheduleOrderReminder(orderId: string, delayMs: number) {
    return this.orderQueue.add('reminder', { orderId }, { delay: delayMs });
  }

  scheduleBargainExpiry(bargainId: string, expiresAt: Date) {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    return this.bargainQueue.add('expire', { bargainId }, { delay, jobId: `bargain-expire-${bargainId}` });
  }

  scheduleAuctionStart(auctionId: string, startsAt: Date) {
    const delay = Math.max(0, startsAt.getTime() - Date.now());
    return this.auctionQueue.add('start', { auctionId }, { delay, jobId: `auction-start-${auctionId}` });
  }

  scheduleAuctionEnd(auctionId: string, endsAt: Date) {
    const delay = Math.max(0, endsAt.getTime() - Date.now());
    return this.auctionQueue.add('end', { auctionId }, { delay, jobId: `auction-end-${auctionId}` });
  }

  scheduleGroupBuyExpiry(groupBuyId: string, expiresAt: Date) {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    return this.groupBuyQueue.add('expire', { groupBuyId }, { delay, jobId: `group-buy-${groupBuyId}` });
  }

  scheduleLiveShopStart(liveShopId: string, scheduledAt: Date) {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    return this.liveShopQueue.add('start-reminder', { liveShopId }, { delay });
  }

  scheduleCartRecovery(customerId: string, delayMs: number) {
    return this.cartQueue.add(
      'recover', { customerId },
      { delay: delayMs, jobId: `cart-recovery-${customerId}` },
    );
  }

  cancelCartRecovery(customerId: string) {
    return this.cartQueue.remove(`cart-recovery-${customerId}`).catch(() => null);
  }

  processImage(payload: { imageUrl: string; sizes: number[]; folder: string }, opts?: JobsOptions) {
    return this.imageQueue.add('process', payload, opts);
  }

  generateReport(payload: {
    tenantId: string; userId: string; reportType: string; filters?: any;
  }, opts?: JobsOptions) {
    return this.reportQueue.add('generate', payload, opts);
  }

  trackEvent(payload: {
    eventType: string; customerId?: string; tenantId?: string;
    entityId?: string; metadata?: any;
  }, opts?: JobsOptions) {
    return this.analyticsQueue.add('track', payload, opts);
  }
}
