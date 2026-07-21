import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateCakeOrderDto, UpdateCakeOrderStatusDto } from './dto/create-cake-order.dto';

@Injectable()
export class CakeOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateCakeOrderDto) {
    const count = await this.prisma.bakeryCakeOrder.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const orderNumber = 'CK-' + year + '-' + String(count + 1).padStart(5, '0');

    const basePrice = Number(dto.basePrice) || 0;
    const customization = Number(dto.customizationCharges) || 0;
    const photoCharges = Number(dto.photoCakeCharges) || 0;
    const delivery = Number(dto.deliveryCharges) || 0;
    const tax = Number(dto.taxAmount) || 0;
    const discount = Number(dto.discount) || 0;
    const total = Math.max(basePrice + customization + photoCharges + delivery + tax - discount, 0);

    const advanceRequired = dto.advanceRequired ?? total * 0.5;

    return this.prisma.bakeryCakeOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        orderNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        productId: dto.productId,
        productName: dto.productName,
        category: dto.category ?? 'CUSTOM_CAKE',
        size: dto.size,
        customWeightKg: dto.customWeightKg,
        shape: dto.shape ?? 'ROUND',
        customShapeDesc: dto.customShapeDesc,
        flavor: dto.flavor,
        customFlavorDesc: dto.customFlavorDesc,
        creamType: dto.creamType,
        numberOrLetter: dto.numberOrLetter,
        numberOfTiers: dto.numberOfTiers ?? 1,
        tierDetails: dto.tierDetails,
        messageOnCake: dto.messageOnCake,
        messageColor: dto.messageColor,
        hasPhotoOnCake: dto.hasPhotoOnCake ?? false,
        photoUrl: dto.photoUrl,
        hasEdibleImage: dto.hasEdibleImage ?? false,
        designReferenceUrls: dto.designReferenceUrls ?? [],
        designInstructions: dto.designInstructions,
        colorTheme: dto.colorTheme,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        decorativeItems: dto.decorativeItems ?? [],
        candlesRequired: dto.candlesRequired,
        candleType: dto.candleType,
        cakeStand: dto.cakeStand ?? false,
        cakeKnife: dto.cakeKnife ?? false,
        occasion: dto.occasion,
        celebrantName: dto.celebrantName,
        celebrantAge: dto.celebrantAge,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        eventTime: dto.eventTime,
        eventVenue: dto.eventVenue,
        isEggless: dto.isEggless ?? false,
        isSugarFree: dto.isSugarFree ?? false,
        isVegan: dto.isVegan ?? false,
        allergies: dto.allergies ?? [],
        dietaryNotes: dto.dietaryNotes,
        deliveryType: dto.deliveryType ?? 'SELF_PICKUP',
        neededBy: new Date(dto.neededBy),
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        deliveryTime: dto.deliveryTime,
        deliveryAddress: dto.deliveryAddress,
        deliveryLandmark: dto.deliveryLandmark,
        deliveryCharges: delivery,
        basePrice,
        customizationCharges: customization,
        photoCakeCharges: photoCharges,
        taxAmount: tax,
        discount,
        advanceRequired,
        advancePaid: Number(dto.advancePaid) || 0,
        paidAmount: Number(dto.advancePaid) || 0,
        total,
        status: 'CONFIRMED',
        paymentStatus: (Number(dto.advancePaid) || 0) >= advanceRequired ? 'DEPOSIT_PAID' : 'UNPAID',
        specialInstructions: dto.specialInstructions,
        internalNotes: dto.internalNotes,
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; occasion?: string; deliveryType?: string; from?: string; to?: string; search?: string; customerId?: string }) {
    return this.prisma.bakeryCakeOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.occasion && { occasion: params.occasion }),
        ...(params.deliveryType && { deliveryType: params.deliveryType as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to ? {
          neededBy: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { celebrantName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { neededBy: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const order = await this.prisma.bakeryCakeOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateCakeOrderStatusDto) {
    const order = await this.prisma.bakeryCakeOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'CONFIRMED') patch.confirmedAt = now;
    if (dto.status === 'IN_PRODUCTION' || dto.status === 'BAKING') patch.startedAt = now;
    if (dto.status === 'READY') patch.completedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }

    return this.prisma.bakeryCakeOrder.update({ where: { id }, data: patch });
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number) {
    const order = await this.prisma.bakeryCakeOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order not found');

    const newPaid = order.paidAmount + amount;
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= order.total) paymentStatus = 'PAID';
    else if (newPaid >= order.advanceRequired) paymentStatus = 'DEPOSIT_PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';

    return this.prisma.bakeryCakeOrder.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus },
    });
  }

  async assignBaker(user: AuthenticatedUser, id: string, bakerId: string, decoratorId?: string) {
    return this.prisma.bakeryCakeOrder.update({
      where: { id },
      data: { assignedBakerId: bakerId, assignedDecoratorId: decoratorId },
    });
  }

  async addRating(user: AuthenticatedUser, id: string, rating: number, feedback?: string, photoUrls?: string[]) {
    return this.prisma.bakeryCakeOrder.update({
      where: { id },
      data: {
        customerRating: rating,
        customerFeedback: feedback,
        finalPhotoUrls: photoUrls ?? [],
      },
    });
  }

  async upcoming(user: AuthenticatedUser, days: number = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.bakeryCakeOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] },
        neededBy: { gte: now, lte: future },
      },
      orderBy: { neededBy: 'asc' },
      take: 50,
    });
  }

  async calendar(user: AuthenticatedUser, from: string, to: string) {
    return this.prisma.bakeryCakeOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        neededBy: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { neededBy: 'asc' },
    });
  }
}
