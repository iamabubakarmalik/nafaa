/**
 * Sends a saved Market order into the shop's Online Orders as a ChannelOrder
 * (OnlineOrdersService.receive on the shop's NAFAA_MARKET channel).
 *
 * Everything is rebuilt from the stored MarketplaceOrder, so the same call
 * serves checkout and the retry sweep. The order number is the external order
 * id, and Online Orders treats a repeated id as the same order, so a retry
 * never creates a second ChannelOrder.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OnlineOrdersService } from '../../integrations/online-orders/online-orders.service';
import { NormalizedOrder } from '../../integrations/online-orders/order-normalizer';
import { MarketChannelService } from './market-channel.service';
import { resolveGate } from './market-config';

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

@Injectable()
export class MarketIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channel: MarketChannelService,
    private readonly orders: OnlineOrdersService,
  ) {}

  /** Creates (or finds) the ChannelOrder for a Market order and links it. Returns its id. */
  async push(marketOrderId: string): Promise<string> {
    const order = await this.prisma.marketplaceOrder.findUnique({
      where: { id: marketOrderId },
      include: { items: true, customer: { select: { fullName: true, phone: true, email: true } } },
    });
    if (!order) throw new Error(`Market order ${marketOrderId} not found`);
    if (order.channelOrderId) return order.channelOrderId;

    const integration = await this.channel.ensureChannel(order.shopId);
    const addr = (order.addressSnapshot ?? null) as null | {
      fullName?: string; phone?: string; addressLine1?: string; addressLine2?: string | null; area?: string; landmark?: string | null;
      city?: string; lat?: number | null; lng?: number | null;
    };
    const pickup = ['PICKUP', 'SELF_PICKUP'].includes(order.deliveryType);
    // Booking shops (salon, clinic, gym...) get a visit at the chosen time.
    const profile = await this.prisma.shopMarketplaceProfile.findUnique({ where: { shopId: order.shopId }, select: { gate: true, tenant: { select: { businessType: true } } } });
    const booking = resolveGate(profile?.gate, profile?.tenant?.businessType) === 'BOOKING';
    const fulfilment = booking ? 'BOOKING' : pickup ? 'PICKUP' : order.deliveryType === 'DINE_IN' ? 'DINE_IN' : 'DELIVERY';
    const coupon = n(order.couponDiscount);
    const loyalty = n(order.loyaltyDiscount);
    const wallet = n(order.walletUsed);
    const marketFunded = r2(loyalty + wallet);
    const method = order.paymentMethod;
    const slot = order.deliverySlotStart?.toISOString() ?? null;

    const itemExtras = order.items
      .filter((i) => i.notes || i.modifiers || i.options)
      .map((i) => ({ name: i.productName, variant: i.variantName ?? null, quantity: i.quantity, notes: i.notes ?? null, modifiers: i.modifiers ?? null, options: i.options ?? null }));

    const normalized: NormalizedOrder = {
      platform: 'custom',
      externalOrderId: order.orderNumber,
      externalOrderNumber: order.orderNumber,
      customerName: addr?.fullName || order.customer.fullName,
      customerPhone: addr?.phone || order.customer.phone,
      customerEmail: order.customer.email ?? undefined,
      customerAddress: addr ? [addr.addressLine1, addr.addressLine2, addr.area, addr.landmark].filter(Boolean).join(', ') : undefined,
      customerCity: addr?.city,
      customerLat: addr?.lat ?? undefined,
      customerLng: addr?.lng ?? undefined,
      items: order.items.map((i) => ({
        name: i.productName, variant: i.variantName ?? undefined, quantity: i.quantity, price: n(i.unitPrice),
        image: i.imageUrl ?? undefined, productId: i.productId, variantId: i.variantId,
      })) as NormalizedOrder['items'],
      subtotal: n(order.subtotal),
      deliveryFee: n(order.deliveryFee),
      // Coupon is the shop's own discount; wallet and points are paid by Nafaa (see metadata.marketFunded).
      discount: r2(coupon + marketFunded),
      total: n(order.total),
      paymentMethod: method === 'COD' ? 'cod' : method.toLowerCase(),
      paymentStatus: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      cancelled: false,
      // The slot travels in metadata.deliverySlot and is shown in Pakistan time by the POS drawer.
      notes: order.customerNotes || undefined,
      paymentTitle: method === 'COD' ? 'Cash on delivery' : method === 'WALLET' ? 'Nafaa Market wallet' : `Online payment (${method})`,
      shippingMethod: `Nafaa Market · ${{ DELIVERY: 'Delivery', PICKUP: 'Pickup', DINE_IN: 'Dine-in', BOOKING: 'Booking' }[fulfilment]}`,
      shopId: order.shopId,
      attribution: (order.couponCode && coupon > 0 ? { discountCodes: [order.couponCode] } : undefined) as NormalizedOrder['attribution'],
    };

    const saved = await this.orders.receive(integration, normalized, { signed: true });
    await this.prisma.channelOrder.update({
      where: { id: saved.id },
      data: {
        metadata: {
          ...((saved.metadata ?? {}) as object),
          platform: 'nafaa_market',
          marketplaceOrderId: order.id,
          customerId: order.customerId,
          fulfilment,
          ...(marketFunded > 0 && { marketFunded: { loyalty, wallet } }),
          ...(slot && { deliverySlot: { start: slot, end: order.deliverySlotEnd?.toISOString() ?? null } }),
          // Customer uploads (prescription photos) for the POS order drawer.
          ...(order.attachments && { attachments: order.attachments }),
          // Per-line choices from the category flow (add-ons, cake message, substitute preference, notes).
          ...(itemExtras.length && { itemExtras }),
        } as Prisma.InputJsonValue,
      },
    }).catch(() => null);
    await this.prisma.marketplaceOrder.update({ where: { id: order.id }, data: { channelOrderId: saved.id } });
    return saved.id;
  }
}
