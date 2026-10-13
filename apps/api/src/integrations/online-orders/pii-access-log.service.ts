import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Records who opened online-order customer data (name, phone, email,
 * address) and when, in ActivityLog. Shopify requires apps with protected
 * customer data to log access to it.
 *
 * Lists are polled by the web app, so a repeat of the same view by the same
 * person within REPEAT_MS is not written again. Exports are always written.
 */
const REPEAT_MS = 10 * 60_000;

export type PiiAccess =
  | { kind: 'ORDER_LIST'; filters?: Record<string, unknown> }
  | { kind: 'ORDER_DETAIL'; orderId: string }
  | { kind: 'CUSTOMER_LIST'; filters?: Record<string, unknown> }
  | { kind: 'ORDER_EXPORT'; filters?: Record<string, unknown> };

const DESCRIPTION: Record<PiiAccess['kind'], string> = {
  ORDER_LIST: 'Viewed online orders list (customer details)',
  ORDER_DETAIL: 'Viewed online order customer details',
  CUSTOMER_LIST: 'Viewed online customers list',
  ORDER_EXPORT: 'Exported online orders with customer details',
};

@Injectable()
export class PiiAccessLogService {
  private readonly logger = new Logger(PiiAccessLogService.name);
  private readonly recent = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  record(user: AuthenticatedUser, access: PiiAccess, ip?: string) {
    const entityId = access.kind === 'ORDER_DETAIL' ? access.orderId : null;
    if (access.kind !== 'ORDER_EXPORT') {
      const key = `${user.id}:${access.kind}:${entityId ?? ''}`;
      const now = Date.now();
      if (now - (this.recent.get(key) ?? 0) < REPEAT_MS) return;
      this.recent.set(key, now);
      if (this.recent.size > 5000) this.prune(now);
    }

    this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: `PII_ACCESS:${access.kind}`,
        entityType: entityId ? 'ChannelOrder' : null,
        entityId,
        description: DESCRIPTION[access.kind],
        metadata: 'filters' in access && access.filters ? (access.filters as any) : undefined,
        ipAddress: ip ?? null,
      },
    }).catch((e) => this.logger.warn(`PII access log failed: ${e?.message}`));
  }

  private prune(now: number) {
    for (const [k, t] of this.recent) if (now - t >= REPEAT_MS) this.recent.delete(k);
  }
}
