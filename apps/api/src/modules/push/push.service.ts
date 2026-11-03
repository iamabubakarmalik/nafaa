import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../core/queue/queue.service';
import { SendPushDto } from './dto/send-push.dto';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

/** One message for the staff mobile app (Expo push token). */
export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  /** iOS sound file name, "default", or null for no sound. Android takes the sound from the channel. */
  sound?: string | null;
}

export interface ExpoPushResult {
  ok: boolean;
  /** Expo ticket id, used to fetch the delivery receipt later. */
  ticketId?: string;
  /** Expo error code, e.g. DeviceNotRegistered. */
  error?: string;
}

export interface ExpoReceipt {
  status: 'ok' | 'error';
  /** e.g. DeviceNotRegistered, InvalidCredentials, MessageTooBig, MessageRateExceeded. */
  error?: string;
}

/**
 * PushService — dispatches push notifications through queue.
 * Actual FCM/APN integration happens in PushProcessor.
 * Staff app (Expo) messages go through sendExpo.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly config: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // SEND to customers (by ids) or raw tokens
  // ═══════════════════════════════════════════════════════════

  async send(dto: SendPushDto) {
    let tokens: string[] = dto.tokens ?? [];

    if (dto.customerIds?.length) {
      const dbTokens = await this.prisma.customerPushToken.findMany({
        where: {
          customerId: { in: dto.customerIds },
          isActive: true,
        },
        select: { token: true },
      });
      tokens = [...tokens, ...dbTokens.map((t) => t.token)];
    }

    if (tokens.length === 0) return { queued: 0 };

    // Queue in batches of 500
    const batchSize = 500;
    let queued = 0;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      await this.queue.sendPush({
        tokens: batch,
        title: dto.title,
        body: dto.body,
        imageUrl: dto.imageUrl,
        data: {
          ...dto.data,
          actionUrl: dto.actionUrl,
        },
      });
      queued += batch.length;
    }
    return { queued };
  }

  // ═══════════════════════════════════════════════════════════
  // BROADCAST to segment
  // ═══════════════════════════════════════════════════════════

  async broadcast(segment: 'all' | 'active-last-30d' | 'new-users', dto: Omit<SendPushDto, 'customerIds' | 'tokens'>) {
    let customerIds: string[] = [];

    if (segment === 'all') {
      const c = await this.prisma.marketplaceCustomer.findMany({
        where: { isActive: true, isBanned: false, marketingPush: true },
        select: { id: true },
        take: 100000,
      });
      customerIds = c.map((x) => x.id);
    } else if (segment === 'active-last-30d') {
      const c = await this.prisma.marketplaceCustomer.findMany({
        where: {
          isActive: true, isBanned: false, marketingPush: true,
          lastActiveAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
        take: 100000,
      });
      customerIds = c.map((x) => x.id);
    } else if (segment === 'new-users') {
      const c = await this.prisma.marketplaceCustomer.findMany({
        where: {
          isActive: true, isBanned: false, marketingPush: true,
          createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
        take: 100000,
      });
      customerIds = c.map((x) => x.id);
    }

    return this.send({ ...dto, customerIds });
  }

  // ═══════════════════════════════════════════════════════════
  // EXPO (staff mobile app)
  // ═══════════════════════════════════════════════════════════

  /** Whether this server may deliver to real devices. Off by default outside production. */
  expoDeliveryEnabled(): boolean {
    const flag = this.config.get<string>('MOBILE_PUSH_LIVE');
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /** Sends up to 100 messages in one request and returns one result per message, in order. */
  async sendExpo(messages: ExpoPushMessage[]): Promise<ExpoPushResult[]> {
    if (messages.length === 0) return [];
    if (messages.length > 100) throw new Error('sendExpo accepts at most 100 messages per call');
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(messages.map((m) => ({
          to: m.to, title: m.title, body: m.body, data: m.data ?? {},
          ...(m.sound === null ? {} : { sound: m.sound ?? 'default' }),
          priority: 'high', channelId: m.channelId ?? 'default',
        }))),
      });
      const json = (await res.json().catch(() => null)) as { data?: Array<{ status: string; id?: string; details?: { error?: string } }> } | null;
      if (!res.ok || !Array.isArray(json?.data)) {
        return messages.map(() => ({ ok: false, error: `HTTP_${res.status}` }));
      }
      return messages.map((_, i) => {
        const ticket = json!.data![i];
        return ticket?.status === 'ok' ? { ok: true, ticketId: ticket.id } : { ok: false, error: ticket?.details?.error ?? 'Unknown' };
      });
    } catch (err: any) {
      this.logger.warn(`Expo push request failed: ${err?.message}`);
      return messages.map(() => ({ ok: false, error: 'NetworkError' }));
    }
  }

  /**
   * Delivery receipts for up to 1000 ticket ids. A missing id means Expo has
   * no receipt yet (or it expired after a day).
   */
  async expoReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt>> {
    if (!ticketIds.length) return {};
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    try {
      const res = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ ids: ticketIds.slice(0, 1000) }),
      });
      const json = (await res.json().catch(() => null)) as { data?: Record<string, { status: string; details?: { error?: string } }> } | null;
      const out: Record<string, ExpoReceipt> = {};
      for (const [id, r] of Object.entries(json?.data ?? {})) {
        out[id] = r.status === 'ok' ? { status: 'ok' } : { status: 'error', error: r.details?.error ?? 'Unknown' };
      }
      return out;
    } catch (err: any) {
      this.logger.warn(`Expo receipts request failed: ${err?.message}`);
      return {};
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TOKEN REGISTRATION (customer side)
  // ═══════════════════════════════════════════════════════════

  async registerCustomerToken(customerId: string, dto: { token: string; platform: string; deviceInfo?: any }) {
    return this.prisma.customerPushToken.upsert({
      where: { token: dto.token },
      update: {
        customerId, platform: dto.platform,
        deviceInfo: dto.deviceInfo, isActive: true, lastUsedAt: new Date(),
      },
      create: {
        customerId, token: dto.token, platform: dto.platform,
        deviceInfo: dto.deviceInfo, isActive: true,
      },
    });
  }

  async removeCustomerToken(customerId: string, token: string) {
    await this.prisma.customerPushToken.deleteMany({
      where: { customerId, token },
    });
    return { success: true };
  }
}
