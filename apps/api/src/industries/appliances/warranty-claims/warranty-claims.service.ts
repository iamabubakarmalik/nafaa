import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplianceClaimStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  BrandResponseDto, CreateClaimDto, SettleClaimDto, SubmitClaimDto, UpdateClaimDto,
} from './dto/upsert-claim.dto';

/** Jin halaton me claim abhi chal raha hai — paisa aana baqi hai */
const OPEN_STATES: ApplianceClaimStatus[] = [
  'DRAFT', 'SUBMITTED', 'BRAND_REVIEWING', 'APPROVED', 'PARTIALLY_APPROVED',
];

@Injectable()
export class ApplianceWarrantyClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(tenantId: string) {
    const year = new Date().getFullYear();
    const prefix = `WC-${year}-`;
    const last = await this.prisma.applianceWarrantyClaim.findFirst({
      where: { tenantId, claimNumber: { startsWith: prefix } },
      orderBy: { claimNumber: 'desc' },
      select: { claimNumber: true },
    });
    const seq = last ? Number(last.claimNumber.slice(prefix.length)) || 0 : 0;
    return `${prefix}${String(seq + 1).padStart(4, '0')}`;
  }

  /** parts + labor + baqi = dukaan ki kul lagat */
  private claimed(parts = 0, labor = 0, other = 0) {
    return (Number(parts) || 0) + (Number(labor) || 0) + (Number(other) || 0);
  }

  async create(user: AuthenticatedUser, dto: CreateClaimDto) {
    // Ek hi repair par do claim na banein
    if (dto.serviceRequestId) {
      const dup = await this.prisma.applianceWarrantyClaim.findFirst({
        where: { tenantId: user.tenantId, serviceRequestId: dto.serviceRequestId },
        select: { claimNumber: true },
      });
      if (dup) {
        throw new BadRequestException(`Is repair par claim ${dup.claimNumber} pehle se bana hua hai`);
      }
    }

    const claimNumber = await this.nextNumber(user.tenantId);
    const claimedAmount = this.claimed(dto.partsCost, dto.laborCost, dto.otherCost);

    return this.prisma.applianceWarrantyClaim.create({
      data: {
        tenantId: user.tenantId,
        claimNumber,
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        partsCost: dto.partsCost ?? 0,
        laborCost: dto.laborCost ?? 0,
        otherCost: dto.otherCost ?? 0,
        claimedAmount,
        status: 'DRAFT',
        createdById: user.id,
      },
    });
  }

  /**
   * Mukammal ho chuke warranty repair se claim banana.
   * Repair ka saara data khud bhar jata hai — dobara likhna nahi parta.
   */
  async createFromService(user: AuthenticatedUser, serviceRequestId: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({
      where: { id: serviceRequestId, tenantId: user.tenantId },
    });
    if (!r) throw new NotFoundException('Service request nahi mila');
    if (!r.coveredUnderWarranty) {
      throw new BadRequestException('Ye repair warranty me nahi tha — brand se claim nahi banta');
    }

    const dup = await this.prisma.applianceWarrantyClaim.findFirst({
      where: { tenantId: user.tenantId, serviceRequestId },
      select: { id: true, claimNumber: true },
    });
    if (dup) throw new BadRequestException(`Claim ${dup.claimNumber} pehle se bana hua hai`);

    // Serial se brand aur kharidne ki tareekh nikal lete hain
    let serial: any = null;
    if (r.serialTrackingId || r.serialNumber) {
      serial = await this.prisma.applianceSerialTracking.findFirst({
        where: {
          tenantId: user.tenantId,
          ...(r.serialTrackingId ? { id: r.serialTrackingId } : { serialNumber: r.serialNumber! }),
        },
      });
    }

    let brandName: string | null = null;
    let brandId: string | null = null;
    if (serial?.productId) {
      const profile = await this.prisma.applianceProductProfile.findFirst({
        where: { tenantId: user.tenantId, productId: serial.productId },
        select: { brandId: true },
      });
      if (profile?.brandId) {
        brandId = profile.brandId;
        const b = await this.prisma.brand.findFirst({
          where: { id: profile.brandId, tenantId: user.tenantId },
          select: { name: true },
        });
        brandName = b?.name ?? null;
      }
    }

    /** Jo warranty abhi chal rahi ho usi par claim banta hai */
    const now = Date.now();
    const live = (d: Date | null) => !!d && new Date(d).getTime() >= now;
    const warrantyKind = serial
      ? live(serial.compressorWarrantyEndDate) && !live(serial.warrantyEndDate)
        ? 'COMPRESSOR'
        : live(serial.motorWarrantyEndDate) && !live(serial.warrantyEndDate)
          ? 'MOTOR'
          : 'MAIN'
      : 'MAIN';

    const claimNumber = await this.nextNumber(user.tenantId);
    const partsCost = Number(r.partsCharge) || 0;
    const laborCost = (Number(r.laborCharge) || 0) + (Number(r.visitCharge) || 0);

    const claim = await this.prisma.applianceWarrantyClaim.create({
      data: {
        tenantId: user.tenantId,
        claimNumber,
        serviceRequestId: r.id,
        serviceRequestNumber: r.requestNumber,
        serialTrackingId: r.serialTrackingId,
        serialNumber: r.serialNumber ?? serial?.serialNumber ?? null,
        productId: r.productId ?? serial?.productId ?? null,
        productName: r.productName,
        brandId,
        brandName,
        modelNumber: serial?.modelNumber ?? null,
        customerId: r.customerId,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        purchaseDate: serial?.soldAt ?? null,
        invoiceNumber: serial?.invoiceNumber ?? null,
        issue: r.diagnosedIssue || r.reportedIssue,
        issueCategory: r.issueCategory,
        warrantyKind,
        partsCost,
        laborCost,
        otherCost: 0,
        claimedAmount: partsCost + laborCost,
        status: 'DRAFT',
        createdById: user.id,
      },
    });

    // Repair par claim number likh dein taake dono jure rahein
    await this.prisma.applianceServiceRequest.update({
      where: { id: r.id },
      data: { warrantyClaimNumber: claimNumber },
    });

    return claim;
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    open?: boolean;
    brandId?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 50));

    const where: any = {
      tenantId: user.tenantId,
      ...(params.status && { status: params.status as ApplianceClaimStatus }),
      ...(params.open && { status: { in: OPEN_STATES } }),
      ...(params.brandId && { brandId: params.brandId }),
      ...(params.from || params.to
        ? {
            claimDate: {
              ...(params.from && { gte: new Date(params.from) }),
              ...(params.to && { lte: (() => { const d = new Date(params.to!); d.setHours(23, 59, 59, 999); return d; })() }),
            },
          }
        : {}),
      ...(params.search && {
        OR: [
          { claimNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { productName: { contains: params.search, mode: 'insensitive' } },
          { serialNumber: { contains: params.search, mode: 'insensitive' } },
          { brandRef: { contains: params.search, mode: 'insensitive' } },
          { serviceRequestNumber: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.applianceWarrantyClaim.findMany({
        where,
        orderBy: { claimDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.applianceWarrantyClaim.count({ where }),
    ]);

    const now = Date.now();
    return {
      items: items.map((c) => ({
        ...c,
        /** Ab tak kitna paisa wapas aana baqi hai */
        pendingAmount: Math.max(Number(c.claimedAmount) - Number(c.receivedAmount), 0),
        /** Brand ne kitna kaata */
        shortfall: c.approvedAmount > 0
          ? Math.max(Number(c.claimedAmount) - Number(c.approvedAmount), 0)
          : 0,
        /** Kitne din se latka hua hai */
        ageDays: Math.floor((now - new Date(c.claimDate).getTime()) / 86_400_000),
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.applianceWarrantyClaim.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!c) throw new NotFoundException('Claim nahi mila');

    const service = c.serviceRequestId
      ? await this.prisma.applianceServiceRequest.findFirst({
          where: { id: c.serviceRequestId, tenantId: user.tenantId },
          select: {
            id: true, requestNumber: true, serviceType: true, status: true,
            reportedIssue: true, diagnosedIssue: true, workDone: true, partsReplaced: true,
            technicianName: true, requestedAt: true, completedAt: true,
            visitCharge: true, laborCharge: true, partsCharge: true, totalCharge: true,
          },
        })
      : null;

    const serial = c.serialTrackingId
      ? await this.prisma.applianceSerialTracking.findFirst({
          where: { id: c.serialTrackingId, tenantId: user.tenantId },
          select: {
            id: true, serialNumber: true, modelNumber: true, soldAt: true, invoiceNumber: true,
            warrantyEndDate: true, compressorWarrantyEndDate: true, motorWarrantyEndDate: true,
          },
        })
      : null;

    // Isi brand ke baqi claims — pata chalta hai brand kitna sust hai
    const brandHistory = c.brandId
      ? await this.prisma.applianceWarrantyClaim.findMany({
          where: { tenantId: user.tenantId, brandId: c.brandId, id: { not: c.id } },
          orderBy: { claimDate: 'desc' },
          take: 10,
          select: {
            id: true, claimNumber: true, productName: true, status: true,
            claimDate: true, claimedAmount: true, receivedAmount: true, settledAt: true,
          },
        })
      : [];

    return {
      ...c,
      pendingAmount: Math.max(Number(c.claimedAmount) - Number(c.receivedAmount), 0),
      shortfall: c.approvedAmount > 0 ? Math.max(Number(c.claimedAmount) - Number(c.approvedAmount), 0) : 0,
      ageDays: Math.floor((Date.now() - new Date(c.claimDate).getTime()) / 86_400_000),
      service,
      serial,
      brandHistory,
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateClaimDto) {
    const c = await this.prisma.applianceWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    if (c.status === 'SETTLED') throw new BadRequestException('Settle ho chuka claim edit nahi hota');

    const partsCost = dto.partsCost ?? Number(c.partsCost);
    const laborCost = dto.laborCost ?? Number(c.laborCost);
    const otherCost = dto.otherCost ?? Number(c.otherCost);

    return this.prisma.applianceWarrantyClaim.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        partsCost, laborCost, otherCost,
        claimedAmount: this.claimed(partsCost, laborCost, otherCost),
      },
    });
  }

  /** Brand ko bhej diya */
  async submit(user: AuthenticatedUser, id: string, dto: SubmitClaimDto) {
    const c = await this.prisma.applianceWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    if (c.status !== 'DRAFT') throw new BadRequestException('Ye claim pehle hi bheja ja chuka hai');
    if (Number(c.claimedAmount) <= 0) {
      throw new BadRequestException('Pehle parts/labor ka kharcha bharein — warna claim khali jayega');
    }

    return this.prisma.applianceWarrantyClaim.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        brandRef: dto.brandRef ?? c.brandRef,
        brandContact: dto.brandContact ?? c.brandContact,
        notes: dto.notes
          ? `${c.notes || ''}\n[${new Date().toLocaleString('en-PK')}] Bheja: ${dto.notes}`.trim()
          : c.notes,
      },
    });
  }

  /** Brand ka jawab aa gaya */
  async brandResponse(user: AuthenticatedUser, id: string, dto: BrandResponseDto) {
    const c = await this.prisma.applianceWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    if (c.status === 'DRAFT') throw new BadRequestException('Pehle claim brand ko bhejein');
    if (c.status === 'SETTLED') throw new BadRequestException('Ye claim settle ho chuka hai');

    const approved = dto.approvedAmount ?? 0;
    if (approved > Number(c.claimedAmount)) {
      throw new BadRequestException('Manzoor shuda raqam claim se ziyada nahi ho sakti');
    }

    return this.prisma.applianceWarrantyClaim.update({
      where: { id },
      data: {
        status: dto.status,
        approvedAmount: dto.status === 'REJECTED' ? 0 : approved,
        brandResponse: dto.brandResponse,
        rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason : null,
        replacementSerialNumber: dto.replacementSerialNumber ?? c.replacementSerialNumber,
        brandRespondedAt: new Date(),
      },
    });
  }

  /** Brand se paisa mil gaya */
  async settle(user: AuthenticatedUser, id: string, dto: SettleClaimDto) {
    const c = await this.prisma.applianceWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    if (c.status === 'DRAFT') throw new BadRequestException('Pehle claim brand ko bhejein');

    const received = Number(c.receivedAmount) + dto.receivedAmount;
    if (received > Number(c.claimedAmount)) {
      throw new BadRequestException('Kul wusool claim ki raqam se ziyada nahi ho sakti');
    }

    return this.prisma.applianceWarrantyClaim.update({
      where: { id },
      data: {
        receivedAmount: received,
        status: 'SETTLED',
        settledAt: new Date(),
        notes: dto.notes
          ? `${c.notes || ''}\n[${new Date().toLocaleString('en-PK')}] Wusool: ${dto.receivedAmount} — ${dto.notes}`.trim()
          : `${c.notes || ''}\n[${new Date().toLocaleString('en-PK')}] Wusool: ${dto.receivedAmount}`.trim(),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.applianceWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    if (c.status !== 'DRAFT') {
      throw new BadRequestException('Sirf wo claim delete hota hai jo abhi brand ko bheja na gaya ho');
    }
    if (c.serviceRequestId) {
      await this.prisma.applianceServiceRequest.updateMany({
        where: { id: c.serviceRequestId, tenantId: user.tenantId },
        data: { warrantyClaimNumber: null },
      });
    }
    await this.prisma.applianceWarrantyClaim.delete({ where: { id } });
    return { message: 'Claim delete ho gaya' };
  }

  /**
   * Jo warranty repair ho chuke hain lekin unka claim abhi bana hi
   * nahi — yehi wo paisa hai jo chupke se zaya ho raha hota hai.
   */
  async missingClaims(user: AuthenticatedUser) {
    const done = await this.prisma.applianceServiceRequest.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        coveredUnderWarranty: true,
        warrantyClaimNumber: null,
      },
      orderBy: { completedAt: 'desc' },
      take: 100,
      select: {
        id: true, requestNumber: true, productName: true, serialNumber: true,
        customerName: true, customerPhone: true, completedAt: true,
        partsCharge: true, laborCharge: true, visitCharge: true, totalCharge: true,
        issueCategory: true, reportedIssue: true, technicianName: true,
      },
    });

    const now = Date.now();
    return {
      items: done.map((r) => ({
        ...r,
        recoverable: (Number(r.partsCharge) || 0) + (Number(r.laborCharge) || 0) + (Number(r.visitCharge) || 0),
        ageDays: r.completedAt ? Math.floor((now - new Date(r.completedAt).getTime()) / 86_400_000) : 0,
      })),
      totalRecoverable: done.reduce(
        (s, r) => s + (Number(r.partsCharge) || 0) + (Number(r.laborCharge) || 0) + (Number(r.visitCharge) || 0), 0),
    };
  }

  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [byStatus, all, monthRows, missing] = await Promise.all([
      this.prisma.applianceWarrantyClaim.groupBy({
        by: ['status'], where: { tenantId }, _count: { _all: true },
      }),
      this.prisma.applianceWarrantyClaim.findMany({
        where: { tenantId },
        select: {
          id: true, status: true, claimDate: true, settledAt: true, brandId: true, brandName: true,
          claimedAmount: true, approvedAmount: true, receivedAmount: true,
        },
      }),
      this.prisma.applianceWarrantyClaim.findMany({
        where: { tenantId, claimDate: { gte: monthStart } },
        select: { claimedAmount: true, receivedAmount: true },
      }),
      this.missingClaims(user),
    ]);

    const map = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
    const open = all.filter((c) => OPEN_STATES.includes(c.status));

    const claimed = all.reduce((s, c) => s + Number(c.claimedAmount), 0);
    const approved = all.reduce((s, c) => s + Number(c.approvedAmount), 0);
    const received = all.reduce((s, c) => s + Number(c.receivedAmount), 0);

    // Settle hone me kitne din lagte hain
    const settled = all.filter((c) => c.settledAt);
    const days = settled.map((c) =>
      (new Date(c.settledAt!).getTime() - new Date(c.claimDate).getTime()) / 86_400_000);

    // Brand ke hisab se — kaunsa brand paisa deta hai, kaunsa nahi
    const byBrand = new Map<string, { brand: string; claims: number; claimed: number; received: number }>();
    for (const c of all) {
      const key = c.brandName ?? 'Bina brand';
      const b = byBrand.get(key) ?? { brand: key, claims: 0, claimed: 0, received: 0 };
      b.claims += 1;
      b.claimed += Number(c.claimedAmount);
      b.received += Number(c.receivedAmount);
      byBrand.set(key, b);
    }

    const nowMs = Date.now();
    return {
      total: all.length,
      byStatus: map,
      draft: map['DRAFT'] ?? 0,
      submitted: map['SUBMITTED'] ?? 0,
      reviewing: map['BRAND_REVIEWING'] ?? 0,
      approved: (map['APPROVED'] ?? 0) + (map['PARTIALLY_APPROVED'] ?? 0),
      rejected: map['REJECTED'] ?? 0,
      settled: map['SETTLED'] ?? 0,
      open: open.length,

      money: {
        claimed,
        approved,
        received,
        /** Jo paisa abhi brand ke paas atka hua hai */
        pending: claimed - received,
        /** Brand ne jitna kaat diya */
        shortfall: all
          .filter((c) => Number(c.approvedAmount) > 0)
          .reduce((s, c) => s + Math.max(Number(c.claimedAmount) - Number(c.approvedAmount), 0), 0),
        recoveryRate: claimed > 0 ? (received / claimed) * 100 : 0,
      },

      /** Jo claim 30 din se latke hain — brand ko yaad dilana chahiye */
      stale: open.filter((c) => (nowMs - new Date(c.claimDate).getTime()) / 86_400_000 > 30).length,
      avgSettleDays: days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0,

      month: {
        claims: monthRows.length,
        claimed: monthRows.reduce((s, c) => s + Number(c.claimedAmount), 0),
        received: monthRows.reduce((s, c) => s + Number(c.receivedAmount), 0),
      },

      byBrand: [...byBrand.values()]
        .map((b) => ({ ...b, recoveryRate: b.claimed > 0 ? (b.received / b.claimed) * 100 : 0 }))
        .sort((a, b) => b.claimed - a.claimed),

      /** Jin repairs ka claim banaya hi nahi gaya — zaya hota paisa */
      missing: {
        count: missing.items.length,
        recoverable: missing.totalRecoverable,
      },
    };
  }
}
