import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ControlledLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.controlledSubstanceLog.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const logNumber = `CSR-${year}-${String(count + 1).padStart(5, '0')}`;

    // Verify product is narcotic
    const med = await this.prisma.pharmacyMedicine.findFirst({
      where: { productId: dto.productId, tenantId: user.tenantId },
    });
    if (!med?.isNarcotic) throw new BadRequestException('Product is not a controlled substance');

    // Get current stock as opening balance
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    const opening = product?.stock ?? 0;
    const closing = dto.logType === 'SALE' || dto.logType === 'DAMAGE' ? opening - dto.quantity : opening + dto.quantity;

    return this.prisma.controlledSubstanceLog.create({
      data: {
        tenantId: user.tenantId,
        productId: dto.productId,
        batchId: dto.batchId,
        saleId: dto.saleId,
        prescriptionId: dto.prescriptionId,
        logNumber,
        logType: dto.logType,
        quantity: dto.quantity,
        unit: dto.unit,
        openingBalance: opening,
        closingBalance: closing,
        patientName: dto.patientName,
        patientCnic: dto.patientCnic,
        patientPhone: dto.patientPhone,
        patientAddress: dto.patientAddress,
        doctorName: dto.doctorName,
        doctorRegNumber: dto.doctorRegNumber,
        prescriptionNumber: dto.prescriptionNumber,
        dispensedBy: dto.dispensedBy,
        supervisedBy: dto.supervisedBy,
        notes: dto.notes,
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
