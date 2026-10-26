import { addCartNeed, claimShopStock } from './stock-claim.helper';
import { priceCutTotal } from './price-cut.helper';
import { isPriceTier, tierPrice, type PriceTier } from '../../../common/helpers/price-tier.helper';
import { normalizePosCounter } from '../../organization/settings/constants/settings.constants';
import { tidyCustomerBalance } from '../returns/returns.helpers';
import {
  CARPET_SALE_NOTE, hasCarpetNote, isCarpetBusiness, isCarpetLine, productsSoldWithoutStock, productsThatTookStock,
} from './carpet-line.helper';
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { addMonths, startOfDay, startOfMonth } from 'date-fns';
import { SaleSource, TenantSettings } from '@prisma/client';
import { PIN_NEEDS, requireManagerPin } from '../../../common/helpers/manager-pin.helper';
import { PaymentPart, saveSalePayments, splitTender } from '../../../common/helpers/sale-payments.helper';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  ShopScope, applyStockDelta, isServiceProduct, putIntoBatches, readShopStock, recordSaleBatches, resolveWriteShopId,
  takeFromBatches,
} from '../../../common/shop-scope';
import { CreateSaleDto } from './dto/create-sale.dto';
import { DiscountsService } from '../discounts/discounts.service';
import { hasPermission, PERMISSIONS } from '../../../common/constants/permissions.constants';
import { FbrService } from '../../../integrations/fbr/fbr.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Sale kahan se aayi. Sirf server ke andar se set hota hai (online order
 * accept karte waqt) — DTO me nahi, taake koi client apni sale ko
 * "WEBSITE" na likh sake.
 */
export interface SaleOrigin {
  source: SaleSource;
  /** Online order ka number, jaise "#1042" */
  sourceRef?: string | null;
}

/** Number or zero, for optional numeric columns. */
const n0 = (v: unknown) => Number(v ?? 0);
/** Rupees to 2 decimals, so stored money carries no float noise. */
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** A line's price tier: `priceTier`, or WHOLESALE for older clients that send `useWholesale`. */
const tierOfItem = (item: { priceTier?: string; useWholesale?: boolean }): PriceTier | null =>
  isPriceTier(item.priceTier) ? item.priceTier : item.useWholesale ? 'WHOLESALE' : null;

/** Runs after a void commits; an industry that keeps its own records for a bill settles them here. */
type VoidListener = (tenantId: string, saleId: string) => Promise<unknown>;

@Injectable()
export class SalesService {
  private readonly voidListeners: VoidListener[] = [];

  /** Industry flows register here to react to a committed void. Errors never fail the void. */
  onVoid(fn: VoidListener) {
    this.voidListeners.push(fn);
  }

  constructor(private readonly prisma: PrismaService,
    private readonly discounts: DiscountsService,
    private readonly notifications: NotificationsService,
    private readonly fbr: FbrService,
  ) {}

  async create(
    user: AuthenticatedUser,
    scope: ShopScope,
    dto: CreateSaleDto,
    origin?: SaleOrigin,
    /**
     * `counter`: the request came from a till (POST /sales), not an industry flow.
     * `tradeInChecked`: the caller already accounted for its trade-in parts
     * (jewelry old gold), so they need no used phone behind them.
     * `unitCosts`: cost per base unit for the item at the same index, used
     * instead of the product's cost (a dish plus its add-on ingredients).
     * Server callers only; never read from the request body.
     */
    opts: { counter?: boolean; tradeInChecked?: boolean; unitCosts?: Array<number | null | undefined> } = {},
  ) {
    // A sale happens at exactly one counter. The body may name the branch
    // (offline queue replays carry it); otherwise use the one being viewed.
    const sellingShopId = await resolveWriteShopId(
      this.prisma,
      user.tenantId,
      scope,
      dto.shopId,
    );
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    const allowNegativeStock = !!settings?.allowNegativeStock;

    // ─── Validate every item has EITHER productId OR usedPhoneId ──
    for (const item of dto.items) {
      if (!item.productId && !item.usedPhoneId) {
        throw new BadRequestException('Har item ke liye productId ya usedPhoneId zaroori hai');
      }
      if (item.productId && item.usedPhoneId) {
        throw new BadRequestException('Ek item me productId aur usedPhoneId dono nahi ho sakte');
      }
    }

    // ─── Validate shop ────────────────────────────────────────
    const shop = await this.prisma.shop.findFirst({
      where: { id: sellingShopId, tenantId: user.tenantId, isActive: true },
    });
    if (!shop) throw new NotFoundException('Shop not found or inactive');

    const productItems = dto.items.filter((i) => !!i.productId);
    const usedPhoneItems = dto.items.filter((i) => !!i.usedPhoneId);

    const productIds = [...new Set(productItems.map((i) => i.productId as string))];
    const variantIds = [
      ...new Set(productItems.map((i) => i.variantId).filter(Boolean) as string[]),
    ];
    const imeiIds = [
      ...new Set(productItems.map((i) => i.imeiId).filter(Boolean) as string[]),
    ];
    const usedPhoneIds = [
      ...new Set(usedPhoneItems.map((i) => i.usedPhoneId as string)),
    ];
    // Electronics: serial/IMEI se track hone wale units (laptop, TV, camera…)
    const serialIds = [
      ...new Set(productItems.map((i) => i.serialId).filter(Boolean) as string[]),
    ];

    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: {
            tenantId: user.tenantId,
            id: { in: productIds },
            isActive: true,
          },
        })
      : [];
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: {
            id: { in: variantIds },
            isActive: true,
            product: { tenantId: user.tenantId, isActive: true },
          },
        })
      : [];
    if (variants.length !== variantIds.length) {
      throw new NotFoundException('One or more variants not found');
    }

    // ─── Validate new-phone IMEIs ─────────────────────────────
    const imeis = imeiIds.length
      ? await this.prisma.productImei.findMany({
          where: {
            id: { in: imeiIds },
            tenantId: user.tenantId,
          },
        })
      : [];
    if (imeis.length !== imeiIds.length) {
      throw new NotFoundException('One or more IMEIs not found');
    }
    const unavailableImei = imeis.find((i) => i.status !== 'IN_STOCK');
    if (unavailableImei) {
      throw new BadRequestException(
        `IMEI ${unavailableImei.imei1} is ${unavailableImei.status} — cannot sell`,
      );
    }
    const imeiDupCheck = new Set<string>();
    for (const id of imeiIds) {
      if (imeiDupCheck.has(id)) throw new BadRequestException('Duplicate IMEI in cart');
      imeiDupCheck.add(id);
    }
    // The phone must be this line's product and variant, and sit in the selling branch;
    // otherwise the bill takes the wrong price and cost and both stocks drift.
    const imeiById = new Map(imeis.map((i) => [i.id, i]));
    for (const item of productItems) {
      if (!item.imeiId) continue;
      const im = imeiById.get(item.imeiId)!;
      if (im.productId !== item.productId || (im.variantId ?? null) !== (item.variantId ?? null)) {
        throw new BadRequestException(`IMEI ${im.imei1} is product/variant ka nahi`);
      }
      if (im.shopId && im.shopId !== sellingShopId) {
        throw new BadRequestException(`IMEI ${im.imei1} doosri shop me hai — pehle transfer karein`);
      }
    }

    // ─── Validate electronics serials ─────────────────────────
    const serials = serialIds.length
      ? await this.prisma.electronicsSerialTracking.findMany({
          where: { id: { in: serialIds }, tenantId: user.tenantId },
        })
      : [];
    if (serials.length !== serialIds.length) {
      throw new NotFoundException('Ek ya zyada serial nahi mile');
    }
    const unavailableSerial = serials.find((sr) => sr.status !== 'IN_STOCK');
    if (unavailableSerial) {
      throw new BadRequestException(
        `Serial ${unavailableSerial.serialNumber} is ${unavailableSerial.status} — bech nahi sakte`,
      );
    }
    const serialDupCheck = new Set<string>();
    for (const id of serialIds) {
      if (serialDupCheck.has(id)) throw new BadRequestException('Ek hi serial cart me do dafa hai');
      serialDupCheck.add(id);
    }
    // Same rule for serial units: the line's product, and in the selling branch.
    const serialById = new Map(serials.map((sr) => [sr.id, sr]));
    for (const item of productItems) {
      if (!item.serialId) continue;
      const sr = serialById.get(item.serialId)!;
      if (sr.productId !== item.productId) {
        throw new BadRequestException(`Serial ${sr.serialNumber} is product ka nahi`);
      }
      if (sr.shopId && sr.shopId !== sellingShopId) {
        throw new BadRequestException(`Serial ${sr.serialNumber} doosri shop me hai — pehle transfer karein`);
      }
    }
    // Warranty months of the serial products, for the unit's warranty dates.
    const serialProductIds = [...new Set(serials.map((sr) => sr.productId))];
    const warrantyMonthsByProduct = new Map(
      (serialProductIds.length
        ? await this.prisma.electronicsProductProfile.findMany({
            where: { tenantId: user.tenantId, productId: { in: serialProductIds } },
            select: { productId: true, warrantyMonths: true },
          })
        : []
      ).map((p) => [p.productId, Number(p.warrantyMonths) || 0]),
    );

    // ─── Validate used phones ───────────────────────────────────
    const usedPhones = usedPhoneIds.length
      ? await this.prisma.usedPhone.findMany({
          where: {
            id: { in: usedPhoneIds },
            tenantId: user.tenantId,
          },
        })
      : [];
    if (usedPhones.length !== usedPhoneIds.length) {
      throw new NotFoundException('One or more used phones not found');
    }
    const unavailableUsedPhone = usedPhones.find((p) => p.status !== 'IN_STOCK');
    if (unavailableUsedPhone) {
      throw new BadRequestException(
        `${unavailableUsedPhone.brand} ${unavailableUsedPhone.model} (${unavailableUsedPhone.usedPhoneCode}) is ${unavailableUsedPhone.status} — cannot sell`,
      );
    }
    const usedPhoneDupCheck = new Set<string>();
    for (const id of usedPhoneIds) {
      if (usedPhoneDupCheck.has(id)) throw new BadRequestException('Duplicate used phone in cart');
      usedPhoneDupCheck.add(id);
    }

    // A batch named on a line must be this item's batch in the selling branch.
    const batchIds = [...new Set(productItems.map((i) => i.batchId).filter(Boolean) as string[])];
    if (batchIds.length) {
      const found = await this.prisma.productBatch.findMany({
        where: { id: { in: batchIds }, tenantId: user.tenantId, shopId: sellingShopId },
        select: { id: true, productId: true, variantId: true },
      });
      const byId = new Map(found.map((b) => [b.id, b]));
      for (const item of productItems) {
        if (!item.batchId) continue;
        const b = byId.get(item.batchId);
        if (!b || b.productId !== item.productId || (b.variantId ?? null) !== (item.variantId ?? null)) {
          throw new BadRequestException('Chuna hua Batch is item ka nahi ya is shop me nahi hai');
        }
      }
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const imeiMap = new Map(imeis.map((i) => [i.id, i]));
    const usedPhoneMap = new Map(usedPhones.map((p) => [p.id, p]));
    const serialMap = new Map(serials.map((sr) => [sr.id, sr]));

    // ─── Detect carpet items ─────────────────────────────────
    // Only roll cuts, cut pieces and area-unit goods in a carpet shop skip
    // shelf stock; tiles and other sqft goods elsewhere are normal stock.
    const tenantRow = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { businessType: true },
    });
    const carpetShop = isCarpetBusiness(tenantRow?.businessType);
    const carpetItemIndices = new Set<number>();
    dto.items.forEach((item, idx) => {
      if (!item.productId) return;
      const product = productMap.get(item.productId);
      if (isCarpetLine(item.note, product?.unit, carpetShop)) carpetItemIndices.add(idx);
    });

    // ─── IMEI + used-phone items: skip ShopStock check ────────
    const imeiItemIndices = new Set<number>();
    const usedPhoneItemIndices = new Set<number>();
    // Serial wale items ka stock aam tareeqe se ghatta hai (IMEI se alag) —
    // yahan sirf ye yaad rakhna hai ke kaunsi line par kaunsa unit gaya.
    const serialItemIndices = new Set<number>();
    dto.items.forEach((item, idx) => {
      if (item.imeiId) imeiItemIndices.add(idx);
      if (item.usedPhoneId) usedPhoneItemIndices.add(idx);
      if (item.serialId) serialItemIndices.add(idx);
    });

    // ─── Fetch shop stock for standard items only ────────────
    const standardItems = dto.items.filter(
      (item, idx) =>
        !carpetItemIndices.has(idx) &&
        !imeiItemIndices.has(idx) &&
        !usedPhoneItemIndices.has(idx) &&
        !!item.productId,
    );
    const shopStocks = standardItems.length > 0
      ? await this.prisma.shopStock.findMany({
          where: {
            shopId: sellingShopId,
            OR: standardItems.map((i) => ({
              productId: i.productId as string,
              variantId: i.variantId ?? null,
            })),
          },
        })
      : [];
    const stockMap = new Map(
      shopStocks.map((s) => [`${s.productId}:${s.variantId ?? 'null'}`, s]),
    );

    let subtotal = 0;
    let costOfGoods = 0;
    let totalLineDiscount = 0;
    // Ek hi product cart me kai lines me ho to sab jor kar stock se milao
    // (4 + 4 alag lines 5 stock par dono "pass" ho kar -3 kar deti thin)
    const wantByKey = new Map<string, number>();

    const normalizedItems = dto.items.map((item, idx) => {
      const isUsedPhoneItem = usedPhoneItemIndices.has(idx);
      const usedPhone = isUsedPhoneItem ? usedPhoneMap.get(item.usedPhoneId as string)! : null;

      const product = item.productId ? productMap.get(item.productId) : undefined;
      const variant = item.variantId ? variantMap.get(item.variantId) : null;
      const imei = item.imeiId ? imeiMap.get(item.imeiId) : null;

      const itemName = usedPhone
        ? `${usedPhone.brand} ${usedPhone.model} (${usedPhone.usedPhoneCode})`
        : variant
          ? `${product!.name} (${variant.name})`
          : product!.name;

      // ─── Resolve unit price ─────────────────────────────────
      const lineTier = tierOfItem(item);
      let unitPrice: number;
      if (item.priceOverride !== undefined && item.priceOverride !== null) {
        unitPrice = item.priceOverride;
      } else if (isUsedPhoneItem) {
        unitPrice = Number(usedPhone!.resalePrice) || 0;
      } else if (lineTier === 'WHOLESALE') {
        unitPrice = (variant?.wholesalePrice ?? product!.wholesalePrice ?? variant?.price ?? product!.price);
      } else if (lineTier === 'CREDIT') {
        unitPrice = (variant?.creditPrice ?? product!.creditPrice ?? variant?.price ?? product!.price);
      } else {
        unitPrice = variant?.price ?? product!.price;
      }

      // Cost: trusted caller's figure > IMEI cost > used-phone total cost > variant/product cost
      const givenCost = opts.unitCosts?.[idx];
      const unitCost = givenCost != null && Number.isFinite(givenCost) && givenCost >= 0
        ? givenCost
        : isUsedPhoneItem
          ? Number(usedPhone!.totalCost) || 0
          : imei?.costPrice ?? variant?.costPrice ?? product?.costPrice ?? 0;

      const quantity = Number(item.quantity);

      // ─── IMEI / used-phone / serial: enforce quantity = 1 ──
      if ((item.imeiId || isUsedPhoneItem || item.serialId) && quantity !== 1) {
        throw new BadRequestException(
          `${itemName}: quantity must be = 1`,
        );
      }

      // ─── Stock check (skip for carpet + IMEI + used phone + services) ──
      const isCarpetItem = carpetItemIndices.has(idx);
      const isImeiItem = imeiItemIndices.has(idx);
      // Fees and services (clinic fee, labour) hold no stock.
      const isServiceItem = !!product && isServiceProduct(product);
      let shopStock = null;

      if (!isCarpetItem && !isImeiItem && !isUsedPhoneItem && !isServiceItem) {
        const stockKey = `${item.productId}:${item.variantId ?? 'null'}`;
        shopStock = stockMap.get(stockKey);

        if (!shopStock) {
          throw new BadRequestException(
            `${itemName} is not available in ${shop.name}. Transfer karein ya purchase entry karein.`,
          );
        }

        // Pieces held for customers (garment hold / layaway) are not free to sell.
        const free = Number(shopStock.stock) - Math.max(Number(shopStock.reserved) || 0, 0);
        addCartNeed(wantByKey, stockKey, quantity, allowNegativeStock ? Infinity : free, { item: itemName, shop: shop.name });
      }

      // Money is kept to paisa: a strip at 260 sold as 6 x 43.333 must total 260, not 259.9999998.
      const lineGross = r2(unitPrice * quantity);
      const askedLineDiscount = r2(item.lineDiscount ?? 0);
      if (askedLineDiscount > lineGross + 0.005) {
        throw new BadRequestException(`Line discount cannot exceed line total for ${itemName}`);
      }
      const lineDiscount = Math.min(askedLineDiscount, lineGross);

      const lineTotal = r2(lineGross - lineDiscount);
      const lineCost = unitCost * quantity;

      subtotal += lineGross;
      totalLineDiscount += lineDiscount;
      costOfGoods += lineCost;

      return {
        productId: product?.id ?? null,
        variantId: variant?.id,
        imeiId: imei?.id,
        imeiNumber: imei?.imei1,
        usedPhoneId: usedPhone?.id ?? null,
        serialId: item.serialId ?? null,
        batchId: item.batchId ?? null,
        shopStockId: shopStock?.id ?? null,
        isCarpetItem,
        isServiceItem,
        isImeiItem,
        isUsedPhoneItem,
        quantity,
        price: unitPrice,
        costPrice: unitCost,
        lineDiscount,
        total: lineTotal,
        note: item.note,
        internalNote: item.internalNote,
        // Product lines always carry a tier; used phones have none.
        priceTier: product ? (lineTier ?? 'RETAIL') : null,
        retailPrice: null as number | null,
      };
    });
    subtotal = r2(subtotal);

    // ─── Price tiers ─────────────────────────────────────────
    const tierSetup = normalizePosCounter((settings?.receiptConfig as Record<string, unknown> | null)?.posCounter);
    await this.fillRetailPrices(user.tenantId, normalizedItems, productMap, variantMap);
    totalLineDiscount = r2(totalLineDiscount);

    // ─── Discount code ────────────────────────────────────────
    let discount = r2((dto.discount ?? 0) + totalLineDiscount);
    let discountCodeId: string | undefined;
    let discountCodeStr: string | undefined;

    let codeDiscount = 0;
    if (dto.discountCode) {
      const validated = await this.discounts.validate(
        user, dto.discountCode, subtotal - totalLineDiscount,
        { shopId: sellingShopId, customerId: dto.customerId },
      );
      codeDiscount = r2(validated.discount);
      discount = r2(discount + codeDiscount);
      discountCodeId = validated.id;
      discountCodeStr = validated.code;
    }

    // ─── Loyalty ──────────────────────────────────────────────
    let loyaltyDiscount = 0;
    let loyaltyPointsUsed = 0;

    if (dto.loyaltyPointsToUse && dto.loyaltyPointsToUse > 0 && dto.customerId && settings?.enableLoyalty) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: user.tenantId },
      });
      if (!customer) throw new NotFoundException('Customer not found');
      if (dto.loyaltyPointsToUse > customer.loyaltyPoints) {
        throw new BadRequestException(`Itne points nahi hain (sirf ${customer.loyaltyPoints})`);
      }
      if (settings.loyaltyMinRedeem > 0 && dto.loyaltyPointsToUse < settings.loyaltyMinRedeem) {
        throw new BadRequestException(`Kam se kam ${settings.loyaltyMinRedeem} points istemal ho sakte hain`);
      }
      // Points may pay at most the configured share of what is left of the bill,
      // and never more than the bill itself.
      const rate = settings.loyaltyRedemptionRate || 1;
      const payable = Math.max(subtotal - discount, 0) * Math.min(100, Math.max(0, settings.loyaltyMaxRedeemPercent ?? 100)) / 100;
      const usable = Math.min(dto.loyaltyPointsToUse, Math.floor(payable / rate));
      loyaltyPointsUsed = Math.max(0, usable);
      loyaltyDiscount = r2(loyaltyPointsUsed * rate);
    }

    const totalDiscount = r2(discount + loyaltyDiscount);

    // ─── Service Charges ────────────────────────────────────
    const allServiceCharges = dto.serviceCharges ?? [];
    // Bahar ka rider apna delivery charge khud leta hai — bill par sirf likha,
    // dukaan ki sale / drawer / munafe me nahi (warna cash register kam dikhta).
    const serviceChargesArr = allServiceCharges.filter((sc: any) => !sc.passThrough);
    const serviceChargesTotal = r2(serviceChargesArr.reduce(
      (sum, sc) => sum + Number(sc.amount || 0),
      0,
    ));

    // Kuch services par dukan ka apna kharcha hota hai (rider ka kiraya
    // waghera). Wo costOfGoods me jurta hai — warna `total - costOfGoods`
    // wali har report delivery charge ko poora munafa gin leti thi.
    const serviceChargesCost = serviceChargesArr.reduce(
      (sum, sc) => sum + Number((sc as any).cost || 0),
      0,
    );

    const total = r2(Math.max(subtotal - totalDiscount + serviceChargesTotal, 0));
    // Amounts handed over are rounded the same way, so a till that sends the
    // unrounded bill total is not left owing a fraction of a paisa.
    const tender = splitTender(total, { parts: dto.payments, method: dto.paymentMethod, paidAmount: r2(dto.paidAmount) });
    tender.paidAmount = r2(tender.paidAmount);
    tender.changeAmount = r2(tender.changeAmount);
    for (const row of tender.rows) row.amount = r2(row.amount);
    if (!opts.tradeInChecked) await this.checkTradeIns(user.tenantId, tender.rows);
    const { paidAmount, changeAmount } = tender;
    const creditAmount = r2(Math.max(total - paidAmount, 0));

    if (creditAmount > 0 && !dto.customerId) {
      throw new BadRequestException('Udhaar sale ke liye customer select karna zaroori hai');
    }
    // Online orders were settled on the platform; the counter rules do not apply.
    if (!origin && settings) {
      // A price typed below the shop's own prices counts toward the discount
      // limit too. Only counter requests: industry flows post their agreed rates.
      const priceCut = opts.counter
        ? await priceCutTotal(this.prisma, user.tenantId, dto.items.flatMap((item, idx) => {
            if (item.priceOverride == null || !item.productId || item.imeiId || hasCarpetNote(item.note)) return [];
            const product = productMap.get(item.productId)!;
            const variant = item.variantId ? variantMap.get(item.variantId) : undefined;
            return [{
              productId: item.productId, variantId: item.variantId ?? null,
              quantity: normalizedItems[idx].quantity, price: Number(item.priceOverride), note: item.note,
              productPrice: Number(product.price) || 0, productWholesale: product.wholesalePrice, productCredit: product.creditPrice,
              variantPrice: variant?.price ?? null, variantWholesale: variant?.wholesalePrice ?? null, variantCredit: variant?.creditPrice ?? null,
              tier: (normalizedItems[idx].priceTier as PriceTier | null) ?? null,
            }];
          }))
        : 0;
      if (opts.counter) await this.checkPriceTiers(user, tierSetup, dto, normalizedItems, creditAmount);
      await this.enforceCounterRules(user, settings, dto, {
        manualDiscount: (dto.discount ?? 0) + totalLineDiscount, priceCut, subtotal, creditAmount,
      });
    }

    let loyaltyEarned = 0;
    if (settings?.enableLoyalty && dto.customerId && total > 0) {
      loyaltyEarned = Math.floor(total * settings.loyaltyPointsPerRupee);
    }

    const saleNumber = `NF-${Date.now().toString().slice(-8)}`;

    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, shopId: sellingShopId, status: 'OPEN' },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      let customer = null;
      if (dto.customerId) {
        customer = await tx.customer.findFirst({
          where: { id: dto.customerId, tenantId: user.tenantId },
        });
        if (!customer) throw new NotFoundException('Customer not found');
      }

      const sale = await tx.sale.create({
        data: {
          tenantId: user.tenantId,
          shopId: sellingShopId,
          cashRegisterId: cashRegister?.id,
          customerId: dto.customerId,
          createdById: user.id,
          soldById: dto.soldById || user.id,
          discountCodeId,
          discountCode: discountCodeStr,
          saleNumber,
          subtotal,
          discount: totalDiscount,
          loyaltyUsed: loyaltyPointsUsed,
          loyaltyEarned,
          codeDiscount,
          loyaltyDiscount,
          total,
          costOfGoods: costOfGoods + serviceChargesCost,
          paidAmount,
          changeAmount,
          creditAmount,
          paymentMethod: tender.mainMethod,
          status: 'COMPLETED',
          serviceCharges: serviceChargesTotal,
          serviceChargesBreakdown:
            allServiceCharges.length > 0
              ? (allServiceCharges as any)
              : undefined,
          // Khali string ko NULL banate hain — warna "pehle kaun aaya
          // tha" wali list me khali naam bhi shamil ho jate hain.
          receivedByName: dto.receivedByName?.trim() || null,
          receivedByPhone: dto.receivedByPhone?.trim() || null,
          receivedByCnic: dto.receivedByCnic?.trim() || null,
          source: origin?.source ?? 'POS',
          sourceRef: origin?.sourceRef ?? null,
          items: {
            create: normalizedItems.map((item) => ({
              ...(item.productId ? { productId: item.productId } : {}),
              ...(item.usedPhoneId ? { usedPhoneId: item.usedPhoneId } : {}),
              quantity: item.quantity,
              price: item.price,
              costPrice: item.costPrice,
              total: item.total,
              note: item.note,
              internalNote: item.internalNote,
              priceTier: item.priceTier,
              retailPrice: item.retailPrice,
              ...(item.variantId && {
                variantLink: { create: { variantId: item.variantId } },
              }),
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              usedPhone: true,
              variantLink: { include: { variant: true } },
            },
          },
          customer: true,
          shop: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      });
      await saveSalePayments(tx, sale, tender.rows);

      // ─── Process each item ──────────────────────────────────
      for (let idx = 0; idx < normalizedItems.length; idx++) {
        const item = normalizedItems[idx];
        const saleItem = sale.items[idx];

        // ─── USED PHONE items: mark SOLD, no stock table sync ──
        if (item.isUsedPhoneItem && item.usedPhoneId) {
          await tx.usedPhone.update({
            where: { id: item.usedPhoneId },
            data: {
              status: 'SOLD',
              finalSoldPrice: item.price,
              soldAt: new Date(),
              soldSaleId: sale.id,
            },
          });
          continue;
        }

        // ─── IMEI items: mark SOLD + sync stock ───────────────
        if (item.isImeiItem && item.imeiId) {
          // Only while still on the shelf, so two counters cannot sell the same phone.
          const claimed = await tx.productImei.updateMany({
            where: { id: item.imeiId, status: 'IN_STOCK' },
            data: {
              status: 'SOLD',
              saleItemId: saleItem.id,
              soldPrice: item.price,
              soldAt: new Date(),
            },
          });
          const updatedImei = imeiMap.get(item.imeiId)!;
          if (!claimed.count) throw new BadRequestException(`IMEI ${updatedImei.imei1} abhi bik chuka hai`);

          // One phone leaves this branch's shelf: one SALE_OUT movement at the
          // phone's own cost. Never below zero, as before, when the branch count
          // was already short of its phones.
          const onShelf = await readShopStock(tx, sellingShopId, item.productId!, item.variantId ?? null);
          const out = Math.min(item.quantity, Math.max(onShelf, 0));
          if (out > 0) {
            await applyStockDelta({
              tx,
              tenantId: user.tenantId,
              shopId: sellingShopId,
              productId: item.productId!,
              variantId: item.variantId ?? null,
              delta: -out,
              movementType: 'SALE_OUT',
              reference: sale.saleNumber,
              note: `IMEI ${updatedImei.imei1} sold at ${shop.name}`,
              userId: user.id,
              unitCost: item.costPrice,
              batchMode: 'none',
            });
          }
          continue;
        }

        // ─── Carpet items: audit log only ─────────────────────
        if (item.isCarpetItem) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId!,
              type: 'SALE_OUT',
              quantity: -item.quantity,
              balanceAfter: 0,
              reference: sale.saleNumber,
              note: `${CARPET_SALE_NOTE}${shop.name}${item.note ? ` • ${item.note}` : ''}`,
            },
          });
          continue;
        }

        // Services and fees: nothing on the shelf to take out.
        if (item.isServiceItem) continue;

        // ─── Electronics serial: us unit ko SOLD mark karo ──────
        // Stock aam tareeqe se neeche ghatta hai — serial sirf ye
        // batata hai ke kaunsa asli unit gaya (warranty ke liye zaroori).
        if (item.serialId) {
          // Customer warranty starts on the day of sale for the product's
          // months, unless the unit already carries its own end date.
          const unit = serialMap.get(item.serialId);
          const months = warrantyMonthsByProduct.get(item.productId!) ?? 0;
          const soldAt = new Date();
          const warranty = unit && !unit.warrantyEndDate && months > 0
            ? { warrantyStartDate: soldAt, warrantyEndDate: addMonths(soldAt, months), warrantyStatus: 'ACTIVE' as const }
            : {};
          await tx.electronicsSerialTracking.update({
            where: { id: item.serialId },
            data: {
              status: 'SOLD',
              saleId: sale.id,
              saleItemId: saleItem.id,
              soldPrice: item.price,
              soldAt,
              soldToCustomerId: dto.customerId ?? null,
              invoiceNumber: sale.saleNumber,
              ...warranty,
            },
          });
        }

        // ─── Standard items: decrement ShopStock + global stock ──
        // Atomic: sirf tab ghatao jab abhi bhi kaafi ho (race / offline sync se minus nahi)
        const updatedShopStock = { stock: await claimShopStock(tx, item.shopStockId!, item.quantity, shop.name, allowNegativeStock) };
        // The same quantity leaves the item's batches: the chosen one, else earliest expiry.
        await recordSaleBatches(tx, saleItem.id, await takeFromBatches(tx, {
          shopId: sellingShopId, productId: item.productId!, variantId: item.variantId ?? null,
          quantity: item.quantity, batchId: item.batchId, sellable: true,
        }));

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        await tx.product.update({
          where: { id: item.productId! },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            shopId: sellingShopId,
            productId: item.productId!,
            type: 'SALE_OUT',
            quantity: -item.quantity,
            balanceAfter: updatedShopStock.stock,
            reference: sale.saleNumber,
            note: `Sale at ${shop.name}${item.note ? ` • ${item.note}` : ''}`,
          },
        });
      }

      if (discountCodeId) {
        // Count the use only while under the limit, in one statement, so two
        // counters cannot both take the last use.
        const used = await tx.discountCode.updateMany({
          where: { id: discountCodeId, OR: [{ usageLimit: null }, { usageCount: { lt: tx.discountCode.fields.usageLimit } }] },
          data: { usageCount: { increment: 1 } },
        });
        if (!used.count) throw new BadRequestException('Is code ki had poori ho chuki hai');
      }

      if (creditAmount > 0 && customer) {
        // Increment, not read-then-write: two counters selling to the same
        // customer at once must both land on the balance.
        const { balance: raw } = await tx.customer.update({
          where: { id: customer.id },
          data: { balance: { increment: creditAmount } },
          select: { balance: true },
        });
        const newBalance = await tidyCustomerBalance(tx, customer.id, raw);
        await tx.customerLedger.create({
          data: {
            tenantId: user.tenantId,
            shopId: sellingShopId,
            customerId: customer.id,
            createdById: user.id,
            type: 'SALE_CREDIT',
            amount: creditAmount,
            balanceAfter: newBalance,
            reference: sale.saleNumber,
            // Khate me bhi receiver ka naam — mahine ke aakhir me
            // khata kholte waqt saaf dikhe ke maal kis ne uthaya.
            note: sale.receivedByName
              ? `Udhaar sale: ${sale.saleNumber} (${shop.name}) — le gaya: ${sale.receivedByName}`
              : `Udhaar sale: ${sale.saleNumber} (${shop.name})`,
          },
        });
      }

      if (customer) {
        // Points move with atomic increments; a redemption checks and deducts
        // in one statement so the same points cannot be spent twice.
        if (loyaltyPointsUsed > 0) {
          const spent = await tx.customer.updateMany({
            where: { id: customer.id, loyaltyPoints: { gte: loyaltyPointsUsed } },
            data: { loyaltyPoints: { decrement: loyaltyPointsUsed } },
          });
          if (!spent.count) throw new BadRequestException('Itne points nahi hain');
          const { loyaltyPoints } = await tx.customer.findUniqueOrThrow({ where: { id: customer.id }, select: { loyaltyPoints: true } });
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId, customerId: customer.id, type: 'REDEEMED', shopId: sellingShopId, saleId: sale.id,
              points: -loyaltyPointsUsed, balanceAfter: loyaltyPoints,
              reference: sale.saleNumber, note: `Rs ${loyaltyDiscount.toFixed(0)} loyalty discount`,
            },
          });
        }
        const { loyaltyPoints } = await tx.customer.update({
          where: { id: customer.id },
          data: { loyaltyPoints: { increment: loyaltyEarned }, totalSpent: { increment: total } },
          select: { loyaltyPoints: true },
        });
        if (loyaltyEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId, customerId: customer.id, type: 'EARNED', shopId: sellingShopId, saleId: sale.id,
              points: loyaltyEarned, balanceAfter: loyaltyPoints,
              reference: sale.saleNumber, note: `Bill ${sale.saleNumber} se`,
            },
          });
        }
      }

      return { ...sale, payments: tender.rows };
    });

    // 🔔 Sale notification (async, non-blocking, fire-and-forget)
    this.notifications.create({
      tenantId: user.tenantId,
      type: 'NEW_SALE' as any,
      title: '💰 Sale Complete',
      message: `${saleNumber} · Rs ${(result as any).total ?? total} · ${dto.items.length} items`,
      link: `/sales/${(result as any).id}/receipt`,
      metadata: { saleId: (result as any).id, total, itemCount: dto.items.length },
    }).catch(() => null);

    return result;
  }

  async findAll(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    // An explicit ?shopId= still wins (report drill-downs use it); otherwise
    // the branch from the switcher applies.
    const shopWhere =
      shopId && shopId !== 'all' ? { shopId } : scope.where;

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...shopWhere,
      },
      include: {
        customer: true,
        shop: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        // Repair delivery se bani sale — isi se pata chalta hai ye repair ki kamai hai
        repairTicket: {
          select: {
            id: true, ticketNumber: true,
            deviceBrand: true, deviceModel: true,
            reportedIssue: true, diagnosedIssue: true,
          },
        },
        items: {
          include: {
            product: true,
            usedPhone: true,
            variantLink: { include: { variant: true } },
          },
        },
      },
      orderBy: { soldAt: 'desc' },
      take: 200,
    });

    // Har item ke saath uske bike hue IMEIs — warna list me phone ka
    // koi nishaan nahi milta aur mobile ke filters khaali reh jate hain.
    const saleItemIds = sales.flatMap((s) => s.items.map((i) => i.id));
    const imeis = saleItemIds.length > 0
      ? await this.prisma.productImei.findMany({
          where: { tenantId: user.tenantId, saleItemId: { in: saleItemIds } },
          select: {
            id: true, imei1: true, imei2: true, serialNumber: true,
            ptaStatus: true, ptaTaxPaid: true,
            warrantyMonths: true, warrantyExpiry: true,
            color: true, costPrice: true, soldPrice: true,
            saleItemId: true, productId: true,
          },
        })
      : [];

    // Electronics ke serial-tracked units — laptop/camera/drone waghera.
    // Inke baghair electronics sales list me pata hi nahi chalta ke
    // kaun sa exact unit gaya aur uski warranty kab tak hai.
    const serials = saleItemIds.length > 0
      ? await this.prisma.electronicsSerialTracking.findMany({
          where: { tenantId: user.tenantId, saleItemId: { in: saleItemIds } },
          select: {
            id: true, serialNumber: true, imei: true, imei2: true, macAddress: true,
            warrantyStartDate: true, warrantyEndDate: true, warrantyStatus: true,
            physicalCondition: true, batteryHealthPct: true,
            soldPrice: true, purchasePrice: true,
            saleItemId: true, productId: true,
          },
        })
      : [];

    const byItem = new Map<string, typeof imeis>();
    for (const im of imeis) {
      const key = im.saleItemId as string;
      const list = byItem.get(key) ?? [];
      list.push(im);
      byItem.set(key, list);
    }

    const serialsByItem = new Map<string, typeof serials>();
    for (const sn of serials) {
      const key = sn.saleItemId as string;
      const list = serialsByItem.get(key) ?? [];
      list.push(sn);
      serialsByItem.set(key, list);
    }

    return sales.map((sale) => ({
      ...sale,
      items: sale.items.map((item) => ({
        ...item,
        imeis: byItem.get(item.id) ?? [],
        serials: serialsByItem.get(item.id) ?? [],
      })),
    }));
  }

  // Deliberately not narrowed by branch: receipt links, WhatsApp shares and
  // support lookups must still open a sale made at another branch. Tenant
  // isolation is what matters here, and that is enforced below.
  async findOne(user: AuthenticatedUser, _scope: ShopScope, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        customer: true,
        shop: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        payments: { select: { method: true, amount: true, reference: true, note: true }, orderBy: { createdAt: 'asc' } },
        items: {
          include: {
            product: { include: { brand: true } },
            usedPhone: true,
            variantLink: { include: { variant: true } },
          },
        },
        tenant: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    // Enrich with IMEIs sold under this sale
    const saleItemIds = sale.items.map((i) => i.id);
    const imeis = saleItemIds.length > 0
      ? await this.prisma.productImei.findMany({
          where: {
            tenantId: user.tenantId,
            saleItemId: { in: saleItemIds },
          },
          select: {
            id: true,
            imei1: true,
            imei2: true,
            serialNumber: true,
            ptaStatus: true,
            ptaTaxPaid: true,
            warrantyMonths: true,
            warrantyExpiry: true,
            color: true,
            costPrice: true,
            soldPrice: true,
            saleItemId: true,
            productId: true,
          },
        })
      : [];

    // Electronics serial units — receipt par serial + warranty
    // chhapne ke liye zaroori hain.
    const serials = saleItemIds.length > 0
      ? await this.prisma.electronicsSerialTracking.findMany({
          where: { tenantId: user.tenantId, saleItemId: { in: saleItemIds } },
          select: {
            id: true, serialNumber: true, imei: true, imei2: true, macAddress: true,
            warrantyStartDate: true, warrantyEndDate: true, warrantyStatus: true,
            physicalCondition: true, batteryHealthPct: true,
            soldPrice: true, purchasePrice: true,
            saleItemId: true, productId: true,
          },
        })
      : [];

    // Appliance units are linked by sale and product (warranty cards need them).
    const applianceSerials = await this.prisma.applianceSerialTracking.findMany({
      where: { tenantId: user.tenantId, saleId: sale.id },
      select: { serialNumber: true, productId: true, warrantyEndDate: true, compressorWarrantyEndDate: true, motorWarrantyEndDate: true },
    });

    // Attach IMEIs + serials to corresponding sale items
    const enrichedItems = sale.items.map((item) => ({
      ...item,
      imeis: imeis.filter((i) => i.saleItemId === item.id),
      serials: serials.filter((sn) => sn.saleItemId === item.id),
      applianceSerials: applianceSerials.filter((a) => a.productId === item.productId),
    }));

    return { ...sale, items: enrichedItems };
  }

  /**
   * Is customer ke pichhle receivers — POS ke suggestion box ke liye.
   *
   * Sab se haal hi wale pehle: jo banda kal aaya tha wo aaj bhi aa sakta
   * hai, mahine pehle wala kam mumkin hai.
   */
  async recentReceivers(user: AuthenticatedUser, customerId?: string) {
    if (!customerId) return [];

    const rows = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        customerId,
        receivedByName: { not: null },
      },
      select: { receivedByName: true, receivedByPhone: true, soldAt: true },
      orderBy: { soldAt: 'desc' },
      take: 60,
    });

    // Ek hi naam baar baar aata hai — sirf pehli (sab se nayi) dafa rakhein.
    const seen = new Map<string, { name: string; phone: string | null; lastAt: Date }>();
    for (const r of rows) {
      const name = (r.receivedByName ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, { name, phone: r.receivedByPhone, lastAt: r.soldAt });
      if (seen.size >= 12) break;
    }

    return [...seen.values()];
  }

  async summary(user: AuthenticatedUser, scope: ShopScope, shopId?: string) {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const baseWhere = {
      tenantId: user.tenantId,
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] as any },
      ...(shopId && shopId !== 'all' ? { shopId } : scope.where),
    };

    const [todayAgg, monthAgg, totalAgg, totalOrders, paymentBreakdown, shopBreakdown] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: { ...baseWhere, soldAt: { gte: todayStart } },
          _sum: { total: true, costOfGoods: true, creditAmount: true, paidAmount: true },
          _count: { _all: true },
        }),
        this.prisma.sale.aggregate({
          where: { ...baseWhere, soldAt: { gte: monthStart } },
          _sum: { total: true, costOfGoods: true },
        }),
        this.prisma.sale.aggregate({
          where: baseWhere,
          _sum: { total: true, costOfGoods: true },
        }),
        this.prisma.sale.count({ where: baseWhere }),
        this.prisma.sale.groupBy({
          by: ['paymentMethod'], where: baseWhere,
          _count: { _all: true }, _sum: { total: true },
        }),
        this.prisma.sale.groupBy({
          by: ['shopId'],
          where: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
          _count: { _all: true }, _sum: { total: true, costOfGoods: true },
        }),
      ]);

    return {
      todaySales: todayAgg._sum.total ?? 0,
      todayOrders: todayAgg._count._all ?? 0,
      todayProfit: (todayAgg._sum.total ?? 0) - (todayAgg._sum.costOfGoods ?? 0),
      todayCredit: todayAgg._sum.creditAmount ?? 0,
      todayPaid: todayAgg._sum.paidAmount ?? 0,
      monthSales: monthAgg._sum.total ?? 0,
      monthProfit: (monthAgg._sum.total ?? 0) - (monthAgg._sum.costOfGoods ?? 0),
      totalSales: totalAgg._sum.total ?? 0,
      totalProfit: (totalAgg._sum.total ?? 0) - (totalAgg._sum.costOfGoods ?? 0),
      totalOrders,
      paymentBreakdown,
      shopBreakdown,
    };
  }

  /**
   * A trade-in from the till is goods taken toward the bill, worth at least the
   * amount and not already used on another live bill. It is either a used phone
   * taken in as an exchange (Used phones → Trade-in, type Exchange) or old gold
   * a jewelry counter took for a bill (JEX-…, purpose SALE, not yet on a bill),
   * or an old part an auto parts counter took back (CORE-…, held, no bill),
 * or an old appliance an appliance counter took in trade (ATI-…, held, no bill).
   * Its code is kept as the reference.
   */
  private async checkTradeIns(tenantId: string, rows: PaymentPart[]) {
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.method !== 'TRADE_IN') continue;
      const code = row.reference?.trim();
      if (!code) throw new BadRequestException('Trade-in ke liye used phone, purana zewar, purana part ya purana saman chunein');
      const goods = /^JEX-/i.test(code) ? await this.oldGoldTradeIn(tenantId, code)
        : /^CORE-/i.test(code) ? await this.coreReturnTradeIn(tenantId, code)
        : /^ATI-/i.test(code) ? await this.applianceTradeIn(tenantId, code)
        : await this.usedPhoneTradeIn(tenantId, code);
      if (seen.has(goods.code)) throw new BadRequestException(`${goods.code} bill me do dafa hai`);
      seen.add(goods.code);
      if (row.amount > goods.value + 0.01) {
        throw new BadRequestException(`${goods.code} ki trade-in qeemat Rs ${goods.value} hai — is se zyada nahi`);
      }
      const used = await this.prisma.salePayment.findFirst({
        where: { tenantId, method: 'TRADE_IN', reference: goods.code, sale: { status: { not: 'VOIDED' } } },
        select: { sale: { select: { saleNumber: true } } },
      });
      if (used) throw new BadRequestException(`${goods.code} pehle hi bill ${used.sale.saleNumber} me lag chuka hai`);
      row.reference = goods.code;
      row.note = row.note || goods.label;
    }
  }

  private async usedPhoneTradeIn(tenantId: string, code: string) {
    const phone = await this.prisma.usedPhone.findFirst({
      where: { tenantId, OR: [{ usedPhoneCode: code }, { id: code }] },
      select: { usedPhoneCode: true, brand: true, model: true, source: true, status: true, buybackPrice: true },
    });
    if (!phone || phone.source !== 'EXCHANGE' || phone.status === 'DISCARDED') {
      throw new BadRequestException(`Trade-in phone ${code} nahi mila (Used phones me "Exchange" wala phone chahiye)`);
    }
    return { code: phone.usedPhoneCode, value: Number(phone.buybackPrice), label: `${phone.brand} ${phone.model} (${phone.usedPhoneCode})` };
  }

  private async oldGoldTradeIn(tenantId: string, code: string) {
    const ex = await this.prisma.jewelryExchange.findFirst({
      where: { tenantId, exchangeNumber: { equals: code, mode: 'insensitive' } },
      select: { exchangeNumber: true, purpose: true, saleId: true, netValue: true, netWeight: true, grossWeight: true },
    });
    if (!ex || ex.purpose !== 'SALE' || ex.saleId) {
      throw new BadRequestException(`Purana zewar ${code} nahi mila — bill ke liye liya gaya zewar chunein jo abhi kisi bill par na laga ho`);
    }
    const grams = Number(ex.netWeight ?? ex.grossWeight) || 0;
    return { code: ex.exchangeNumber, value: Number(ex.netValue), label: `Purana zewar ${grams.toFixed(3)}g (${ex.exchangeNumber})` };
  }

  /** An old part an auto parts counter took back: held and not on a live bill. */
  private async coreReturnTradeIn(tenantId: string, code: string) {
    const core = await this.prisma.coreReturn.findFirst({
      where: { tenantId, id: code.slice(5) },
      select: { id: true, description: true, value: true, status: true, saleId: true, jobId: true },
    });
    // A part taken with a workshop job is used on that job's own bill.
    if (!core || core.status !== 'HELD' || core.saleId || core.jobId) {
      throw new BadRequestException(`Purana part ${code} nahi mila — counter par liya gaya part chunein jo abhi kisi bill par na laga ho`);
    }
    return { code: `CORE-${core.id}`, value: Number(core.value), label: `Purana part: ${core.description}` };
  }

  /** An old appliance an appliance counter took in trade: held and not on a live bill. */
  private async applianceTradeIn(tenantId: string, code: string) {
    const t = await this.prisma.applianceTradeIn.findFirst({
      where: { tenantId, code: { equals: code, mode: 'insensitive' } },
      select: { code: true, description: true, brand: true, value: true, status: true, saleId: true },
    });
    if (!t || t.status !== 'HELD' || t.saleId) {
      throw new BadRequestException(`Purana saman ${code} nahi mila — counter par liya gaya saman chunein jo abhi kisi bill par na laga ho`);
    }
    const name = /^purana\b/i.test(t.description) ? t.description : `Purana ${t.description}`;
    return { code: t.code, value: Number(t.value), label: `${name}${t.brand ? ` (${t.brand})` : ''} (${t.code})` };
  }

  /**
   * The shop's counter settings: customer on every bill, hand discounts (on or
   * off, a ceiling the owner's PIN can lift, a PIN for any discount), credit
   * (on or off, each customer's limit that only the PIN can lift).
   */
  /**
   * Retail price per base unit on wholesale and credit lines, kept on the
   * line so history can show what the item would have cost at retail. A pack
   * sold at its own tier price compares with that pack's retail price.
   */
  private async fillRetailPrices(
    tenantId: string,
    lines: Array<{ productId: string | null; variantId?: string; price: number; priceTier: string | null; retailPrice: number | null }>,
    productMap: Map<string, { price: number }>,
    variantMap: Map<string, { price: number }>,
  ) {
    const tiered = lines.filter((l) => l.productId && (l.priceTier === 'WHOLESALE' || l.priceTier === 'CREDIT'));
    if (!tiered.length) return;
    const units = await this.prisma.productUnit.findMany({
      where: { tenantId, isActive: true, productId: { in: [...new Set(tiered.map((l) => l.productId!))] } },
      select: { productId: true, variantId: true, conversionRate: true, price: true, wholesalePrice: true, creditPrice: true },
    });
    for (const l of tiered) {
      const variant = l.variantId ? variantMap.get(l.variantId) : undefined;
      let retail = Number(variant?.price ?? productMap.get(l.productId!)?.price) || 0;
      for (const u of units) {
        if (u.productId !== l.productId || (u.variantId && u.variantId !== l.variantId)) continue;
        const rate = Number(u.conversionRate) || 1;
        if (rate === 1 || !(u.price > 0)) continue;
        if (Math.abs(tierPrice(u, l.priceTier as PriceTier) / rate - l.price) < 0.01) { retail = u.price / rate; break; }
      }
      l.retailPrice = retail > 0 ? r2(retail * 10000) / 10000 : null;
    }
  }

  /**
   * With price tiers on, a line away from the shop's default tier needs the
   * pos.price_tier permission, unless the owner's own rules chose it: the
   * customer's default price, or the credit price on an udhaar bill.
   */
  private async checkPriceTiers(
    user: AuthenticatedUser,
    setup: ReturnType<typeof normalizePosCounter>,
    dto: CreateSaleDto,
    lines: Array<{ priceTier: string | null }>,
    creditAmount: number,
  ) {
    if (!setup.priceTiers || hasPermission(user.role, user.permissions, PERMISSIONS.POS_PRICE_TIER)) return;
    const off = lines.filter((l) => l.priceTier && l.priceTier !== setup.defaultPriceTier);
    if (!off.length) return;
    const customer = setup.tierFromCustomer && dto.customerId
      ? await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { priceTier: true } })
      : null;
    for (const l of off) {
      if (customer?.priceTier && l.priceTier === customer.priceTier) continue;
      if (l.priceTier === 'CREDIT' && creditAmount > 0 && setup.tierCreditOnUdhaar) continue;
      throw new ForbiddenException('Price tier badalne ki permission nahi (Price tier badalna). Owner se poochein.');
    }
  }

  private async enforceCounterRules(
    user: AuthenticatedUser,
    s: TenantSettings,
    dto: CreateSaleDto,
    bill: { manualDiscount: number; priceCut?: number; subtotal: number; creditAmount: number },
  ) {
    if (s.requireCustomerForSale && !dto.customerId) {
      throw new BadRequestException('Har bill par customer chunna zaroori hai (Settings)');
    }
    // The on/off switch covers the discount field and line discounts; a lowered
    // price is held to the same limit and PIN, measured on the shop's prices.
    const priceCut = Math.max(0, bill.priceCut ?? 0);
    if (bill.manualDiscount > 0 && !s.allowDiscount) {
      throw new BadRequestException('Is dukaan me haath se discount band hai (Settings)');
    }
    const given = bill.manualDiscount + priceCut;
    if (given > 0.005) {
      // Staff the owner trusted with "Had se zyada chhoot" skip the limit and its PIN.
      const trusted = hasPermission(user.role, user.permissions, PERMISSIONS.POS_DISCOUNT_OVERRIDE);
      const base = bill.subtotal + priceCut;
      const percent = base > 0 ? (given / base) * 100 : 100;
      const what = bill.manualDiscount > 0 ? 'Discount' : 'Kam price';
      if (!trusted && percent > s.maxDiscountPercent + 0.01) {
        await requireManagerPin(this.prisma, user, dto.managerPin, `${s.maxDiscountPercent}% se zyada discount`, true, PIN_NEEDS.discount);
      } else if (!trusted && s.requirePinForDiscount) {
        await requireManagerPin(this.prisma, user, dto.managerPin, what, false, PIN_NEEDS.discount);
      }
    }
    if (bill.creditAmount > 0) {
      const c = await this.prisma.customer.findFirst({
        where: { id: dto.customerId!, tenantId: user.tenantId },
        select: { creditLimit: true, balance: true },
      });
      // With credit off, a bill may still use up the advance the customer holds.
      const held = Math.max(-(c?.balance ?? 0), 0);
      if (!s.allowCredit && bill.creditAmount > held + 0.01) {
        throw new BadRequestException('Is dukaan me udhaar band hai (Settings)');
      }
      if (c && c.creditLimit > 0 && c.balance + bill.creditAmount > c.creditLimit + 0.01) {
        await requireManagerPin(this.prisma, user, dto.managerPin, `Credit limit (Rs ${c.creditLimit}) se zyada udhaar`, true, PIN_NEEDS.credit);
      }
    }
  }

  /**
   * Refuses a void when another used-phone record for the same IMEI is still
   * held by the shop (any status but SOLD or DISCARDED).
   */
  private async refuseIfBoughtBack(tx: any, tenantId: string, code: string, imeis: (string | null | undefined)[], exceptId?: string) {
    const list = [...new Set(imeis.map((x) => x?.trim()).filter((x): x is string => !!x))];
    if (!list.length) return;
    const held = await tx.usedPhone.findFirst({
      where: {
        tenantId,
        ...(exceptId && { id: { not: exceptId } }),
        status: { notIn: ['SOLD', 'DISCARDED'] },
        OR: [{ imei1: { in: list } }, { imei2: { in: list } }],
      },
      select: { usedPhoneCode: true },
    });
    if (held) {
      throw new BadRequestException(
        `${code} wala phone dobara khareeda ja chuka (${held.usedPhoneCode}) — pehle wo record discard karein, phir ye bill cancel karein`,
      );
    }
  }

  async voidSale(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    reason?: string,
    managerPin?: string,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId: user.tenantId, ...scope.where },
      include: { items: { include: { variantLink: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOIDED') throw new BadRequestException('Sale already voided');
    // Part of this bill has come back already; voiding would give that part back twice.
    if (sale.status === 'PARTIALLY_RETURNED' || sale.status === 'FULLY_RETURNED') {
      throw new BadRequestException('Is bill ki return ho chuki hai — void nahi ho sakta. Baqi maal ki return karein.');
    }
    const rules = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { requirePinForVoid: true } });
    if (rules?.requirePinForVoid) await requireManagerPin(this.prisma, user, managerPin, 'Bill cancel', false, PIN_NEEDS.void);
    if (!sale.shopId) throw new BadRequestException('Sale has no shop linked — cannot void safely');

    return this.prisma.$transaction(async (tx) => {
      // Pehle sale ko "apna" karo — do log (ya do tab) ek saath void karein
      // to stock sirf ek dafa wapas aaye, do dafa nahi.
      const claim = await tx.sale.updateMany({
        where: { id, status: { not: 'VOIDED' } },
        data: { status: 'VOIDED' },
      });
      if (claim.count === 0) throw new BadRequestException('Sale already voided');

      // Record who cancelled the bill and why; reports read this instead of guessing from the seller.
      await tx.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: 'SALE_VOIDED', entityType: 'Sale', entityId: id,
          description: `Bill ${sale.saleNumber} void kiya${reason?.trim() ? ` — ${reason.trim()}` : ''}`,
          metadata: { saleNumber: sale.saleNumber, total: sale.total, shopId: sale.shopId, reason: reason?.trim() || null, pinApproved: !!rules?.requirePinForVoid },
        },
      });

      // Online order se bani sale thi → order bhi cancel, warna wo "Deliver"
      // aur "COD baqi" me ginta rehta jabke bill hai hi nahi.
      await tx.channelOrder.updateMany({
        where: { nafaaSaleId: id, orderStatus: { notIn: ['CANCELLED', 'REJECTED', 'RETURNED'] } },
        data: { orderStatus: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason?.trim() || 'Bill void hua' },
      });

      // ─── Restore used phones (mark IN_STOCK again) ────────────
      const usedPhoneItems = sale.items.filter((i) => (i as any).usedPhoneId);
      for (const item of usedPhoneItems) {
        // The shop may have bought this phone back since; two live records for one IMEI is not allowed.
        const phone = await tx.usedPhone.findUnique({
          where: { id: (item as any).usedPhoneId },
          select: { id: true, usedPhoneCode: true, imei1: true, imei2: true },
        });
        if (phone) {
          await this.refuseIfBoughtBack(tx, user.tenantId, phone.usedPhoneCode, [phone.imei1, phone.imei2], phone.id);
        }
        await tx.usedPhone.update({
          where: { id: (item as any).usedPhoneId },
          data: {
            status: 'IN_STOCK',
            finalSoldPrice: null,
            soldAt: null,
            soldSaleId: null,
          },
        });
      }

      // ─── Restore IMEIs (mark IN_STOCK again) ──────────────────
      const saleItemIds = sale.items.map((i) => i.id);
      // Lines that sold a phone: their stock comes back below as one phone each.
      const imeiLineIds = new Set<string>();
      if (saleItemIds.length > 0) {
        const imeis = await tx.productImei.findMany({
          where: {
            tenantId: user.tenantId,
            saleItemId: { in: saleItemIds },
          },
        });
        for (const imei of imeis) {
          // A sold phone that came back as a used phone cannot also return to new stock.
          await this.refuseIfBoughtBack(tx, user.tenantId, `IMEI ${imei.imei1}`, [imei.imei1, imei.imei2]);
          if (imei.saleItemId) imeiLineIds.add(imei.saleItemId);
          await tx.productImei.update({
            where: { id: imei.id },
            data: {
              status: 'IN_STOCK',
              saleItemId: null,
              soldPrice: null,
              soldAt: null,
            },
          });
        }
      }

      // ─── Serial units go back on the shelf ────────────────────
      // Electronics units are cleared outright. Warranty dates are cleared
      // only when they were set by this sale (start = day of sale).
      const soldSerials = await tx.electronicsSerialTracking.findMany({
        where: { tenantId: user.tenantId, saleId: id },
        select: { id: true, soldAt: true, warrantyStartDate: true },
      });
      for (const sr of soldSerials) {
        const setBySale = !!sr.soldAt && !!sr.warrantyStartDate && sr.soldAt.getTime() === sr.warrantyStartDate.getTime();
        await tx.electronicsSerialTracking.update({
          where: { id: sr.id },
          data: {
            status: 'IN_STOCK', saleId: null, saleItemId: null, soldAt: null, soldPrice: null,
            soldToCustomerId: null, invoiceNumber: null,
            ...(setBySale ? { warrantyStartDate: null, warrantyEndDate: null, warrantyStatus: 'NO_WARRANTY' as const } : {}),
          },
        });
      }
      // Appliance units carry the bill id only; their warranty runs from the sale.
      await tx.applianceSerialTracking.updateMany({
        where: { tenantId: user.tenantId, saleId: id, status: 'SOLD' },
        data: {
          status: 'IN_STOCK', saleId: null, invoiceNumber: null, soldAt: null, soldPrice: null,
          soldToCustomerId: null, customerName: null, customerPhone: null, deliveryAddress: null,
          warrantyStartDate: null, warrantyEndDate: null, compressorWarrantyEndDate: null, motorWarrantyEndDate: null,
        },
      });

      // Lines whose sale took no shelf stock (carpet audit rows, and older
      // bills that treated every sqft product that way) get no stock back.
      const noStockTaken = await productsSoldWithoutStock(tx, user.tenantId, sale.saleNumber);
      // Services and fees took nothing off the shelf, so nothing goes back.
      const tookStock = await productsThatTookStock(tx, user.tenantId, sale.saleNumber);
      const lineProducts = await tx.product.findMany({
        where: { id: { in: sale.items.map((i) => i.productId).filter((x): x is string => !!x) } },
        select: { id: true, productType: true, unit: true },
      });
      const serviceIds = new Set(lineProducts.filter((p) => isServiceProduct(p)).map((p) => p.id));

      for (const item of sale.items) {
        if ((item as any).usedPhoneId) continue; // already handled above

        const itemNote = (item as any).note || '';
        const isCarpetItem = hasCarpetNote(itemNote) || (!!item.productId && noStockTaken.has(item.productId));
        // A phone line is known by its IMEI; the note prefix covers older bills.
        const isImeiItem = imeiLineIds.has(item.id) || itemNote.startsWith('IMEI:');

        if (!item.productId) continue; // safety guard

        if (isCarpetItem) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              shopId: sale.shopId,
              productId: item.productId,
              type: 'RETURN_IN',
              quantity: item.quantity,
              balanceAfter: 0,
              reference: sale.saleNumber,
              note: `Voided carpet sale — cut length goes back to its roll or piece: ${reason || 'No reason'}`,
            },
          });
          continue;
        }

        if (serviceIds.has(item.productId) && !tookStock.has(item.productId)) continue;

        const variantId = item.variantLink?.variantId ?? null;

        if (isImeiItem) {
          // The phone is back on this branch's shelf: one RETURN_IN at its cost.
          await applyStockDelta({
            tx,
            tenantId: user.tenantId,
            shopId: sale.shopId!,
            productId: item.productId,
            variantId,
            delta: item.quantity,
            movementType: 'RETURN_IN',
            reference: sale.saleNumber,
            note: `Voided IMEI sale: ${reason || 'No reason'}`,
            userId: user.id,
            unitCost: item.costPrice,
            batchMode: 'none',
          });
          continue;
        }

        // Standard items: stock and the batches it came from go back.
        const takes = await tx.saleItemBatch.findMany({ where: { saleItemId: item.id }, select: { batchId: true, quantity: true, returnedQty: true } });
        await putIntoBatches(tx, takes.map((t) => ({ batchId: t.batchId, quantity: t.quantity - t.returnedQty })));
        const shopStock = await tx.shopStock.findFirst({
          where: { shopId: sale.shopId!, productId: item.productId, variantId },
        });

        if (shopStock) {
          await tx.shopStock.update({
            where: { id: shopStock.id },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.shopStock.create({
            data: {
              tenantId: user.tenantId,
              shopId: sale.shopId!,
              productId: item.productId,
              variantId,
              stock: item.quantity,
            },
          });
        }

        if (variantId) {
          await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            shopId: sale.shopId,
            productId: item.productId,
            type: 'RETURN_IN',
            quantity: item.quantity,
            balanceAfter: updated.stock,
            reference: sale.saleNumber,
            note: `Voided: ${reason || 'No reason'}`,
          },
        });
      }

      if (sale.creditAmount > 0 && sale.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: sale.customerId } });
        if (customer) {
          // The void takes back exactly what the bill put on the khata. An advance
          // the credit used up, or a payment made against it later, stays with the
          // customer as an advance. Old bills with no ledger row keep the capped rule.
          const written = await tx.customerLedger.aggregate({
            where: { tenantId: user.tenantId, customerId: sale.customerId, reference: sale.saleNumber, type: 'SALE_CREDIT' },
            _sum: { amount: true },
            _count: true,
          });
          const removed = written._count
            ? Math.max(Number(written._sum.amount ?? 0), 0)
            : Math.min(sale.creditAmount, Math.max(customer.balance, 0));
          const { balance: raw } = await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: { decrement: removed } },
            select: { balance: true },
          });
          const newBalance = await tidyCustomerBalance(tx, sale.customerId, raw);
          await tx.customerLedger.create({
            data: {
              tenantId: user.tenantId,
              shopId: sale.shopId,
              customerId: sale.customerId,
              createdById: user.id,
              type: 'ADJUSTMENT',
              amount: -removed,
              balanceAfter: newBalance,
              reference: sale.saleNumber,
              note: `Sale voided: ${reason || ''}`,
            },
          });
        }
      }

      // A voided bill gives back its code use and undoes its points and spend.
      if (sale.discountCodeId) {
        await tx.discountCode.updateMany({ where: { id: sale.discountCodeId, usageCount: { gt: 0 } }, data: { usageCount: { decrement: 1 } } });
      }
      if (sale.customerId) {
        const c = await tx.customer.findUnique({ where: { id: sale.customerId }, select: { loyaltyPoints: true } });
        if (c) {
          // Points used come back; points earned go away, but never below zero.
          const change = Math.max(n0(sale.loyaltyUsed) - n0(sale.loyaltyEarned), -c.loyaltyPoints);
          const { loyaltyPoints } = await tx.customer.update({
            where: { id: sale.customerId },
            data: { loyaltyPoints: { increment: change }, totalSpent: { decrement: sale.total } },
            select: { loyaltyPoints: true },
          });
          if (change !== 0) {
            await tx.loyaltyTransaction.create({
              data: {
                tenantId: user.tenantId, customerId: sale.customerId, type: 'ADJUSTMENT', shopId: sale.shopId, saleId: sale.id,
                points: change, balanceAfter: loyaltyPoints, reference: sale.saleNumber, note: `Bill void: ${reason || ''}`.trim(),
              },
            });
          }
        }
      }

      return tx.sale.update({ where: { id }, data: { status: 'VOIDED' } });
    }).then((result) => {
      for (const fn of this.voidListeners) void fn(user.tenantId, id).catch(() => undefined);
      void this.fbr
        .cancelInvoice(user.tenantId, id, reason ?? 'Sale voided')
        .catch(() => undefined);
      return result;
    });
  }
}

