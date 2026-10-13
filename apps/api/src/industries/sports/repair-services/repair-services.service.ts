import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateRepairServiceDto, UpdateRepairStatusDto } from './dto/create-repair.dto';
import { nextRunningNumber } from '../common/service-sale.helper';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

@Injectable()
export class RepairServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateRepairServiceDto, activeShopId?: string | null) {
    const serviceNumber = await nextRunningNumber(
      async (prefix) => (await this.prisma.sportsRepairService.findFirst({
        where: { tenantId: user.tenantId, serviceNumber: { startsWith: prefix } },
        orderBy: { serviceNumber: 'desc' },
        select: { serviceNumber: true },
      }))?.serviceNumber,
      `RS-${new Date().getFullYear()}-`,
    );
    if ((dto.advancePaid ?? 0) > (dto.estimatedCost ?? 0) + 0.01 && (dto.estimatedCost ?? 0) > 0) {
      throw new BadRequestException('Advance andaze ki raqam se zyada nahi ho sakta');
    }

    const advance = r2(dto.advancePaid ?? 0);
    return this.prisma.$transaction(async (tx) => {
      let customerId = dto.customerId || null;
      if (advance > 0) {
        // The advance is cash in hand today; it waits on the customer's khata
        // and is used up by the sale made on delivery.
        const shopId = await resolveIndustryShopId(tx, user, activeShopId);
        customerId = await ensureCustomer(tx, user, {
          customerId, name: dto.customerName, phone: dto.customerPhone, shopId,
        });
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advance, reference: serviceNumber, note: `Repair advance ${serviceNumber}`,
        });
      }
      return tx.sportsRepairService.create({
        data: {
          tenantId: user.tenantId,
          serviceNumber,
          customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          itemType: dto.itemType,
          itemBrand: dto.itemBrand,
          itemDescription: dto.itemDescription,
          issue: dto.issue,
          repairType: dto.repairType,
          estimatedCost: dto.estimatedCost ?? 0,
          advancePaid: advance,
          estimatedReadyAt: dto.estimatedReadyAt ? new Date(dto.estimatedReadyAt) : null,
          photosBeforeUrls: dto.photosBeforeUrls ?? [],
          notes: dto.notes,
          status: 'RECEIVED',
        },
      });
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    itemType?: string;
    repairType?: string;
    customerId?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.sportsRepairService.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.itemType && { itemType: params.itemType }),
        ...(params.repairType && { repairType: params.repairType }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to
          ? {
              receivedAt: {
                ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
                ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { serviceNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { itemType: { contains: params.search, mode: 'insensitive' } },
            { itemBrand: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { receivedAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    return r;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateRepairStatusDto, activeShopId?: string | null) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    if ((r.status === 'DELIVERED' || r.status === 'CANCELLED') && dto.status !== r.status) {
      throw new BadRequestException(`${r.serviceNumber} pehle hi ${r.status === 'DELIVERED' ? 'deliver' : 'cancel'} ho chuka hai`);
    }
    if (r.status === 'DELIVERED' && dto.finalCost !== undefined && Math.abs(dto.finalCost - Number(r.finalCost ?? 0)) > 0.009) {
      throw new BadRequestException('Deliver ke baad bill ki raqam nahi badal sakti');
    }

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'COMPLETED' && !r.completedAt) patch.completedAt = now;
    if (dto.status === 'DELIVERED' && !r.deliveredAt) patch.deliveredAt = now;
    if (dto.workDone) patch.workDone = dto.workDone;
    if (dto.partsUsed) patch.partsUsed = dto.partsUsed;
    if (dto.finalCost !== undefined) patch.finalCost = dto.finalCost;
    if (dto.photosAfterUrls) patch.photosAfterUrls = dto.photosAfterUrls;
    if (dto.notes) patch.notes = ((r.notes || '') + '\n' + dto.notes).trim();

    if (dto.status !== 'DELIVERED' || r.status === 'DELIVERED') {
      return this.prisma.sportsRepairService.update({ where: { id }, data: patch });
    }

    // Delivery books the repair charge as a sale, like any counter bill.
    // Advances already sit on the customer's khata and are used up by it.
    const total = r2(Number(dto.finalCost ?? r.finalCost ?? r.estimatedCost ?? 0));
    patch.finalCost = total;
    const advance = r2(r.advancePaid);
    if (advance > total + 0.01) {
      throw new BadRequestException(`Rs ${advance} pehle liye ja chuke hain — bill is se kam nahi ho sakta`);
    }
    const due = r2(Math.max(total - advance, 0));
    const takenNow = r2(Math.max(dto.paidNow ?? due, 0));
    const kept = r2(Math.min(takenNow, due));
    const stillOwed = r2(due - kept);
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, activeShopId);
      let customerId = r.customerId;
      if (!customerId && stillOwed > 0) {
        customerId = await ensureCustomer(tx, user, { name: r.customerName, phone: r.customerPhone, shopId });
      }
      if (total > 0) {
        const legacyPaid = r2(Math.max(advance - (await paidOnKhata(tx, user.tenantId, r.serviceNumber)), 0));
        await postIndustrySale(tx, user, {
          saleNumber: r.serviceNumber,
          sourceRef: r.serviceNumber,
          shopId,
          customerId,
          lines: [{
            label: `Repair: ${r.itemType}${r.itemBrand ? ` ${r.itemBrand}` : ''} — ${dto.workDone || r.workDone || r.issue}`,
            amount: total,
          }],
          paidAmount: r2(takenNow + legacyPaid),
          paymentMethod: dto.paymentMethod,
        });
      }
      return tx.sportsRepairService.update({
        where: { id },
        data: { ...patch, customerId, advancePaid: r2(advance + kept) },
      });
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number, activeShopId?: string | null) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (r.status === 'DELIVERED' || r.status === 'CANCELLED') {
      throw new BadRequestException(r.status === 'DELIVERED'
        ? 'Repair deliver ho chuki — baqi raqam customer ke khate se wasool karein'
        : 'Cancel shuda repair par payment nahi li ja sakti');
    }
    const bill = Number(r.finalCost ?? r.estimatedCost ?? 0);
    const due = r2(bill - Number(r.advancePaid || 0));
    if (bill > 0 && amount > due + 0.01) {
      throw new BadRequestException(due > 0 ? `Baqi sirf Rs ${due} hai` : 'Poori raqam mil chuki hai');
    }

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, activeShopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: r.customerId, name: r.customerName, phone: r.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: r.serviceNumber, note: `Repair advance ${r.serviceNumber}`,
      });
      return tx.sportsRepairService.update({
        where: { id },
        data: { advancePaid: r2(Number(r.advancePaid || 0) + amount), customerId },
      });
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    if (r.status === 'DELIVERED') throw new BadRequestException('Deliver shuda repair ki bikri ban chuki hai — ise mitaya nahi ja sakta');
    if (Number(r.advancePaid || 0) > 0) throw new BadRequestException('Is repair par paise liye ja chuke hain — mitane ke bajaye Cancel karein');
    return this.prisma.sportsRepairService.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [received, inProgress, completed, delivered] = await Promise.all([
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'RECEIVED' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
    ]);
    const revenue = await this.prisma.sportsRepairService.aggregate({
      where: { tenantId: user.tenantId, status: 'DELIVERED' },
      _sum: { finalCost: true, advancePaid: true },
    });
    return {
      received, inProgress, completed, delivered,
      totalRevenue: revenue._sum.finalCost ?? 0,
      totalCollected: revenue._sum.advancePaid ?? 0,
    };
  }

  async overdueRepairs(user: AuthenticatedUser) {
    const now = new Date();
    return this.prisma.sportsRepairService.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['RECEIVED', 'IN_PROGRESS'] },
        estimatedReadyAt: { lt: now },
      },
      orderBy: { estimatedReadyAt: 'asc' },
    });
  }
}
