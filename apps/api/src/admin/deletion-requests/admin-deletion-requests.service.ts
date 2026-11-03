import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

export const USER_GRACE_DAYS = 30;
export const TENANT_GRACE_DAYS = 7;
export const PURGE_AFTER_DAYS = 90;

export type DeletionStatus = 'IN_GRACE' | 'DUE' | 'PROCESSED' | 'CANCELLED';
export type DeletionKind = 'USER' | 'TENANT';

const ACTIONS = {
  USER: { requested: 'ACCOUNT_DELETION_REQUESTED', cancelled: 'ACCOUNT_DELETION_CANCELLED', processed: 'ACCOUNT_DELETION_PROCESSED' },
  TENANT: { requested: 'TENANT_DELETION_REQUESTED', cancelled: 'TENANT_DELETION_CANCELLED', processed: 'TENANT_DELETION_PROCESSED' },
} as const;

const DAY = 86_400_000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

type LogRow = { action: string; createdAt: Date; metadata: unknown; tenantId: string; entityId: string | null };

/** Latest event wins: a request, then cancel/processed. Returns the state of one subject. */
export function deletionStateFromLogs(kind: DeletionKind, logs: LogRow[], now = new Date()) {
  const a = ACTIONS[kind];
  const sorted = [...logs].sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());
  const latest = sorted[0];
  if (!latest) return null;
  const request = sorted.find((l) => l.action === a.requested);
  if (!request) return null;
  const meta = (request.metadata ?? {}) as { scheduledFor?: string; reason?: string | null; previousStatus?: string };
  const graceDays = kind === 'USER' ? USER_GRACE_DAYS : TENANT_GRACE_DAYS;
  const dueAt = meta.scheduledFor ? new Date(meta.scheduledFor) : addDays(request.createdAt, graceDays);
  let status: DeletionStatus;
  if (latest.action === a.processed) status = 'PROCESSED';
  else if (latest.action === a.cancelled) status = 'CANCELLED';
  else status = now.getTime() >= dueAt.getTime() ? 'DUE' : 'IN_GRACE';
  const processedLog = latest.action === a.processed ? latest : null;
  return {
    status,
    requestedAt: request.createdAt,
    dueAt,
    reason: meta.reason ?? null,
    processedAt: processedLog?.createdAt ?? null,
    purgeAfter: processedLog ? ((processedLog.metadata ?? {}) as { purgeAfter?: string }).purgeAfter ?? null : null,
  };
}

@Injectable()
export class AdminDeletionRequestsService {
  private readonly logger = new Logger(AdminDeletionRequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseId(id: string): { kind: DeletionKind; subjectId: string } {
    const [k, ...rest] = id.split(':');
    const subjectId = rest.join(':');
    if ((k !== 'user' && k !== 'tenant') || !subjectId) throw new BadRequestException('Invalid request id');
    return { kind: k === 'user' ? 'USER' : 'TENANT', subjectId };
  }

  private async logsFor(kind: DeletionKind, subjectId?: string): Promise<LogRow[]> {
    const a = ACTIONS[kind];
    return this.prisma.activityLog.findMany({
      where: {
        action: { in: [a.requested, a.cancelled, a.processed] },
        ...(subjectId ? (kind === 'USER' ? { entityId: subjectId } : { tenantId: subjectId }) : {}),
        ...(kind === 'USER' ? { entityType: 'USER' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { action: true, createdAt: true, metadata: true, tenantId: true, entityId: true },
    });
  }

  async list(params: { status?: string; kind?: string }) {
    const now = new Date();
    const items: any[] = [];

    if (params.kind !== 'tenant') {
      const logs = await this.logsFor('USER');
      const byUser = new Map<string, LogRow[]>();
      for (const l of logs) if (l.entityId) byUser.set(l.entityId, [...(byUser.get(l.entityId) ?? []), l]);
      const users = await this.prisma.user.findMany({
        where: { id: { in: [...byUser.keys()] } },
        select: { id: true, fullName: true, email: true, role: true, isActive: true, tenant: { select: { id: true, name: true } } },
      });
      for (const u of users) {
        const st = deletionStateFromLogs('USER', byUser.get(u.id)!, now);
        if (!st) continue;
        items.push({
          id: `user:${u.id}`, kind: 'USER', subjectId: u.id, name: u.fullName, email: u.email,
          role: u.role, isActive: u.isActive, tenantId: u.tenant.id, tenantName: u.tenant.name, ...st,
        });
      }
    }

    if (params.kind !== 'user') {
      const logs = await this.logsFor('TENANT');
      const byTenant = new Map<string, LogRow[]>();
      for (const l of logs) byTenant.set(l.tenantId, [...(byTenant.get(l.tenantId) ?? []), l]);
      const tenants = await this.prisma.tenant.findMany({
        where: { id: { in: [...byTenant.keys()] } },
        select: { id: true, name: true, status: true, _count: { select: { users: true } } },
      });
      for (const t of tenants) {
        const st = deletionStateFromLogs('TENANT', byTenant.get(t.id)!, now);
        if (!st) continue;
        items.push({
          id: `tenant:${t.id}`, kind: 'TENANT', subjectId: t.id, name: t.name, email: null, role: null,
          tenantId: t.id, tenantName: t.name, tenantStatus: t.status, userCount: t._count.users, ...st,
        });
      }
    }

    const f = (params.status ?? 'pending').toLowerCase();
    const filtered = items.filter((i) =>
      f === 'all' ? true : f === 'pending' ? i.status === 'IN_GRACE' || i.status === 'DUE' : i.status.toLowerCase() === f);
    filtered.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    const counts = { inGrace: 0, due: 0, processed: 0, cancelled: 0 };
    for (const i of items) {
      if (i.status === 'IN_GRACE') counts.inGrace++;
      else if (i.status === 'DUE') counts.due++;
      else if (i.status === 'PROCESSED') counts.processed++;
      else counts.cancelled++;
    }
    return { items: filtered, counts };
  }

  async process(adminId: string, id: string, note?: string) {
    const { kind, subjectId } = this.parseId(id);
    return kind === 'USER' ? this.processUser(adminId, subjectId, note) : this.processTenant(adminId, subjectId, note);
  }

  /** Anonymize one user inside a transaction client. Business records stay linked to the same user id. */
  private anonymizeUser(userId: string) {
    const tx = this.prisma;
    return [
      tx.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          fullName: 'Deleted user',
          email: `deleted+${userId}@nafaa.invalid`,
          phone: null,
          avatarUrl: null,
          passwordHash: null,
          approvalPin: null,
          googleId: null,
          passwordResetToken: null,
          passwordResetExpires: null,
          pushTokens: [],
        },
      }),
      tx.session.deleteMany({ where: { userId } }),
      tx.mobileDevice.updateMany({ where: { userId }, data: { pushToken: null } }),
      tx.staff.updateMany({
        where: { userId },
        data: {
          fullName: 'Deleted user', fatherName: null, cnic: null, phone: '', altPhone: null, email: null,
          address: null, city: null, emergencyName: null, emergencyPhone: null, emergencyRelation: null, dateOfBirth: null,
        },
      }),
      // Old log lines carried the person's name and email.
      tx.activityLog.updateMany({
        where: { entityType: 'USER', entityId: userId, action: ACTIONS.USER.requested },
        data: { description: 'Account deletion requested' },
      }),
    ];
  }

  private async processUser(adminId: string, userId: string, note?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, tenantId: true, role: true, email: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'SUPER_ADMIN') throw new BadRequestException('Super admin accounts cannot be processed here');
    const st = deletionStateFromLogs('USER', await this.logsFor('USER', userId));
    if (!st) throw new NotFoundException('No deletion request for this user');
    if (st.status === 'PROCESSED') return { success: true, alreadyProcessed: true, processedAt: st.processedAt };
    if (st.status === 'CANCELLED') throw new BadRequestException('This request was cancelled by the user');
    if (st.status === 'IN_GRACE') throw new BadRequestException(`Grace period is not over yet. Due on ${st.dueAt.toISOString()}`);

    await this.prisma.$transaction([
      ...this.anonymizeUser(userId),
      this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: adminId, action: ACTIONS.USER.processed, entityType: 'USER', entityId: userId,
          description: 'Super admin processed the account deletion (login disabled, personal fields anonymized)',
          metadata: { processedBy: adminId, note: note?.trim() || null, requestedAt: st.requestedAt.toISOString() },
        },
      }),
    ]);
    return { success: true, alreadyProcessed: false };
  }

  private async processTenant(adminId: string, tenantId: string, note?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, slug: true, status: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'nafaa-system') throw new BadRequestException('System tenant cannot be processed');
    const st = deletionStateFromLogs('TENANT', await this.logsFor('TENANT', tenantId));
    if (!st) throw new NotFoundException('No deletion request for this tenant');
    if (st.status === 'PROCESSED') return { success: true, alreadyProcessed: true, processedAt: st.processedAt };
    if (st.status === 'CANCELLED') throw new BadRequestException('This request was cancelled by the owner');
    if (st.status === 'IN_GRACE') throw new BadRequestException(`Grace period is not over yet. Due on ${st.dueAt.toISOString()}`);

    const users = await this.prisma.user.findMany({ where: { tenantId, role: { not: 'SUPER_ADMIN' } }, select: { id: true } });
    const purgeAfter = addDays(new Date(), PURGE_AFTER_DAYS).toISOString();

    await this.prisma.$transaction([
      this.prisma.tenant.update({ where: { id: tenantId }, data: { status: 'SUSPENDED' } }),
      ...users.flatMap((u) => this.anonymizeUser(u.id)),
      this.prisma.activityLog.create({
        data: {
          tenantId, userId: adminId, action: ACTIONS.TENANT.processed, entityType: 'TENANT', entityId: tenantId,
          description: `Super admin processed the shop deletion (shop closed, ${users.length} users deactivated and anonymized). Business data kept until purge date.`,
          // TODO(owner decision): the purge of business data after `purgeAfter` is a separate, manual
          // decision by the owner. Nothing in this codebase hard-deletes tenant data.
          metadata: { processedBy: adminId, note: note?.trim() || null, userCount: users.length, purgeAfter, purgeStatus: 'MARKED' },
        },
      }),
    ]);
    return { success: true, alreadyProcessed: false, usersAnonymized: users.length, purgeAfter };
  }

  /** Daily 09:00 PKT (04:00 UTC). Only tells super admins; never processes anything. */
  @Cron('0 4 * * *')
  async notifyDue() {
    try {
      const { counts } = await this.list({ status: 'pending' });
      if (counts.due === 0) return;
      const since = new Date(Date.now() - 20 * 3_600_000);
      const dup = await this.prisma.adminNotification.findFirst({ where: { entityType: 'DELETION_REQUESTS', createdAt: { gte: since } } });
      if (dup) return;
      await this.prisma.adminNotification.create({
        data: {
          type: 'WARNING', priority: 'HIGH', title: 'Deletion requests are due',
          message: `${counts.due} deletion request(s) are past their grace period and waiting for you to process.`,
          link: '/deletion-requests', entityType: 'DELETION_REQUESTS',
        },
      });
    } catch (e) {
      this.logger.warn(`Deletion reminder failed: ${(e as Error).message}`);
    }
  }
}
