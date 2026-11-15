import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { DeliveryService } from './delivery.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { RiderClaims, RiderTokenGuard, signRiderToken } from './rider-token';

type RiderRequest = Request & { rider: RiderClaims };

/**
 * Rider App API for the rider device. Every rider endpoint needs a signed
 * rider token (`x-rider-token`), issued by shop staff through
 * POST rider-app/riders/:riderId/token. A rider only reads and changes their
 * own assignments.
 */
@ApiTags('Delivery / Rider App')
@Controller('rider-app')
export class RiderAppController {
  constructor(
    private readonly svc: DeliveryService,
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
  ) {}

  /** Shop staff (normal login) issue a token for one of their riders. */
  @Post('riders/:riderId/token')
  @ApiOperation({ summary: 'Issue a rider token (staff only)' })
  async issueToken(@Req() req: Request, @Param('riderId') riderId: string) {
    const tenantId = (req as any).user?.tenantId as string | undefined;
    const rider = tenantId ? await this.prisma.mktRider.findFirst({ where: { id: riderId, tenantId }, select: { id: true } }) : null;
    if (!rider) throw new NotFoundException('Rider nahi mila');
    return signRiderToken(rider.id, tenantId!);
  }

  private ownRider(req: RiderRequest, riderId: string) {
    if (req.rider.r !== riderId) throw new ForbiddenException('Ye rider aap nahi hain');
  }

  private async ownAssignment(req: RiderRequest, id: string) {
    const a = await this.prisma.mktDeliveryAssignment.findUnique({ where: { id } });
    if (!a || a.riderId !== req.rider.r || a.tenantId !== req.rider.t) throw new NotFoundException('Delivery nahi mili');
    return a;
  }

  @Public()
  @UseGuards(RiderTokenGuard)
  @Post('riders/:riderId/location')
  @ApiOperation({ summary: 'Rider pings current location' })
  updateLocation(
    @Req() req: RiderRequest,
    @Param('riderId') riderId: string,
    @Body() dto: UpdateLocationDto & { orderId?: string },
  ) {
    this.ownRider(req, riderId);
    return this.svc.updateRiderLocation(riderId, dto, dto.orderId);
  }

  @Public()
  @UseGuards(RiderTokenGuard)
  @Get('riders/:riderId/pending')
  @ApiOperation({ summary: 'New pending assignments for rider' })
  async pending(@Req() req: RiderRequest, @Param('riderId') riderId: string) {
    this.ownRider(req, riderId);
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
  @UseGuards(RiderTokenGuard)
  @Get('riders/:riderId/active')
  @ApiOperation({ summary: 'Currently active assignments' })
  active(@Req() req: RiderRequest, @Param('riderId') riderId: string) {
    this.ownRider(req, riderId);
    return this.prisma.mktDeliveryAssignment.findMany({
      where: { riderId, status: { in: ['ACCEPTED', 'PICKED_UP'] } },
    });
  }

  @Public()
  @UseGuards(RiderTokenGuard)
  @Post('assignments/:id/accept')
  async accept(@Req() req: RiderRequest, @Param('id') id: string) {
    await this.ownAssignment(req, id);
    const a = await this.prisma.mktDeliveryAssignment.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    this.rt.emitOrderUpdate(a.orderId, { deliveryStatus: 'ACCEPTED' });
    return a;
  }

  @Public()
  @UseGuards(RiderTokenGuard)
  @Post('assignments/:id/reject')
  async reject(@Req() req: RiderRequest, @Param('id') id: string, @Body() body: { reason?: string }) {
    await this.ownAssignment(req, id);
    return this.prisma.mktDeliveryAssignment.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectReason: body.reason },
    });
  }

  @Public()
  @UseGuards(RiderTokenGuard)
  @Post('assignments/:id/pickup')
  async pickup(@Req() req: RiderRequest, @Param('id') id: string) {
    await this.ownAssignment(req, id);
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
  @UseGuards(RiderTokenGuard)
  @Post('assignments/:id/deliver')
  async deliver(@Req() req: RiderRequest, @Param('id') id: string, @Body() body: { otpCode?: string; proofUrl?: string }) {
    const a = await this.ownAssignment(req, id);
    if (a.otpCode && a.otpCode !== body.otpCode) {
      throw new ForbiddenException('OTP ghalat hai');
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
