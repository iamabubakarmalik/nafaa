import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddPaymentDto, CreateJewelrySaleDto, UpdateSaleStatusDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateJewelrySaleDto) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    const count = await this.prisma.jewelrySale.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const invoiceNumber = `JW-${year}-${String(count + 1).padStart(5, '0')}`;

    // Fetch current rates snapshot
    const rates = await this.prisma.jewelryMetalRate.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    const ratesMap: Record<string, number> = {};
    rates.forEach((r) => { ratesMap[`${r.metalType}_${r.purity}`] = r.ratePerGram; });

    let totalGrossWeight = 0;
    let totalNetWeight = 0;
    let totalMetalValue = 0;
    let totalMakingCharges = 0;
    let totalWastageValue = 0;
    let totalPolishCharges = 0;
    let totalHallmarkCharges = 0;
    let totalStoneValue = 0;

    const enrichedItems = dto.items.map((it, idx) => {
      const grossWeight = Number(it.grossWeight) || 0;
      const netWeight = Number(it.netWeight) || 0;
      const rate = Number(it.ratePerGram) || 0;

      const metalValue = netWeight * rate;
      const makingCharge =
        (Number(it.makingChargePerGram) || 0) * netWeight +
        (Number(it.makingChargeFixed) || 0) +
        (metalValue * (Number(it.makingChargePct) || 0)) / 100;

      const wastageValue = ((Number(it.wastagePct) || 0) / 100) * metalValue;
      const polishCharges = Number(it.polishCharges) || 0;
      const hallmarkCharges = Number(it.hallmarkCharges) || 0;
      const stoneValue = Number(it.stoneValue) || 0;
      const quantity = Number(it.quantity) || 1;

      const itemTotal = (metalValue + makingCharge + wastageValue + polishCharges + hallmarkCharges + stoneValue) * quantity;

      totalGrossWeight += grossWeight * quantity;
      totalNetWeight += netWeight * quantity;
      totalMetalValue += metalValue * quantity;
      totalMakingCharges += makingCharge * quantity;
      totalWastageValue += wastageValue * quantity;
      totalPolishCharges += polishCharges * quantity;
      totalHallmarkCharges += hallmarkCharges * quantity;
      totalStoneValue += stoneValue * quantity;

      return {
        productId: it.productId,
        productName: it.productName,
        category: it.category,
        metalType: it.metalType,
        purity: it.purity,
        ratePerGram: rate,
        grossWeight,
        netWeight,
        metalValue,
        makingChargePerGram: Number(it.makingChargePerGram) || 0,
        makingChargeFixed: Number(it.makingChargeFixed) || 0,
        makingChargePct: Number(it.makingChargePct) || 0,
        makingTotal: makingCharge,
        wastagePct: Number(it.wastagePct) || 0,
        wastageValue,
        polishCharges,
        hallmarkCharges,
        stoneValue,
        quantity,
        itemTotal,
        hallmarkNumber: it.hallmarkNumber,
        certificateNumber: it.certificateNumber,
        itemPhotoUrl: it.itemPhotoUrl,
        displayOrder: idx,
      };
    });

    const gstAmount = Number(dto.gstAmount) || 0;
    const otherCharges = Number(dto.otherCharges) || 0;
    const discount = Number(dto.discount) || 0;
    const exchangeValue = Number(dto.exchangeValue) || 0;

    const subtotal = totalMetalValue + totalMakingCharges + totalWastageValue + totalPolishCharges + totalHallmarkCharges + totalStoneValue;
    const total = Math.max(subtotal + gstAmount + otherCharges - discount - exchangeValue, 0);

    const paidAmount = Number(dto.paidAmount) || 0;
    let paymentStatus = 'UNPAID';
    if (paidAmount >= total) paymentStatus = 'PAID';
    else if (paidAmount > 0) paymentStatus = 'PARTIALLY_PAID';

    return this.prisma.jewelrySale.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        invoiceNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerCnic: dto.customerCnic,
        customerAddress: dto.customerAddress,
        metalRateSnapshot: ratesMap,
        grossWeight: totalGrossWeight,
        netWeight: totalNetWeight,
        metalValue: totalMetalValue,
        makingCharges: totalMakingCharges,
        wastageValue: totalWastageValue,
        polishCharges: totalPolishCharges,
        hallmarkCharges: totalHallmarkCharges,
        stoneValue: totalStoneValue,
        gstAmount,
        otherCharges,
        subtotal,
        discount,
        total,
        paidAmount,
        paymentStatus,
        paymentMethod: dto.paymentMethod,
        exchangeMetalGrams: Number(dto.exchangeMetalGrams) || 0,
        exchangeMetalPurity: dto.exchangeMetalPurity,
        exchangeValue,
        exchangeType: dto.exchangeType,
        hallmarkVerified: dto.hallmarkVerified ?? false,
        hasCertificate: dto.hasCertificate ?? false,
        customerNotes: dto.customerNotes,
        internalNotes: dto.internalNotes,
        createdById: user.id,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.jewelrySale.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to ? {
          saleDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { customerCnic: { contains: params.search } },
          ],
        }),
      },
      include: { items: true },
      orderBy: { saleDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.jewelrySale.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!s) throw new NotFoundException('Sale not found');
    return s;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateSaleStatusDto) {
    const patch: any = { status: dto.status };
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = new Date();
      patch.cancellationReason = dto.cancellationReason;
    }
    return this.prisma.jewelrySale.update({ where: { id }, data: patch, include: { items: true } });
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const s = await this.prisma.jewelrySale.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Sale not found');
    const newPaid = s.paidAmount + Number(dto.amount);
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= s.total) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.jewelrySale.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        paymentStatus,
        paymentMethod: dto.paymentMethod ?? s.paymentMethod,
      },
      include: { items: true },
    });
  }

  async markReturned(user: AuthenticatedUser, id: string, reason: string) {
    return this.prisma.jewelrySale.update({
      where: { id },
      data: { isReturned: true, returnedAt: new Date(), returnReason: reason, status: 'CANCELLED' },
      include: { items: true },
    });
  }

  async markExchanged(user: AuthenticatedUser, id: string, exchangeType: string) {
    return this.prisma.jewelrySale.update({
      where: { id },
      data: { isExchanged: true, exchangedAt: new Date(), exchangeType: exchangeType as any },
      include: { items: true },
    });
  }
}
