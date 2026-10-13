/**
 * Stock transfers between branches. Sending takes stock out of the source
 * at once (it is "on the way"); receiving puts what actually arrived into
 * the destination, so a short delivery is recorded; cancelling puts it back
 * at the source. Staff tied to a branch can send only from it and receive
 * only into it. Status changes are claimed atomically, so two clicks never
 * receive the same transfer twice.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../../notifications/notifications.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { tzParts } from '../../../common/helpers/business-time.helper';
import { ShopScope, applyStockDelta, assertShopAccess, recacheProductStock } from '../../../common/shop-scope';
import { periodRange } from '../taxonomy/taxonomy.helper';
import { CancelTransferDto, CreateTransferDto, ListTransfersDto, ReceiveTransferDto } from './dto/create-transfer.dto';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const r2 = (n: number) => Math.round(n * 100) / 100;
const HOUR = 3_600_000;

const ITEM_INCLUDE = {
  product: { select: { id: true, name: true, unit: true, sku: true, barcode: true } },
  carpetRoll: { select: { id: true, rollNumber: true, remainingSqft: true, remainingLengthFt: true, remainingLengthInch: true, widthFt: true, widthInch: true, variantId: true } },
  imei: { select: { id: true, imei1: true, imei2: true, status: true, color: true } },
  usedPhone: { select: { id: true, usedPhoneCode: true, brand: true, model: true, storage: true, color: true, status: true, resalePrice: true } },
  serial: { select: { id: true, serialNumber: true, imei: true, status: true, warrantyEndDate: true, physicalCondition: true } },
} satisfies Prisma.StockTransferItemInclude;

const TRANSFER_INCLUDE = {
  fromShop: { select: { id: true, name: true, isMain: true, address: true, phone: true } },
  toShop: { select: { id: true, name: true, isMain: true, address: true, phone: true } },
  createdBy: { select: { id: true, fullName: true } },
  items: { include: ITEM_INCLUDE },
} satisfies Prisma.StockTransferInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Re-derives a branch's carpet stock from its active rolls and cut pieces. */
  private async syncShopStockForCarpet(tx: Tx, tenantId: string, shopId: string, productId: string, variantId: string | null) {
    const [rolls, pieces] = await Promise.all([
      tx.carpetRoll.aggregate({ where: { tenantId, shopId, productId, variantId, status: 'ACTIVE', remainingLengthFt: { gt: 0 } }, _sum: { remainingSqft: true } }),
      tx.carpetCutPiece.aggregate({ where: { tenantId, shopId, productId, variantId, status: 'AVAILABLE' }, _sum: { totalSqft: true } }),
    ]);
    const total = r2(Number(rolls._sum.remainingSqft ?? 0) + Number(pieces._sum.totalSqft ?? 0));
    const existing = await tx.shopStock.findFirst({ where: { shopId, productId, variantId } });
    if (existing) await tx.shopStock.update({ where: { id: existing.id }, data: { stock: total } });
    else if (total > 0) await tx.shopStock.create({ data: { tenantId, shopId, productId, variantId, stock: total, isActive: true } });
    await recacheProductStock(tx, productId, variantId);
    return total;
  }

  private async number(tenantId: string) {
    const { tz } = await this.tz.clock(tenantId);
    const p = tzParts(new Date(), tz);
    const stem = `TR-${String(p.year).slice(2)}${String(p.month).padStart(2, '0')}${String(p.day).padStart(2, '0')}`;
    const today = await this.prisma.stockTransfer.count({ where: { tenantId, transferNumber: { startsWith: stem } } });
    return `${stem}-${String(today + 1).padStart(3, '0')}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
  }

  /* ───────────────────────── send ───────────────────────── */

  async create(user: AuthenticatedUser, dto: CreateTransferDto) {
    if (dto.fromShopId === dto.toShopId) throw new BadRequestException('Bhejne aur lene wali branch alag honi chahiye');
    assertShopAccess(user, dto.fromShopId, 'Maal bhejna');
    const [fromShop, toShop] = await Promise.all([
      this.prisma.shop.findFirst({ where: { id: dto.fromShopId, tenantId: user.tenantId } }),
      this.prisma.shop.findFirst({ where: { id: dto.toShopId, tenantId: user.tenantId } }),
    ]);
    if (!fromShop || !toShop) throw new NotFoundException('Branch nahi mili');

    type Line = (typeof dto.items)[number] & {
      kind: 'used' | 'carpet' | 'plain'; product: { id: string; name: string; costPrice: number } | null;
      roll: { id: string; rollNumber: string; remainingSqft: number; remainingLengthFt: number; variantId: string | null; costPerSqft: number } | null;
      imei: { id: string; imei1: string; costPrice: number } | null; serial: { id: string; serialNumber: string } | null;
      usedPhone: { id: string; usedPhoneCode: string } | null; cost: number; label: string;
    };
    const lines: Line[] = [];
    for (const item of dto.items) {
      if (item.usedPhoneId) {
        const used = await this.prisma.usedPhone.findFirst({ where: { id: item.usedPhoneId, tenantId: user.tenantId } });
        if (!used) throw new NotFoundException('Used phone nahi mila');
        if (used.shopId && used.shopId !== dto.fromShopId) throw new BadRequestException(`${used.usedPhoneCode} ${fromShop.name} me nahi hai`);
        if (used.status !== 'IN_STOCK') throw new BadRequestException(`${used.usedPhoneCode} abhi ${used.status} hai — bhej nahi sakte`);
        const cost = Number(used.totalCost) || Number(used.buybackPrice) || 0;
        lines.push({ ...item, quantity: 1, kind: 'used', product: null, roll: null, imei: null, serial: null, usedPhone: used, cost, label: used.usedPhoneCode });
        continue;
      }
      if (!item.productId) throw new BadRequestException('Har line me product ya used phone zaroori hai');
      const product = await this.prisma.product.findFirst({ where: { id: item.productId, tenantId: user.tenantId } });
      if (!product) throw new NotFoundException('Product nahi mila');

      if (CARPET_UNITS.has(product.unit)) {
        if (!item.carpetRollId) throw new BadRequestException(`${product.name}: roll chunna zaroori hai`);
        const roll = await this.prisma.carpetRoll.findFirst({ where: { id: item.carpetRollId, tenantId: user.tenantId, shopId: dto.fromShopId } });
        if (!roll) throw new BadRequestException(`Roll ${fromShop.name} me nahi mila`);
        if (roll.status !== 'ACTIVE' || roll.remainingLengthFt <= 0) throw new BadRequestException(`Roll ${roll.rollNumber} bhej nahi sakte (${roll.status})`);
        const cost = Number(roll.costPerSqft) || Number(product.costPrice) || 0;
        lines.push({ ...item, quantity: roll.remainingSqft, kind: 'carpet', product, roll, imei: null, serial: null, usedPhone: null, cost, label: `${product.name} · ${roll.rollNumber}` });
        continue;
      }

      let imei: Line['imei'] = null;
      if (item.imeiId) {
        const found = await this.prisma.productImei.findFirst({ where: { id: item.imeiId, tenantId: user.tenantId, productId: product.id } });
        if (!found) throw new NotFoundException('Device nahi mila');
        if (found.shopId && found.shopId !== dto.fromShopId) throw new BadRequestException(`IMEI ${found.imei1} ${fromShop.name} me nahi hai`);
        if (found.status !== 'IN_STOCK') throw new BadRequestException(`IMEI ${found.imei1} abhi ${found.status} hai`);
        if (Number(item.quantity) !== 1) throw new BadRequestException(`IMEI ${found.imei1}: ginti 1 honi chahiye`);
        imei = { id: found.id, imei1: found.imei1, costPrice: Number(found.costPrice) || 0 };
      }
      let serial: Line['serial'] = null;
      if (item.serialId) {
        const found = await this.prisma.electronicsSerialTracking.findFirst({ where: { id: item.serialId, tenantId: user.tenantId, productId: product.id } });
        if (!found) throw new NotFoundException('Serial unit nahi mila');
        if (found.shopId && found.shopId !== dto.fromShopId) throw new BadRequestException(`Serial ${found.serialNumber} ${fromShop.name} me nahi hai`);
        if (found.status !== 'IN_STOCK') throw new BadRequestException(`Serial ${found.serialNumber} abhi ${found.status} hai`);
        if (Number(item.quantity) !== 1) throw new BadRequestException(`Serial ${found.serialNumber}: ginti 1 honi chahiye`);
        serial = { id: found.id, serialNumber: found.serialNumber };
      }
      let cost = imei?.costPrice || Number(product.costPrice) || 0;
      let label = product.name;
      if (item.variantId) {
        const v = await this.prisma.productVariant.findFirst({ where: { id: item.variantId, productId: product.id }, select: { name: true, costPrice: true } });
        if (!v) throw new NotFoundException('Variant is product ka nahi');
        cost = imei?.costPrice || Number(v.costPrice) || cost;
        label = `${product.name} (${v.name})`;
      }
      lines.push({ ...item, kind: 'plain', product, roll: null, imei, serial, usedPhone: null, cost, label });
    }

    const transferNumber = await this.number(user.tenantId);
    const value = r2(lines.reduce((s, l) => s + l.quantity * l.cost, 0));

    const transfer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          tenantId: user.tenantId, fromShopId: dto.fromShopId, toShopId: dto.toShopId, createdById: user.id, transferNumber,
          status: 'IN_TRANSIT', notes: dto.notes, transferredAt: new Date(), value,
          items: {
            create: lines.map((l) => ({
              productId: l.productId ?? null, variantId: l.variantId ?? null, carpetRollId: l.carpetRollId ?? null, imeiId: l.imeiId ?? null,
              usedPhoneId: l.usedPhoneId ?? null, serialId: l.serialId ?? null, quantity: l.quantity, unitCost: l.cost, notes: l.notes,
            })),
          },
        },
        include: TRANSFER_INCLUDE,
      });

      for (const l of lines) {
        if (l.kind === 'used' && l.usedPhone) {
          const claimed = await tx.usedPhone.updateMany({ where: { id: l.usedPhone.id, status: 'IN_STOCK' }, data: { status: 'IN_TRANSIT' } });
          if (!claimed.count) throw new BadRequestException(`${l.label} abhi bik gaya ya kahin aur gaya`);
          continue;
        }
        if (l.kind === 'carpet' && l.roll && l.product) {
          const claimed = await tx.carpetRoll.updateMany({ where: { id: l.roll.id, status: 'ACTIVE' }, data: { status: 'TRANSFERRED' } });
          if (!claimed.count) throw new BadRequestException(`Roll ${l.roll.rollNumber} abhi badal gaya — dobara koshish karein`);
          await tx.carpetRollMovement.create({
            data: {
              rollId: l.roll.id, tenantId: user.tenantId, type: 'TRANSFER', lengthFt: 0, sqft: 0,
              balanceLengthAfter: Number(l.roll.remainingLengthFt), balanceSqftAfter: Number(l.roll.remainingSqft),
              reference: transferNumber, note: `${toShop.name} ko bheja`, createdById: user.id,
            },
          });
          const variantId = l.variantId ?? l.roll.variantId ?? null;
          const after = await this.syncShopStockForCarpet(tx, user.tenantId, dto.fromShopId, l.product.id, variantId);
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId, shopId: dto.fromShopId, productId: l.product.id, variantId, type: 'TRANSFER_OUT', quantity: -l.quantity,
              balanceAfter: after, reference: transferNumber, note: `Roll ${l.roll.rollNumber} → ${toShop.name}`, createdById: user.id, unitCost: l.cost,
            },
          });
          continue;
        }
        if (!l.product) continue;
        if (l.imei) {
          const claimed = await tx.productImei.updateMany({ where: { id: l.imei.id, status: 'IN_STOCK' }, data: { status: 'RESERVED' } });
          if (!claimed.count) throw new BadRequestException(`IMEI ${l.imei.imei1} abhi bik gaya`);
        }
        if (l.serial) {
          const claimed = await tx.electronicsSerialTracking.updateMany({ where: { id: l.serial.id, status: 'IN_STOCK' }, data: { status: 'IN_TRANSIT' } });
          if (!claimed.count) throw new BadRequestException(`Serial ${l.serial.serialNumber} abhi bik gaya`);
        }
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: dto.fromShopId, productId: l.product.id, variantId: l.variantId ?? null, delta: -l.quantity,
          movementType: 'TRANSFER_OUT', reference: transferNumber,
          note: l.imei ? `IMEI ${l.imei.imei1} → ${toShop.name}` : l.serial ? `Serial ${l.serial.serialNumber} → ${toShop.name}` : `${toShop.name} ko bheja`,
          // Serialised units were already checked one by one above.
          preventNegative: !l.imei && !l.serial, label: l.label, userId: user.id, unitCost: l.cost,
        });
      }
      return created;
    }, { timeout: 60_000 });

    await this.notifications.create({
      tenantId: user.tenantId, type: 'INFO', title: 'Maal raste me',
      message: `${transferNumber}: ${fromShop.name} → ${toShop.name} (${lines.length} cheezen)`, link: '/transfers',
    });
    return transfer;
  }

  /* ───────────────────────── receive ───────────────────────── */

  async receive(user: AuthenticatedUser, id: string, dto: ReceiveTransferDto = {}) {
    const transfer = await this.prisma.stockTransfer.findFirst({ where: { id, tenantId: user.tenantId }, include: TRANSFER_INCLUDE });
    if (!transfer) throw new NotFoundException('Transfer nahi mila');
    assertShopAccess(user, transfer.toShopId, 'Maal wusool karna');
    if (transfer.status !== 'IN_TRANSIT') throw new BadRequestException('Yeh transfer raste me nahi hai');
    const got = new Map((dto.items ?? []).map((i) => [i.itemId, i.receivedQty]));
    for (const [itemId, q] of got) {
      const line = transfer.items.find((i) => i.id === itemId);
      if (!line) throw new BadRequestException('Line is transfer ki nahi');
      if (q > line.quantity + 0.0001) throw new BadRequestException('Bheje gaye se zyada receive nahi ho sakta');
      if ((line.imeiId || line.serialId || line.usedPhoneId || line.carpetRollId) && q !== 0 && q !== line.quantity) {
        throw new BadRequestException('Device/roll poora aata hai ya bilkul nahi');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.stockTransfer.updateMany({
        where: { id, status: 'IN_TRANSIT' },
        data: {
          status: 'RECEIVED', receivedAt: new Date(), receivedById: user.id,
          ...(dto.notes?.trim() && { notes: [transfer.notes, `Wusooli: ${dto.notes.trim()}`].filter(Boolean).join('\n') }),
        },
      });
      if (!claimed.count) throw new BadRequestException('Yeh transfer abhi kisi aur ne receive ya cancel kar diya');
      const from = transfer.fromShop.name;
      let short = 0;

      for (const item of transfer.items) {
        const qty = got.has(item.id) ? got.get(item.id)! : item.quantity;
        await tx.stockTransferItem.update({ where: { id: item.id }, data: { receivedQty: qty } });
        short += (item.quantity - qty) * item.unitCost;

        if (item.usedPhoneId) {
          await tx.usedPhone.update({ where: { id: item.usedPhoneId }, data: qty > 0 ? { status: 'IN_STOCK', shopId: transfer.toShopId } : { status: 'DISCARDED' } });
          continue;
        }
        if (!item.productId) continue;

        if (item.carpetRollId && item.carpetRoll) {
          const variantId = item.variantId ?? item.carpetRoll.variantId ?? null;
          await tx.carpetRoll.update({ where: { id: item.carpetRollId }, data: qty > 0 ? { shopId: transfer.toShopId, status: 'ACTIVE' } : { status: 'FINISHED' } });
          await tx.carpetRollMovement.create({
            data: {
              rollId: item.carpetRollId, tenantId: user.tenantId, type: 'TRANSFER', lengthFt: 0, sqft: 0,
              balanceLengthAfter: Number(item.carpetRoll.remainingLengthFt), balanceSqftAfter: qty > 0 ? Number(item.carpetRoll.remainingSqft) : 0,
              reference: transfer.transferNumber, note: qty > 0 ? `${transfer.toShop.name} me wusool (${from} se)` : 'Raste me gum', createdById: user.id,
            },
          });
          if (qty > 0) {
            const after = await this.syncShopStockForCarpet(tx, user.tenantId, transfer.toShopId, item.productId, variantId);
            await tx.stockMovement.create({
              data: {
                tenantId: user.tenantId, shopId: transfer.toShopId, productId: item.productId, variantId, type: 'TRANSFER_IN', quantity: qty,
                balanceAfter: after, reference: transfer.transferNumber, note: `Roll ${item.carpetRoll.rollNumber} — ${from} se`, createdById: user.id, unitCost: item.unitCost,
              },
            });
          }
          continue;
        }

        if (item.imeiId) await tx.productImei.update({ where: { id: item.imeiId }, data: qty > 0 ? { status: 'IN_STOCK', shopId: transfer.toShopId } : { status: 'LOST' } });
        if (item.serialId) await tx.electronicsSerialTracking.update({ where: { id: item.serialId }, data: qty > 0 ? { status: 'IN_STOCK', shopId: transfer.toShopId } : { status: 'LOST' } });
        if (qty > 0) {
          await applyStockDelta({
            tx, tenantId: user.tenantId, shopId: transfer.toShopId, productId: item.productId, variantId: item.variantId, delta: qty,
            movementType: 'TRANSFER_IN', reference: transfer.transferNumber,
            note: qty < item.quantity ? `${from} se — ${item.quantity} bheje, ${qty} aaye` : `${from} se aaya`,
            userId: user.id, unitCost: item.unitCost,
          });
        }
      }
      return { short: r2(short) };
    }, { timeout: 60_000 });

    if (result.short > 0) {
      await this.notifications.create({
        tenantId: user.tenantId, type: 'WARNING', title: 'Transfer me maal kam aaya',
        message: `${transfer.transferNumber}: Rs ${Math.round(result.short).toLocaleString('en-PK')} ka maal kam pohncha`, link: '/transfers',
      });
    }
    return this.findOne(user, id);
  }

  /* ───────────────────────── cancel ───────────────────────── */

  async cancel(user: AuthenticatedUser, id: string, dto: CancelTransferDto = {}) {
    const transfer = await this.prisma.stockTransfer.findFirst({ where: { id, tenantId: user.tenantId }, include: TRANSFER_INCLUDE });
    if (!transfer) throw new NotFoundException('Transfer nahi mila');
    assertShopAccess(user, transfer.fromShopId, 'Transfer cancel karna');
    if (transfer.status === 'RECEIVED') throw new BadRequestException('Receive ho chuka transfer cancel nahi hota — wapas bhejein');
    if (transfer.status === 'CANCELLED') throw new BadRequestException('Pehle hi cancel hai');
    const wasInTransit = transfer.status === 'IN_TRANSIT';

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.stockTransfer.updateMany({
        where: { id, status: transfer.status },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: user.id, cancelReason: dto.reason?.trim() || null },
      });
      if (!claimed.count) throw new BadRequestException('Yeh transfer abhi badal gaya — page refresh karein');
      if (!wasInTransit) return;

      for (const item of transfer.items) {
        if (item.usedPhoneId) {
          await tx.usedPhone.update({ where: { id: item.usedPhoneId }, data: { status: 'IN_STOCK', shopId: transfer.fromShopId } });
          continue;
        }
        if (!item.productId) continue;
        if (item.carpetRollId && item.carpetRoll) {
          const variantId = item.variantId ?? item.carpetRoll.variantId ?? null;
          await tx.carpetRoll.update({ where: { id: item.carpetRollId }, data: { status: 'ACTIVE' } });
          await tx.carpetRollMovement.create({
            data: {
              rollId: item.carpetRollId, tenantId: user.tenantId, type: 'TRANSFER', lengthFt: 0, sqft: 0,
              balanceLengthAfter: Number(item.carpetRoll.remainingLengthFt), balanceSqftAfter: Number(item.carpetRoll.remainingSqft),
              reference: transfer.transferNumber, note: 'Transfer cancel — wapas', createdById: user.id,
            },
          });
          const after = await this.syncShopStockForCarpet(tx, user.tenantId, transfer.fromShopId, item.productId, variantId);
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId, shopId: transfer.fromShopId, productId: item.productId, variantId, type: 'TRANSFER_IN', quantity: item.quantity,
              balanceAfter: after, reference: transfer.transferNumber, note: 'Transfer cancel — wapas', createdById: user.id, unitCost: item.unitCost,
            },
          });
          continue;
        }
        if (item.imeiId) await tx.productImei.update({ where: { id: item.imeiId }, data: { status: 'IN_STOCK', shopId: transfer.fromShopId } });
        if (item.serialId) await tx.electronicsSerialTracking.update({ where: { id: item.serialId }, data: { status: 'IN_STOCK', shopId: transfer.fromShopId } });
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: transfer.fromShopId, productId: item.productId, variantId: item.variantId, delta: item.quantity,
          movementType: 'TRANSFER_IN', reference: transfer.transferNumber,
          note: `Transfer cancel — wapas${dto.reason?.trim() ? ` (${dto.reason.trim()})` : ''}`, userId: user.id, unitCost: item.unitCost,
        });
      }
    }, { timeout: 60_000 });
    return this.findOne(user, id);
  }

  /* ───────────────────────── reading ───────────────────────── */

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ListTransfersDto): Promise<Prisma.StockTransferWhereInput> {
    const range = await periodRange(this.tz, user.tenantId, q.from, q.to);
    const locked = user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' ? user.shopId ?? null : null;
    const shop = locked ?? q.shopId ?? scope.shopId;
    const dir = q.direction ?? 'all';
    const side: Prisma.StockTransferWhereInput = !shop ? {}
      : dir === 'in' ? { toShopId: shop }
        : dir === 'out' ? { fromShopId: shop }
          : { OR: [{ fromShopId: shop }, { toShopId: shop }] };
    const s = q.search?.trim();
    return {
      tenantId: user.tenantId, createdAt: range, ...side,
      ...(q.status && q.status !== 'all' && { status: q.status as Prisma.EnumTransferStatusFilter['equals'] }),
      ...(s && {
        AND: [{
          OR: [
            { transferNumber: { contains: s, mode: 'insensitive' as const } },
            { notes: { contains: s, mode: 'insensitive' as const } },
            { items: { some: { product: { name: { contains: s, mode: 'insensitive' as const } } } } },
            { items: { some: { imei: { imei1: { contains: s } } } } },
          ],
        }],
      }),
    };
  }

  async list(user: AuthenticatedUser, scope: ShopScope, q: ListTransfersDto = {}) {
    const where = await this.where(user, scope, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [items, total, byStatus] = await Promise.all([
      this.prisma.stockTransfer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: TRANSFER_INCLUDE }),
      this.prisma.stockTransfer.count({ where }),
      this.prisma.stockTransfer.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { value: true } }),
    ]);
    const st = (k: string) => byStatus.find((b) => b.status === k);
    return {
      items: await this.withPeople(items), total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        count: total,
        inTransit: st('IN_TRANSIT')?._count._all ?? 0, inTransitValue: r2(Number(st('IN_TRANSIT')?._sum.value ?? 0)),
        received: st('RECEIVED')?._count._all ?? 0, cancelled: st('CANCELLED')?._count._all ?? 0,
        value: r2(byStatus.filter((b) => b.status !== 'CANCELLED').reduce((s, b) => s + Number(b._sum.value ?? 0), 0)),
      },
    };
  }

  /** Adds who received / cancelled (stored as plain ids). */
  private async withPeople<T extends { receivedById: string | null; cancelledById: string | null }>(rows: T[]) {
    const ids = [...new Set(rows.flatMap((r) => [r.receivedById, r.cancelledById]).filter(Boolean) as string[])];
    if (!ids.length) return rows.map((r) => ({ ...r, receivedBy: null, cancelledBy: null }));
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } });
    const by = (id: string | null) => users.find((u) => u.id === id) ?? null;
    return rows.map((r) => ({ ...r, receivedBy: by(r.receivedById), cancelledBy: by(r.cancelledById) }));
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({ where: { id, tenantId: user.tenantId }, include: TRANSFER_INCLUDE });
    if (!transfer) throw new NotFoundException('Transfer nahi mila');
    const locked = user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' ? user.shopId : null;
    if (locked && transfer.fromShopId !== locked && transfer.toShopId !== locked) throw new NotFoundException('Transfer nahi mila');
    return (await this.withPeople([transfer]))[0];
  }

  /** Routes, what moves most, value by day, how long receiving takes and shortages. */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListTransfersDto = {}) {
    const where = await this.where(user, scope, q);
    const { tz } = await this.tz.clock(user.tenantId);
    const rows = await this.prisma.stockTransfer.findMany({
      where,
      select: {
        status: true, value: true, createdAt: true, transferredAt: true, receivedAt: true,
        fromShop: { select: { id: true, name: true } }, toShop: { select: { id: true, name: true } },
        items: { select: { quantity: true, receivedQty: true, unitCost: true, productId: true, product: { select: { name: true, unit: true } } } },
      },
    });
    const live = rows.filter((r) => r.status !== 'CANCELLED');
    const routes = new Map<string, { from: string; to: string; count: number; value: number }>();
    const days = new Map<string, { key: string; value: number; count: number }>();
    const products = new Map<string, { name: string; unit: string; qty: number; value: number }>();
    let short = 0; let hours = 0; let timed = 0;
    for (const r of live) {
      const k = `${r.fromShop.id}>${r.toShop.id}`;
      const g = routes.get(k) ?? { from: r.fromShop.name, to: r.toShop.name, count: 0, value: 0 };
      g.count++; g.value += r.value; routes.set(k, g);
      const p = tzParts(r.createdAt, tz);
      const dk = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      const d = days.get(dk) ?? { key: dk, value: 0, count: 0 };
      d.value += r.value; d.count++; days.set(dk, d);
      for (const i of r.items) {
        if (i.productId && i.product) {
          const pg = products.get(i.productId) ?? { name: i.product.name, unit: i.product.unit, qty: 0, value: 0 };
          pg.qty += i.quantity; pg.value += i.quantity * i.unitCost; products.set(i.productId, pg);
        }
        if (r.status === 'RECEIVED') short += Math.max(0, i.quantity - i.receivedQty) * i.unitCost;
      }
      if (r.status === 'RECEIVED' && r.receivedAt) { hours += (r.receivedAt.getTime() - (r.transferredAt ?? r.createdAt).getTime()) / HOUR; timed++; }
    }
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      totals: {
        count: rows.length, value: r2(live.reduce((s, r) => s + r.value, 0)),
        inTransit: count('IN_TRANSIT'), received: count('RECEIVED'), cancelled: count('CANCELLED'),
        shortValue: r2(short), avgHours: timed ? Math.round((hours / timed) * 10) / 10 : null,
      },
      byStatus: [
        { key: 'IN_TRANSIT', count: count('IN_TRANSIT') }, { key: 'RECEIVED', count: count('RECEIVED') }, { key: 'CANCELLED', count: count('CANCELLED') },
      ],
      routes: [...routes.values()].sort((a, b) => b.value - a.value).slice(0, 8).map((r) => ({ ...r, value: r2(r.value) })),
      trend: [...days.values()].sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({ ...d, value: r2(d.value) })),
      topProducts: [...products.values()].sort((a, b) => b.value - a.value).slice(0, 10).map((p) => ({ ...p, qty: r2(p.qty), value: r2(p.value) })),
    };
  }
}
