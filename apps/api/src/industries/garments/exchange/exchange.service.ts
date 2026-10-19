/**
 * Exchange at the counter: pieces from an earlier bill come back through
 * the shared return, and the new pieces are sold on a new bill at once,
 * with the returned value taken as part of its payment.
 *
 * Money: the return pays its refund out in cash and the new bill takes the
 * same amount in cash ("exchange credit"), so the drawer only moves by the
 * difference, while sales, returns, stock and khata are the same records
 * the reports already count. A refund that first clears what is still owed
 * on the old bill (khata) is not credit: only what would be handed back is.
 *
 * Window: Settings → exchange days. Past it the owner's or a manager's PIN
 * is needed; 0 means no limit.
 */

import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope, isServiceProduct } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PIN_NEEDS, requireManagerPin } from '../../../common/helpers/manager-pin.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { CreateReturnDto } from '../../../modules/sales/returns/dto/create-return.dto';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { CreateSaleDto } from '../../../modules/sales/sales/dto/create-sale.dto';
import { DAY_MS, garmentClock, opt, r2 } from '../common/garments-common';
import { ExchangeDto } from './dto/exchange.dto';

const ACTION = 'GARMENT_EXCHANGE';
const EPS = 0.001;
/** Same window as the returns service uses to spot a repeated return. */
const REPEAT_MS = 20_000;
/** Notes on the return of an exchange; tells it apart from a plain return. */
const NOTE = 'Exchange: naya maal isi waqt diya';

const SALE_INCLUDE = {
  items: {
    select: {
      id: true, productId: true, usedPhoneId: true, quantity: true, returnedQty: true, price: true, total: true,
      product: { select: { name: true, unit: true } },
      variantLink: { select: { variantId: true, variant: { select: { name: true } } } },
    },
  },
  customer: { select: { id: true, name: true, phone: true } },
  shop: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;

type BillRow = Prisma.SaleGetPayload<{ include: typeof SALE_INCLUDE }>;

/**
 * What one unit of each line refunds: its own net price, less its share of
 * the bill discount. Same rule as the shared returns service, for the
 * figures shown before the exchange is saved.
 */
function unitRefunds(sale: BillRow) {
  const net = (i: BillRow['items'][number]) => Number(i.total ?? i.price * i.quantity);
  const lines = sale.items.reduce((s, i) => s + net(i), 0);
  const lineDiscount = sale.items.reduce((s, i) => s + Math.max(0, i.price * i.quantity - net(i)), 0);
  const billDiscount = Math.max(0, Number(sale.discount ?? 0) - lineDiscount);
  const factor = lines > 0 ? Math.min(1, Math.max(0, (lines - billDiscount) / lines)) : 1;
  return new Map(sale.items.map((i) => [i.id, r2(i.quantity > 0 ? (net(i) / i.quantity) * factor : i.price * factor)]));
}

const dayNo = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};

@Injectable()
export class ExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly returns: ReturnsService,
    private readonly sales: SalesService,
  ) {}

  /** `returned`: a fully returned bill is let through (checked by the caller). */
  private async bill(user: AuthenticatedUser, scope: ShopScope, saleId: string, returned = false) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId: user.tenantId, ...scope.where }, include: SALE_INCLUDE });
    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (sale.status === 'VOIDED') throw new BadRequestException('Ye bill void ho chuka — exchange nahi ho sakta');
    if (sale.status === 'FULLY_RETURNED' && !returned) throw new BadRequestException('Is bill ka saara maal pehle hi wapas ho chuka');
    return sale;
  }

  /** Business days since the bill, the shop's window, and whether it is past it. */
  private async window(tenantId: string, soldAt: Date) {
    const [settings, clock] = await Promise.all([
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { exchangeDays: true, requirePinForRefund: true, requireCustomerForSale: true, allowNegativeStock: true, managerPin: true },
      }),
      garmentClock(this.tz, tenantId),
    ]);
    const exchangeDays = settings?.exchangeDays ?? 0;
    const days = Math.max(dayNo(clock.keyOf(new Date())) - dayNo(clock.keyOf(soldAt)), 0);
    return { settings, exchangeDays, days, late: exchangeDays > 0 && days > exchangeDays };
  }

  /** The bill's lines that can still come back, with what each unit refunds. */
  async preview(user: AuthenticatedUser, scope: ShopScope, saleId: string) {
    const sale = await this.bill(user, scope, saleId);
    const { settings, exchangeDays, days, late } = await this.window(user.tenantId, sale.soldAt);
    const rate = unitRefunds(sale);
    return {
      sale: {
        id: sale.id, saleNumber: sale.saleNumber, soldAt: sale.soldAt, total: sale.total, creditAmount: sale.creditAmount,
        status: sale.status, customer: sale.customer, shop: sale.shop,
      },
      exchangeDays, days, late,
      /** A PIN will be asked: past the window, or every refund needs it. */
      needsPin: (late || !!settings?.requirePinForRefund) && !!settings?.managerPin,
      lines: sale.items
        .filter((i) => i.productId && !i.usedPhoneId && i.quantity - i.returnedQty > EPS)
        .map((i) => ({
          saleItemId: i.id, productId: i.productId, variantId: i.variantLink?.variantId ?? null,
          name: i.product?.name ?? '—', variantName: i.variantLink?.variant?.name ?? null, unit: i.product?.unit ?? 'pcs',
          quantity: i.quantity, returnable: r2(i.quantity - i.returnedQty), unitRefund: rate.get(i.id) ?? 0,
        })),
    };
  }

  /**
   * The new pieces, checked before anything is saved: this shop's active
   * products, a size/colour where the product has them, and enough free
   * stock in the branch (stock − held, plus what comes back now).
   */
  private async newLines(user: AuthenticatedUser, shopId: string, dto: ExchangeDto, sale: BillRow, allowNegative: boolean) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const variantIds = [...new Set(dto.items.map((i) => i.variantId).filter((x): x is string => !!x))];
    const [products, variants] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId, id: { in: productIds }, isActive: true },
        select: { id: true, name: true, price: true, hasVariants: true, productType: true, unit: true },
      }),
      variantIds.length
        ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds }, isActive: true, product: { tenantId: user.tenantId } }, select: { id: true, productId: true, name: true, price: true } })
        : Promise.resolve([]),
    ]);
    const productOf = new Map(products.map((p) => [p.id, p]));
    const variantOf = new Map(variants.map((v) => [v.id, v]));

    const lines = dto.items.map((i) => {
      const p = productOf.get(i.productId);
      if (!p) throw new BadRequestException('Naya maal nahi mila ya band hai');
      const v = i.variantId ? variantOf.get(i.variantId) : null;
      if (i.variantId && (!v || v.productId !== p.id)) throw new BadRequestException(`${p.name}: ye size/rang is product ka nahi`);
      if (p.hasVariants && !v) throw new BadRequestException(`${p.name} — size/rang chunein`);
      const price = Number(v?.price ?? p.price) || 0;
      return {
        productId: p.id, variantId: v?.id ?? null, quantity: Number(i.quantity), price,
        name: v ? `${p.name} (${v.name})` : p.name, service: isServiceProduct(p),
      };
    });
    if (allowNegative) return lines;

    // Pieces coming back on the shelf now can go out again on the new bill.
    const back = new Map<string, number>();
    const itemOf = new Map(sale.items.map((i) => [i.id, i]));
    for (const r of dto.returnItems) {
      const si = itemOf.get(r.saleItemId);
      if (!si?.productId || r.restock === false) continue;
      const k = `${si.productId}:${si.variantLink?.variantId ?? ''}`;
      back.set(k, (back.get(k) ?? 0) + Number(r.quantity));
    }
    const need = new Map<string, { productId: string; variantId: string | null; qty: number; name: string }>();
    for (const l of lines) {
      if (l.service) continue;
      const k = `${l.productId}:${l.variantId ?? ''}`;
      const cur = need.get(k) ?? { productId: l.productId, variantId: l.variantId, qty: 0, name: l.name };
      cur.qty += l.quantity;
      need.set(k, cur);
    }
    if (!need.size) return lines;
    const rows = await this.prisma.shopStock.findMany({
      where: { shopId, OR: [...need.values()].map((n) => ({ productId: n.productId, variantId: n.variantId })) },
      select: { productId: true, variantId: true, stock: true, reserved: true },
    });
    const rowOf = new Map(rows.map((r) => [`${r.productId}:${r.variantId ?? ''}`, r]));
    for (const [k, n] of need) {
      const row = rowOf.get(k);
      const reserved = Number(row?.reserved ?? 0);
      const free = r2(Number(row?.stock ?? 0) - reserved + (back.get(k) ?? 0));
      if (free < n.qty - EPS) {
        throw new BadRequestException(`${n.name}: is branch me ${Math.max(free, 0)} hi bechne ke liye hain${reserved ? ` (${reserved} hold par)` : ''}`);
      }
    }
    return lines;
  }

  /** The result of an exchange already saved for this return (a double click). */
  private async done(tenantId: string, returnId: string) {
    const log = await this.prisma.activityLog.findFirst({
      where: { tenantId, action: ACTION, metadata: { path: ['returnId'], equals: returnId } },
      select: { metadata: true },
    });
    return (log?.metadata as { result?: unknown } | null)?.result ?? null;
  }

  async exchange(user: AuthenticatedUser, scope: ShopScope, dto: ExchangeDto) {
    // The route needs returns.create; the new bill needs the counter too.
    if (!hasPermission(user.role, user.permissions, PERMISSIONS.POS_USE)) {
      throw new ForbiddenException('Exchange me naya bill banta hai — POS ki permission chahiye');
    }
    const sale = await this.bill(user, scope, dto.saleId, true);
    if (!sale.shopId) throw new BadRequestException('Is bill par branch darj nahi — exchange nahi ho sakta');
    if (scope.shopId && scope.shopId !== sale.shopId) {
      throw new BadRequestException(`Ye bill ${sale.shop?.name ?? 'doosri'} branch ka hai — exchange usi branch se karein`);
    }
    const shopId = sale.shopId;
    const { settings, exchangeDays, days, late } = await this.window(user.tenantId, sale.soldAt);
    if (settings?.requireCustomerForSale && !sale.customerId) {
      throw new BadRequestException('Is dukaan me har bill par customer zaroori hai, aur is bill par customer nahi — Return aur POS se alag karein');
    }

    // Sent again a moment later (double click, or after a PIN was asked for
    // the new bill): the return is already saved, so the quantities are
    // left to the returns service, which finds it instead of adding one.
    const recent = await this.prisma.saleReturn.findFirst({
      where: { tenantId: user.tenantId, saleId: sale.id, createdById: user.id, notes: NOTE, returnedAt: { gte: new Date(Date.now() - REPEAT_MS) } },
      orderBy: { returnedAt: 'desc' },
      select: { id: true },
    });
    if (recent) {
      const earlier = await this.done(user.tenantId, recent.id);
      if (earlier) return earlier;
    } else if (sale.status === 'FULLY_RETURNED') {
      throw new BadRequestException('Is bill ka saara maal pehle hi wapas ho chuka');
    }

    // The lines coming back must be on this bill and not returned yet.
    const itemOf = new Map(sale.items.map((i) => [i.id, i]));
    const seen = new Set<string>();
    for (const r of dto.returnItems) {
      const si = itemOf.get(r.saleItemId);
      if (!si || !si.productId || si.usedPhoneId) throw new BadRequestException('Wapas aane wala maal is bill ka nahi');
      if (seen.has(r.saleItemId)) throw new BadRequestException('Ek hi cheez do dafa chuni gayi hai');
      seen.add(r.saleItemId);
      const left = r2(si.quantity - si.returnedQty);
      if (!recent && r.quantity > left + EPS) throw new BadRequestException(`${si.product?.name ?? 'Item'}: sirf ${left} wapas ho sakta hai`);
    }
    const lines = await this.newLines(user, shopId, dto, sale, !!settings?.allowNegativeStock);
    const newTotal = r2(lines.reduce((s, l) => s + r2(l.price * l.quantity), 0));
    if (!sale.customerId && dto.paidNow != null) {
      const rate = unitRefunds(sale);
      const value = dto.returnItems.reduce((s, r) => s + (rate.get(r.saleItemId) ?? 0) * r.quantity, 0);
      if (value + dto.paidNow < newTotal - 0.01) throw new BadRequestException('Bill par customer nahi, is liye udhaar nahi ho sakta — poora farq lein');
    }

    if (late) {
      await requireManagerPin(this.prisma, user, dto.managerPin, `Exchange — bill ${days} din purana (had ${exchangeDays} din)`, false, PIN_NEEDS.refund);
    }

    const ret = await this.returns.create(user, scope, {
      saleId: sale.id,
      refundMethod: 'CASH',
      reason: opt(dto.reason) ?? 'Exchange',
      notes: NOTE,
      items: dto.returnItems.map((r) => ({ saleItemId: r.saleItemId, quantity: r.quantity, restock: r.restock })),
      managerPin: dto.managerPin,
    } as CreateReturnDto);
    if (ret.repeated) {
      // A plain return of the same lines a moment ago already paid the money out.
      if (ret.notes !== NOTE) throw new BadRequestException(`Ye maal abhi ${ret.returnNumber} me wapas ho chuka — naya maal POS se bechein`);
      const earlier = await this.done(user.tenantId, ret.id);
      if (earlier) return earlier;
    }
    // Part of the refund that cleared the old bill's khata is not credit.
    const khata = 'khataAmount' in ret ? Number(ret.khataAmount) : -Number((await this.prisma.customerLedger.aggregate({
      where: { tenantId: user.tenantId, type: 'REFUND', reference: ret.returnNumber }, _sum: { amount: true },
    }))._sum.amount ?? 0);
    const credit = r2(Number(ret.refundAmount) - khata);

    const paidNow = r2(dto.paidNow ?? Math.max(newTotal - credit, 0));
    const method: PaymentMethod = dto.paymentMethod ?? 'CASH';
    const payments = [
      ...(credit > 0 ? [{ method: 'CASH' as PaymentMethod, amount: credit, note: `Exchange credit ${ret.returnNumber}` }] : []),
      ...(paidNow > 0 ? [{ method, amount: paidNow }] : []),
    ];
    let bill: { id: string; saleNumber: string; total: number; paidAmount: number; changeAmount: number; creditAmount: number };
    try {
      bill = await this.sales.create(user, new ShopScope(shopId, false), {
        shopId,
        customerId: sale.customerId ?? undefined,
        paymentMethod: payments[0]?.method ?? method,
        paidAmount: r2(credit + paidNow),
        ...(payments.length && { payments }),
        allowCredit: sale.customerId ? true : undefined,
        managerPin: dto.managerPin,
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? undefined, quantity: l.quantity, note: `Exchange — ${ret.returnNumber}` })),
      } as CreateSaleDto);
    } catch (e) {
      // A PIN request goes back as it is: the till asks for it and sends the
      // exchange again, which finds this return and only makes the bill.
      if (e instanceof ForbiddenException && /PIN chahiye/.test(e.message)) throw e;
      const why = e instanceof HttpException ? e.message : 'server ka masla';
      throw new BadRequestException(
        `Wapsi ${ret.returnNumber} ho gayi (customer ke Rs ${credit}), lekin naya bill nahi bana: ${why}. POS se bill banayein aur Rs ${credit} payment me ginein.`,
      );
    }

    const result = {
      returnId: ret.id, returnNumber: ret.returnNumber, refundAmount: r2(Number(ret.refundAmount)), khataAmount: r2(khata), credit,
      paidNow, days, late,
      sale: {
        id: bill.id, saleNumber: bill.saleNumber, total: bill.total, paidAmount: bill.paidAmount,
        changeAmount: bill.changeAmount, creditAmount: bill.creditAmount,
      },
    };
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId, userId: user.id, action: ACTION, entityType: 'Sale', entityId: bill.id,
        description: `Exchange: bill ${sale.saleNumber} ka maal wapas (${ret.returnNumber}), naya bill ${bill.saleNumber}${late ? ` — ${days} din baad, PIN se` : ''}`,
        metadata: { returnId: ret.id, fromSaleId: sale.id, result } as unknown as Prisma.InputJsonValue,
      },
    });
    return result;
  }
}
