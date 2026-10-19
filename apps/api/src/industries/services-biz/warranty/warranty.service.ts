/**
 * Warranty on finished jobs: the register of jobs still under work
 * warranty, and claims when a customer comes back with the same fault.
 * An approved claim becomes a free job card (category WARRANTY_CLAIM)
 * for the same technician; its bill carries only the shop's cost, so the
 * profit report shows what the warranty cost.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { JobsService } from '../jobs/jobs.service';
import { blank, nextDocNumber } from '../jobs/job-rules';
import type { ApproveClaimDto, CreateClaimDto, ListClaimsQuery } from './dto/claim.dto';

@Injectable()
export class WarrantyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async createClaim(user: AuthenticatedUser, dto: CreateClaimDto) {
    const job = dto.originalJobId
      ? await this.prisma.serviceJob.findFirst({ where: { id: dto.originalJobId, tenantId: user.tenantId } })
      : null;
    if (dto.originalJobId && !job) throw new NotFoundException('Job nahi mili');
    if (job && job.status !== 'COMPLETED') throw new BadRequestException(`${job.jobNumber} abhi mukammal nahi — claim sirf mukammal job par banta hai`);
    if (job && !dto.allowExpired && (!job.jobWarrantyExpiryDate || job.jobWarrantyExpiryDate.getTime() < Date.now())) {
      throw new BadRequestException(job.jobWarrantyExpiryDate ? `${job.jobNumber} ki warranty khatam ho chuki` : `${job.jobNumber} par koi warranty nahi thi`);
    }
    if (job) {
      const open = await this.prisma.serviceWarrantyClaim.findFirst({ where: { tenantId: user.tenantId, originalJobId: job.id, status: { in: ['SUBMITTED', 'APPROVED', 'IN_PROGRESS'] } }, select: { claimNumber: true } });
      if (open) throw new BadRequestException(`Is job ka claim ${open.claimNumber} pehle se khula hai`);
    }
    let customerName = blank(dto.customerName) ?? job?.customerName ?? undefined;
    let customerPhone = blank(dto.customerPhone) ?? job?.customerPhone ?? undefined;
    const customerId = dto.customerId ?? job?.customerId ?? null;
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { name: true, phone: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      customerName = customerName ?? c.name;
      customerPhone = customerPhone ?? c.phone ?? undefined;
    }
    if (!customerName) throw new BadRequestException('Customer ka naam likhein');

    for (let attempt = 0; ; attempt++) {
      const claimNumber = await nextDocNumber(async (prefix) => (await this.prisma.serviceWarrantyClaim.findFirst({
        where: { tenantId: user.tenantId, claimNumber: { startsWith: prefix } }, orderBy: { claimNumber: 'desc' }, select: { claimNumber: true },
      }))?.claimNumber, 'WCL');
      try {
        return await this.prisma.serviceWarrantyClaim.create({
          data: {
            tenantId: user.tenantId, claimNumber, originalJobId: job?.id ?? null, customerId, customerName, customerPhone: customerPhone ?? '',
            claimType: dto.claimType ?? 'SERVICE_PROVIDER', issueDescription: dto.issueDescription.trim(),
            originalServiceDate: job?.completedAt ?? null, warrantyExpiryDate: job?.jobWarrantyExpiryDate ?? null,
            photoUrls: dto.photoUrls ?? [], createdById: user.id,
          },
        });
      } catch (e) {
        if (attempt < 3 && (e as { code?: string }).code === 'P2002') continue;
        throw e;
      }
    }
  }

  async listClaims(user: AuthenticatedUser, p: ListClaimsQuery) {
    const s = p.search?.trim();
    const rows = await this.prisma.serviceWarrantyClaim.findMany({
      where: {
        tenantId: user.tenantId,
        ...(p.status && { status: p.status }),
        ...(p.customerId && { customerId: p.customerId }),
        ...(s && {
          OR: [
            { claimNumber: { contains: s, mode: 'insensitive' } },
            { customerName: { contains: s, mode: 'insensitive' } },
            { customerPhone: { contains: s } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return this.withJobs(user.tenantId, rows);
  }

  private async withJobs<T extends { originalJobId: string | null; newJobId: string | null }>(tenantId: string, rows: T[]) {
    const ids = [...new Set(rows.flatMap((r) => [r.originalJobId, r.newJobId]).filter((x): x is string => !!x))];
    const jobs = ids.length
      ? await this.prisma.serviceJob.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, jobNumber: true, serviceName: true, status: true, brand: true, modelNumber: true, primaryTechnicianId: true } })
      : [];
    const byId = new Map(jobs.map((j) => [j.id, j]));
    return rows.map((r) => ({ ...r, originalJob: r.originalJobId ? byId.get(r.originalJobId) ?? null : null, newJob: r.newJobId ? byId.get(r.newJobId) ?? null : null }));
  }

  /** Jobs whose work warranty is still running (or ended in the last 30 days). */
  async register(user: AuthenticatedUser, search?: string) {
    const s = search?.trim();
    const since = new Date(Date.now() - 30 * 86_400_000);
    const where: Prisma.ServiceJobWhereInput = {
      tenantId: user.tenantId, status: 'COMPLETED', jobWarrantyExpiryDate: { gte: since },
      ...(s && {
        OR: [
          { jobNumber: { contains: s, mode: 'insensitive' } }, { customerName: { contains: s, mode: 'insensitive' } }, { customerPhone: { contains: s } },
          { serialNumber: { contains: s, mode: 'insensitive' } }, { brand: { contains: s, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.serviceJob.findMany({
      where,
      orderBy: { jobWarrantyExpiryDate: 'asc' },
      take: 300,
      select: {
        id: true, jobNumber: true, serviceName: true, customerName: true, customerPhone: true, brand: true, modelNumber: true, serialNumber: true,
        completedAt: true, jobWarrantyDays: true, jobWarrantyExpiryDate: true, jobWarrantyTerms: true, totalCharge: true,
      },
    });
  }

  private async find(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.serviceWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    return c;
  }

  async getClaim(user: AuthenticatedUser, id: string) {
    const [row] = await this.withJobs(user.tenantId, [await this.find(user, id)]);
    return row;
  }

  /** Approves the claim and opens its free job card (one step, as the counter does it). */
  async approve(user: AuthenticatedUser, id: string, dto: ApproveClaimDto) {
    const c = await this.find(user, id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException(`${c.claimNumber} pehle hi ${c.status === 'REJECTED' ? 'reject' : 'approve'} ho chuka`);
    const now = new Date();
    await this.prisma.serviceWarrantyClaim.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: now, reviewedBy: user.id, reviewedAt: now, resolutionType: dto.resolutionType, resolutionNotes: blank(dto.notes) ?? null },
    });
    if (dto.resolutionType === 'NO_FAULT' || dto.resolutionType === 'REFUND') {
      // No work: refund money goes back through Sales → Return on the original bill.
      await this.prisma.serviceWarrantyClaim.update({ where: { id }, data: { status: 'RESOLVED' } });
      return this.getClaim(user, id);
    }
    return this.createServiceJob(user, id);
  }

  async reject(user: AuthenticatedUser, id: string, reason: string) {
    const c = await this.find(user, id);
    if (c.status !== 'SUBMITTED') throw new BadRequestException('Ye claim pehle hi faisla ho chuka');
    const now = new Date();
    await this.prisma.serviceWarrantyClaim.update({ where: { id }, data: { status: 'REJECTED', rejectedAt: now, reviewedBy: user.id, reviewedAt: now, rejectionReason: reason.trim() } });
    return this.getClaim(user, id);
  }

  /** Free job card for an approved claim, for the original technician. */
  async createServiceJob(user: AuthenticatedUser, claimId: string) {
    const c = await this.find(user, claimId);
    if (c.newJobId) throw new BadRequestException('Is claim ka job pehle hi bana hai');
    if (c.status !== 'APPROVED') throw new BadRequestException('Pehle claim approve karein');
    const orig = c.originalJobId ? await this.prisma.serviceJob.findFirst({ where: { id: c.originalJobId, tenantId: user.tenantId } }) : null;
    const job = await this.jobs.create(user, {
      shopId: orig?.shopId ?? undefined,
      customerId: c.customerId ?? undefined, customerName: c.customerName, customerPhone: c.customerPhone || undefined,
      serviceName: `Warranty: ${orig?.serviceName ?? c.claimNumber}`, category: 'WARRANTY_CLAIM', underWarranty: true,
      problemDescription: c.issueDescription,
      brand: orig?.brand ?? undefined, modelNumber: orig?.modelNumber ?? undefined, serialNumber: orig?.serialNumber ?? undefined,
      locationType: orig?.locationType, serviceAddress: orig?.serviceAddress ?? undefined, city: orig?.city ?? undefined, area: orig?.area ?? undefined,
      primaryTechnicianId: orig?.primaryTechnicianId ?? undefined,
      visitCharge: 0, labourCharge: 0, internalNotes: `Warranty claim ${c.claimNumber}`,
    });
    await this.prisma.$transaction([
      this.prisma.serviceJob.update({ where: { id: job.id }, data: { parentJobId: orig?.id ?? null, warrantyType: c.claimType } }),
      this.prisma.serviceWarrantyClaim.update({ where: { id: claimId }, data: { newJobId: job.id, status: 'IN_PROGRESS' } }),
    ]);
    return this.getClaim(user, claimId);
  }
}
