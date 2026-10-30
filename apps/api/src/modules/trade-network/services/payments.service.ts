/**
 * Two-sided khata. A payment is posted at once in the books of the side that
 * records it, and shows on the other side as "pending confirmation" until
 * that side confirms; only then is it posted there. Nothing is ever posted
 * twice: each TradePayment holds the one ledger row it made on each side,
 * and the payment scan (sync.service) skips rows already held.
 *
 *   seller confirms  → PAYMENT_RECEIVED on the buyer's customer record (a
 *                      verified network collection, as at the counter)
 *   buyer confirms   → PAYMENT_MADE on the seller's supplier record
 *   dispute          → stays out of the other side's books; the recorder
 *                      can cancel a network-recorded payment, which writes
 *                      a reversing adjustment in their own books.
 *
 * The statement both sides see is built only from the link's records:
 * delivered invoices (less returns) and confirmed payments.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TradePayment } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { refreshSettlements } from '../../../common/helpers/sale-settlement.helper';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { NotificationsService } from '../../notifications/notifications.service';
import { SupplierLedgerService } from '../../purchasing/supplier-ledger/supplier-ledger.service';
import { postCollection } from '../../distribution/distribution.support';
import { tidyCustomerBalance } from '../../sales/returns/returns.helpers';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { DisputeDto, PaymentsQueryDto, RecordPaymentDto } from '../dto/trade.dto';
import { DONE_STATUSES, r2, type TradeStatus } from '../helpers/trade-rules';
import { businessCards, linkFor, notify, requirePerm, requireSideRead, type Side } from '../trade-network.support';
import { TradeSyncService } from './sync.service';

type Db = Prisma.TransactionClient;

const METHOD_TEXT: Record<string, string> = { CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa' };

@Injectable()
export class TradePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierLedger: SupplierLedgerService,
    private readonly notifications: NotificationsService,
    private readonly sync: TradeSyncService,
  ) {}

  /* ───────────── posting on one side ───────────── */

  /** PAYMENT_RECEIVED on the buyer's customer record in the seller's books; returns the ledger row id. */
  private async postSellerSide(tx: Db, user: AuthenticatedUser, link: { customerId: string | null }, p: { amount: number; method: string; reference?: string | null; note?: string | null }) {
    if (!link.customerId) throw new BadRequestException('Link par customer nahi');
    const customer = await tx.customer.findFirst({ where: { id: link.customerId, tenantId: user.tenantId }, select: { id: true, routeId: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const route = customer.routeId ? await tx.distRoute.findFirst({ where: { id: customer.routeId, tenantId: user.tenantId }, select: { shopId: true } }) : null;
    const settings = await tx.distributionSettings.findUnique({ where: { tenantId: user.tenantId }, select: { defaultShopId: true } });
    const c = await tx.distCollection.create({
      data: {
        tenantId: user.tenantId, customerId: customer.id, kind: 'RECOVERY', amount: r2(p.amount), method: p.method,
        reference: p.reference?.trim() || null, note: p.note?.trim() || 'Nafaa network payment', status: 'PENDING',
        shopId: route?.shopId ?? settings?.defaultShopId ?? null, collectedById: user.id,
      },
    });
    const ok = await postCollection(tx, c, user.id);
    if (!ok) throw new BadRequestException('Payment post nahi hui');
    const row = await tx.distCollection.findUniqueOrThrow({ where: { id: c.id }, select: { ledgerId: true } });
    return row.ledgerId!;
  }

  /** PAYMENT_MADE on the seller's supplier record in the buyer's books; returns the ledger row id. */
  private async postBuyerSide(tx: Db, user: AuthenticatedUser, link: { supplierId: string | null }, p: { amount: number; method: string; reference?: string | null; note?: string | null; paidAt?: Date }) {
    if (!link.supplierId) throw new BadRequestException('Link par supplier nahi');
    const s = await tx.supplier.findFirst({ where: { id: link.supplierId, tenantId: user.tenantId }, select: { id: true, outstandingDue: true } });
    if (!s) throw new NotFoundException('Supplier nahi mila');
    if (s.outstandingDue < p.amount - 0.001) {
      throw new BadRequestException(`Supplier ka khata abhi Rs ${Math.round(s.outstandingDue)} hai — pehle aaya hua maal "Maal mil gaya" se receive karein, phir payment`);
    }
    const row = await this.supplierLedger.post(user, s.id, 'PAYMENT_MADE', r2(p.amount), {
      reference: p.reference?.trim() || undefined, note: p.note?.trim() || 'Nafaa network payment', paymentMethod: p.method,
      ...(p.paidAt && { entryDate: p.paidAt.toISOString() }),
    }, tx);
    return row.id;
  }

  /* ───────────── record, confirm, dispute, cancel ───────────── */

  async record(user: AuthenticatedUser, linkId: string, dto: RecordPaymentDto) {
    requirePerm(user, PERMISSIONS.TRADE_PAYMENTS_MANAGE);
    const link = await linkFor(this.prisma, user.tenantId, linkId);
    if (!['ACTIVE', 'PAUSED', 'UNLINKED'].includes(link.status) || !link.activatedAt) throw new BadRequestException('Link abhi chalu nahi');
    const amount = r2(dto.amount);
    const method = dto.method ?? 'CASH';
    const paidAt = dto.paidAt ? new Date(Math.min(new Date(dto.paidAt).getTime(), Date.now())) : new Date();
    let tradeOrderId: string | null = null;
    if (dto.tradeOrderId) {
      const o = await this.prisma.tradeOrder.findFirst({ where: { id: dto.tradeOrderId, linkId: link.id }, select: { id: true } });
      if (!o) throw new BadRequestException('Order is link ka nahi');
      tradeOrderId = o.id;
    }
    const payment = await this.prisma.$transaction(async (tx) => {
      const ledgerId = link.side === 'SELLER'
        ? await this.postSellerSide(tx, user, link, { amount, method, reference: dto.reference, note: dto.note })
        : await this.postBuyerSide(tx, user, link, { amount, method, reference: dto.reference, note: dto.note, paidAt });
      return tx.tradePayment.create({
        data: {
          linkId: link.id, sellerTenantId: link.sellerTenantId, buyerTenantId: link.buyerTenantId, source: link.side, status: 'PENDING',
          amount, method, reference: dto.reference?.trim() || null, note: dto.note?.trim() || null, paidAt, tradeOrderId,
          recordedById: user.id, ...(link.side === 'SELLER' ? { sellerLedgerId: ledgerId } : { buyerLedgerId: ledgerId }),
        },
      });
    }, { timeout: 20_000 });
    if (link.side === 'SELLER' && link.customerId) refreshSettlements(this.prisma, user.tenantId, link.customerId);
    const me = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId)?.name ?? '';
    void notify(this.notifications, {
      tenantId: link.side === 'SELLER' ? link.buyerTenantId : link.sellerTenantId, kind: 'PAYMENT_TO_CONFIRM', refId: payment.id, type: 'PAYMENT_RECEIVED',
      title: 'Payment confirm karein', message: `${me} ne Rs ${amount.toLocaleString('en-PK')} (${METHOD_TEXT[method] ?? method}) ki payment likhi hai`,
      link: link.side === 'SELLER' ? `/network/suppliers/${link.id}?tab=payments` : `/network/links/${link.id}?tab=payments`,
    });
    return this.view(payment, link.side);
  }

  private async mine(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.tradePayment.findFirst({ where: { id, OR: [{ sellerTenantId: user.tenantId }, { buyerTenantId: user.tenantId }] }, include: { link: true } });
    if (!p) throw new NotFoundException('Payment nahi mili');
    const side: Side = p.sellerTenantId === user.tenantId ? 'SELLER' : 'BUYER';
    return { p, side };
  }

  /** The other side confirms: the payment is posted in their books too. */
  async confirm(user: AuthenticatedUser, id: string) {
    requirePerm(user, PERMISSIONS.TRADE_PAYMENTS_MANAGE);
    const { p, side } = await this.mine(user, id);
    if (p.source === side) throw new BadRequestException('Apni likhi payment doosri party confirm karti hai');
    if (p.status !== 'PENDING' && p.status !== 'DISPUTED') throw new BadRequestException(`Payment ${p.status} hai`);
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.tradePayment.updateMany({
        where: { id: p.id, status: { in: ['PENDING', 'DISPUTED'] }, ...(side === 'SELLER' ? { sellerLedgerId: null } : { buyerLedgerId: null }) },
        data: { status: 'CONFIRMED', decidedById: user.id, decidedAt: new Date(), disputeReason: null },
      });
      if (!claim.count) throw new BadRequestException('Payment pehle hi badal chuki');
      const pay = { amount: p.amount, method: p.method, reference: p.reference, note: p.note ? `Network: ${p.note}` : 'Nafaa network payment (confirm)', paidAt: p.paidAt };
      const ledgerId = side === 'SELLER' ? await this.postSellerSide(tx, user, p.link, pay) : await this.postBuyerSide(tx, user, p.link, pay);
      await tx.tradePayment.update({ where: { id: p.id }, data: side === 'SELLER' ? { sellerLedgerId: ledgerId } : { buyerLedgerId: ledgerId } });
    }, { timeout: 20_000 });
    if (side === 'SELLER' && p.link.customerId) refreshSettlements(this.prisma, user.tenantId, p.link.customerId);
    const me = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId)?.name ?? '';
    void notify(this.notifications, {
      tenantId: side === 'SELLER' ? p.buyerTenantId : p.sellerTenantId, kind: 'PAYMENT_CONFIRMED', refId: p.id, type: 'SUCCESS',
      title: 'Payment confirm ho gayi', message: `${me} ne Rs ${p.amount.toLocaleString('en-PK')} ki payment confirm kar di — dono khate barabar`,
      link: side === 'SELLER' ? `/network/suppliers/${p.linkId}?tab=payments` : `/network/links/${p.linkId}?tab=payments`,
    });
    return this.view((await this.prisma.tradePayment.findUniqueOrThrow({ where: { id: p.id } })), side);
  }

  async dispute(user: AuthenticatedUser, id: string, dto: DisputeDto) {
    requirePerm(user, PERMISSIONS.TRADE_PAYMENTS_MANAGE);
    const { p, side } = await this.mine(user, id);
    if (p.source === side) throw new BadRequestException('Apni likhi payment par ikhtilaf nahi');
    const done = await this.prisma.tradePayment.updateMany({ where: { id: p.id, status: 'PENDING' }, data: { status: 'DISPUTED', decidedById: user.id, decidedAt: new Date(), disputeReason: dto.reason.trim() } });
    if (!done.count) throw new BadRequestException('Sirf pending payment par ikhtilaf ho sakta hai');
    const me = (await businessCards(this.prisma, [user.tenantId])).get(user.tenantId)?.name ?? '';
    void notify(this.notifications, {
      tenantId: side === 'SELLER' ? p.buyerTenantId : p.sellerTenantId, kind: 'PAYMENT_DISPUTED', refId: p.id, type: 'WARNING',
      title: 'Payment par ikhtilaf', message: `${me}: Rs ${p.amount.toLocaleString('en-PK')} — ${dto.reason.trim()}`,
      link: side === 'SELLER' ? `/network/suppliers/${p.linkId}?tab=payments` : `/network/links/${p.linkId}?tab=payments`,
    });
    return this.view((await this.prisma.tradePayment.findUniqueOrThrow({ where: { id: p.id } })), side);
  }

  /** The recorder takes back a payment the other side has not confirmed; their own books get a reversing entry. */
  async cancel(user: AuthenticatedUser, id: string) {
    requirePerm(user, PERMISSIONS.TRADE_PAYMENTS_MANAGE);
    const { p, side } = await this.mine(user, id);
    if (p.source !== side) throw new BadRequestException('Sirf likhne wali party payment wapas le sakti hai');
    if (!p.recordedById) throw new BadRequestException('Yeh payment aap ke khate se aayi hai — wahin durust karein');
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.tradePayment.updateMany({ where: { id: p.id, status: { in: ['PENDING', 'DISPUTED'] } }, data: { status: 'CANCELLED', decidedAt: new Date() } });
      if (!claim.count) throw new BadRequestException('Confirm hui payment wapas nahi hoti');
      if (side === 'SELLER') {
        const { balance: raw } = await tx.customer.update({ where: { id: p.link.customerId! }, data: { balance: { increment: p.amount } }, select: { balance: true } });
        const balance = await tidyCustomerBalance(tx, p.link.customerId!, raw);
        await tx.customerLedger.create({
          data: {
            tenantId: user.tenantId, customerId: p.link.customerId!, createdById: user.id, type: 'ADJUSTMENT', amount: p.amount, balanceAfter: balance,
            reference: p.reference, note: 'Network payment wapas li (cancel)',
          },
        });
      } else {
        await this.supplierLedger.post(user, p.link.supplierId!, 'ADJUSTMENT', p.amount, { reference: p.reference ?? undefined, note: 'Network payment wapas li (cancel)' }, tx);
      }
    }, { timeout: 20_000 });
    if (side === 'SELLER' && p.link.customerId) refreshSettlements(this.prisma, user.tenantId, p.link.customerId);
    return this.view((await this.prisma.tradePayment.findUniqueOrThrow({ where: { id: p.id } })), side);
  }

  private view(p: TradePayment, side: Side) {
    return {
      id: p.id, linkId: p.linkId, source: p.source, status: p.status, amount: p.amount, method: p.method, reference: p.reference, note: p.note,
      paidAt: p.paidAt, tradeOrderId: p.tradeOrderId, disputeReason: p.disputeReason, decidedAt: p.decidedAt, createdAt: p.createdAt,
      mine: p.source === side,
      postedHere: side === 'SELLER' ? !!p.sellerLedgerId : !!p.buyerLedgerId,
      postedThere: side === 'SELLER' ? !!p.buyerLedgerId : !!p.sellerLedgerId,
      canConfirm: p.source !== side && (p.status === 'PENDING' || p.status === 'DISPUTED'),
      canDispute: p.source !== side && p.status === 'PENDING',
      canCancel: p.source === side && !!p.recordedById && (p.status === 'PENDING' || p.status === 'DISPUTED'),
    };
  }

  /** Payments waiting on the caller's side, across links, or one link's list. */
  async list(user: AuthenticatedUser, q: PaymentsQueryDto) {
    const where: Prisma.TradePaymentWhereInput = { OR: [{ sellerTenantId: user.tenantId }, { buyerTenantId: user.tenantId }] };
    if (q.linkId) {
      const link = await linkFor(this.prisma, user.tenantId, q.linkId);
      requireSideRead(user, link.side);
      where.linkId = link.id;
    }
    if (q.status) where.status = { in: q.status.split(',').map((s) => s.trim().toUpperCase()) };
    const rows = await this.prisma.tradePayment.findMany({ where, orderBy: { paidAt: 'desc' }, take: 300 });
    return rows.map((p) => this.view(p, p.sellerTenantId === user.tenantId ? 'SELLER' : 'BUYER'));
  }

  /* ───────────── statement ───────────── */

  /** The account both sides agree on, from the link's own records only. */
  async statement(user: AuthenticatedUser, linkId: string) {
    const link = await linkFor(this.prisma, user.tenantId, linkId);
    requireSideRead(user, link.side);
    await this.sync.syncOrders({ linkId: link.id }, 100).catch(() => undefined);
    await this.sync.scanLink(link).catch(() => undefined);
    const [orders, payments, cards] = await Promise.all([
      this.prisma.tradeOrder.findMany({ where: { linkId: link.id, status: { not: 'CANCELLED' } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.tradePayment.findMany({ where: { linkId: link.id }, orderBy: { paidAt: 'asc' } }),
      businessCards(this.prisma, [link.sellerTenantId, link.buyerTenantId]),
    ]);
    type Row = { at: Date; kind: 'INVOICE' | 'RETURN' | 'PAYMENT'; ref: string | null; text: string; debit: number; credit: number; state: string; counts: boolean; orderId?: string; paymentId?: string };
    const rows: Row[] = [];
    let onTheWay = 0;
    let delivered = 0;
    let returns = 0;
    for (const o of orders) {
      if (o.invoiceTotal == null) continue;
      const done = DONE_STATUSES.includes(o.status as TradeStatus);
      if (!done) onTheWay += o.invoiceTotal;
      rows.push({
        at: o.invoicedAt ?? o.createdAt, kind: 'INVOICE', ref: o.invoiceNumber, text: `Invoice · Order ${o.orderNumber ?? ''}`,
        debit: r2(o.invoiceTotal), credit: 0, counts: done,
        state: !done ? 'ON_THE_WAY' : o.receiveState === 'RECEIVED' || o.receiveState === 'NOTHING' ? 'BOTH' : 'BUYER_TO_RECEIVE',
        orderId: o.id,
      });
      if (done) delivered += o.invoiceTotal;
      if (done && o.returnsValue > 0) {
        returns += o.returnsValue;
        rows.push({ at: o.deliveredAt ?? o.updatedAt, kind: 'RETURN', ref: o.invoiceNumber, text: `Maal wapas · Order ${o.orderNumber ?? ''}`, debit: 0, credit: r2(o.returnsValue), counts: true, state: 'BOTH', orderId: o.id });
      }
    }
    let paid = 0;
    const pending = { fromSeller: 0, fromBuyer: 0, disputed: 0 };
    for (const p of payments) {
      if (p.status === 'CANCELLED') continue;
      const ok = p.status === 'CONFIRMED';
      if (ok) paid += p.amount;
      else if (p.status === 'DISPUTED') pending.disputed += p.amount;
      else if (p.source === 'SELLER') pending.fromSeller += p.amount;
      else pending.fromBuyer += p.amount;
      rows.push({
        at: p.paidAt, kind: 'PAYMENT', ref: p.reference, text: `Payment · ${METHOD_TEXT[p.method] ?? p.method}${p.source === 'SELLER' ? ' (supplier ne likhi)' : ' (dukaan ne likhi)'}`,
        debit: 0, credit: r2(p.amount), counts: ok, state: p.status, paymentId: p.id,
      });
    }
    rows.sort((a, b) => a.at.getTime() - b.at.getTime());
    let running = 0;
    const entries = rows.map((r) => {
      if (r.counts) running = r2(running + r.debit - r.credit);
      return { ...r, balance: r.counts ? running : null };
    });
    const ownBalance = link.side === 'SELLER'
      ? (link.customerId ? (await this.prisma.customer.findFirst({ where: { id: link.customerId, tenantId: user.tenantId }, select: { balance: true } }))?.balance ?? null : null)
      : (link.supplierId ? (await this.prisma.supplier.findFirst({ where: { id: link.supplierId, tenantId: user.tenantId }, select: { outstandingDue: true } }))?.outstandingDue ?? null : null);
    return {
      link: { id: link.id, side: link.side, status: link.status, activatedAt: link.activatedAt },
      seller: cards.get(link.sellerTenantId) ?? null,
      buyer: cards.get(link.buyerTenantId) ?? null,
      totals: {
        delivered: r2(delivered), returns: r2(returns), paid: r2(paid), agreedBalance: r2(delivered - returns - paid), onTheWay: r2(onTheWay),
        pendingFromSeller: r2(pending.fromSeller), pendingFromBuyer: r2(pending.fromBuyer), disputed: r2(pending.disputed),
        toReceive: orders.filter((o) => o.receiveState === 'DRAFT' || o.receiveState === 'NEEDS_MAP').length,
      },
      /** The caller's own khata balance with the other party (it may include business from before the link). */
      ownBalance: ownBalance == null ? null : r2(ownBalance),
      entries,
    };
  }
}
