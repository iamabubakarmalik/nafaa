import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class WarrantyService {
  constructor(private readonly prisma: PrismaService) {}

  async createClaim(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.serviceWarrantyClaim.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const claimNumber = 'WCL-' + year + '-' + String(count + 1).padStart(4, '0');

    return this.prisma.serviceWarrantyClaim.create({
      data: {
        tenantId: user.tenantId,
        claimNumber,
        originalJobId: dto.originalJobId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        claimType: dto.claimType ?? 'SERVICE_PROVIDER',
        issueDescription: dto.issueDescription,
        originalServiceDate: dto.originalServiceDate ? new Date(dto.originalServiceDate) : null,
        warrantyExpiryDate: dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null,
        photoUrls: dto.photoUrls ?? [],
        documentUrls: dto.documentUrls ?? [],
        createdById: user.id,
      },
    });
  }

  async listClaims(user: AuthenticatedUser, params: { status?: string; customerId?: string; search?: string }) {
    return this.prisma.serviceWarrantyClaim.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.search && {
          OR: [
            { claimNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getClaim(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.serviceWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim not found');
    return c;
  }

  async approve(user: AuthenticatedUser, id: string, resolutionType: string, notes?: string) {
    return this.prisma.serviceWarrantyClaim.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        reviewedBy: user.id,
        reviewedAt: new Date(),
        resolutionType,
        resolutionNotes: notes,
      },
    });
  }

  async reject(user: AuthenticatedUser, id: string, reason: string) {
    return this.prisma.serviceWarrantyClaim.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        reviewedBy: user.id,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async createServiceJob(user: AuthenticatedUser, claimId: string) {
    const claim = await this.prisma.serviceWarrantyClaim.findFirst({ where: { id: claimId, tenantId: user.tenantId } });
    if (!claim) throw new NotFoundException('Claim not found');

    const count = await this.prisma.serviceJob.count({ where: { tenantId: user.tenantId } });
    const jobNumber = 'JOB-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    const job = await this.prisma.serviceJob.create({
      data: {
        tenantId: user.tenantId,
        jobNumber,
        customerId: claim.customerId,
        customerName: claim.customerName,
        customerPhone: claim.customerPhone,
        serviceName: 'Warranty Claim: ' + claim.claimNumber,
        category: 'WARRANTY_CLAIM',
        problemDescription: claim.issueDescription,
        underWarranty: true,
        warrantyType: claim.claimType,
        totalCharge: 0,
        status: 'CONFIRMED',
        createdById: user.id,
      },
    });

    await this.prisma.serviceWarrantyClaim.update({
      where: { id: claimId },
      data: { newJobId: job.id, status: 'IN_PROGRESS' },
    });

    return job;
  }
}
