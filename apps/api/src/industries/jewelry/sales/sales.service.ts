/**
 * Jewelry bills. Every bill is also posted as a normal sale through the shared
 * sales service, so stock, the customer's khata, the cash drawer, day book and
 * reports all see it. The jewelry row keeps the weight, karat, rate and making
 * breakdown and carries the same bill number as the shared sale.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JewelryPurity, PaymentMethod } from '@prisma/client';
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
export class SalesService {
  private readonly logger = new Logger('JewelrySales');

  constructor(
    private readonly prisma: PrismaService,
    private readonly coreSales: CoreSalesService,
  ) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateJewelrySaleDto) {
    if (!dto.items?.length) throw new BadRequestException('Kam az kam ek item zaroori hai');

    const rates = await this.prisma.jewelryMetalRate.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    const ratesMap: Record<string, number> = {};
    rates.forEach((r) => { ratesMap[`${r.metalType}_${r.purity}`] = r.ratePerGram; });

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
    const exchangeValue = Math.max(Number(dto.exchangeValue) || 0, 0);
    const exchangeGrams = Math.max(Number(dto.exchangeMetalGrams) || 0, 0);

    const subtotal = r2(enrichedItems.reduce((s, i) => s + i.itemTotal, 0));
    const total = r2(Math.max(subtotal + gstAmount + otherCharges - discount - exchangeValue, 0));

    const paidAmount = Math.max(Number(dto.paidAmount) || 0, 0);
    if (paidAmount < total - 0.005 && !dto.customerId) {
      throw new BadRequestException('Baqi amount (udhaar) ke liye customer chunein');
    }
    const paymentMethod = METHOD[(dto.paymentMethod || 'CASH').toUpperCase()];
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
    const exchangePurityLabel = dto.exchangeMetalPurity ? ` ${KARAT_LABEL(dto.exchangeMetalPurity)}` : '';
    const notes = [
      exchangeValue > 0 ? `Purana sona${exchangeGrams ? ` ${exchangeGrams.toFixed(3)}g` : ''}${exchangePurityLabel}: Rs ${Math.round(exchangeValue).toLocaleString('en-PK')} minus` : '',
      dto.customerNotes || '',
    ].filter(Boolean).join(' · ');

    const core: any = await this.coreSales.create(user, scope, {
      shopId: dto.shopId,
      customerId: dto.customerId,
      paymentMethod,
      paidAmount,
      // The old-gold value lowers the bill the same way a discount does.
      discount: r2(discount + exchangeValue) || undefined,
      managerPin: dto.managerPin,
      note: notes || undefined,
      items: catalogLines.map((i) => ({
        productId: i.productId!,
        quantity: i.quantity,
        priceOverride: i.unitTotal,
        note: describe(i),
      })),
      serviceCharges: serviceCharges.length ? serviceCharges : undefined,
    } as any);

    let jewelrySale;
    try {
      jewelrySale = await this.prisma.jewelrySale.create({
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
          total: Number(core.total ?? total),
          paidAmount: Math.min(paidAmount, Number(core.total ?? total)),
          paymentStatus: paidAmount >= total - 0.005 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          paymentMethod,
          exchangeMetalGrams: exchangeGrams,
          exchangeMetalPurity: dto.exchangeMetalPurity,
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
    } catch (err) {
      // Keep the books clean: without the jewelry row the bill is undone.
      await this.coreSales.voidSale(user, scope, core.id, 'Jewelry bill save nahi hua').catch(() => undefined);
      throw err;
    }

    if (exchangeGrams > 0 || exchangeValue > 0) {
      await this.recordOldGold(user, jewelrySale.id, core.saleNumber, dto, exchangeGrams, exchangeValue)
        .catch((e) => this.logger.warn(`Old gold entry failed for ${core.saleNumber}: ${e?.message}`));
    }

    return { ...jewelrySale, saleId: core.id, saleNumber: core.saleNumber };
  }

  /** Old gold taken in on a bill: an exchange record plus metal stock in. */
  private async recordOldGold(
    user: AuthenticatedUser, jewelrySaleId: string, saleNumber: string,
    dto: CreateJewelrySaleDto, grams: number, value: number,
  ) {
    const purity: JewelryPurity = dto.exchangeMetalPurity ?? 'OTHER';
    const metalType = metalTypeForPurity(dto.exchangeMetalPurity);
    const fine = grams * (PURITY_FACTOR[purity] ?? 1);
    const count = await this.prisma.jewelryExchange.count({ where: { tenantId: user.tenantId } });
    const exchange = await this.prisma.jewelryExchange.create({
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
        grossWeight: grams,
        netWeight: grams,
        fineGoldEquivalent: fine,
        ratePerGram: grams > 0 ? r2(value / grams) : 0,
        grossValue: value,
        netValue: value,
        saleId: jewelrySaleId,
        purpose: 'SALE',
        createdById: user.id,
      },
    });
    if (grams > 0 && dto.exchangeMetalPurity) {
      await postMetalEntry(this.prisma, user.tenantId, user.id, {
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

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    const rows = await this.prisma.jewelrySale.findMany({
      where: {
        tenantId: user.tenantId,
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

  /** Old gold taken on a cancelled bill goes back to the customer: take it out of metal stock once. */
  private async giveBackOldGold(user: AuthenticatedUser, s: { id: string; invoiceNumber: string; exchangeMetalGrams: number; exchangeMetalPurity: JewelryPurity | null; exchangeValue: number; customerName: string | null }) {
    if (!(s.exchangeMetalGrams > 0) || !s.exchangeMetalPurity) return;
    const taken = await this.prisma.jewelryMetalStock.findFirst({
      where: { tenantId: user.tenantId, saleId: s.id, entryType: 'EXCHANGE_IN' }, select: { id: true },
    });
    const done = await this.prisma.jewelryMetalStock.findFirst({
      where: { tenantId: user.tenantId, saleId: s.id, entryType: 'ADJUSTMENT' }, select: { id: true },
    });
    if (!taken || done) return;
    await postMetalEntry(this.prisma, user.tenantId, user.id, {
      entryType: 'ADJUSTMENT',
      metalType: metalTypeForPurity(s.exchangeMetalPurity),
      purity: s.exchangeMetalPurity,
      grams: s.exchangeMetalGrams,
      ratePerGram: r2(s.exchangeValue / s.exchangeMetalGrams),
      reference: s.invoiceNumber,
      source: s.customerName || 'Customer',
      saleId: s.id,
      notes: 'Bill cancel: purana zewar customer ko wapas',
    }).catch((e) => this.logger.warn(`Old gold give-back failed for ${s.invoiceNumber}: ${e?.message}`));
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateSaleStatusDto) {
    const { s, core } = await this.own(user, id);
    const patch: any = { status: dto.status };
    if (dto.status === 'CANCELLED') {
      await this.voidCore(user, scope, core, dto.cancellationReason, dto.managerPin);
      await this.giveBackOldGold(user, s);
      patch.cancelledAt = new Date();
      patch.cancellationReason = dto.cancellationReason;
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
    await this.giveBackOldGold(user, s);
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
