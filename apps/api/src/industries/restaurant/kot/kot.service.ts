import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KotStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { RecipesService } from '../recipes/recipes.service';
import { withTokens } from '../orders/order-tokens';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateKotDto } from './dto/create-kot.dto';

/** KOT states the kitchen is still working on. */
export const OPEN_KOT: KotStatus[] = ['PENDING', 'PRINTED', 'ACKNOWLEDGED', 'COOKING', 'READY'];

/** Priority given to a ticket that tells the kitchen to stop a dish. */
export const VOID_PRIORITY = 'VOID';

/** How long a cancel ticket stays on the kitchen screen. */
const VOID_TICKET_MINUTES = 30;

/** A ticket older than this has left the kitchen screen (a shift is over). */
const STALE_TICKET_HOURS = 12;

/** Order steps a ticket moves forward, in kitchen order. */
const KOT_FLOW: KotStatus[] = ['PENDING', 'PRINTED', 'ACKNOWLEDGED', 'COOKING', 'READY', 'SERVED'];

const kitchenInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, unit: true, categoryId: true, variants: { select: { id: true, name: true } } } },
      modifiers: { include: { modifierOption: { select: { name: true } } } },
    },
  },
  table: { select: { tableNumber: true, tableName: true, section: true } },
} satisfies Prisma.RestaurantOrderInclude;

type KitchenOrder = Prisma.RestaurantOrderGetPayload<{ include: typeof kitchenInclude }>;
type KitchenLine = KitchenOrder['items'][number];

/** What the kitchen reads on a ticket; also kept on the ticket so later edits do not change it. */
function snapshotLine(it: KitchenLine, quantity = it.quantity) {
  return {
    id: it.id,
    productId: it.productId,
    // The size goes on the ticket: the kitchen cooks a half and a full plate differently.
    name: [it.product?.name ?? 'Item', it.product?.variants.find((v) => v.id === it.variantId)?.name].filter(Boolean).join(' · '),
    quantity,
    unit: it.unit,
    modifiers: it.modifiers.map((m) => (m.quantity > 1 ? `${m.quantity}× ` : '') + m.modifierOption.name),
    specialInstructions: it.specialInstructions,
    spiceLevel: it.spiceLevel,
    cookingNote: it.cookingNote,
    courseNumber: it.courseNumber,
  };
}

function ticketHeader(o: KitchenOrder, token: number | null = null) {
  return {
    orderNumber: o.orderNumber,
    token,
    mode: o.mode,
    table: o.table ? { tableNumber: o.table.tableNumber, tableName: o.table.tableName, section: o.table.section } : null,
    guests: o.numberOfGuests,
    customerName: o.customerName,
    specialRequests: o.specialRequests,
  };
}

@Injectable()
export class KotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipes: RecipesService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** The order's token for the day (counter call number). */
  private async tokenOf(tenantId: string, order: { id: string; createdAt: Date; parentOrderId: string | null }) {
    const [row] = await withTokens(this.prisma, tenantId, await this.tz.clock(tenantId), [order]);
    return row?.token ?? null;
  }

  private async nextNumber(tenantId: string) {
    const prefix = `KOT-${new Date().getFullYear()}-`;
    const last = await this.prisma.kot.findFirst({
      where: { tenantId, kotNumber: { startsWith: prefix } },
      orderBy: { kotNumber: 'desc' }, select: { kotNumber: true },
    });
    const n = last ? parseInt(last.kotNumber.slice(prefix.length), 10) || 0 : 0;
    return `${prefix}${String(n + 1).padStart(4, '0')}`;
  }

  /** Creates one ticket, taking the next number; retries when two counters take the same one. */
  private async createTicket(tenantId: string, data: Omit<Prisma.KotUncheckedCreateInput, 'tenantId' | 'kotNumber'>) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.kot.create({ data: { tenantId, kotNumber: await this.nextNumber(tenantId), ...data } });
      } catch (e) {
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  /** Station of each category (first active station that lists it). */
  private async stationOf(tenantId: string) {
    const stations = await this.prisma.kitchenStation.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: { name: true, categoryIds: true },
    });
    return (categoryId: string | null | undefined) =>
      (categoryId && stations.find((s) => s.categoryIds.includes(categoryId))?.name) || null;
  }

  private loadOrder(tenantId: string, orderId: string) {
    return this.prisma.restaurantOrder.findFirst({ where: { id: orderId, tenantId }, include: kitchenInclude });
  }

  /**
   * Sends the order's lines that have not gone to the kitchen yet: one ticket
   * per station (by the dish's category), so the bar gets drinks and the
   * tandoor gets naan. Returns the new tickets (none when nothing is new).
   */
  async fire(user: AuthenticatedUser, orderId: string, opts: { itemIds?: string[]; notes?: string; priority?: string } = {}) {
    const order = await this.loadOrder(user.tenantId, orderId);
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.saleId || ['COMPLETED', 'CANCELLED'].includes(order.status)) return [];

    const lines = order.items.filter((it) => !it.isReturned && !it.sentToKitchenAt && (!opts.itemIds || opts.itemIds.includes(it.id)));
    if (!lines.length) return [];

    const station = await this.stationOf(user.tenantId);
    const groups = new Map<string, KitchenLine[]>();
    for (const it of lines) {
      const key = station(it.product?.categoryId) ?? '';
      groups.set(key, [...(groups.get(key) ?? []), it]);
    }

    // Claim the lines first, so two taps on "Kitchen bhejein" send each dish once.
    const now = new Date();
    const claimed = await this.prisma.restaurantOrderItem.updateMany({
      where: { id: { in: lines.map((l) => l.id) }, sentToKitchenAt: null },
      data: { sentToKitchenAt: now },
    });
    if (claimed.count !== lines.length) {
      // Someone else sent part of these at the same moment; send only what this call claimed.
      const mine = await this.prisma.restaurantOrderItem.findMany({ where: { id: { in: lines.map((l) => l.id) }, sentToKitchenAt: now }, select: { id: true } });
      const ids = new Set(mine.map((m) => m.id));
      for (const [k, g] of groups) groups.set(k, g.filter((l) => ids.has(l.id)));
    }

    const header = ticketHeader(order, await this.tokenOf(user.tenantId, order));
    const kots = [];
    for (const [name, group] of groups) {
      if (!group.length) continue;
      kots.push(await this.createTicket(user.tenantId, {
        orderId,
        station: name || null,
        status: 'PENDING',
        priority: opts.priority ?? 'NORMAL',
        notes: opts.notes,
        itemIds: group.map((l) => l.id),
        itemsSnapshot: { ...header, items: group.map((l) => snapshotLine(l)) } as unknown as Prisma.InputJsonValue,
      }));
    }

    // New dishes reopen the kitchen side of an order that was ready or billed.
    await this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        kotPrintedAt: now,
        kotPrintCount: { increment: kots.length },
        ...(['READY', 'SERVED', 'ON_HOLD'].includes(order.status) && { status: 'PLACED' }),
      },
    });
    return kots;
  }

  /** Tells the kitchen to stop dishes that were voided after their ticket went out. */
  async cancelTicket(user: AuthenticatedUser, orderId: string, lines: Array<{ itemId: string; quantity: number }>, reason: string) {
    const order = await this.loadOrder(user.tenantId, orderId);
    if (!order || !lines.length) return null;
    const byId = new Map(order.items.map((it) => [it.id, it]));
    const station = await this.stationOf(user.tenantId);
    const picked = lines.map((l) => ({ it: byId.get(l.itemId), quantity: l.quantity })).filter((x): x is { it: KitchenLine; quantity: number } => !!x.it);
    if (!picked.length) return null;
    return this.createTicket(user.tenantId, {
      orderId,
      station: station(picked[0].it.product?.categoryId),
      status: 'CANCELLED',
      cancelledAt: new Date(),
      priority: VOID_PRIORITY,
      notes: reason,
      itemIds: picked.map((p) => p.it.id),
      itemsSnapshot: { ...ticketHeader(order, await this.tokenOf(user.tenantId, order)), items: picked.map((p) => snapshotLine(p.it, p.quantity)) } as unknown as Prisma.InputJsonValue,
    });
  }

  /**
   * Older screens post the item ids themselves. Lines already on a ticket are
   * skipped, so pressing "KOT" twice does not cook a dish twice; the lines are
   * routed to their stations like any new order.
   */
  async create(user: AuthenticatedUser, dto: CreateKotDto) {
    const order = await this.loadOrder(user.tenantId, dto.orderId);
    if (!order) throw new NotFoundException('Order nahi mila');
    const onTicket = await this.prisma.kot.findMany({
      where: { orderId: dto.orderId, status: { not: 'CANCELLED' } },
      select: { itemIds: true },
    });
    const sent = new Set(onTicket.flatMap((k) => k.itemIds));
    const wanted = order.items.filter((it) => dto.itemIds.includes(it.id) && !it.isReturned && !sent.has(it.id));
    if (!wanted.length) {
      throw new BadRequestException('Ye items pehle hi kitchen ja chuke hain — dobara print ke liye order par "KOT print" dabayein');
    }
    // Legacy rows were stamped on creation; clear the stamp so they can go out now.
    await this.prisma.restaurantOrderItem.updateMany({ where: { id: { in: wanted.map((w) => w.id) } }, data: { sentToKitchenAt: null } });
    const kots = await this.fire(user, dto.orderId, { itemIds: wanted.map((w) => w.id), notes: dto.notes, priority: dto.priority });
    return { ...kots[0], kots };
  }

  async list(user: AuthenticatedUser, params: { status?: string; station?: string; orderId?: string; active?: boolean; shopId?: string }) {
    if (params.status && !(Object.values(KotStatus) as string[]).includes(params.status)) throw new BadRequestException('KOT ka status ghalat hai');
    const since = new Date(Date.now() - VOID_TICKET_MINUTES * 60_000);
    const kots = await this.prisma.kot.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as KotStatus }),
        ...(params.station && { station: params.station === '-' ? null : params.station }),
        ...(params.orderId && { orderId: params.orderId }),
        // Kitchen screen: tickets still cooking, plus fresh cancel tickets.
        ...(params.active && {
          OR: [
            { status: { in: OPEN_KOT }, createdAt: { gte: new Date(Date.now() - STALE_TICKET_HOURS * 3600_000) } },
            { priority: VOID_PRIORITY, cancelledAt: { gte: since } },
          ],
        }),
        ...(params.shopId && { order: { OR: [{ shopId: params.shopId }, { shopId: null }] } }),
      },
      include: {
        order: {
          select: {
            id: true, orderNumber: true, mode: true, status: true, numberOfGuests: true, customerName: true, specialRequests: true,
            createdAt: true, estimatedPrepTime: true, parentOrderId: true, table: { select: { tableNumber: true, tableName: true, section: true } },
          },
        },
      },
      orderBy: { createdAt: params.active ? 'asc' : 'desc' },
      take: params.active ? 300 : 100,
    });
    const tokens = new Map((await withTokens(this.prisma, user.tenantId, await this.tz.clock(user.tenantId), [...new Map(kots.map((k) => [k.order.id, k.order])).values()]))
      .map((t) => [t.id, t.token]));
    return kots.map((k) => ({ ...k, order: { ...k.order, token: tokens.get(k.order.id) ?? null } }));
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, status: string) {
    if (!(Object.values(KotStatus) as string[]).includes(status)) throw new BadRequestException('KOT ka status ghalat hai');
    const next = status as KotStatus;
    const kot = await this.prisma.kot.findFirst({ where: { id, tenantId: user.tenantId }, include: { order: { include: { items: true } } } });
    if (!kot) throw new NotFoundException('KOT nahi mila');
    if (kot.status === 'CANCELLED') throw new BadRequestException('Ye ticket cancel ho chuka hai');
    if (kot.status === next) return kot;
    if (next !== 'CANCELLED' && KOT_FLOW.indexOf(next) < KOT_FLOW.indexOf(kot.status)) {
      throw new BadRequestException('Ticket peeche nahi ja sakta');
    }

    const now = new Date();
    const order = kot.order;
    const lines = order.items.filter((it) => kot.itemIds.includes(it.id) && !it.isReturned);
    const lineIds = lines.map((l) => l.id);

    // Cooking starts: the dishes' ingredients leave the store (once per line).
    if (next === 'COOKING' || ((next === 'READY' || next === 'SERVED') && lines.some((l) => !l.cookingStartedAt))) {
      const shopId = order.shopId ?? await resolveWriteShopId(this.prisma, user.tenantId, scope);
      await this.recipes.consumeForLines(user, shopId, lines, order.orderNumber);
    }
    if (lineIds.length && (next === 'COOKING' || next === 'READY' || next === 'SERVED')) {
      await this.prisma.restaurantOrderItem.updateMany({
        where: { id: { in: lineIds } },
        data: {
          status: next,
          ...(next === 'READY' && { readyAt: now }),
          ...(next === 'SERVED' && { servedAt: now }),
        },
      });
    }

    const patch: Prisma.KotUpdateInput = { status: next };
    if (next === 'PRINTED') patch.printedAt = now;
    if (next === 'ACKNOWLEDGED') patch.acknowledgedAt = now;
    if (next === 'COOKING') patch.cookingStartedAt = now;
    if (next === 'READY') patch.readyAt = now;
    if (next === 'SERVED') patch.servedAt = now;
    if (next === 'CANCELLED') patch.cancelledAt = now;
    const updated = await this.prisma.kot.update({ where: { id }, data: patch });

    await this.syncOrder(order.id, now);
    return updated;
  }

  /** Moves an open order's kitchen status to match its tickets. A billed (pre-bill) order keeps its status. */
  private async syncOrder(orderId: string, now: Date) {
    const order = await this.prisma.restaurantOrder.findUnique({ where: { id: orderId }, select: { status: true, mode: true } });
    if (!order || ['COMPLETED', 'CANCELLED', 'ON_HOLD', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) return;
    const kots = await this.prisma.kot.findMany({ where: { orderId, status: { not: 'CANCELLED' } }, select: { status: true } });
    if (!kots.length) return;
    const st = kots.map((k) => k.status);
    let target: 'COOKING' | 'READY' | 'SERVED' | null = null;
    if (st.every((s) => s === 'SERVED')) target = order.mode === 'DINE_IN' || order.mode === 'ROOM_SERVICE' ? 'SERVED' : 'READY';
    else if (st.every((s) => s === 'READY' || s === 'SERVED')) target = 'READY';
    else if (st.some((s) => s === 'COOKING' || s === 'READY' || s === 'SERVED')) target = 'COOKING';
    if (!target || target === order.status) return;
    await this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        status: target,
        ...(target === 'COOKING' && { cookingStartedAt: now }),
        ...(target === 'READY' && { readyAt: now }),
        ...(target === 'SERVED' && { servedAt: now }),
      },
    });
  }
}
