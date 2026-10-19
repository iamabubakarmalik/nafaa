/**
 * Salon gift vouchers: sold as their own bill (paid in full; income on the
 * day of sale, like a package), then spent at the counter against the
 * balance, in one go or over several visits, until used up, expired or
 * cancelled. The rules for spending and giving back are in voucher-rules.ts.
 *
 * Cancelling only stops the voucher; money goes back by voiding or
 * returning the voucher's own bill in Sales history, which cancels it too.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale } from '../../_shared/industry-sale.helper';
import { assertCan, r2, salonClock } from '../common/salon-common';
import { SellVoucherDto, VoucherListQuery } from './dto/gift-voucher.dto';
import { normalizeCode, voucherProblem, voucherSaleNumber } from './voucher-rules';

const P = PERMISSIONS;
/** No 0/O or 1/I, so a code read out over the phone is not mistaken. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => `GV-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;

@Injectable()
export class GiftVouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private get db() {
    return this.prisma as unknown as Prisma.TransactionClient;
  }

  async sell(user: AuthenticatedUser, dto: SellVoucherDto) {
    assertCan(user, [P.POS_USE], 'Gift voucher bechne');
    const tenantId = user.tenantId;
    const amount = r2(dto.amount);
    const customer = dto.customerId
      ? await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true, name: true } })
      : null;
    if (dto.customerId && !customer) throw new NotFoundException('Customer nahi mila');

    let expiryDate: Date | null = null;
    if (dto.expiryDate) {
      const clock = await salonClock(this.tz, tenantId);
      if (dto.expiryDate < clock.keyOf(new Date())) throw new BadRequestException('Aakhri din aaj ya baad ka chunein');
      expiryDate = new Date(clock.range(dto.expiryDate, dto.expiryDate)!.lt.getTime() - 1);
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      const code = newCode();
      try {
        return await this.prisma.$transaction(async (tx) => {
          const voucher = await tx.salonGiftVoucher.create({
            data: { tenantId, shopId: dto.shopId ?? user.shopId ?? null, code, amount, balance: amount, customerId: customer?.id ?? null, expiryDate },
          });
          const sale = await postIndustrySale(tx, user, {
            saleNumber: voucherSaleNumber(code),
            sourceRef: code,
            shopId: dto.shopId,
            customerId: customer?.id,
            lines: [{ label: `Gift voucher ${code}`, amount }],
            paidAmount: amount,
            paymentMethod: dto.paymentMethod,
          });
          return tx.salonGiftVoucher.update({ where: { id: voucher.id }, data: { saleId: sale.id, shopId: sale.shopId } });
        });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new BadRequestException('Voucher code nahi bana — dobara koshish karein');
  }

  /** Marks vouchers past their last day as expired. */
  private expire(tenantId: string) {
    return this.prisma.salonGiftVoucher.updateMany({
      where: { tenantId, status: 'ACTIVE', expiryDate: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }

  async list(user: AuthenticatedUser, q: VoucherListQuery) {
    assertCan(user, [P.POS_USE, P.CUSTOMERS_VIEW], 'Gift voucher dekhne');
    const tenantId = user.tenantId;
    await this.expire(tenantId);
    const term = q.search?.trim();
    const customerIds = term
      ? (await this.prisma.customer.findMany({
          where: { tenantId, OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: term } }] },
          select: { id: true }, take: 200,
        })).map((c) => c.id)
      : [];
    const [rows, active] = await Promise.all([
      this.prisma.salonGiftVoucher.findMany({
        where: {
          tenantId,
          ...(q.status && { status: q.status }),
          ...(q.customerId && { customerId: q.customerId }),
          ...(term && { OR: [{ code: { contains: normalizeCode(term) } }, { customerId: { in: customerIds } }] }),
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.salonGiftVoucher.aggregate({ where: { tenantId, status: 'ACTIVE' }, _sum: { balance: true, amount: true }, _count: true }),
    ]);
    const [customers, sales] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId, id: { in: [...new Set(rows.map((r) => r.customerId).filter((x): x is string => !!x))] } },
        select: { id: true, name: true, phone: true },
      }),
      this.prisma.sale.findMany({
        where: { tenantId, id: { in: rows.map((r) => r.saleId).filter((x): x is string => !!x) } },
        select: { id: true, saleNumber: true, status: true },
      }),
    ]);
    const customerOf = new Map(customers.map((c) => [c.id, c]));
    const saleOf = new Map(sales.map((s) => [s.id, s]));
    return {
      items: rows.map((r) => ({
        ...r,
        used: r2(r.amount - r.balance),
        customer: r.customerId ? customerOf.get(r.customerId) ?? null : null,
        sale: r.saleId ? saleOf.get(r.saleId) ?? null : null,
      })),
      totals: { active: active._count, balance: r2(active._sum.balance ?? 0), sold: r2(active._sum.amount ?? 0) },
    };
  }

  /** One voucher with the bills it paid for. */
  async getOne(user: AuthenticatedUser, id: string) {
    assertCan(user, [P.POS_USE, P.CUSTOMERS_VIEW], 'Gift voucher dekhne');
    await this.expire(user.tenantId);
    const v = await this.prisma.salonGiftVoucher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Voucher nahi mila');
    const lines = await this.prisma.saleItem.findMany({
      where: { internalNote: { contains: `[Voucher ${v.code} ` }, sale: { tenantId: user.tenantId } },
      select: { internalNote: true, sale: { select: { id: true, saleNumber: true, status: true, createdAt: true } } },
      orderBy: { sale: { createdAt: 'desc' } },
      take: 500,
    });
    const bills = new Map<string, { saleId: string; saleNumber: string; status: string; at: Date; amount: number; givenBack: number }>();
    for (const l of lines) {
      const m = new RegExp(`\\[Voucher ${v.code} Rs ([\\d.]+)( wapas)?\\]`).exec(l.internalNote ?? '');
      if (!m) continue;
      const row = bills.get(l.sale.id) ?? { saleId: l.sale.id, saleNumber: l.sale.saleNumber, status: l.sale.status, at: l.sale.createdAt, amount: 0, givenBack: 0 };
      row.amount = r2(row.amount + Number(m[1]));
      if (m[2]) row.givenBack = r2(row.givenBack + Number(m[1]));
      bills.set(l.sale.id, row);
    }
    const [customer, sale] = await Promise.all([
      v.customerId ? this.prisma.customer.findFirst({ where: { id: v.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true } }) : null,
      v.saleId ? this.prisma.sale.findFirst({ where: { id: v.saleId, tenantId: user.tenantId }, select: { id: true, saleNumber: true, status: true } }) : null,
    ]);
    return { ...v, used: r2(v.amount - v.balance), customer, sale, uses: [...bills.values()] };
  }

  /** What the counter needs to take a voucher: its balance, or why it cannot be used. */
  async lookup(user: AuthenticatedUser, code: string) {
    assertCan(user, [P.POS_USE], 'Gift voucher lagane');
    const v = await this.prisma.salonGiftVoucher.findFirst({ where: { tenantId: user.tenantId, code: normalizeCode(code ?? '') } });
    if (!v) throw new NotFoundException(`Voucher ${normalizeCode(code ?? '')} nahi mila`);
    const customer = v.customerId
      ? await this.prisma.customer.findFirst({ where: { id: v.customerId, tenantId: user.tenantId }, select: { name: true } })
      : null;
    return {
      id: v.id, code: v.code, amount: v.amount, balance: v.balance, status: v.status, expiryDate: v.expiryDate,
      customerName: customer?.name ?? null, problem: await voucherProblem(this.db, v),
    };
  }

  async cancel(user: AuthenticatedUser, id: string) {
    assertCan(user, [P.POS_USE], 'Gift voucher cancel karne');
    const v = await this.prisma.salonGiftVoucher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Voucher nahi mila');
    if (v.status === 'CANCELLED') throw new BadRequestException('Ye voucher pehle hi cancel hai');
    return this.prisma.salonGiftVoucher.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
