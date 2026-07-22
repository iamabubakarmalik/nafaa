import { Injectable, Logger } from '@nestjs/common';
import { FraudActionTaken, FraudRiskLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface FraudContext {
  entityType: 'ORDER' | 'CUSTOMER_SIGNUP' | 'LOGIN' | 'REFUND_REQUEST' | 'BARGAIN';
  entityId: string;
  customerId?: string;
  tenantId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface RuleResult {
  ruleName: string;
  hit: boolean;
  scoreImpact: number;
  reason?: string;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runChecks(ctx: FraudContext): Promise<{
    riskLevel: FraudRiskLevel;
    riskScore: number;
    triggered: string[];
    action: FraudActionTaken;
    checkId: string;
  }> {
    const results: RuleResult[] = [];

    // Rule 1: Multiple signups from same IP within 1 hour
    if (ctx.ipAddress) {
      const recentSignups = await this.prisma.customerLoginHistory.count({
        where: {
          ipAddress: ctx.ipAddress,
          isNewDevice: true,
          createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (recentSignups >= 3) {
        results.push({
          ruleName: 'MULTI_SIGNUP_SAME_IP',
          hit: true,
          scoreImpact: 40,
          reason: `${recentSignups} signups from IP in last hour`,
        });
      }
    }

    // Rule 2: Same device fingerprint used by multiple customers
    if (ctx.deviceFingerprint) {
      const device = await this.prisma.deviceFingerprint.findUnique({
        where: { fingerprint: ctx.deviceFingerprint },
      });
      if (device) {
        if (device.isBlocked) {
          results.push({
            ruleName: 'BLOCKED_DEVICE',
            hit: true,
            scoreImpact: 100,
            reason: 'Device previously blocked',
          });
        }
        if (device.customerIds.length >= 4) {
          results.push({
            ruleName: 'DEVICE_SHARED_MULTI_ACCOUNTS',
            hit: true,
            scoreImpact: 35,
            reason: `Device used by ${device.customerIds.length} accounts`,
          });
        }
      }
    }

    // Rule 3: Customer with recent cancellations
    if (ctx.customerId) {
      const cancellations = await this.prisma.marketplaceOrder.count({
        where: {
          customerId: ctx.customerId,
          status: 'CANCELLED',
          cancelledBy: 'CUSTOMER',
          createdAt: { gt: new Date(Date.now() - 7 * 86400000) },
        },
      });
      if (cancellations >= 5) {
        results.push({
          ruleName: 'HIGH_CANCELLATION_RATE',
          hit: true,
          scoreImpact: 25,
          reason: `${cancellations} cancellations in last 7 days`,
        });
      }
    }

    // Rule 4: Order value spike vs history
    if (ctx.entityType === 'ORDER' && ctx.customerId) {
      const order = await this.prisma.marketplaceOrder.findUnique({
        where: { id: ctx.entityId },
        select: { total: true },
      });
      const avg = await this.prisma.marketplaceOrder.aggregate({
        where: { customerId: ctx.customerId, status: 'DELIVERED' },
        _avg: { total: true },
      });
      if (order && avg._avg.total && Number(order.total) > Number(avg._avg.total) * 8) {
        results.push({
          ruleName: 'ORDER_VALUE_SPIKE',
          hit: true,
          scoreImpact: 20,
          reason: `Order 8x higher than customer average`,
        });
      }
    }

    // Rule 5: New account + high-value COD order
    if (ctx.entityType === 'ORDER' && ctx.customerId) {
      const customer = await this.prisma.marketplaceCustomer.findUnique({
        where: { id: ctx.customerId },
        select: { createdAt: true },
      });
      const order = await this.prisma.marketplaceOrder.findUnique({
        where: { id: ctx.entityId },
        select: { total: true, paymentMethod: true },
      });
      if (customer && order && order.paymentMethod === 'COD') {
        const daysSinceSignup = (Date.now() - customer.createdAt.getTime()) / 86400000;
        if (daysSinceSignup < 2 && Number(order.total) > 5000) {
          results.push({
            ruleName: 'NEW_ACCOUNT_HIGH_COD',
            hit: true,
            scoreImpact: 30,
            reason: `New account (<2 days), high-value COD`,
          });
        }
      }
    }

    // Rule 6: Refund abuse
    if (ctx.customerId && ctx.entityType === 'REFUND_REQUEST') {
      const refunds = await this.prisma.marketplaceOrder.count({
        where: {
          customerId: ctx.customerId,
          status: 'REFUNDED',
          createdAt: { gt: new Date(Date.now() - 30 * 86400000) },
        },
      });
      if (refunds >= 3) {
        results.push({
          ruleName: 'REFUND_ABUSE',
          hit: true,
          scoreImpact: 35,
          reason: `${refunds} refunds in last 30 days`,
        });
      }
    }

    const totalScore = results.reduce((s, r) => s + r.scoreImpact, 0);
    const triggered = results.map((r) => r.ruleName);

    let riskLevel: FraudRiskLevel = 'LOW';
    let action: FraudActionTaken = 'NONE';
    if (totalScore >= 80) { riskLevel = 'CRITICAL'; action = 'BLOCKED'; }
    else if (totalScore >= 50) { riskLevel = 'HIGH'; action = 'MANUAL_REVIEW'; }
    else if (totalScore >= 25) { riskLevel = 'MEDIUM'; action = 'FLAGGED'; }

    const check = await this.prisma.fraudCheck.create({
      data: {
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        customerId: ctx.customerId,
        tenantId: ctx.tenantId,
        riskLevel,
        riskScore: totalScore,
        triggeredRules: triggered,
        reasons: results as unknown as Prisma.InputJsonValue,
        ipAddress: ctx.ipAddress,
        deviceId: ctx.deviceFingerprint,
        actionTaken: action,
      },
    });

    // Update device fingerprint history
    if (ctx.deviceFingerprint) {
      await this.prisma.deviceFingerprint.upsert({
        where: { fingerprint: ctx.deviceFingerprint },
        create: {
          fingerprint: ctx.deviceFingerprint,
          customerIds: ctx.customerId ? [ctx.customerId] : [],
          ipAddresses: ctx.ipAddress ? [ctx.ipAddress] : [],
          userAgent: ctx.userAgent,
          suspiciousScore: totalScore,
        },
        update: {
          lastSeenAt: new Date(),
          customerIds: ctx.customerId
            ? { push: ctx.customerId }
            : undefined,
          suspiciousScore: { increment: totalScore * 0.1 },
        },
      });
    }

    if (riskLevel !== 'LOW') {
      this.logger.warn(`🚨 Fraud check ${riskLevel}: ${ctx.entityType}/${ctx.entityId} — score ${totalScore}, triggered: ${triggered.join(', ')}`);
    }

    return { riskLevel, riskScore: totalScore, triggered, action, checkId: check.id };
  }

  async listSuspicious(opts: { limit?: number; offset?: number; riskLevel?: FraudRiskLevel }) {
    const where: Prisma.FraudCheckWhereInput = {};
    if (opts.riskLevel) where.riskLevel = opts.riskLevel;
    else where.riskLevel = { in: ['MEDIUM', 'HIGH', 'CRITICAL'] };

    return this.prisma.fraudCheck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
      skip: opts.offset ?? 0,
    });
  }

  async review(checkId: string, reviewerId: string, notes: string, action: FraudActionTaken) {
    return this.prisma.fraudCheck.update({
      where: { id: checkId },
      data: {
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        actionTaken: action,
      },
    });
  }

  async blockDevice(fingerprint: string, reason: string) {
    return this.prisma.deviceFingerprint.update({
      where: { fingerprint },
      data: { isBlocked: true, blockReason: reason },
    });
  }
}
