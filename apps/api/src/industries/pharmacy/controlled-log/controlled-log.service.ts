import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateControlledLogDto, OUTGOING_LOG_TYPES } from './dto/create-controlled-log.dto';

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ControlledLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateControlledLogDto) {
    return this.record(this.prisma, user.tenantId, dto, user.email);
  }

  /**
   * Writes one register line. Entries are made after the stock has already
   * moved (a sale, a received purchase, a damage write-off), so the closing
   * balance is the stock on hand now and the opening balance is worked back
   * from it.
   */
  async record(db: Db, tenantId: string, dto: CreateControlledLogDto, dispensedBy?: string) {
    const quantity = Number(dto.quantity);
    if (!(quantity > 0)) throw new BadRequestException('Miqdaar 0 se zyada honi chahiye');

    const med = await db.pharmacyMedicine.findFirst({
      where: { productId: dto.productId, tenantId },
      include: { product: { select: { stock: true, unit: true } } },
    });
    if (!med) throw new NotFoundException('Dawai nahi mili');
    if (!med.isNarcotic) throw new BadRequestException('Ye dawai narcotic / controlled list me nahi hai');

    if (dto.batchId) {
      const batch = await db.productBatch.findFirst({ where: { id: dto.batchId, productId: dto.productId, tenantId } });
      if (!batch) throw new NotFoundException('Batch nahi mila');
    }

    const closing = Number(med.product?.stock ?? 0);
    const outgoing = OUTGOING_LOG_TYPES.includes(dto.logType);
    const opening = outgoing ? closing + quantity : closing - quantity;

    const year = new Date().getFullYear();
    let seq = (await db.controlledSubstanceLog.count({ where: { tenantId } })) + 1;
    let logNumber = `CSR-${year}-${String(seq).padStart(5, '0')}`;
    while (await db.controlledSubstanceLog.findFirst({ where: { tenantId, logNumber }, select: { id: true } })) {
      seq += 1;
      logNumber = `CSR-${year}-${String(seq).padStart(5, '0')}`;
    }

    return db.controlledSubstanceLog.create({
      data: {
        tenantId,
        productId: dto.productId,
        batchId: dto.batchId || undefined,
        saleId: dto.saleId || undefined,
        prescriptionId: dto.prescriptionId || undefined,
        logNumber,
        logType: dto.logType,
        quantity,
        unit: dto.unit || med.product?.unit || 'pcs',
        openingBalance: opening,
        closingBalance: closing,
        patientName: dto.patientName || undefined,
        patientCnic: dto.patientCnic || undefined,
        patientPhone: dto.patientPhone || undefined,
        patientAddress: dto.patientAddress || undefined,
        doctorName: dto.doctorName || undefined,
        doctorRegNumber: dto.doctorRegNumber || undefined,
        prescriptionNumber: dto.prescriptionNumber || undefined,
        dispensedBy: dto.dispensedBy || dispensedBy || undefined,
        supervisedBy: dto.supervisedBy || undefined,
        notes: dto.notes || undefined,
        attachmentUrls: dto.attachmentUrls ?? [],
      },
    });
  }

  async list(user: AuthenticatedUser, params: { productId?: string; from?: string; to?: string; logType?: string }) {
    return this.prisma.controlledSubstanceLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.logType && { logType: params.logType }),
        ...(params.from || params.to ? {
          logDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { logDate: 'desc' },
      take: 500,
    });
  }

  async register(user: AuthenticatedUser, productId: string, params: { from?: string; to?: string }) {
    return this.prisma.controlledSubstanceLog.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        ...(params.from || params.to ? {
          logDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { logDate: 'asc' },
    });
  }
}
