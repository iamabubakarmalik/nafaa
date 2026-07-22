import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketplaceOrderStatus, MarketplacePaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketplaceCartService } from '../cart/cart.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { PreviewCheckoutDto } from './dto/preview-checkout.dto';

const LOYALTY_POINT_VALUE = 0.5; // 1 point = 0.5 PKR

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NB${y}${m}${d}${rand}`;
}

@Injectable()
export class MarketplaceCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartSvc: MarketplaceCartService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // PREVIEW — calculates totals BEFORE placing order
  // ═══════════════════════════════════════════════════════════

  async preview(customerId: string, dto: PreviewCheckoutDto) {
    const cart = await this.cartSvc.getCart(customerId);
    if (cart.shopGroups.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate address
    let address = null;
    if (dto.addressId) {
      address = await this.prisma.customerAddress.findFirst({
        where: { id: dto.addressId, customerId },
      });
      if (!address) throw new NotFoundException('Address not found');
    }

    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true, loyaltyPoints: true },
    });
    if (!customer) throw new NotFoundException();

    // Apply coupon (placeholder — promotions module will fill this)
    let couponDiscount = 0;
    let couponError: string | null = null;
    if (dto.couponCode) {
      // TODO: integrate with PromotionsModule
      couponError = 'Coupon system not yet implemented';
    }

    // Loyalty points value
    const maxLoyaltyValue = Number(customer.loyaltyPoints) * LOYALTY_POINT_VALUE;
    const loyaltyPointsToUse = Math.min(
      dto.loyaltyPointsToUse ?? 0,
      customer.loyaltyPoints,
    );
    const loyaltyDiscount = loyaltyPointsToUse * LOYALTY_POINT_VALUE;

    // Wallet
    const walletAmountToUse = Math.min(
      dto.walletAmountToUse ?? 0,
      Number(customer.walletBalance),
    );

    // Per-shop breakdown
    const shopBreakdown = cart.shopGroups.map((g) => ({
      shopId: g.shopId,
      shop: g.shop,
      itemCount: g.itemCount,
      subtotal: g.subtotal,
      deliveryFee: g.deliveryFee,
      minOrderAmount: g.minOrderAmount,
      meetsMinOrder: g.meetsMinOrder,
      total: g.shopTotal,
    }));

    const subtotal = cart.subtotal;
    const totalDeliveryFee = cart.totalDeliveryFee;
    const totalDiscount = couponDiscount + loyaltyDiscount;
    const grandTotalBeforeWallet = Math.max(0, subtotal + totalDeliveryFee - totalDiscount);
    const finalTotal = Math.max(0, grandTotalBeforeWallet - walletAmountToUse);

    const anyShopUnmet = shopBreakdown.some((s) => !s.meetsMinOrder);

    return {
      shopBreakdown,
      subtotal,
      totalDeliveryFee,
      couponDiscount,
      couponError,
      loyaltyPoints: {
        available: customer.loyaltyPoints,
        used: loyaltyPointsToUse,
        maxValue: maxLoyaltyValue,
        appliedDiscount: loyaltyDiscount,
      },
      wallet: {
        balance: Number(customer.walletBalance),
        used: walletAmountToUse,
        remainingAfter: Number(customer.walletBalance) - walletAmountToUse,
      },
      totalDiscount,
      grandTotalBeforeWallet,
      finalTotal,
      canPlaceOrder: !anyShopUnmet && cart.shopGroups.length > 0,
      warnings: anyShopUnmet ? ['Some shops do not meet minimum order requirement'] : [],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PLACE ORDER — creates 1 order PER shop (multi-shop split)
  // ═══════════════════════════════════════════════════════════

  async placeOrder(customerId: string, dto: PlaceOrderDto) {
    const cart = await this.cartSvc.getCart(customerId);
    if (cart.shopGroups.length === 0) throw new BadRequestException('Cart is empty');

    const address = await this.prisma.customerAddress.findFirst({
      where: { id: dto.addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');

    // Validate each shop meets min order
    for (const g of cart.shopGroups) {
      if (!g.meetsMinOrder) {
        throw new BadRequestException(
          `Minimum order not met for ${g.shop?.publicName ?? g.shopId} (required ${g.minOrderAmount})`,
        );
      }
    }

    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: { walletBalance: true, loyaltyPoints: true },
    });
    if (!customer) throw new NotFoundException();

    // Compute values
    const loyaltyPointsToUse = Math.min(dto.loyaltyPointsToUse ?? 0, customer.loyaltyPoints);
    const loyaltyDiscount = loyaltyPointsToUse * LOYALTY_POINT_VALUE;
    const walletAmountToUse = Math.min(
      dto.walletAmountToUse ?? 0,
      Number(customer.walletBalance),
    );

    // Load cart lines full snapshot
    const cartFull = await this.prisma.marketplaceCart.findUnique({
      where: { customerId },
      include: { lines: true },
    });
    if (!cartFull) throw new NotFoundException();

    // Distribute loyalty + wallet discount proportionally by shop subtotal
    const totalSubtotal = cart.shopGroups.reduce((s, g) => s + g.subtotal, 0);
    const totalDeliveryFee = cart.shopGroups.reduce((s, g) => s + g.deliveryFee, 0);
    const totalDiscount = loyaltyDiscount;

    const createdOrders: any[] = [];

    // Use single transaction
    await this.prisma.$transaction(async (tx) => {
      for (const group of cart.shopGroups) {
        // Load shop tenantId
        const shop = await tx.shop.findUnique({
          where: { id: group.shopId },
          select: { id: true, tenantId: true },
        });
        if (!shop) throw new BadRequestException(`Shop ${group.shopId} not found`);

        const proportionalDiscount = totalSubtotal > 0
          ? (group.subtotal / totalSubtotal) * totalDiscount
          : 0;
        const proportionalWallet = totalSubtotal + totalDeliveryFee > 0
          ? ((group.subtotal + group.deliveryFee) / (totalSubtotal + totalDeliveryFee)) * walletAmountToUse
          : 0;

        const shopSubtotal = group.subtotal;
        const shopDelivery = group.deliveryFee;
        const tipShare = (dto.tipAmount ?? 0) / cart.shopGroups.length;
        const shopTotal = Math.max(
          0,
          shopSubtotal + shopDelivery + tipShare - proportionalDiscount - proportionalWallet,
        );

        const order = await tx.marketplaceOrder.create({
          data: {
            orderNumber: generateOrderNumber(),
            customerId,
            shopId: shop.id,
            tenantId: shop.tenantId,
            status: MarketplaceOrderStatus.PENDING,
            deliveryType: dto.deliveryType,
            subtotal: new Prisma.Decimal(shopSubtotal),
            deliveryFee: new Prisma.Decimal(shopDelivery),
            discount: new Prisma.Decimal(proportionalDiscount),
            walletUsed: new Prisma.Decimal(proportionalWallet),
            loyaltyPointsUsed: Math.round(
              (loyaltyPointsToUse * shopSubtotal) / (totalSubtotal || 1),
            ),
            loyaltyDiscount: new Prisma.Decimal(
              (loyaltyDiscount * shopSubtotal) / (totalSubtotal || 1),
            ),
            tipAmount: new Prisma.Decimal(tipShare),
            total: new Prisma.Decimal(shopTotal),
            currency: 'PKR',
            paymentMethod: dto.paymentMethod,
            paymentStatus:
              dto.paymentMethod === 'COD'
                ? MarketplacePaymentStatus.PENDING
                : MarketplacePaymentStatus.PENDING,
            addressId: address.id,
            addressSnapshot: address as any,
            deliverySlotStart: dto.deliverySlotStart ? new Date(dto.deliverySlotStart) : null,
            deliverySlotEnd: dto.deliverySlotEnd ? new Date(dto.deliverySlotEnd) : null,
            customerNotes: dto.customerNotes,
            source: 'APP',
            items: {
              create: cartFull.lines
                .filter((l) => l.shopId === group.shopId)
                .map((l) => ({
                  productId: l.productId,
                  variantId: l.variantId,
                  productName: l.productName,
                  variantName: l.variantName,
                  imageUrl: l.imageUrl,
                  unitPrice: l.unitPrice,
                  quantity: l.quantity,
                  total: new Prisma.Decimal(Number(l.unitPrice) * l.quantity),
                  notes: l.notes,
                  modifiers: l.modifiers as any,
                  bargainId: l.bargainId,
                })),
            },
            statusHistory: {
              create: {
                status: MarketplaceOrderStatus.PENDING,
                note: 'Order placed by customer',
                changedBy: 'CUSTOMER',
              },
            },
          },
          include: { items: true },
        });

        // Convert bargains
        const bargainedLines = cartFull.lines.filter(
          (l) => l.shopId === group.shopId && l.bargainId,
        );
        for (const bl of bargainedLines) {
          await tx.bargain.update({
            where: { id: bl.bargainId! },
            data: {
              orderId: order.id,
              convertedAt: new Date(),
              status: 'CONVERTED',
            },
          });
        }

        // Group buy participation
        const groupBuyLines = cartFull.lines.filter(
          (l) => l.shopId === group.shopId && l.groupBuyId,
        );
        for (const gbl of groupBuyLines) {
          await tx.groupBuyParticipant.upsert({
            where: {
              groupBuyId_customerId: {
                groupBuyId: gbl.groupBuyId!,
                customerId,
              },
            },
            update: {
              quantity: { increment: gbl.quantity },
              orderId: order.id,
            },
            create: {
              groupBuyId: gbl.groupBuyId!,
              customerId,
              quantity: gbl.quantity,
              amount: new Prisma.Decimal(Number(gbl.unitPrice) * gbl.quantity),
              orderId: order.id,
            },
          });
          await tx.groupBuy.update({
            where: { id: gbl.groupBuyId! },
            data: { currentCount: { increment: gbl.quantity } },
          });
        }

        createdOrders.push(order);
      }

      // Deduct wallet
      if (walletAmountToUse > 0) {
        const newBalance = Number(customer.walletBalance) - walletAmountToUse;
        await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { walletBalance: new Prisma.Decimal(newBalance) },
        });
        await tx.customerWalletTxn.create({
          data: {
            customerId,
            type: 'DEBIT',
            amount: new Prisma.Decimal(walletAmountToUse),
            balanceAfter: new Prisma.Decimal(newBalance),
            reason: `Used for order(s): ${createdOrders.map((o) => o.orderNumber).join(', ')}`,
            referenceType: 'ORDER',
          },
        });
      }

      // Deduct loyalty
      if (loyaltyPointsToUse > 0) {
        await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { loyaltyPoints: { decrement: loyaltyPointsToUse } },
        });
      }

      // Clear cart
      await tx.marketplaceCartLine.deleteMany({ where: { cartId: cartFull.id } });
    });

    return {
      success: true,
      orders: createdOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        shopId: o.shopId,
        total: Number(o.total),
        paymentMethod: o.paymentMethod,
        status: o.status,
      })),
      totalOrders: createdOrders.length,
      grandTotal: createdOrders.reduce((s, o) => s + Number(o.total), 0),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // DELIVERY SLOTS (available time windows)
  // ═══════════════════════════════════════════════════════════

  async getDeliverySlots(shopId?: string) {
    // Naive slots for next 3 days, 2-hour windows from 10:00 to 22:00
    const slots: { start: string; end: string; label: string }[] = [];
    const now = new Date();
    for (let d = 0; d < 3; d++) {
      for (let h = 10; h < 22; h += 2) {
        const start = new Date(now);
        start.setDate(now.getDate() + d);
        start.setHours(h, 0, 0, 0);
        if (start < now) continue;
        const end = new Date(start);
        end.setHours(h + 2);
        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: `${start.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })} ${h}:00 - ${h + 2}:00`,
        });
      }
    }
    return { slots };
  }
}
