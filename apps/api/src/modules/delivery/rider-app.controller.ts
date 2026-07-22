import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { DeliveryService } from './delivery.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';

/**
 * Rider App API — separate endpoints for the mobile rider app.
 * NOTE: rider auth will be added in a later batch; for now these are `@Public`
 * with riderId in path/body. Add proper rider auth guard when the mobile app is built.
 */
@ApiTags('Delivery / Rider App')
@Controller('rider-app')
export class RiderAppController {
  constructor(
    private readonly svc: DeliveryService,
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
  ) {}

  @Public()
  @Post('riders/:riderId/location')
  @ApiOperation({ summary: 'Rider pings current location' })
  updateLocation(
    @Param('riderId') riderId: string,
    @Body() dto: UpdateLocationDto & { orderId?: string },
  ) {
    return this.svc.updateRiderLocation(riderId, dto, dto.orderId);
  }

  @Public()
  @Get('riders/:riderId/pending')
  @ApiOperation({ summary: 'New pending assignments for rider' })
  async pending(@Param('riderId') riderId: string) {
    const assignments = await this.prisma.mktDeliveryAssignment.findMany({
      where: { riderId, status: 'PENDING' },
    });
    // Batch fetch related orders (orderId is just a string field, no Prisma relation)
    const orderIds = assignments.map((a) => a.orderId);
    const orders = orderIds.length
      ? await this.prisma.marketplaceOrder.findMany({
          where: { id: { in: orderIds } },
          select: {
            id: true, orderNumber: true, total: true,
            customerId: true, addressSnapshot: true, customerNotes: true,
            items: { select: { productName: true, quantity: true } },
          },
        })
      : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    return assignments.map((a) => ({
      ...a,
      order: orderMap.get(a.orderId) ?? null,
    }));
  }

  @Public()
  @Get('riders/:riderId/active')
  @ApiOperation({ summary: 'Currently active assignments' })
  active(@Param('riderId') riderId: string) {
    return this.prisma.mktDeliveryAssignment.findMany({
      where: { riderId, status: { in: ['ACCEPTED', 'PICKED_UP'] } },
    });
  }

  @Public()
  @Post('assignments/:id/accept')
  async accept(@Param('id') id: string) {
    const a = await this.prisma.mktDeliveryAssignment.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    this.rt.emitOrderUpdate(a.orderId, { deliveryStatus: 'ACCEPTED' });
    return a;
  }

  @Public()
  @Post('assignments/:id/reject')
  async reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.prisma.mktDeliveryAssignment.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectReason: body.reason },
    });
  }

  @Public()
  @Post('assignments/:id/pickup')
  async pickup(@Param('id') id: string) {
    const a = await this.prisma.mktDeliveryAssignment.update({
      where: { id },
      data: { status: 'PICKED_UP', pickedUpAt: new Date() },
    });
    await this.prisma.marketplaceOrder.update({
      where: { id: a.orderId },
      data: { status: 'OUT_FOR_DELIVERY' },
    });
    this.rt.emitOrderUpdate(a.orderId, { deliveryStatus: 'PICKED_UP', status: 'OUT_FOR_DELIVERY' });
    return a;
  }

  @Public()
  @Post('assignments/:id/deliver')
  async deliver(@Param('id') id: string, @Body() body: { otpCode?: string; proofUrl?: string }) {
    const a = await this.prisma.mktDeliveryAssignment.findUnique({ where: { id } });
    if (!a) throw new Error('Not found');
    if (a.otpCode && a.otpCode !== body.otpCode) {
      throw new Error('Invalid OTP');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.mktDeliveryAssignment.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          otpVerifiedAt: body.otpCode ? new Date() : null,
          proofOfDeliveryUrl: body.proofUrl,
          actualMinutes: a.pickedUpAt
            ? Math.ceil((Date.now() - a.pickedUpAt.getTime()) / 60000)
            : null,
        },
      });
      await tx.marketplaceOrder.update({
        where: { id: a.orderId },
        data: { status: 'DELIVERED', actualDeliveryAt: new Date() },
      });
      await tx.mktRider.update({
        where: { id: a.riderId },
        data: {
          totalDeliveries: { increment: 1 },
          completedDeliveries: { increment: 1 },
          totalEarnings: { increment: a.riderCommission },
          status: 'AVAILABLE',
        },
      });
      return u;
    });
    this.rt.emitOrderUpdate(a.orderId, { status: 'DELIVERED' });
    return updated;
  }
}
