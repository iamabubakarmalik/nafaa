import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ConfirmApplianceDeliveryDto, CreateApplianceDeliveryDto, UpdateApplianceDeliveryStatusDto } from './dto/create-delivery.dto';

@Injectable()
export class ApplianceDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agla delivery number — `count() + 1` se nahi.
   * Purani delivery delete hone par wohi number dobara ban jata tha aur
   * `[tenantId, deliveryNumber]` unique constraint tut jata tha.
   */
  private async nextNumber(tenantId: string) {
    const year = new Date().getFullYear();
    const prefix = `APDL-${year}-`;
    const last = await this.prisma.applianceDelivery.findFirst({
      where: { tenantId, deliveryNumber: { startsWith: prefix } },
      orderBy: { deliveryNumber: 'desc' },
      select: { deliveryNumber: true },
    });
    const seq = last ? Number(last.deliveryNumber.slice(prefix.length)) || 0 : 0;
    return `${prefix}${String(seq + 1).padStart(4, '0')}`;
  }

  async create(user: AuthenticatedUser, dto: CreateApplianceDeliveryDto) {
    const deliveryNumber = await this.nextNumber(user.tenantId);

    // Auto floor charge if no lift and floor > 0
    let floorCharge = dto.floorCharge ?? 0;
    if (!dto.hasLift && dto.floorNumber && dto.floorNumber > 0 && floorCharge === 0) {
      floorCharge = dto.floorNumber * 300; // Rs 300 per floor default
    }

    const totalCharge = (dto.deliveryCharge ?? 0) + (dto.loadingCharge ?? 0) + (dto.unloadingCharge ?? 0) + floorCharge;

    return this.prisma.applianceDelivery.create({
      data: {
        tenantId: user.tenantId,
        deliveryNumber,
        ...dto,
        serialTrackingIds: dto.serialTrackingIds ?? [],
        floorCharge,
        totalCharge,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        status: 'PENDING',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.applianceDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to
          ? {
              scheduledDate: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { deliveryNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { vehicleNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return d;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateApplianceDeliveryStatusDto) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'DISPATCHED') patch.dispatchedAt = now;
    if (dto.status === 'ARRIVED') patch.arrivedAt = now;
    if (dto.status === 'DELIVERED') patch.deliveredAt = now;
    if (dto.notes) patch.notes = ((d.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.applianceDelivery.update({ where: { id }, data: patch });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmApplianceDeliveryDto) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceDelivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          receivedByName: dto.receivedByName,
          receivedByCnic: dto.receivedByCnic,
          signatureUrl: dto.signatureUrl,
          photoUrls: dto.photoUrls ?? [],
        },
      });

      // Serial register ko bhi bata dein.
      // tenantId ka filter zaroori hai — warna banaye gaye serialTrackingIds
      // me kisi aur tenant ki id aa jane par uska record badal jata tha.
      if (d.serialTrackingIds.length > 0) {
        await tx.applianceSerialTracking.updateMany({
          where: { id: { in: d.serialTrackingIds }, tenantId: user.tenantId },
          data: {
            deliveredAt: new Date(),
            deliveredBy: d.driverName,
            deliveryAddress: d.deliveryAddress,
          },
        });
      }

      return updated;
    });
  }

  async assignVehicle(user: AuthenticatedUser, id: string, dto: { vehicleNumber: string; driverName: string; driverPhone: string; helperCount?: number }) {
    const d = await this.prisma.applianceDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return this.prisma.applianceDelivery.update({
      where: { id },
      data: { ...dto, status: 'SCHEDULED' },
    });
  }

  /**
   * Summary — ginti ke sath paisa aur late trips bhi.
   * Pehle yahan sirf counts thay is liye "delivery se kitna kamaya"
   * kahin nazar nahi aata tha.
   */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [byStatus, openRows, doneMonth, todayScheduled] = await Promise.all([
      this.prisma.applianceDelivery.groupBy({
        by: ['status'], where: { tenantId }, _count: { _all: true },
      }),
      this.prisma.applianceDelivery.findMany({
        where: { tenantId, status: { in: ['PENDING', 'SCHEDULED', 'DISPATCHED', 'ARRIVED'] } },
        select: { id: true, scheduledDate: true, vehicleNumber: true, requiresInstallation: true, installationLinked: true },
      }),
      this.prisma.applianceDelivery.findMany({
        where: { tenantId, status: 'DELIVERED', deliveredAt: { gte: monthStart } },
        select: {
          totalCharge: true, deliveryCharge: true, loadingCharge: true,
          unloadingCharge: true, floorCharge: true, requiresInstallation: true, installationLinked: true,
        },
      }),
      this.prisma.applianceDelivery.count({
        where: { tenantId, scheduledDate: { gte: todayStart, lte: todayEnd } },
      }),
    ]);

    const map = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
    const revenue = doneMonth.reduce((s, r) => s + Number(r.totalCharge), 0);

    return {
      // Purane naam waise hi rakhe hain
      pending: map['PENDING'] ?? 0,
      scheduled: map['SCHEDULED'] ?? 0,
      dispatched: map['DISPATCHED'] ?? 0,
      delivered: map['DELIVERED'] ?? 0,
      todayScheduled,

      arrived: map['ARRIVED'] ?? 0,
      cancelled: map['CANCELLED'] ?? 0,
      open: openRows.length,
      /** Gaari abhi tak nahi lagi */
      noVehicle: openRows.filter((r) => !r.vehicleNumber).length,
      /** Tareekh guzar gayi lekin maal nahi pohancha */
      overdue: openRows.filter((r) => r.scheduledDate && new Date(r.scheduledDate) < todayStart).length,
      /** Maal pohanch gaya lekin installation abhi book nahi hui */
      installationPending: doneMonth.filter((r) => r.requiresInstallation && !r.installationLinked).length,

      month: {
        trips: doneMonth.length,
        revenue,
        avgTrip: doneMonth.length ? revenue / doneMonth.length : 0,
        breakdown: {
          delivery: doneMonth.reduce((s, r) => s + Number(r.deliveryCharge), 0),
          loading: doneMonth.reduce((s, r) => s + Number(r.loadingCharge), 0),
          unloading: doneMonth.reduce((s, r) => s + Number(r.unloadingCharge), 0),
          floor: doneMonth.reduce((s, r) => s + Number(r.floorCharge), 0),
        },
      },
    };
  }
}
