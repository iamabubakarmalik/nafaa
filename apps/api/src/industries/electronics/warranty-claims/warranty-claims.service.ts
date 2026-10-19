/**
 * Warranty claims: a customer brings back a faulty unit. The claim records
 * the unit, the bill it came from and what was done, and puts the money and
 * stock of the outcome into the books:
 *
 *   - a repair charge to the customer becomes a bill (WC-… number) with the
 *     shop's repair cost as its cost; unpaid charge goes on khata;
 *   - repair cost the shop paid in cash leaves the open drawer;
 *   - a replacement unit from shop stock leaves stock as damage (write-off),
 *     takes over the old unit's bill and warranty, and the old unit is
 *     marked faulty;
 *   - a refund is done as a Return on the original bill, which moves money,
 *     stock and khata; the claim reads the refunded amount from it.
 *
 * Open claims have no resolvedAt and a working status (ACTIVE, CLAIMED,
 * IN_REPAIR). A claim is never deleted; cancelling marks it VOID.
 */
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertShopAccess } from '../../../common/shop-scope';
import { startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { periodRange } from '../../../modules/inventory/taxonomy/taxonomy.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { nextNumber, numberHead, payFromDrawer, writeOffUnit } from '../common/books';
import { warrantyWindow } from '../common/serial-upkeep';
import { BrandContactDto, CreateClaimDto, ListClaimsDto, ResolveClaimDto, UpdateClaimStatusDto } from './dto/create-claim.dto';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const OPEN_STATUSES = ['ACTIVE', 'CLAIMED', 'IN_REPAIR'] as const;
const OPEN: Prisma.ElectronicsWarrantyClaimWhereInput = { resolvedAt: null, status: { in: [...OPEN_STATUSES] } };
const DAY = 86_400_000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const stamp = (notes: string | null, line: string) =>
  `${notes ? `${notes}\n` : ''}[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] ${line}`;

@Injectable()
export class WarrantyClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateClaimDto) {
    const purchaseDate = new Date(dto.purchaseDate);
    if (Number.isNaN(purchaseDate.getTime())) throw new BadRequestException('Khareed ki tareekh sahi likhein');
    if (!dto.issueDescription?.trim()) throw new BadRequestException('Kharabi likhein');
    if (!dto.customerName?.trim()) throw new BadRequestException('Customer ka naam likhein');

    // Linked records must belong to this shop owner.
    const serial = dto.serialTrackingId
      ? await this.prisma.electronicsSerialTracking.findFirst({ where: { id: dto.serialTrackingId, tenantId: user.tenantId } })
      : null;
    if (dto.serialTrackingId && !serial) throw new NotFoundException('Serial nahi mila');
    const productId = serial?.productId ?? dto.productId ?? null;
    if (productId) {
      const p = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true } });
      if (!p) throw new NotFoundException('Product nahi mila');
    }
    const customerId = dto.customerId ?? serial?.soldToCustomerId ?? null;
    if (customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
    }
    if (serial) {
      const open = await this.prisma.electronicsWarrantyClaim.findFirst({
        where: { tenantId: user.tenantId, serialTrackingId: serial.id, ...OPEN },
        select: { claimNumber: true },
      });
      if (open) throw new BadRequestException(`Is unit ka claim ${open.claimNumber} pehle se khula hai`);
    }

    for (let attempt = 0; ; attempt++) {
      const claimNumber = await this.nextClaimNumber(user.tenantId);
      try {
        return await this.prisma.electronicsWarrantyClaim.create({
          data: {
            tenantId: user.tenantId,
            claimNumber,
            serialTrackingId: serial?.id ?? null,
            productId,
            productName: dto.productName.trim(),
            customerId,
            customerName: dto.customerName.trim(),
            customerPhone: dto.customerPhone?.trim() || null,
            customerEmail: dto.customerEmail?.trim() || null,
            purchaseDate,
            invoiceNumber: dto.invoiceNumber?.trim() || serial?.invoiceNumber || null,
            serialNumber: dto.serialNumber?.trim() || serial?.serialNumber || null,
            imei: dto.imei?.trim() || serial?.imei || null,
            issueDescription: dto.issueDescription.trim(),
            issueCategory: dto.issueCategory?.trim() || null,
            imageUrls: dto.imageUrls ?? [],
            documentUrls: dto.documentUrls ?? [],
            internalNotes: dto.internalNotes?.trim() || null,
            receivedAt: new Date(),
            handledById: user.id,
          },
        });
      } catch (e) {
        // Two claims saved at once can pick the same number; take the next one.
        if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
  }

  /** Older list, kept for the dashboard and other callers. */
  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; sentToBrand?: boolean; from?: string; to?: string; search?: string }) {
    return this.prisma.electronicsWarrantyClaim.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.sentToBrand !== undefined && { sentToBrand: params.sentToBrand }),
        ...this.dateWhere(params.from, params.to),
        ...(params.search && { OR: this.searchOr(params.search) }),
      },
      orderBy: [{ status: 'asc' }, { claimDate: 'desc' }],
      take: 200,
    });
  }

  /** Paged list for the claims page: one view, search, dates; counts for every view. */
  async page(user: AuthenticatedUser, q: ListClaimsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    // Business-day keys (YYYY-MM-DD) follow the shop's clock; anything else is read as given.
    const days = q.from && q.to && DAY_KEY.test(q.from) && DAY_KEY.test(q.to);
    const base: Prisma.ElectronicsWarrantyClaimWhereInput = {
      tenantId: user.tenantId,
      ...(days ? { claimDate: await periodRange(this.tz, user.tenantId, q.from, q.to) } : this.dateWhere(q.from, q.to)),
      ...(q.search?.trim() && { OR: this.searchOr(q.search.trim()) }),
    };
    const views = this.views();
    const where = { ...base, ...(views[q.view ?? 'open'] ?? {}) };
    const [items, total, ...counts] = await Promise.all([
      this.prisma.electronicsWarrantyClaim.findMany({
        where,
        orderBy: { claimDate: q.sort === 'new' ? 'desc' : q.view === 'done' || q.view === 'all' || q.view === 'closed' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.electronicsWarrantyClaim.count({ where }),
      ...Object.values(views).map((v) => this.prisma.electronicsWarrantyClaim.count({ where: { ...base, ...v } })),
    ]);
    const bills = await this.billsFor(user.tenantId, items.map((c) => c.claimNumber));
    return {
      items: items.map((c) => ({ ...c, bill: bills.get(c.claimNumber) ?? null })),
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(Object.keys(views).map((k, i) => [k, counts[i]])),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.find(user, id);
    const [bills, serial, sale] = await Promise.all([
      this.billsFor(user.tenantId, [c.claimNumber]),
      c.serialTrackingId ? this.prisma.electronicsSerialTracking.findFirst({ where: { id: c.serialTrackingId, tenantId: user.tenantId } }) : null,
      c.invoiceNumber ? this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, saleNumber: c.invoiceNumber }, select: { id: true, saleNumber: true, status: true, soldAt: true, total: true } }) : null,
    ]);
    return { ...c, bill: bills.get(c.claimNumber) ?? null, serial, originalSale: sale };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateClaimStatusDto) {
    const c = await this.find(user, id);
    if (c.resolvedAt) throw new BadRequestException('Ye claim band ho chuka hai');
    if (!(OPEN_STATUSES as readonly string[]).includes(dto.status)) {
      throw new BadRequestException('Status sirf Naya ya Repair mein ho sakta hai — band karne ke liye "Hal karein" ya "Cancel" use karein');
    }
    if (!(OPEN_STATUSES as readonly string[]).includes(c.status)) throw new BadRequestException('Cancel hua claim dobara nahi khulta');
    const data: Prisma.ElectronicsWarrantyClaimUpdateInput = { status: dto.status };
    if (dto.status === 'IN_REPAIR' && !c.receivedAt) data.receivedAt = new Date();
    if (dto.diagnosis?.trim()) { data.diagnosis = dto.diagnosis.trim(); data.diagnosedAt = new Date(); }
    if (dto.resolution?.trim()) data.resolution = dto.resolution.trim();
    if (dto.notes?.trim()) data.internalNotes = stamp(c.internalNotes, dto.notes.trim());
    return this.prisma.electronicsWarrantyClaim.update({ where: { id }, data });
  }

  async contactBrand(user: AuthenticatedUser, id: string, dto: BrandContactDto) {
    const c = await this.find(user, id);
    if (c.resolvedAt) throw new BadRequestException('Ye claim band ho chuka hai');
    return this.prisma.electronicsWarrantyClaim.update({
      where: { id },
      data: {
        sentToBrand: true,
        brandRef: dto.brandRef.trim(),
        brandContactedAt: c.brandContactedAt ?? new Date(),
        brandResponse: dto.brandResponse?.trim() || c.brandResponse,
        status: 'IN_REPAIR',
        internalNotes: stamp(c.internalNotes, `Company ko bheja (${dto.brandRef.trim()})`),
      },
    });
  }

  async resolve(user: AuthenticatedUser, id: string, dto: ResolveClaimDto) {
    const c = await this.find(user, id);
    if (c.resolvedAt) throw new BadRequestException('Ye claim pehle hi hal ho chuka hai');
    if (!(OPEN_STATUSES as readonly string[]).includes(c.status)) throw new BadRequestException('Cancel hua claim hal nahi ho sakta');

    const type = dto.resolutionType;
    const charge = type === 'REJECTED' ? 0 : r2(dto.paidByCustomer ?? 0);
    const repairCost = r2(dto.repairCost ?? 0);
    const brand = r2(dto.paidByBrand ?? 0);
    const paidNow = r2(Math.min(dto.paidNow ?? charge, charge));
    if (dto.refundAmount && type !== 'REFUNDED') throw new BadRequestException('Refund sirf "Paisa wapas" wale claim par');
    if (type === 'REPLACED' && !hasPermission(user.role, user.permissions, PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)) {
      throw new ForbiddenException('Naya unit stock se dene ke liye stock adjustment ki permission chahiye');
    }
    if (type === 'REPLACED' && !dto.replacementSerialId && !c.productId) {
      throw new BadRequestException('Naya unit chunein — ya product ke bagair claim par replacement nahi ho sakta');
    }

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      assertShopAccess(user, shopId, 'Warranty claim');
      const notes: string[] = [];
      let replacementSerialNumber = dto.replacementSerialNumber?.trim() || null;

      // 1. Replacement from shop stock.
      if (type === 'REPLACED') {
        replacementSerialNumber = await this.replaceUnit(tx, user, c, shopId, dto.replacementSerialId) ?? replacementSerialNumber;
        notes.push(`Naya unit diya${replacementSerialNumber ? ` (${replacementSerialNumber})` : ''} — stock se nikla, write-off`);
      } else if (c.serialTrackingId && type !== 'REFUNDED') {
        // The customer keeps the unit; its warranty is now used.
        await tx.electronicsSerialTracking.updateMany({
          where: { id: c.serialTrackingId, tenantId: user.tenantId, status: 'SOLD' },
          data: { warrantyStatus: type === 'REJECTED' ? 'VOID' : 'CLAIMED' },
        });
      }

      // 2. Charge to the customer, with the shop's cost on the same bill.
      if (charge > 0 || (repairCost > brand && type !== 'REJECTED')) {
        const customerId = charge - paidNow > 0.005 || c.customerId
          ? await ensureCustomer(tx, user, { customerId: c.customerId, name: c.customerName, phone: c.customerPhone, shopId })
          : null;
        const sale = await postIndustrySale(tx, user, {
          saleNumber: c.claimNumber,
          sourceRef: c.claimNumber,
          shopId,
          customerId,
          lines: [{ label: `Warranty ${type === 'REPAIRED' ? 'repair' : 'claim'} — ${c.productName}${c.serialNumber ? ` (S/N ${c.serialNumber})` : ''}`, amount: charge, cost: Math.max(repairCost - brand, 0) }],
          paidAmount: paidNow,
          paymentMethod: dto.paymentMethod,
        });
        notes.push(`Bill ${sale.saleNumber}: charge ${charge}, mila ${paidNow}${charge - paidNow > 0.005 ? `, udhaar ${r2(charge - paidNow)}` : ''}`);
      }

      // 3. Repair cost paid in cash.
      const fromDrawer = r2(Math.max(repairCost - brand, 0));
      if (dto.costFromDrawer && fromDrawer > 0) {
        const paid = await payFromDrawer(tx, {
          tenantId: user.tenantId, userId: user.id, shopId, amount: fromDrawer,
          reason: `Warranty repair ${c.claimNumber}`, note: c.productName, reference: `warranty:${c.claimNumber}`,
        });
        if (!paid) throw new BadRequestException('Galla (cash register) khula nahi — pehle register kholein ya "galle se diya" hata dein');
        notes.push(`Repair kharcha ${fromDrawer} galle se diya`);
      }

      // 4. Refund: read from the returns made on the original bill.
      const refundAmount = type === 'REFUNDED' ? await this.refundedOnBill(tx, user.tenantId, c) : 0;
      if (type === 'REFUNDED' && refundAmount <= 0) {
        throw new BadRequestException('Pehle asal bill par Return karein (Sales history → bill → Wapas) — phir claim band karein');
      }

      return tx.electronicsWarrantyClaim.update({
        where: { id },
        data: {
          status: type === 'REJECTED' ? 'VOID' : 'CLAIMED',
          resolvedAt: new Date(),
          resolutionType: type,
          replacementSerialNumber,
          refundAmount,
          repairCost,
          paidByCustomer: charge,
          paidByBrand: brand,
          isChargeable: dto.isChargeable ?? charge > 0,
          resolution: dto.resolution?.trim() || c.resolution,
          internalNotes: stamp(c.internalNotes, notes.join(' · ') || 'Hal ho gaya'),
        },
      });
    });
  }

  /** Cancels a claim; it stays in the list. A claim with a bill cannot be cancelled. */
  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.find(user, id);
    if (c.resolvedAt) throw new BadRequestException('Hal hua claim cancel nahi hota');
    const bill = await this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, saleNumber: c.claimNumber }, select: { id: true } });
    if (bill) throw new BadRequestException('Is claim ka bill ban chuka hai — bill Sales history se void karein');
    return this.prisma.electronicsWarrantyClaim.update({
      where: { id },
      data: { status: 'VOID', internalNotes: stamp(c.internalNotes, 'Cancel kiya') },
    });
  }

  async summary(user: AuthenticatedUser) {
    const monthStart = startOfMonthTz(new Date());
    const where = { tenantId: user.tenantId };
    const weekAgo = new Date(Date.now() - 7 * DAY);
    const [total, active, claimed, inRepair, resolved, expired, sentToBrand, thisMonth, stale, money] =
      await Promise.all([
        this.prisma.electronicsWarrantyClaim.count({ where }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, ...OPEN, status: 'ACTIVE' } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, ...OPEN, status: 'CLAIMED' } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, ...OPEN, status: 'IN_REPAIR' } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, resolvedAt: { not: null } } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, resolvedAt: null, status: { in: ['EXPIRED', 'VOID', 'NO_WARRANTY'] } } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, ...OPEN, sentToBrand: true } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, claimDate: { gte: monthStart } } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, ...OPEN, claimDate: { lt: weekAgo } } }),
        this.prisma.electronicsWarrantyClaim.aggregate({
          where: { ...where, resolvedAt: { gte: monthStart } },
          _sum: { repairCost: true, refundAmount: true, paidByCustomer: true, paidByBrand: true },
        }),
      ]);

    const repairCost = money._sum.repairCost ?? 0;
    const refundAmount = money._sum.refundAmount ?? 0;
    const paidByCustomer = money._sum.paidByCustomer ?? 0;
    const paidByBrand = money._sum.paidByBrand ?? 0;
    return {
      total, active, claimed, inRepair, resolved, expired, sentToBrand, thisMonth, stale,
      /** Open claims: no result yet. */
      pending: active + claimed + inRepair,
      /** This month's resolved claims. */
      cost: {
        repairCost, refundAmount, paidByCustomer, paidByBrand,
        shopBore: Math.max(0, r2(repairCost - paidByCustomer - paidByBrand)),
      },
    };
  }

  // ── helpers ──

  private async find(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.electronicsWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    return c;
  }

  private async nextClaimNumber(tenantId: string) {
    const rows = await this.prisma.electronicsWarrantyClaim.findMany({
      where: { tenantId, claimNumber: { startsWith: numberHead('WC') } },
      select: { claimNumber: true },
    });
    return nextNumber(rows.map((r) => r.claimNumber), 'WC');
  }

  private views(): Record<string, Prisma.ElectronicsWarrantyClaimWhereInput> {
    return {
      open: OPEN,
      repair: { ...OPEN, status: 'IN_REPAIR' },
      brand: { ...OPEN, sentToBrand: true },
      stale: { ...OPEN, claimDate: { lt: new Date(Date.now() - 7 * DAY) } },
      done: { resolvedAt: { not: null } },
      closed: { resolvedAt: null, status: { in: ['EXPIRED', 'VOID', 'NO_WARRANTY'] } },
      all: {},
    };
  }

  private searchOr(s: string): Prisma.ElectronicsWarrantyClaimWhereInput[] {
    return [
      { claimNumber: { contains: s, mode: 'insensitive' } },
      { customerName: { contains: s, mode: 'insensitive' } },
      { customerPhone: { contains: s } },
      { productName: { contains: s, mode: 'insensitive' } },
      { serialNumber: { contains: s, mode: 'insensitive' } },
      { imei: { contains: s } },
      { invoiceNumber: { contains: s, mode: 'insensitive' } },
    ];
  }

  private dateWhere(from?: string, to?: string): Prisma.ElectronicsWarrantyClaimWhereInput {
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    if ((!f || Number.isNaN(f.getTime())) && (!t || Number.isNaN(t.getTime()))) return {};
    return {
      claimDate: {
        ...(f && !Number.isNaN(f.getTime()) && { gte: f }),
        ...(t && !Number.isNaN(t.getTime()) && { lte: t }),
      },
    };
  }

  /** Bills posted for claims (number = claim number). */
  private async billsFor(tenantId: string, numbers: string[]) {
    if (!numbers.length) return new Map<string, { id: string; saleNumber: string; total: number; creditAmount: number; status: string }>();
    const rows = await this.prisma.sale.findMany({
      where: { tenantId, saleNumber: { in: numbers } },
      select: { id: true, saleNumber: true, total: true, creditAmount: true, status: true },
    });
    return new Map(rows.map((s) => [s.saleNumber, s]));
  }

  /** Refunded on the claim's original bill for this product (returns are the money record). */
  private async refundedOnBill(tx: Prisma.TransactionClient, tenantId: string, c: { invoiceNumber: string | null; productId: string | null }) {
    if (!c.invoiceNumber) return 0;
    const sale = await tx.sale.findFirst({ where: { tenantId, saleNumber: c.invoiceNumber }, select: { id: true } });
    if (!sale) return 0;
    const lines = await tx.saleReturnItem.findMany({
      where: { return: { saleId: sale.id, tenantId }, ...(c.productId && { productId: c.productId }) },
      select: { total: true },
    });
    return r2(lines.reduce((s, l) => s + Number(l.total || 0), 0));
  }

  /**
   * Gives the customer another unit from stock. A serial unit takes over the
   * old unit's bill line and warranty; the old unit is marked faulty and
   * leaves the bill. Without a serial, one piece of the product leaves stock.
   */
  private async replaceUnit(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    c: { claimNumber: string; productId: string | null; productName: string; serialTrackingId: string | null; customerId: string | null },
    shopId: string,
    replacementSerialId?: string,
  ): Promise<string | null> {
    const fresh = replacementSerialId
      ? await tx.electronicsSerialTracking.findFirst({ where: { id: replacementSerialId, tenantId: user.tenantId } })
      : null;
    if (replacementSerialId && !fresh) throw new NotFoundException('Naya unit nahi mila');
    if (fresh && fresh.status !== 'IN_STOCK') throw new BadRequestException(`Unit ${fresh.serialNumber} stock mein nahi (${fresh.status})`);
    if (fresh && fresh.shopId && fresh.shopId !== shopId) throw new BadRequestException(`Unit ${fresh.serialNumber} is branch mein nahi`);
    const productId = fresh?.productId ?? c.productId!;
    const old = c.serialTrackingId
      ? await tx.electronicsSerialTracking.findFirst({ where: { id: c.serialTrackingId, tenantId: user.tenantId } })
      : null;

    await writeOffUnit(tx, {
      tenantId: user.tenantId, userId: user.id, shopId, productId, label: c.productName,
      reference: c.claimNumber, note: `Warranty replacement ${c.claimNumber}${fresh ? ` — S/N ${fresh.serialNumber}` : ''}`,
      unitCost: fresh?.purchasePrice ?? null,
    });

    if (!fresh) return null;
    const profile = await tx.electronicsProductProfile.findFirst({ where: { tenantId: user.tenantId, productId: fresh.productId }, select: { warrantyMonths: true } });
    const w = old ? warrantyWindow(old, profile?.warrantyMonths) : { start: null, end: null };
    if (old) {
      // saleItemId is unique: free it before the new unit takes it.
      await tx.electronicsSerialTracking.update({
        where: { id: old.id },
        data: {
          status: 'DEFECTIVE', warrantyStatus: 'CLAIMED', saleItemId: null, saleId: null,
          notes: stamp(old.notes, `Warranty ${c.claimNumber}: badle mein ${fresh.serialNumber} diya (bill ${old.invoiceNumber ?? '—'})`),
        },
      });
    }
    await tx.electronicsSerialTracking.update({
      where: { id: fresh.id },
      data: {
        status: 'SOLD',
        saleId: old?.saleId ?? null,
        saleItemId: old?.saleItemId ?? null,
        invoiceNumber: old?.invoiceNumber ?? c.claimNumber,
        soldAt: old?.soldAt ?? new Date(),
        soldPrice: 0,
        soldToCustomerId: old?.soldToCustomerId ?? c.customerId,
        warrantyStartDate: w.start ?? new Date(),
        warrantyEndDate: w.end,
        warrantyStatus: w.end ? 'ACTIVE' : 'NO_WARRANTY',
        notes: stamp(fresh.notes, `Warranty ${c.claimNumber}: ${old ? `${old.serialNumber} ke badle` : 'replacement'} diya`),
      },
    });
    return fresh.serialNumber;
  }
}
