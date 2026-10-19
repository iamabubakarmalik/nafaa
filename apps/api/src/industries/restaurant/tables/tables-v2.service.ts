import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RestaurantTableStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { OPEN_ORDER } from '../orders/order-tokens';
import { ReserveTableDto, UpdateTableDto, UpsertTableDto } from './dto/upsert-table.dto';

const RESERVATION_CLEAR = { reservedAt: null, reservedFor: null, reservedByName: null, reservedByPhone: null, reservationNote: null };

@Injectable()
export class TablesV2Service {
  constructor(private readonly prisma: PrismaService) {}

  private async checkShop(tenantId: string, shopId?: string | null) {
    if (!shopId) return;
    const shop = await this.prisma.shop.findFirst({ where: { id: shopId, tenantId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Branch nahi mili');
  }

  /** Open order sitting on the table, if any. */
  private openOrderOn(tenantId: string, tableId: string) {
    return this.prisma.restaurantOrder.findFirst({
      where: { tenantId, tableId, status: { in: OPEN_ORDER }, saleId: null },
      select: { id: true, orderNumber: true },
    });
  }

  /** A new table belongs to the branch being viewed, so the branch's floor shows it. */
  async create(user: AuthenticatedUser, dto: UpsertTableDto, viewShopId?: string) {
    const shopId = dto.shopId ?? viewShopId ?? null;
    await this.checkShop(user.tenantId, shopId);
    const tableNumber = dto.tableNumber.trim();
    const { status: _status, ...rest } = dto;
    // Table numbers are unique per business (schema), deleted tables included.
    const dup = await this.prisma.restaurantTableV2.findFirst({ where: { tenantId: user.tenantId, tableNumber } });
    if (dup?.isActive) throw new BadRequestException(`Table "${tableNumber}" pehle se hai`);
    if (dup) {
      // A deleted table with this number comes back instead of failing on the unique key.
      return this.prisma.restaurantTableV2.update({
        where: { id: dup.id },
        data: { ...rest, tableNumber, shopId, isActive: true, status: 'AVAILABLE', currentOrderId: null, occupiedAt: null, ...RESERVATION_CLEAR },
      });
    }
    return this.prisma.restaurantTableV2.create({ data: { tenantId: user.tenantId, ...rest, tableNumber, shopId, status: 'AVAILABLE' } });
  }

  async list(user: AuthenticatedUser, params: { status?: string; section?: string; shopId?: string }) {
    if (params.status && !(Object.values(RestaurantTableStatus) as string[]).includes(params.status)) throw new BadRequestException('Table ka status ghalat hai');
    return this.prisma.restaurantTableV2.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.status && { status: params.status as RestaurantTableStatus }),
        ...(params.section && { section: params.section }),
        // Tables made before branches have no shop; they stay visible everywhere.
        ...(params.shopId && { OR: [{ shopId: params.shopId }, { shopId: null }] }),
      },
      orderBy: [{ section: 'asc' }, { tableNumber: 'asc' }],
    });
  }

  /**
   * The floor: every table with what is happening on it — the running bill,
   * guests, waiter, minutes since seating, whether the pre-bill went out and
   * how many dishes the kitchen has ready.
   */
  async floor(user: AuthenticatedUser, shopId?: string) {
    const tables = await this.list(user, { shopId });
    const orders = await this.prisma.restaurantOrder.findMany({
      where: { tenantId: user.tenantId, tableId: { in: tables.map((t) => t.id) }, status: { in: OPEN_ORDER }, saleId: null },
      select: {
        id: true, orderNumber: true, tableId: true, status: true, total: true, paidAmount: true, numberOfGuests: true, waiterId: true,
        createdAt: true, parentOrderId: true,
        items: { where: { isReturned: false }, select: { status: true, sentToKitchenAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const waiterIds = [...new Set(orders.map((o) => o.waiterId).filter((x): x is string => !!x))];
    const waiters = waiterIds.length ? await this.prisma.user.findMany({ where: { id: { in: waiterIds }, tenantId: user.tenantId }, select: { id: true, fullName: true } }) : [];
    const nameOf = new Map(waiters.map((w) => [w.id, w.fullName]));

    const rows = tables.map((t) => {
      const mine = orders.filter((o) => o.tableId === t.id);
      const main = mine.find((o) => o.id === t.currentOrderId) ?? mine[0];
      const items = mine.flatMap((o) => o.items);
      return {
        ...t,
        // Older data may leave a table marked busy with nothing on it; the floor shows what is true.
        liveStatus: mine.length ? 'OCCUPIED' : t.status === 'OCCUPIED' ? 'CLEANING' : t.status,
        orders: mine.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, total: o.total, paidAmount: o.paidAmount, parentOrderId: o.parentOrderId })),
        currentOrder: main ? { id: main.id, orderNumber: main.orderNumber, status: main.status, createdAt: main.createdAt } : null,
        runningBill: mine.reduce((n, o) => n + o.total - o.paidAmount, 0),
        guests: mine.reduce((n, o) => n + (o.numberOfGuests ?? 0), 0) || null,
        waiterName: main?.waiterId ? nameOf.get(main.waiterId) ?? null : null,
        billPrinted: mine.some((o) => o.status === 'ON_HOLD'),
        unsent: items.filter((i) => !i.sentToKitchenAt).length,
        cooking: items.filter((i) => i.sentToKitchenAt && ['PLACED', 'CONFIRMED', 'COOKING'].includes(i.status)).length,
        ready: items.filter((i) => i.status === 'READY').length,
      };
    });
    const sections = [...new Set(rows.map((r) => r.section || 'Main'))];
    const count = (s: string) => rows.filter((r) => r.liveStatus === s).length;
    return {
      tables: rows,
      sections,
      stats: {
        total: rows.length,
        available: count('AVAILABLE'),
        occupied: count('OCCUPIED'),
        reserved: count('RESERVED'),
        cleaning: count('CLEANING'),
        outOfService: count('OUT_OF_SERVICE'),
        billPrinted: rows.filter((r) => r.billPrinted).length,
        guests: rows.reduce((n, r) => n + (r.guests ?? 0), 0),
        runningBill: Math.round(rows.reduce((n, r) => n + r.runningBill, 0) * 100) / 100,
        ready: rows.reduce((n, r) => n + r.ready, 0),
      },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.restaurantTableV2.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        orders: { where: { status: { in: OPEN_ORDER }, saleId: null }, include: { items: { where: { isReturned: false } } }, take: 5 },
      },
    });
    if (!t) throw new NotFoundException('Table nahi mili');
    return t;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTableDto) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table nahi mili');
    const { status, ...rest } = dto;
    const tableNumber = rest.tableNumber?.trim();
    if (tableNumber && tableNumber !== t.tableNumber) {
      const dup = await this.prisma.restaurantTableV2.findFirst({ where: { tenantId: user.tenantId, tableNumber, NOT: { id } } });
      if (dup) throw new BadRequestException(`Table "${tableNumber}" pehle se hai${dup.isActive ? '' : ' (hataayi hui)'}`);
    }
    if (rest.shopId !== undefined) await this.checkShop(user.tenantId, rest.shopId);
    await this.prisma.restaurantTableV2.update({ where: { id }, data: { ...rest, ...(tableNumber && { tableNumber }) } });
    // A status sent with the edit goes through the same checks as the status buttons.
    if (status && status !== t.status) return this.changeStatus(user, id, status);
    return this.prisma.restaurantTableV2.findUniqueOrThrow({ where: { id } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table nahi mili');
    const open = await this.openOrderOn(user.tenantId, id);
    if (open) throw new BadRequestException(`Table par order ${open.orderNumber} chal raha hai — pehle bill band karein`);
    return this.prisma.restaurantTableV2.update({ where: { id }, data: { isActive: false, status: 'AVAILABLE', currentOrderId: null } });
  }

  /**
   * Status buttons on the floor. A table with an open order stays taken until
   * the bill is paid, moved or cancelled; it cannot be marked free by hand.
   */
  async changeStatus(user: AuthenticatedUser, id: string, status: RestaurantTableStatus) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table nahi mili');
    const open = await this.openOrderOn(user.tenantId, id);
    if (open && status !== 'OCCUPIED') {
      throw new BadRequestException(`Table par order ${open.orderNumber} chal raha hai — bill band karein ya order doosri table par le jayein`);
    }
    const patch: Prisma.RestaurantTableV2UpdateInput = { status };
    if (status === 'OCCUPIED') patch.occupiedAt = t.occupiedAt ?? new Date();
    if (status !== 'OCCUPIED') {
      patch.occupiedAt = null;
      patch.currentOrderId = null;
    }
    if (status !== 'RESERVED') Object.assign(patch, RESERVATION_CLEAR);
    return this.prisma.restaurantTableV2.update({ where: { id }, data: patch });
  }

  async reserve(user: AuthenticatedUser, id: string, dto: ReserveTableDto) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId, isActive: true } });
    if (!t) throw new NotFoundException('Table nahi mili');
    if (!t.isReservable) throw new BadRequestException('Ye table reserve nahi hoti');
    if (t.status === 'OUT_OF_SERVICE') throw new BadRequestException('Table band hai');
    if (await this.openOrderOn(user.tenantId, id)) throw new BadRequestException('Table par abhi log baithe hain');
    const at = new Date(dto.reservedFor);
    if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() - 15 * 60_000) throw new BadRequestException('Reservation ka waqt aage ka hona chahiye');
    return this.prisma.restaurantTableV2.update({
      where: { id },
      data: {
        status: 'RESERVED',
        reservedAt: new Date(),
        reservedFor: at,
        reservedByName: dto.reservedByName.trim(),
        reservedByPhone: dto.reservedByPhone?.trim() || null,
        reservationNote: [dto.numberOfGuests ? `${dto.numberOfGuests} mehman` : '', dto.reservationNote?.trim() ?? ''].filter(Boolean).join(' · ') || null,
      },
    });
  }

  async cancelReservation(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table nahi mili');
    if (t.status !== 'RESERVED') return t;
    return this.changeStatus(user, id, 'AVAILABLE');
  }

  async layout(user: AuthenticatedUser, shopId?: string) {
    const tables = await this.list(user, { shopId });
    const bySection: Record<string, typeof tables> = {};
    for (const t of tables) {
      const s = t.section || 'Main';
      if (!bySection[s]) bySection[s] = [];
      bySection[s].push(t);
    }
    return {
      sections: Object.entries(bySection).map(([section, items]) => ({ section, tables: items })),
      totalTables: tables.length,
      byStatus: {
        AVAILABLE: tables.filter((t) => t.status === 'AVAILABLE').length,
        OCCUPIED: tables.filter((t) => t.status === 'OCCUPIED').length,
        RESERVED: tables.filter((t) => t.status === 'RESERVED').length,
        CLEANING: tables.filter((t) => t.status === 'CLEANING').length,
      },
    };
  }
}
