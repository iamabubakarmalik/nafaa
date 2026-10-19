/**
 * Serial / IMEI register of electronics units.
 *
 * A serial only names a unit; stock itself moves through purchases, sales,
 * returns and stock adjustments. So this service never marks a unit sold,
 * lost or faulty on its own without the matching stock record: a sale marks
 * it inside the bill, a stock adjustment calls `return` / `defective` right
 * after taking the stock out, and a trade-in adds the stock and pays the
 * customer from the drawer in one transaction.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ElectronicsSerialStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta, assertShopAccess } from '../../../common/shop-scope';
import { ensureCustomer, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { nextNumber, numberHead, payFromDrawer } from '../common/books';
import { releaseVoidedSerials, warrantyWindow } from '../common/serial-upkeep';
import { BulkCreateSerialDto, ListSerialsDto, SellSerialDto, TradeInDto, UpsertSerialDto } from './dto/upsert-serial.dto';

const DAY = 86_400_000;
const PROBLEM: ElectronicsSerialStatus[] = ['DEFECTIVE', 'LOST', 'IN_REPAIR', 'RETURNED'];
/** Status changes allowed by a plain edit; the rest come with a stock record. */
const EDITABLE: ElectronicsSerialStatus[] = ['IN_STOCK', 'RESERVED'];
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

const date = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Tareekh sahi likhein');
  return d;
};

@Injectable()
export class SerialTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertSerialDto) {
    const serialNumber = dto.serialNumber?.trim();
    if (!serialNumber) throw new BadRequestException('Serial number likhein');
    await this.product(user, dto.productId);
    const shopId = await this.shop(user, dto.shopId);
    await this.assertFree(user.tenantId, serialNumber, [dto.imei, dto.imei2]);
    const status = dto.status ?? 'IN_STOCK';
    if (!EDITABLE.includes(status)) throw new BadRequestException('Naya unit sirf stock ya rakha hua ho sakta hai');

    return this.prisma.electronicsSerialTracking.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        productId: dto.productId,
        serialNumber,
        imei: dto.imei?.trim() || null,
        imei2: dto.imei2?.trim() || null,
        macAddress: dto.macAddress?.trim() || null,
        status,
        purchasePrice: dto.purchasePrice,
        purchaseDate: date(dto.purchaseDate) ?? new Date(),
        supplierRef: dto.supplierRef?.trim() || null,
        warrantyStartDate: date(dto.warrantyStartDate),
        warrantyEndDate: date(dto.warrantyEndDate),
        warrantyStatus: dto.warrantyStatus ?? (dto.warrantyEndDate ? 'ACTIVE' : 'NO_WARRANTY'),
        batteryHealthPct: dto.batteryHealthPct,
        screenCondition: dto.screenCondition,
        physicalCondition: dto.physicalCondition,
        functionalStatus: dto.functionalStatus,
        notes: dto.notes,
        imageUrls: dto.imageUrls ?? [],
      },
    });
  }

  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateSerialDto) {
    await this.product(user, dto.productId);

    // Two ways in: serial numbers only, or full entries (serial + IMEI + MAC).
    const entries = dto.entries?.length
      ? dto.entries.filter((e) => e.serialNumber?.trim())
      : (dto.serialNumbers ?? [])
          .filter((sn) => sn?.trim())
          .map((serialNumber) => ({ serialNumber, imei: undefined, imei2: undefined, macAddress: undefined }));
    if (entries.length === 0) throw new BadRequestException('Koi serial number nahi diya gaya');

    // Drop serials repeated in the same call.
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      const sn = e.serialNumber.trim();
      if (seen.has(sn)) return false;
      seen.add(sn);
      return true;
    });

    const existing = await this.prisma.electronicsSerialTracking.findMany({
      where: { tenantId: user.tenantId, serialNumber: { in: unique.map((e) => e.serialNumber.trim()) } },
      select: { serialNumber: true },
    });
    const existingSet = new Set(existing.map((e) => e.serialNumber));
    const fresh = unique.filter((e) => !existingSet.has(e.serialNumber.trim()));
    if (fresh.length === 0) throw new BadRequestException('Ye saare serial pehle se mojood hain');

    const imeis = fresh.flatMap((e) => [e.imei?.trim(), e.imei2?.trim()]).filter(Boolean) as string[];
    if (imeis.length) {
      const clash = await this.prisma.electronicsSerialTracking.findFirst({
        where: { tenantId: user.tenantId, OR: [{ imei: { in: imeis } }, { imei2: { in: imeis } }] },
        select: { serialNumber: true, imei: true },
      });
      if (clash) throw new BadRequestException(`IMEI ${clash.imei} pehle se serial ${clash.serialNumber} par hai`);
    }

    const shopId = await this.shop(user, dto.shopId);
    await this.prisma.electronicsSerialTracking.createMany({
      data: fresh.map((e) => ({
        tenantId: user.tenantId,
        shopId,
        productId: dto.productId,
        serialNumber: e.serialNumber.trim(),
        imei: e.imei?.trim() || null,
        imei2: e.imei2?.trim() || null,
        macAddress: e.macAddress?.trim() || null,
        status: 'IN_STOCK' as const,
        purchasePrice: dto.purchasePrice,
        purchaseDate: new Date(),
        supplierRef: dto.supplierRef,
        warrantyStartDate: date(dto.warrantyStartDate),
        warrantyEndDate: date(dto.warrantyEndDate),
        warrantyStatus: dto.warrantyStartDate ? 'ACTIVE' as const : 'NO_WARRANTY' as const,
      })),
    });

    return {
      created: fresh.length,
      skipped: unique.length - fresh.length,
      duplicatesInRequest: entries.length - unique.length,
    };
  }

  /** Older list (max 500), used by transfers, adjustments, the POS picker and product pages. */
  async list(
    user: AuthenticatedUser,
    params: { productId?: string; status?: string; imei?: string; search?: string; shopId?: string },
  ) {
    await releaseVoidedSerials(this.prisma, user.tenantId);
    const and: Prisma.ElectronicsSerialTrackingWhereInput[] = [];
    // Units saved before branches existed have no shop and show everywhere.
    if (params.shopId) and.push({ OR: [{ shopId: params.shopId }, { shopId: null }] });
    if (params.imei) and.push({ OR: [{ imei: params.imei }, { imei2: params.imei }] });
    if (params.search) and.push({ OR: this.searchOr(params.search) });
    const rows = await this.prisma.electronicsSerialTracking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.status && { status: params.status as ElectronicsSerialStatus }),
        ...(and.length && { AND: and }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return this.withProducts(user.tenantId, rows);
  }

  /** Paged register for the serials page, with counts per view and the shelf value. */
  async page(user: AuthenticatedUser, shopId: string | undefined, q: ListSerialsDto) {
    await releaseVoidedSerials(this.prisma, user.tenantId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const now = new Date();
    const soon = new Date(Date.now() + 30 * DAY);
    const search = q.search?.trim();
    const productIds = search ? await this.productsMatching(user.tenantId, search) : [];
    const base: Prisma.ElectronicsSerialTrackingWhereInput = {
      tenantId: user.tenantId,
      ...(q.productId && { productId: q.productId }),
      AND: [
        ...(shopId ? [{ OR: [{ shopId }, { shopId: null }] }] : []),
        ...(search ? [{ OR: [...this.searchOr(search), ...(productIds.length ? [{ productId: { in: productIds } }] : [])] }] : []),
      ],
    };
    const views: Record<string, Prisma.ElectronicsSerialTrackingWhereInput> = {
      all: {},
      stock: { status: { in: ['IN_STOCK', 'RESERVED'] } },
      sold: { status: 'SOLD' },
      warranty: { status: 'SOLD', warrantyEndDate: { gte: now } },
      expiring: { status: 'SOLD', warrantyEndDate: { gte: now, lte: soon } },
      problem: { status: { in: PROBLEM } },
      tradein: { supplierRef: { startsWith: 'TI-' } },
    };
    const where = { ...base, ...(views[q.view ?? 'all'] ?? {}) };
    const orderBy: Prisma.ElectronicsSerialTrackingOrderByWithRelationInput =
      q.sort === 'old' ? { createdAt: 'asc' }
        : q.sort === 'warranty' ? { warrantyEndDate: 'asc' }
          : q.sort === 'cost' ? { purchasePrice: 'desc' }
            : { updatedAt: 'desc' };

    const [rows, total, value, ...counts] = await Promise.all([
      this.prisma.electronicsSerialTracking.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.electronicsSerialTracking.count({ where }),
      this.prisma.electronicsSerialTracking.aggregate({ where: { ...base, ...views.stock }, _sum: { purchasePrice: true } }),
      ...Object.values(views).map((v) => this.prisma.electronicsSerialTracking.count({ where: { ...base, ...v } })),
    ]);
    const items = await this.withProducts(user.tenantId, rows);
    const claims = rows.length
      ? await this.prisma.electronicsWarrantyClaim.findMany({
          where: { tenantId: user.tenantId, serialTrackingId: { in: rows.map((r) => r.id) } },
          select: { id: true, serialTrackingId: true, claimNumber: true, status: true, resolvedAt: true },
          orderBy: { claimDate: 'desc' },
        })
      : [];
    return {
      items: items.map((s) => ({ ...s, claims: claims.filter((c) => c.serialTrackingId === s.id) })),
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(Object.keys(views).map((k, i) => [k, counts[i]])),
      shelfCost: r2(value._sum.purchasePrice ?? 0),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    const [product, customer, claims] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: s.productId, tenantId: user.tenantId }, include: { images: true } }),
      s.soldToCustomerId ? this.prisma.customer.findFirst({ where: { id: s.soldToCustomerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true } }) : null,
      this.prisma.electronicsWarrantyClaim.findMany({
        where: { tenantId: user.tenantId, serialTrackingId: s.id },
        select: { id: true, claimNumber: true, status: true, resolvedAt: true, resolutionType: true, claimDate: true },
        orderBy: { claimDate: 'desc' },
      }),
    ]);
    return { ...s, product, customer, claims };
  }

  async lookupBySerialOrImei(user: AuthenticatedUser, code: string) {
    await releaseVoidedSerials(this.prisma, user.tenantId);
    const c = code.trim();
    if (!c) return null;
    return this.prisma.electronicsSerialTracking.findFirst({
      where: {
        tenantId: user.tenantId,
        OR: [{ serialNumber: c }, { imei: c }, { imei2: c }, { macAddress: c }],
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSerialDto) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    if (dto.status && dto.status !== s.status) {
      if (!EDITABLE.includes(s.status) || !EDITABLE.includes(dto.status)) {
        throw new BadRequestException('Bika, kharab ya gum unit ka status yahan se nahi badalta — sale, return ya stock adjustment se badlein');
      }
    }
    if (dto.productId && dto.productId !== s.productId) {
      if (s.status !== 'IN_STOCK') throw new BadRequestException('Sirf stock wale unit ka product badal sakte hain');
      await this.product(user, dto.productId);
    }
    const serialNumber = dto.serialNumber?.trim();
    if (serialNumber && serialNumber !== s.serialNumber) await this.assertFree(user.tenantId, serialNumber, [], s.id);
    const imeis = [dto.imei, dto.imei2].filter((v) => v && v !== s.imei && v !== s.imei2);
    if (imeis.length) await this.assertFree(user.tenantId, null, imeis, s.id);
    const shopId = dto.shopId && dto.shopId !== s.shopId ? await this.shop(user, dto.shopId) : undefined;
    if (shopId && s.status !== 'IN_STOCK') throw new BadRequestException('Branch sirf stock wale unit ki badal sakti hai');

    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        ...(dto.productId && { productId: dto.productId }),
        ...(shopId && { shopId }),
        ...(serialNumber && { serialNumber }),
        ...(dto.imei !== undefined && { imei: dto.imei?.trim() || null }),
        ...(dto.imei2 !== undefined && { imei2: dto.imei2?.trim() || null }),
        ...(dto.macAddress !== undefined && { macAddress: dto.macAddress?.trim() || null }),
        ...(dto.status && { status: dto.status }),
        ...(dto.purchasePrice !== undefined && { purchasePrice: dto.purchasePrice }),
        ...(dto.purchaseDate !== undefined && { purchaseDate: date(dto.purchaseDate) }),
        ...(dto.supplierRef !== undefined && { supplierRef: dto.supplierRef?.trim() || null }),
        ...(dto.warrantyStartDate !== undefined && { warrantyStartDate: date(dto.warrantyStartDate) }),
        ...(dto.warrantyEndDate !== undefined && { warrantyEndDate: date(dto.warrantyEndDate) }),
        ...(dto.warrantyStatus && { warrantyStatus: dto.warrantyStatus }),
        ...(dto.batteryHealthPct !== undefined && { batteryHealthPct: dto.batteryHealthPct }),
        ...(dto.screenCondition !== undefined && { screenCondition: dto.screenCondition }),
        ...(dto.physicalCondition !== undefined && { physicalCondition: dto.physicalCondition }),
        ...(dto.functionalStatus !== undefined && { functionalStatus: dto.functionalStatus }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.imageUrls && { imageUrls: dto.imageUrls }),
      },
    });
  }

  /**
   * Links a unit to a bill that already sold its product. A bill made at the
   * POS does this itself; this is for a bill saved without the serial.
   */
  async sell(user: AuthenticatedUser, id: string, dto: SellSerialDto) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    if (s.status !== 'IN_STOCK' && s.status !== 'RESERVED') {
      throw new BadRequestException(`Ye unit ${s.status} hai — bech nahi sakte`);
    }
    const sale = dto.saleId
      ? await this.prisma.sale.findFirst({
          where: { id: dto.saleId, tenantId: user.tenantId, status: { not: 'VOIDED' } },
          select: { id: true, saleNumber: true, soldAt: true, customerId: true, items: { where: { productId: s.productId }, select: { id: true, price: true, quantity: true } } },
        })
      : null;
    if (!sale || !sale.items.length) throw new BadRequestException('Unit sirf us bill se jur sakta hai jis mein ye product bika ho — POS se bill banayein');
    const taken = await this.prisma.electronicsSerialTracking.findMany({
      where: { tenantId: user.tenantId, saleItemId: { in: sale.items.map((i) => i.id) } },
      select: { saleItemId: true },
    });
    const line = sale.items.find((i) => !taken.some((t) => t.saleItemId === i.id));
    const linked = await this.prisma.electronicsSerialTracking.count({ where: { tenantId: user.tenantId, saleId: sale.id, productId: s.productId } });
    const sold = sale.items.reduce((a, i) => a + Number(i.quantity), 0);
    if (linked >= sold) throw new BadRequestException('Is bill ke saare units pehle se jure hain');
    const profile = await this.prisma.electronicsProductProfile.findFirst({ where: { tenantId: user.tenantId, productId: s.productId }, select: { warrantyMonths: true } });
    const w = warrantyWindow({ status: 'SOLD', soldAt: sale.soldAt, warrantyStartDate: s.warrantyStartDate, warrantyEndDate: s.warrantyEndDate }, profile?.warrantyMonths);
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        status: 'SOLD',
        soldPrice: dto.soldPrice,
        soldAt: sale.soldAt,
        soldToCustomerId: dto.soldToCustomerId ?? sale.customerId,
        saleId: sale.id,
        saleItemId: line?.id ?? null,
        invoiceNumber: sale.saleNumber,
        warrantyStartDate: w.start,
        warrantyEndDate: w.end,
        ...(w.end && { warrantyStatus: 'ACTIVE' as const }),
      },
    });
  }

  /** Unit taken out of stock by a stock adjustment (lost, given away). */
  async returnSerial(user: AuthenticatedUser, id: string, reason: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    if (s.status === 'SOLD') throw new BadRequestException('Bika hua unit bill ke Return se wapas aata hai');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: { status: 'RETURNED', notes: ((s.notes || '') + '\nStock se nikla: ' + (reason ?? '')).trim() },
    });
  }

  /** Unit taken out of stock as damaged by a stock adjustment. */
  async markDefective(user: AuthenticatedUser, id: string, reason: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    if (s.status === 'SOLD') throw new BadRequestException('Bika hua unit bill ke Return ya warranty claim se aata hai');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: { status: 'DEFECTIVE', notes: ((s.notes || '') + '\nKharab: ' + (reason ?? '')).trim() },
    });
  }

  async warrantyCheck(user: AuthenticatedUser, code: string) {
    const s = await this.lookupBySerialOrImei(user, code);
    if (!s) return { found: false };

    // A sold unit's warranty runs from the day of sale for the product's months.
    const [profile, product, customer, claims] = await Promise.all([
      this.prisma.electronicsProductProfile.findFirst({
        where: { tenantId: user.tenantId, productId: s.productId }, select: { warrantyMonths: true, warrantyType: true },
      }),
      this.prisma.product.findFirst({ where: { id: s.productId, tenantId: user.tenantId }, select: { id: true, name: true } }),
      s.soldToCustomerId
        ? this.prisma.customer.findFirst({ where: { id: s.soldToCustomerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true } })
        : null,
      this.prisma.electronicsWarrantyClaim.findMany({
        where: { tenantId: user.tenantId, serialTrackingId: s.id },
        select: { id: true, claimNumber: true, status: true, resolvedAt: true },
        orderBy: { claimDate: 'desc' },
      }),
    ]);
    const w = warrantyWindow(s, profile?.warrantyMonths);
    const now = new Date();
    const isExpired = w.end ? new Date(w.end) < now : true;
    const daysRemaining = w.end
      ? Math.max(0, Math.floor((new Date(w.end).getTime() - now.getTime()) / DAY))
      : 0;
    const voidStatus = ['VOID', 'EXPIRED'].includes(String(s.warrantyStatus));

    return {
      found: true,
      serial: { ...s, product, customer },
      claims,
      warranty: {
        status: s.warrantyStatus,
        type: profile?.warrantyType ?? null,
        startDate: w.start,
        endDate: w.end,
        isExpired,
        daysRemaining,
        isValid: s.status === 'SOLD' && !isExpired && !voidStatus,
      },
    };
  }

  /** Only a unit entered by mistake: on the shelf, never sold, not on a claim or transfer. */
  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    if (s.status !== 'IN_STOCK' || s.saleId || s.soldAt) throw new BadRequestException('Sirf stock wala, kabhi na bika unit hataya ja sakta hai');
    const [claim, transfer] = await Promise.all([
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId, serialTrackingId: id } }),
      this.prisma.stockTransferItem.count({ where: { serialId: id } }),
    ]);
    if (claim || transfer) throw new BadRequestException('Is unit ka record (claim / transfer) mojood hai — hataya nahi ja sakta');
    if (s.supplierRef?.startsWith('TI-')) throw new BadRequestException('Trade-in unit ka paisa diya ja chuka hai — hataya nahi ja sakta');
    return this.prisma.electronicsSerialTracking.delete({ where: { id } });
  }

  /**
   * Buys a used unit from a customer: the unit enters stock at the price
   * paid, and the cash leaves the open drawer. Sold later like any unit.
   */
  async tradeIn(user: AuthenticatedUser, scopeShopId: string | undefined, dto: TradeInDto) {
    const serialNumber = dto.serialNumber.trim();
    const value = r2(dto.value);
    if (!dto.productId && !dto.name?.trim()) throw new BadRequestException('Product chunein ya naam likhein');
    await this.assertFree(user.tenantId, serialNumber, [dto.imei]);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scopeShopId);
      assertShopAccess(user, shopId, 'Trade-in');
      const prior = await tx.electronicsSerialTracking.findMany({
        where: { tenantId: user.tenantId, supplierRef: { startsWith: numberHead('TI') } },
        select: { supplierRef: true },
      });
      const number = nextNumber(prior.map((p) => p.supplierRef ?? ''), 'TI');
      const customerId = dto.customerId || dto.customerName?.trim()
        ? await ensureCustomer(tx, user, { customerId: dto.customerId, name: dto.customerName, phone: dto.customerPhone, shopId })
        : null;
      const who = customerId
        ? (await tx.customer.findUnique({ where: { id: customerId }, select: { name: true } }))?.name
        : dto.customerName?.trim();

      // The product the unit is kept under.
      let productId = dto.productId;
      let label: string;
      if (productId) {
        const p = await tx.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true, name: true, stock: true, costPrice: true } });
        if (!p) throw new NotFoundException('Product nahi mila');
        label = p.name;
        // Average cost over the stock already held and this unit.
        const held = Math.max(Number(p.stock) || 0, 0);
        const cost = r2((held * (Number(p.costPrice) || 0) + value) / (held + 1));
        await tx.product.update({ where: { id: p.id }, data: { costPrice: cost } });
      } else {
        label = `Used ${dto.name!.trim()}`;
        if (dto.brandId && !(await tx.brand.findFirst({ where: { id: dto.brandId, tenantId: user.tenantId }, select: { id: true } }))) {
          throw new NotFoundException('Brand nahi mila');
        }
        if (dto.categoryId && !(await tx.category.findFirst({ where: { id: dto.categoryId, tenantId: user.tenantId }, select: { id: true } }))) {
          throw new NotFoundException('Category nahi mili');
        }
        const created = await tx.product.create({
          data: {
            tenantId: user.tenantId,
            name: label,
            slug: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 6)}`,
            unit: 'pcs',
            price: r2(dto.salePrice ?? value),
            costPrice: value,
            stock: 0,
            lowStockAlert: 0,
            brandId: dto.brandId ?? null,
            categoryId: dto.categoryId ?? null,
            description: `Trade-in ${number}`,
          },
          select: { id: true },
        });
        productId = created.id;
      }
      const profile = await tx.electronicsProductProfile.findUnique({ where: { productId }, select: { id: true } });
      if (!profile) {
        await tx.electronicsProductProfile.create({
          data: {
            tenantId: user.tenantId, productId, brandId: dto.brandId ?? null,
            conditionType: dto.condition ?? 'USED', requiresSerial: true, hasImei: !!dto.imei?.trim(),
            isNewArrival: false, hasManual: false, hasWarrantyCard: false,
          },
        });
      }

      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: productId!, delta: 1,
        movementType: 'PURCHASE_IN', reference: number, note: `Trade-in${who ? ` — ${who}` : ''}`,
        userId: user.id, unitCost: value,
      });
      const serial = await tx.electronicsSerialTracking.create({
        data: {
          tenantId: user.tenantId, shopId, productId: productId!, serialNumber,
          imei: dto.imei?.trim() || null, status: 'IN_STOCK',
          purchasePrice: value, purchaseDate: new Date(), supplierRef: number,
          physicalCondition: dto.physicalCondition?.trim() || null,
          notes: [`Trade-in ${number}${who ? ` — ${who}` : ''}`, dto.notes?.trim()].filter(Boolean).join('\n'),
        },
      });
      const paid = await payFromDrawer(tx, {
        tenantId: user.tenantId, userId: user.id, shopId, amount: value,
        reason: `Trade-in ${number}`, note: `${label} · S/N ${serialNumber}${who ? ` · ${who}` : ''}`, reference: `tradein:${number}`,
      });
      if (!paid) throw new BadRequestException('Galla (cash register) khula nahi — trade-in ka paisa galle se jata hai, pehle register kholein');
      return { number, serial, productId, value, customerId };
    });
  }

  // ── helpers ──

  private async product(user: AuthenticatedUser, productId: string) {
    const p = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true } });
    if (!p) throw new NotFoundException('Product nahi mila');
    return p;
  }

  /** The given branch (checked), else the user's own, else the main shop. */
  private async shop(user: AuthenticatedUser, shopId?: string) {
    if (shopId) {
      const s = await this.prisma.shop.findFirst({ where: { id: shopId, tenantId: user.tenantId }, select: { id: true } });
      if (!s) throw new NotFoundException('Branch nahi mili');
      assertShopAccess(user, s.id, 'Serial');
      return s.id;
    }
    return resolveIndustryShopId(this.prisma as unknown as Prisma.TransactionClient, user, null);
  }

  private async assertFree(tenantId: string, serialNumber: string | null, imeis: Array<string | undefined | null>, exceptId?: string) {
    const codes = imeis.map((v) => v?.trim()).filter(Boolean) as string[];
    const or: Prisma.ElectronicsSerialTrackingWhereInput[] = [
      ...(serialNumber ? [{ serialNumber }] : []),
      ...(codes.length ? [{ imei: { in: codes } }, { imei2: { in: codes } }] : []),
    ];
    if (!or.length) return;
    const clash = await this.prisma.electronicsSerialTracking.findFirst({
      where: { tenantId, OR: or, ...(exceptId && { id: { not: exceptId } }) },
      select: { serialNumber: true },
    });
    if (clash) throw new BadRequestException(`Serial / IMEI pehle se mojood hai (${clash.serialNumber})`);
  }

  private searchOr(s: string): Prisma.ElectronicsSerialTrackingWhereInput[] {
    return [
      { serialNumber: { contains: s, mode: 'insensitive' } },
      { imei: { contains: s } },
      { imei2: { contains: s } },
      { macAddress: { contains: s, mode: 'insensitive' } },
      { invoiceNumber: { contains: s, mode: 'insensitive' } },
      { supplierRef: { contains: s, mode: 'insensitive' } },
    ];
  }

  private async productsMatching(tenantId: string, s: string) {
    const rows = await this.prisma.product.findMany({
      where: { tenantId, OR: [{ name: { contains: s, mode: 'insensitive' } }, { sku: { contains: s, mode: 'insensitive' } }] },
      select: { id: true },
      take: 200,
    });
    return rows.map((r) => r.id);
  }

  /** Product name and image with each unit (the register has no Prisma relation to Product). */
  private async withProducts<T extends { productId: string }>(tenantId: string, rows: T[]) {
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds }, tenantId },
          select: {
            id: true, name: true, sku: true, unit: true, price: true, costPrice: true,
            images: { select: { id: true, url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, product: byId.get(r.productId) ?? null }));
  }
}
