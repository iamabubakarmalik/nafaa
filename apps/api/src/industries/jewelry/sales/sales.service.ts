/**
 * Jewelry bills. Every bill is also posted as a normal sale through the shared
 * sales service, so stock, the customer's khata, the cash drawer, day book and
 * reports all see it. The jewelry row keeps the weight, karat, rate and making
 * breakdown and carries the same bill number as the shared sale.
 */
import { BadRequestException, Injectable, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { JewelryPurity, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService as CoreSalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope } from '../../../common/shop-scope';
import { PURITY_FACTOR, metalTypeForPurity, postMetalEntry } from '../common/metal-ledger';
import { AddPaymentDto, CreateJewelrySaleDto, UpdateSaleStatusDto } from './dto/create-sale.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;

const METHOD: Record<string, PaymentMethod> = {
  CASH: 'CASH', CARD: 'CARD', BANK: 'BANK_TRANSFER', BANK_TRANSFER: 'BANK_TRANSFER',
  JAZZCASH: 'JAZZCASH', EASYPAISA: 'EASYPAISA',
};

const KARAT_LABEL = (p: string) => p.replace('KARAT_', '') + (p.startsWith('KARAT_') ? 'K' : '');

@Injectable()
export class SalesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coreSales: CoreSalesService,
  ) {}

  /** A bill voided anywhere (sales history, receipt) cancels its jewelry row and gives back its old gold. */
  onModuleInit() {
    this.coreSales.onVoid((tenantId, saleId) => this.afterCoreVoid(tenantId, saleId));
  }

  private async afterCoreVoid(tenantId: string, saleId: string) {
    const core = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId, status: 'VOIDED' }, select: { saleNumber: true } });
    if (!core) return;
    const s = await this.prisma.jewelrySale.findFirst({ where: { tenantId, invoiceNumber: core.saleNumber }, select: { id: true } });
    if (!s) return;
    const log = await this.prisma.activityLog.findFirst({
      where: { tenantId, action: 'SALE_VOIDED', entityType: 'Sale', entityId: saleId },
      orderBy: { createdAt: 'desc' }, select: { userId: true },
    });
    await this.settleCancelled(tenantId, log?.userId ?? null, s.id, 'Bill void');
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateJewelrySaleDto) {
    if (!dto.items?.length) throw new BadRequestException('Kam az kam ek item zaroori hai');

    const rates = await this.prisma.jewelryMetalRate.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    const ratesMap: Record<string, number> = {};
    const buyMap: Record<string, number> = {};
    rates.forEach((r) => {
      ratesMap[`${r.metalType}_${r.purity}`] = r.ratePerGram;
      buyMap[`${r.metalType}_${r.purity}`] = r.buyRate || r.ratePerGram;
    });

    let totalGrossWeight = 0;
    let totalNetWeight = 0;
    let totalMetalValue = 0;
    let totalMakingCharges = 0;
    let totalWastageValue = 0;
    let totalPolishCharges = 0;
    let totalHallmarkCharges = 0;
    let totalStoneValue = 0;

    const enrichedItems = dto.items.map((it, idx) => {
      const grossWeight = Number(it.grossWeight) || 0;
      const netWeight = Number(it.netWeight) || 0;
      const rate = Number(it.ratePerGram) || 0;
      const quantity = Math.max(1, Math.round(Number(it.quantity) || 1));
      if (netWeight < 0 || rate < 0) throw new BadRequestException(`${it.productName}: weight ya rate ghalat hai`);

      const metalValue = r2(netWeight * rate);
      const makingCharge = r2(
        (Number(it.makingChargePerGram) || 0) * netWeight +
        (Number(it.makingChargeFixed) || 0) +
        (metalValue * (Number(it.makingChargePct) || 0)) / 100,
      );
      const wastageValue = r2(((Number(it.wastagePct) || 0) / 100) * metalValue + (Number(it.wastageGrams) || 0) * rate);
      const polishCharges = Number(it.polishCharges) || 0;
      const hallmarkCharges = Number(it.hallmarkCharges) || 0;
      const stoneValue = Number(it.stoneValue) || 0;
      const unitTotal = r2(metalValue + makingCharge + wastageValue + polishCharges + hallmarkCharges + stoneValue);
      const itemTotal = r2(unitTotal * quantity);

      totalGrossWeight += grossWeight * quantity;
      totalNetWeight += netWeight * quantity;
      totalMetalValue += metalValue * quantity;
      totalMakingCharges += makingCharge * quantity;
      totalWastageValue += wastageValue * quantity;
      totalPolishCharges += polishCharges * quantity;
      totalHallmarkCharges += hallmarkCharges * quantity;
      totalStoneValue += stoneValue * quantity;

      return {
        productId: it.productId || undefined,
        productName: it.productName,
        category: it.category,
        metalType: it.metalType,
        purity: it.purity,
        ratePerGram: rate,
        grossWeight,
        netWeight,
        metalValue,
        makingChargePerGram: Number(it.makingChargePerGram) || 0,
        makingChargeFixed: Number(it.makingChargeFixed) || 0,
        makingChargePct: Number(it.makingChargePct) || 0,
        makingTotal: makingCharge,
        wastagePct: Number(it.wastagePct) || 0,
        wastageValue,
        polishCharges,
        hallmarkCharges,
        stoneValue,
        quantity,
        itemTotal,
        unitTotal,
        hallmarkNumber: it.hallmarkNumber,
        certificateNumber: it.certificateNumber,
        itemPhotoUrl: it.itemPhotoUrl,
        displayOrder: idx,
      };
    });

    const gstAmount = Math.max(Number(dto.gstAmount) || 0, 0);
    const otherCharges = Math.max(Number(dto.otherCharges) || 0, 0);
    const discount = Math.max(Number(dto.discount) || 0, 0);
    // Old gold comes either as trade-in rows naming gold already weighed in at
    // the counter (JEX-…, checked by the shared sales service), or as grams on
    // this bill (older screens), which are recorded here after the bill.
    const tradeRows = (dto.payments ?? []).filter((p) => p.method === 'TRADE_IN' && Number(p.amount) > 0);
    const taken = await this.counterGold(user.tenantId, tradeRows.map((p) => String(p.reference ?? '').trim()));
    if (taken.length && (Number(dto.exchangeMetalGrams) > 0 || Number(dto.exchangeValue) > 0)) {
      throw new BadRequestException('Purana sona ya trade-in se lein ya wazan likh kar — dono ek saath nahi');
    }
    const exchangeGrams = taken.length
      ? Math.round(taken.reduce((g, e) => g + (e.netWeight ?? e.grossWeight), 0) * 1000) / 1000
      : Math.max(Number(dto.exchangeMetalGrams) || 0, 0);
    const exchangePurity = taken.length ? (taken[0].testedPurity ?? taken[0].claimedPurity) : dto.exchangeMetalPurity;
    if (!taken.length && exchangeGrams > 0 && !exchangePurity) throw new BadRequestException('Purane sone ka karat chunein');
    const exchangeValue = taken.length
      ? r2(tradeRows.reduce((v, p) => v + Number(p.amount), 0))
      : dto.exchangeValue != null
        ? Math.max(Number(dto.exchangeValue) || 0, 0)
        : this.oldGoldValue(buyMap, exchangeGrams, exchangePurity, dto.exchangeDeductionPct);
    if (exchangeValue > 0 && !(exchangeGrams > 0)) throw new BadRequestException('Purane sone ka wazan likhein');

    const subtotal = r2(enrichedItems.reduce((s, i) => s + i.itemTotal, 0));
    // What the customer still pays after the old gold (kept on the jewelry bill).
    const total = r2(Math.max(subtotal + gstAmount + otherCharges - discount - exchangeValue, 0));

    // Money parts of a split payment; old gold is never taken from the client here.
    const parts = (dto.payments ?? []).filter((p) => p.method !== 'TRADE_IN' && Number(p.amount) > 0)
      .map((p) => ({ method: p.method, amount: r2(Number(p.amount)), reference: p.reference, note: p.note }));
    const paidAmount = parts.length
      ? r2(parts.reduce((sum, p) => sum + p.amount, 0))
      : Math.max(Number(dto.paidAmount) || 0, 0);
    if (paidAmount < total - 0.005 && !dto.customerId) {
      throw new BadRequestException('Baqi amount (udhaar) ke liye customer chunein');
    }
    const paymentMethod = parts.length
      ? parts.reduce((a, b) => (b.amount > a.amount ? b : a)).method
      : METHOD[(dto.paymentMethod || 'CASH').toUpperCase()];
    if (!paymentMethod) throw new BadRequestException('Payment ka tareeqa ghalat hai');

    // Catalog pieces become bill lines; hand-typed pieces (not in the catalog)
    // go on the same bill as charges so the totals match.
    const catalogLines = enrichedItems.filter((i) => i.productId);
    if (!catalogLines.length) {
      throw new BadRequestException('Kam az kam ek item catalog se chunein (stock usi se kam hota hai)');
    }
    const customLines = enrichedItems.filter((i) => !i.productId);
    const describe = (i: (typeof enrichedItems)[number]) => [
      `${KARAT_LABEL(i.purity)} ${i.netWeight.toFixed(3)}g @ Rs ${Math.round(i.ratePerGram).toLocaleString('en-PK')}/g`,
      i.makingTotal ? `banwai Rs ${Math.round(i.makingTotal).toLocaleString('en-PK')}` : '',
      i.wastageValue ? `wastage Rs ${Math.round(i.wastageValue).toLocaleString('en-PK')}` : '',
      i.hallmarkNumber ? `hallmark ${i.hallmarkNumber}` : '',
    ].filter(Boolean).join(' · ');

    const serviceCharges = [
      ...customLines.map((i) => ({ type: 'CUSTOM', label: `${i.productName} (${describe(i)})`, amount: i.itemTotal })),
      ...(gstAmount > 0 ? [{ type: 'OTHER', label: 'GST', amount: gstAmount }] : []),
      ...(otherCharges > 0 ? [{ type: 'OTHER', label: 'Deegar charges', amount: otherCharges }] : []),
    ];
    const exchangePurityLabel = exchangePurity ? ` ${KARAT_LABEL(exchangePurity)}` : '';
    const oldGold = `Purana sona${exchangeGrams ? ` ${exchangeGrams.toFixed(3)}g` : ''}${exchangePurityLabel}`;

    // Old gold is part of the payment (TRADE_IN), not a discount: the bill
    // keeps its full value, so profit is right and the discount rules stay out.
    const payments = [
      ...(parts.length ? parts : paidAmount > 0 ? [{ method: paymentMethod, amount: paidAmount }] : []),
      ...(taken.length
        ? tradeRows.map((p) => ({ method: 'TRADE_IN' as const, amount: r2(Number(p.amount)), reference: String(p.reference).trim(), note: p.note }))
        : exchangeValue > 0 ? [{ method: 'TRADE_IN' as const, amount: exchangeValue, note: oldGold }] : []),
    ];
    const core: any = await this.coreSales.create(user, scope, {
      shopId: dto.shopId,
      customerId: dto.customerId,
      paymentMethod,
      paidAmount: r2(paidAmount + exchangeValue),
      payments: payments.length ? payments : undefined,
      discount: discount || undefined,
      managerPin: dto.managerPin,
      note: dto.customerNotes || undefined,
      items: catalogLines.map((i) => ({
        productId: i.productId!,
        quantity: i.quantity,
        priceOverride: i.unitTotal,
        note: describe(i),
      })),
      serviceCharges: serviceCharges.length ? serviceCharges : undefined,
    } as any, undefined, { tradeInChecked: !taken.length });

    let jewelrySale;
    try {
      jewelrySale = await this.prisma.$transaction(async (tx) => {
        const row = await tx.jewelrySale.create({
          data: {
            tenantId: user.tenantId,
            shopId: core.shopId,
            invoiceNumber: core.saleNumber,
            customerId: dto.customerId,
            customerName: dto.customerName || core.customer?.name,
            customerPhone: dto.customerPhone || core.customer?.phone,
            customerCnic: dto.customerCnic,
            customerAddress: dto.customerAddress,
            metalRateSnapshot: ratesMap,
            grossWeight: totalGrossWeight,
            netWeight: totalNetWeight,
            metalValue: r2(totalMetalValue),
            makingCharges: r2(totalMakingCharges),
            wastageValue: r2(totalWastageValue),
            polishCharges: totalPolishCharges,
            hallmarkCharges: totalHallmarkCharges,
            stoneValue: totalStoneValue,
            gstAmount,
            otherCharges,
            subtotal,
            discount,
            total,
            paidAmount: r2(Math.min(paidAmount, total)),
            paymentStatus: paidAmount >= total - 0.005 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
            paymentMethod,
            exchangeMetalGrams: exchangeGrams,
            exchangeMetalPurity: exchangePurity,
            exchangeValue,
            exchangeType: dto.exchangeType ?? (exchangeValue > 0 ? 'OLD_GOLD_EXCHANGE' : undefined),
            hallmarkVerified: dto.hallmarkVerified ?? false,
            hasCertificate: dto.hasCertificate ?? false,
            customerNotes: dto.customerNotes,
            internalNotes: dto.internalNotes,
            createdById: user.id,
            items: { create: enrichedItems.map(({ unitTotal: _u, ...rest }) => rest) },
          },
          include: { items: true },
        });
        if (taken.length) {
          // Gold weighed in at the counter now belongs to this bill.
          const ids = taken.map((e) => e.id);
          const linked = await tx.jewelryExchange.updateMany({ where: { id: { in: ids }, saleId: null, purpose: 'SALE' }, data: { saleId: row.id } });
          if (linked.count !== ids.length) throw new BadRequestException('Purana sona kisi aur bill par lag chuka hai');
          await tx.jewelryMetalStock.updateMany({ where: { tenantId: user.tenantId, exchangeId: { in: ids }, entryType: 'EXCHANGE_IN' }, data: { saleId: row.id } });
        } else if (exchangeGrams > 0 || exchangeValue > 0) {
          await this.recordOldGold(tx, user, row.id, core.saleNumber, dto, exchangeGrams, exchangeValue, buyMap);
        }
        return row;
      }, { timeout: 30_000 });
    } catch (err) {
      // Keep the books clean: without the jewelry row the bill is undone.
      await this.coreSales.voidSale(user, scope, core.id, 'Jewelry bill save nahi hua').catch(() => undefined);
      throw err;
    }

    return { ...jewelrySale, saleId: core.id, saleNumber: core.saleNumber };
  }

  /** Old gold at today's buying rate (or selling rate) for its karat, less the kaat percent. */
  private oldGoldValue(rates: Record<string, number>, grams: number, purity?: JewelryPurity, deductionPct?: number) {
    if (!(grams > 0) || !purity) return 0;
    const rate = rates[`${metalTypeForPurity(purity)}_${purity}`] ?? 0;
    if (!(rate > 0)) throw new BadRequestException('Is karat ka aaj ka rate set nahi — Metal rates me rate likhein ya purane sone ki qeemat khud likhein');
    return r2(grams * rate * (1 - Math.min(Math.max(Number(deductionPct) || 0, 0), 50) / 100));
  }

  /** Old gold weighed in at the counter for a bill (JEX-…, not yet on a bill), in the order the rows name it. */
  private async counterGold(tenantId: string, codes: string[]) {
    if (!codes.length) return [];
    if (codes.some((c) => !/^JEX-/i.test(c))) throw new BadRequestException('Trade-in ke liye counter par tola gaya purana sona chunein');
    const rows = await this.prisma.jewelryExchange.findMany({
      where: { tenantId, exchangeNumber: { in: codes, mode: 'insensitive' }, purpose: 'SALE', saleId: null },
      select: { id: true, exchangeNumber: true, netWeight: true, grossWeight: true, testedPurity: true, claimedPurity: true },
    });
    const missing = codes.find((c) => !rows.some((r) => r.exchangeNumber.toUpperCase() === c.toUpperCase()));
    if (missing) throw new BadRequestException(`Purana sona ${missing} nahi mila ya pehle hi kisi bill par lag chuka hai`);
    return codes.map((c) => rows.find((r) => r.exchangeNumber.toUpperCase() === c.toUpperCase())!);
  }

  /** Old gold taken in on a bill: an exchange record plus metal stock in. */
  private async recordOldGold(
    tx: Prisma.TransactionClient, user: AuthenticatedUser, jewelrySaleId: string, saleNumber: string,
    dto: CreateJewelrySaleDto, grams: number, value: number, rates: Record<string, number>,
  ) {
    const purity: JewelryPurity = dto.exchangeMetalPurity ?? 'OTHER';
    const metalType = metalTypeForPurity(dto.exchangeMetalPurity);
    const fine = grams * (PURITY_FACTOR[purity] ?? 1);
    const fullValue = r2(grams * (rates[`${metalType}_${purity}`] ?? 0));
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-exchange-no:${user.tenantId}`}))::text`;
    const count = await tx.jewelryExchange.count({ where: { tenantId: user.tenantId } });
    const exchange = await tx.jewelryExchange.create({
      data: {
        tenantId: user.tenantId,
        exchangeNumber: 'JEX-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0'),
        exchangeType: dto.exchangeType ?? (metalType === 'SILVER' ? 'OLD_SILVER_EXCHANGE' : 'OLD_GOLD_EXCHANGE'),
        customerId: dto.customerId,
        customerName: dto.customerName || 'Walk-in',
        customerPhone: dto.customerPhone || '',
        customerCnic: dto.customerCnic,
        itemDescription: `Bill ${saleNumber} par liya gaya purana zewar`,
        metalType,
        claimedPurity: purity,
        testedPurity: purity,
        grossWeight: grams,
        netWeight: grams,
        fineGoldEquivalent: fine,
        ratePerGram: grams > 0 ? r2(value / grams) : 0,
        grossValue: Math.max(fullValue, value),
        deductions: r2(Math.max(fullValue - value, 0)),
        netValue: value,
        saleId: jewelrySaleId,
        purpose: 'SALE',
        createdById: user.id,
      },
    });
    if (grams > 0 && dto.exchangeMetalPurity) {
      await postMetalEntry(tx, user.tenantId, user.id, {
        entryType: 'EXCHANGE_IN', metalType, purity, grams,
        ratePerGram: r2(value / grams), reference: saleNumber,
        source: dto.customerName || 'Customer', saleId: jewelrySaleId, exchangeId: exchange.id,
        notes: 'Bill par purana zewar liya',
      });
    }
  }

  /** Bill number → shared sale (id, status), for linking and status sync. */
  private async coreSalesFor(tenantId: string, numbers: string[]) {
    if (!numbers.length) return new Map<string, { id: string; status: string }>();
    const rows = await this.prisma.sale.findMany({
      where: { tenantId, saleNumber: { in: numbers } },
      select: { id: true, saleNumber: true, status: true },
    });
    return new Map(rows.map((r) => [r.saleNumber, { id: r.id, status: String(r.status) }]));
  }

  private withCore<T extends { invoiceNumber: string; status: any }>(s: T, core?: { id: string; status: string }) {
    if (!core) return { ...s, saleId: null as string | null };
    return { ...s, saleId: core.id, status: core.status === 'VOIDED' ? 'CANCELLED' : s.status };
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string; numbers?: string[] }) {
    const rows = await this.prisma.jewelrySale.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.numbers?.length && { invoiceNumber: { in: params.numbers.slice(0, 200) } }),
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to ? {
          saleDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { customerCnic: { contains: params.search } },
          ],
        }),
      },
      include: { items: true },
      orderBy: { saleDate: 'desc' },
      take: 200,
    });
    const cores = await this.coreSalesFor(user.tenantId, rows.map((r) => r.invoiceNumber));
    return rows.map((r) => this.withCore(r, cores.get(r.invoiceNumber)));
  }

  /** Accepts the jewelry bill id or the shared sale id (receipts open either). */
  async getOne(user: AuthenticatedUser, id: string) {
    let s = await this.prisma.jewelrySale.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!s) {
      const core = await this.prisma.sale.findFirst({ where: { id, tenantId: user.tenantId }, select: { saleNumber: true } });
      if (core) {
        s = await this.prisma.jewelrySale.findFirst({
          where: { tenantId: user.tenantId, invoiceNumber: core.saleNumber },
          include: { items: true },
        });
      }
    }
    if (!s) throw new NotFoundException('Sale not found');
    const cores = await this.coreSalesFor(user.tenantId, [s.invoiceNumber]);
    return this.withCore(s, cores.get(s.invoiceNumber));
  }

  private async own(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.jewelrySale.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Sale not found');
    const core = (await this.coreSalesFor(user.tenantId, [s.invoiceNumber])).get(s.invoiceNumber);
    return { s, core };
  }

  /** Cancelling a bill cancels the shared sale too: stock and khata come back. */
  private async voidCore(user: AuthenticatedUser, scope: ShopScope, core: { id: string; status: string } | undefined, reason?: string, managerPin?: string) {
    if (core && core.status !== 'VOIDED') {
      await this.coreSales.voidSale(user, scope, core.id, reason, managerPin);
    }
  }

  /**
   * Marks a jewelry bill cancelled once its shared sale is void, and takes
   * the old gold taken on it back out of metal stock (it goes back to the
   * customer). Safe to call more than once and from parallel paths.
   */
  private async settleCancelled(tenantId: string, userId: string | null, id: string, reason?: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-void:${id}`}))::text`;
      const s = await tx.jewelrySale.findFirst({ where: { id, tenantId } });
      if (!s) return;
      // Each karat of old gold that came in on the bill and has not gone back yet.
      const moves = await tx.jewelryMetalStock.groupBy({
        by: ['entryType', 'metalType', 'purity'],
        where: { tenantId, saleId: s.id, entryType: { in: ['EXCHANGE_IN', 'ADJUSTMENT'] } },
        _sum: { grams: true, totalValue: true },
      });
      for (const m of moves.filter((x) => x.entryType === 'EXCHANGE_IN')) {
        const back = moves.find((x) => x.entryType === 'ADJUSTMENT' && x.metalType === m.metalType && x.purity === m.purity)?._sum.grams ?? 0;
        const grams = Math.round(((m._sum.grams ?? 0) - back) * 1000) / 1000;
        if (!(grams > 0.0005)) continue;
        await postMetalEntry(tx, tenantId, userId ?? s.createdById, {
          entryType: 'ADJUSTMENT', metalType: m.metalType, purity: m.purity, grams,
          ratePerGram: m._sum.grams ? r2((m._sum.totalValue ?? 0) / m._sum.grams) : null,
          reference: s.invoiceNumber, source: s.customerName || 'Customer', saleId: s.id,
          notes: 'Bill cancel: purana zewar customer ko wapas',
        });
      }
      await tx.jewelryExchange.updateMany({ where: { tenantId, saleId: s.id, purpose: 'SALE' }, data: { purpose: 'RETURNED' } });
      if (s.status !== 'CANCELLED') {
        await tx.jewelrySale.update({
          where: { id: s.id },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: s.cancellationReason ?? reason },
        });
      }
    }, { timeout: 30_000 });
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateSaleStatusDto) {
    const { s, core } = await this.own(user, id);
    const patch: any = { status: dto.status };
    if (dto.status === 'CANCELLED') {
      await this.voidCore(user, scope, core, dto.cancellationReason, dto.managerPin);
      await this.settleCancelled(user.tenantId, user.id, s.id, dto.cancellationReason);
      return this.prisma.jewelrySale.findFirstOrThrow({ where: { id }, include: { items: true } });
    } else if (s.status === 'CANCELLED' || core?.status === 'VOIDED') {
      throw new BadRequestException('Cancel hua bill dobara khol nahi sakte, naya bill banayein');
    }
    return this.prisma.jewelrySale.update({ where: { id }, data: patch, include: { items: true } });
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const { s, core } = await this.own(user, id);
    if (core) {
      // The balance lives in the customer's khata; collecting it here would
      // leave the khata and the drawer out of step.
      throw new BadRequestException('Baqi amount customer ke Khata se wasool karein');
    }
    const newPaid = s.paidAmount + Number(dto.amount);
    let paymentStatus = 'PARTIALLY_PAID';
    if (newPaid >= s.total) paymentStatus = 'PAID';
    if (newPaid <= 0) paymentStatus = 'UNPAID';
    return this.prisma.jewelrySale.update({
      where: { id },
      data: { paidAmount: newPaid, paymentStatus, paymentMethod: dto.paymentMethod ?? s.paymentMethod },
      include: { items: true },
    });
  }

  async markReturned(user: AuthenticatedUser, scope: ShopScope, id: string, reason: string, managerPin?: string) {
    const { s, core } = await this.own(user, id);
    if (s.isReturned || s.status === 'CANCELLED') throw new BadRequestException('Yeh bill pehle hi wapas / cancel ho chuka hai');
    await this.voidCore(user, scope, core, reason || 'Wapsi', managerPin);
    await this.settleCancelled(user.tenantId, user.id, s.id, reason || 'Wapsi');
    return this.prisma.jewelrySale.update({
      where: { id },
      data: { isReturned: true, returnedAt: new Date(), returnReason: reason, status: 'CANCELLED' },
      include: { items: true },
    });
  }

  async markExchanged(user: AuthenticatedUser, id: string, exchangeType: string) {
    await this.own(user, id);
    return this.prisma.jewelrySale.update({
      where: { id },
      data: { isExchanged: true, exchangedAt: new Date(), exchangeType: exchangeType as any },
      include: { items: true },
    });
  }
}
