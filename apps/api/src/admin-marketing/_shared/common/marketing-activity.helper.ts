import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Wrapper for creating marketing activity logs.
 * Maps old marketingActivityLog.create() calls to ActivityLog schema.
 */
export async function logMarketingActivity(
  prisma: PrismaService,
  params: {
    tenantId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    description?: string;
    metadata?: any;
  },
) {
  try {
    return await prisma.activityLog.create({
      data: {
        tenantId: params.tenantId ?? 'system',
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description ?? params.action,
        metadata: params.metadata,
      },
    });
  } catch (e) {
    // Silent fail — logging should never break the main flow
    console.warn('[MarketingActivity] Log failed:', (e as Error).message);
  }
}
