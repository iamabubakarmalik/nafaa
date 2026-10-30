/**
 * Keeps the buyer's side in step with the seller's books, without hooks in
 * the distribution code: every 30 seconds (and whenever either side opens a
 * network screen) open network orders are compared with their sales orders.
 *
 *   - A forward move (approved, invoiced, on the van, delivered) is copied
 *     to the buyer's order and announced once; the claim on the old status
 *     makes concurrent runs announce it only once.
 *   - A delivered order (DELIVERED, PARTIAL, RETURNED) becomes a draft
 *     Purchase from the seller's Supplier record in the buyer's books, with
 *     what was actually delivered at the invoice's net price (scheme free
 *     goods at zero). Products are matched (remembered, barcode, SKU, name);
 *     unmatched ones wait for the buyer to match them once. The purchase
 *     total is balanced to the seller's khata figure (invoice less returns).
 *   - With auto-receive on, the draft is received into stock at once.
 *
 * Payments: each side's khata is scanned for payments with the other party
 * since the link started; each one not yet known is mirrored as a pending
 * TradePayment for the other side to confirm (see payments.service).
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, TradeLink, TradeOrder } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { NotificationsService } from '../../notifications/notifications.service';
import { PurchasesService } from '../../purchasing/purchases/purchases.service';
import type { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import type { ProductMapLineDto } from '../dto/trade.dto';
import {
  DONE_STATUSES, OPEN_TRADE_STATUSES, balancingFigures, deliveredLines, isForward, r2, tradeStatusOf, type TradeStatus,
} from '../helpers/trade-rules';
import { actorFor, businessCards, notify } from '../trade-network.support';
import { TradeCatalogService } from './catalog.service';

const STALE_CLAIM_MS = 2 * 60_000;
const SCAN_OVERLAP_MS = 10 * 60_000;

const STATUS_NEWS: Partial<Record<TradeStatus, { title: string; text: (seller: string, no: string) => string; type: 'INFO' | 'SUCCESS' | 'WARNING' }>> = {
  APPROVED: { title: 'Order approve ho gaya', text: (s, n) => `${s} ne Order ${n} approve kar diya`, type: 'SUCCESS' },
  INVOICED: { title: 'Invoice ban gayi', text: (s, n) => `${s} ne Order ${n} ki Invoice bana di`, type: 'INFO' },
  LOADED: { title: 'Maal raste me hai', text: (s, n) => `${s} ka Order ${n} gaari par load ho gaya`, type: 'INFO' },
  DELIVERED: { title: 'Maal deliver ho gaya', text: (s, n) => `${s} ka Order ${n} deliver ho gaya — receive karein`, type: 'SUCCESS' },
  PARTIAL: { title: 'Maal deliver (kuch wapas)', text: (s, n) => `${s} ka Order ${n} deliver hua, kuch maal wapas gaya — receive karein`, type: 'INFO' },
  RETURNED: { title: 'Order wapas', text: (s, n) => `${s} ka Order ${n} deliver nahi hua, sab maal wapas`, type: 'WARNING' },
  CANCELLED: { title: 'Order cancel', text: (s, n) => `${s} ne Order ${n} cancel kar diya`, type: 'WARNING' },
};

@Injectable()
export class TradeSyncService {
  private readonly logger = new Logger(TradeSyncService.name);
  private running = false;
  private ticks = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly purchases: PurchasesService,
    private readonly catalog: TradeCatalogService,
  ) {}

  @Cron('*/30 * * * * *', { name: 'trade-network-sync' })
  async sweep() {
    if (process.env.DISABLE_TRADE_SYNC === '1' || this.running) return;
    this.running = true;
    try {
      await this.syncOrders({});
      // Payments every two minutes.
      if (this.ticks++ % 4 === 0) await this.scanPayments({});
    } catch (e) {
      this.logger.warn(`Trade sync: ${(e as Error)?.message}`);
    } finally {
      this.running = false;
    }
  }

  /* ───────────── orders ───────────── */

  /** Brings open orders (and delivered ones not yet prepared for receiving) in line with the seller. */
  async syncOrders(where: Prisma.TradeOrderWhereInput, limit = 200) {
    const rows = await this.prisma.tradeOrder.findMany({
      where: {
        AND: [where, {
          OR: [
            { status: { in: OPEN_TRADE_STATUSES } },
            { status: { in: DONE_STATUSES }, receiveState: { in: ['NONE', 'PREPARING'] } },
          ],
        }],
      },
      orderBy: { syncedAt: { sort: 'asc', nulls: 'first' } },
      take: limit,
    });
    for (const t of rows) {
      await this.syncOne(t).catch((e) => this.logger.warn(`Trade order ${t.id}: ${(e as Error)?.message}`));
    }
    return rows.length;
  }

  async syncOne(t: TradeOrder) {
    if (!t.salesOrderId) return;
    const so = await this.prisma.salesOrder.findFirst({ where: { id: t.salesOrderId, tenantId: t.sellerTenantId } });
    if (!so) return;
    const next = tradeStatusOf(so.status);
    const sale = so.saleId
      ? await this.prisma.sale.findFirst({ where: { id: so.saleId, tenantId: t.sellerTenantId }, select: { saleNumber: true, total: true } })
      : null;
    const done = DONE_STATUSES.includes(next);
    const now = new Date();
    const data: Prisma.TradeOrderUncheckedUpdateManyInput = {
      status: next, syncedAt: now, orderNumber: so.orderNumber,
      invoiceNumber: sale?.saleNumber ?? t.invoiceNumber, invoiceTotal: sale ? r2(sale.total) : t.invoiceTotal,
      returnsValue: r2(so.returnsValue), cashAtDelivery: r2(so.cashCollected),
      deliveredValue: done && sale ? r2(sale.total - so.returnsValue) : t.deliveredValue,
      approvedAt: t.approvedAt ?? so.approvedAt ?? null,
      invoicedAt: t.invoicedAt ?? so.invoicedAt ?? null,
      loadedAt: t.loadedAt ?? (['LOADED', ...DONE_STATUSES].includes(next) && so.loadSheetId ? now : null),
      deliveredAt: t.deliveredAt ?? (done ? so.deliveredAt ?? now : null),
      cancelledAt: t.cancelledAt ?? (next === 'CANCELLED' ? so.cancelledAt ?? now : null),
    };
    if (next !== t.status) {
      const claim = await this.prisma.tradeOrder.updateMany({ where: { id: t.id, status: t.status }, data });
      if (!claim.count) return;
      if (isForward(t.status, next)) {
        const news = STATUS_NEWS[next];
        if (news) {
          const seller = (await businessCards(this.prisma, [t.sellerTenantId])).get(t.sellerTenantId)?.name ?? 'Supplier';
          void notify(this.notifications, {
            tenantId: t.buyerTenantId, kind: `ORDER_${next}`, refId: t.id, type: news.type,
            title: news.title, message: news.text(seller, so.orderNumber), link: `/network/orders?id=${t.id}`,
          });
        }
      }
    } else {
      await this.prisma.tradeOrder.update({ where: { id: t.id }, data: data as Prisma.TradeOrderUncheckedUpdateInput });
    }
    if (done) await this.prepareReceiving(t.id).catch((e) => this.logger.warn(`Receiving ${t.id}: ${(e as Error)?.message}`));
  }

  /**
   * Makes the draft Purchase for a delivered order once every line is
   * matched. `maps` are the buyer's own choices for unmatched lines.
   * Returns the receive state reached.
   */
  async prepareReceiving(id: string, opts: { maps?: ProductMapLineDto[] } = {}): Promise<string> {
    const t = await this.prisma.tradeOrder.findUnique({ where: { id }, include: { link: true } });
    if (!t || !DONE_STATUSES.includes(t.status as TradeStatus)) return t?.receiveState ?? 'NONE';
    if (t.purchaseId || ['DRAFT', 'RECEIVING', 'RECEIVED', 'NOTHING'].includes(t.receiveState)) return t.receiveState;
    const before = t.receiveState === 'PREPARING' ? 'NONE' : t.receiveState;
    const claim = await this.prisma.tradeOrder.updateMany({
      where: {
        id, purchaseId: null,
        OR: [{ receiveState: { in: ['NONE', 'NEEDS_MAP'] } }, { receiveState: 'PREPARING', updatedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } }],
      },
      data: { receiveState: 'PREPARING' },
    });
    if (!claim.count) return 'BUSY';
    let state = before;
    try {
      state = await this.buildDraft(t, t.link, opts.maps);
      return state;
    } finally {
      if (state === before || state === 'PREPARING') {
        await this.prisma.tradeOrder.updateMany({ where: { id, receiveState: 'PREPARING' }, data: { receiveState: before === 'PREPARING' ? 'NONE' : before } });
      }
    }
  }

  private async buildDraft(t: TradeOrder, link: TradeLink, maps?: ProductMapLineDto[]): Promise<string> {
    const so = await this.prisma.salesOrder.findFirst({ where: { id: t.salesOrderId!, tenantId: t.sellerTenantId }, include: { items: true } });
    if (!so) return 'NONE';
    const lines = deliveredLines(so.items, so.status);
    if (!lines.length) {
      await this.prisma.tradeOrder.update({ where: { id: t.id }, data: { receiveState: 'NOTHING' } });
      return 'NOTHING';
    }
    if (maps?.length) {
      const hints = new Map(lines.filter((l) => !l.free).map((l) => [l.sellerProductId, l.unitCost]));
      await this.prisma.$transaction((tx) => this.catalog.saveMaps(tx, link, maps, hints), { timeout: 30_000 });
    }
    const resolver = await this.catalog.resolveMaps(this.prisma, link, lines.map((l) => ({ productId: l.sellerProductId, variantId: l.sellerVariantId })));
    const missing = lines.filter((l) => !resolver.get(l.sellerProductId, l.sellerVariantId));
    if (missing.length) {
      const first = t.receiveState !== 'NEEDS_MAP';
      await this.prisma.tradeOrder.update({ where: { id: t.id }, data: { receiveState: 'NEEDS_MAP' } });
      if (first) {
        void notify(this.notifications, {
          tenantId: t.buyerTenantId, kind: 'RECEIVE_NEEDS_MAP', refId: t.id, type: 'WARNING',
          title: 'Maal receive karne se pehle', message: `Order ${t.orderNumber ?? ''}: ${missing.length} item apne products se milayein — sirf ek dafa`,
          link: `/network/receiving?id=${t.id}`,
        });
      }
      return 'NEEDS_MAP';
    }

    const tag = `Nafaa network ${t.id}`;
    const actor = await actorFor(this.prisma, t.buyerTenantId, [t.placedById, link.requestedById]);
    let purchase = await this.prisma.purchase.findFirst({ where: { tenantId: t.buyerTenantId, notes: { contains: tag } }, select: { id: true } });
    if (!purchase) {
      const supplierId = await this.supplierFor(link);
      const seller = (await businessCards(this.prisma, [t.sellerTenantId])).get(t.sellerTenantId)?.name ?? 'Supplier';
      const target = t.deliveredValue ?? r2(lines.reduce((s, l) => s + l.baseQty * l.unitCost, 0));
      const figures = balancingFigures(lines, target);
      purchase = await this.purchases.create(actor, new ShopScope(null, true), {
        supplierId, shopId: link.receiveShopId ?? undefined, paymentMethod: 'CASH', receive: false,
        discount: figures.discount, otherCharges: figures.otherCharges,
        notes: `${tag} · ${seller} · Order ${so.orderNumber}`.slice(0, 500), supplierInvoiceNo: (t.invoiceNumber ?? so.orderNumber).slice(0, 60),
        items: lines.map((l) => {
          const m = resolver.get(l.sellerProductId, l.sellerVariantId)!;
          return { productId: m.buyerProductId, variantId: m.buyerVariantId ?? undefined, quantity: l.baseQty, costPrice: l.unitCost };
        }),
      } as never) as { id: string };
    }
    await this.prisma.tradeOrder.update({ where: { id: t.id }, data: { purchaseId: purchase.id, receiveState: 'DRAFT' } });
    if (link.autoReceive) {
      try {
        await this.receiveDraft(t.id, actor);
        return 'RECEIVED';
      } catch (e) {
        this.logger.warn(`Auto receive ${t.id}: ${(e as Error)?.message}`);
      }
    }
    void notify(this.notifications, {
      tenantId: t.buyerTenantId, kind: 'RECEIVE_READY', refId: t.id, type: 'INFO',
      title: 'Purchase tayyar — maal receive karein', message: `Order ${so.orderNumber}: maal milte hi "Maal mil gaya" dabayein`,
      link: `/network/receiving?id=${t.id}`,
    });
    return 'DRAFT';
  }

  /** The seller's Supplier record in the buyer's books, made again if it was removed. */
  private async supplierFor(link: TradeLink) {
    if (link.supplierId) {
      const s = await this.prisma.supplier.findFirst({ where: { id: link.supplierId, tenantId: link.buyerTenantId }, select: { id: true } });
      if (s) return s.id;
    }
    const card = (await businessCards(this.prisma, [link.sellerTenantId])).get(link.sellerTenantId);
    const s = await this.prisma.supplier.create({
      data: { tenantId: link.buyerTenantId, name: card?.name ?? 'Network supplier', phone: card?.phone ?? null, city: card?.city ?? null, notes: 'Nafaa network supplier' },
      select: { id: true },
    });
    await this.prisma.tradeLink.update({ where: { id: link.id }, data: { supplierId: s.id } });
    return s.id;
  }

  /** Receives the whole draft into stock ("Maal mil gaya"). */
  async receiveDraft(id: string, actor: AuthenticatedUser) {
    const t = await this.prisma.tradeOrder.findUnique({ where: { id } });
    if (!t?.purchaseId) throw new Error('Purchase abhi tayyar nahi');
    const claim = await this.prisma.tradeOrder.updateMany({ where: { id, receiveState: 'DRAFT' }, data: { receiveState: 'RECEIVING' } });
    if (!claim.count) return t.receiveState;
    try {
      const p = await this.prisma.purchase.findFirst({ where: { id: t.purchaseId, tenantId: t.buyerTenantId }, include: { items: true } });
      if (!p) throw new Error('Purchase nahi mili');
      if (p.status === 'PENDING' || p.status === 'PARTIAL') {
        const items = p.items
          .filter((i) => i.baseQuantity - i.receivedQty > 0.0001)
          .map((i) => ({ itemId: i.id, quantity: (i.baseQuantity - i.receivedQty) / (i.conversionRate || 1) }));
        await this.purchases.receive(actor, new ShopScope(null, true), p.id, { items: items.length ? items : [{ itemId: p.items[0].id, quantity: 0.0001 }], close: true } as never);
      }
      await this.prisma.tradeOrder.update({ where: { id }, data: { receiveState: 'RECEIVED', receivedAt: new Date() } });
    } catch (e) {
      await this.prisma.tradeOrder.updateMany({ where: { id, receiveState: 'RECEIVING' }, data: { receiveState: 'DRAFT' } });
      throw e;
    }
    const buyer = (await businessCards(this.prisma, [t.buyerTenantId])).get(t.buyerTenantId)?.name ?? 'Customer';
    void notify(this.notifications, {
      tenantId: t.sellerTenantId, kind: 'ORDER_RECEIVED', refId: t.id, type: 'SUCCESS',
      title: 'Maal mil gaya', message: `${buyer} ne Order ${t.orderNumber ?? ''} ka maal receive kar liya`, link: '/network/customers',
    });
    return 'RECEIVED';
  }

  /* ───────────── payments ───────────── */

  async scanPayments(where: Prisma.TradeLinkWhereInput) {
    const links = await this.prisma.tradeLink.findMany({ where: { AND: [where, { status: { in: ['ACTIVE', 'PAUSED'] }, activatedAt: { not: null } }] }, take: 500 });
    for (const l of links) await this.scanLink(l).catch((e) => this.logger.warn(`Payment scan ${l.id}: ${(e as Error)?.message}`));
  }

  /** Mirrors payments written in either khata (counter, recovery, settlement cash, supplier payment) as pending for the other side. */
  async scanLink(link: TradeLink) {
    const started = new Date();
    const from = new Date(Math.max(link.activatedAt!.getTime(), (link.paymentsScanAt?.getTime() ?? 0) - SCAN_OVERLAP_MS));
    const orders = await this.prisma.tradeOrder.findMany({ where: { linkId: link.id, invoiceNumber: { not: null } }, select: { id: true, invoiceNumber: true, orderNumber: true } });
    const orderOf = (ref: string | null) => (ref ? orders.find((o) => o.invoiceNumber === ref || o.orderNumber === ref)?.id ?? null : null);
    const cards = await businessCards(this.prisma, [link.sellerTenantId, link.buyerTenantId]);

    if (link.customerId) {
      const rows = await this.prisma.customerLedger.findMany({
        where: { tenantId: link.sellerTenantId, customerId: link.customerId, type: 'PAYMENT_RECEIVED', amount: { lt: 0 }, createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' }, take: 500,
      });
      const known = new Set((await this.prisma.tradePayment.findMany({ where: { sellerLedgerId: { in: rows.map((r) => r.id) } }, select: { sellerLedgerId: true } })).map((x) => x.sellerLedgerId));
      for (const r of rows) {
        if (known.has(r.id)) continue;
        const made = await this.mirror({
          linkId: link.id, sellerTenantId: link.sellerTenantId, buyerTenantId: link.buyerTenantId, source: 'SELLER',
          amount: r2(-r.amount), method: r.paymentMethod ?? 'CASH', reference: r.reference, note: r.note, paidAt: r.createdAt,
          sellerLedgerId: r.id, tradeOrderId: orderOf(r.reference),
        });
        if (made) {
          void notify(this.notifications, {
            tenantId: link.buyerTenantId, kind: 'PAYMENT_TO_CONFIRM', refId: made, type: 'PAYMENT_RECEIVED',
            title: 'Payment confirm karein', message: `${cards.get(link.sellerTenantId)?.name ?? 'Supplier'} ne Rs ${r2(-r.amount).toLocaleString('en-PK')} ki payment likhi hai — confirm karein`,
            link: `/network/suppliers/${link.id}?tab=payments`,
          });
        }
      }
    }
    if (link.supplierId) {
      const rows = await this.prisma.supplierLedger.findMany({
        where: { tenantId: link.buyerTenantId, supplierId: link.supplierId, type: 'PAYMENT_MADE', amount: { gt: 0 }, createdAt: { gte: from } },
        orderBy: { createdAt: 'asc' }, take: 500,
      });
      const known = new Set((await this.prisma.tradePayment.findMany({ where: { buyerLedgerId: { in: rows.map((r) => r.id) } }, select: { buyerLedgerId: true } })).map((x) => x.buyerLedgerId));
      for (const r of rows) {
        if (known.has(r.id)) continue;
        const made = await this.mirror({
          linkId: link.id, sellerTenantId: link.sellerTenantId, buyerTenantId: link.buyerTenantId, source: 'BUYER',
          amount: r2(r.amount), method: r.paymentMethod ?? 'CASH', reference: r.reference, note: r.note, paidAt: r.entryDate,
          buyerLedgerId: r.id, tradeOrderId: orderOf(r.reference),
        });
        if (made) {
          void notify(this.notifications, {
            tenantId: link.sellerTenantId, kind: 'PAYMENT_TO_CONFIRM', refId: made, type: 'PAYMENT_RECEIVED',
            title: 'Payment confirm karein', message: `${cards.get(link.buyerTenantId)?.name ?? 'Customer'} ne Rs ${r2(r.amount).toLocaleString('en-PK')} ki payment likhi hai — confirm karein`,
            link: `/network/links/${link.id}?tab=payments`,
          });
        }
      }
    }
    await this.prisma.tradeLink.update({ where: { id: link.id }, data: { paymentsScanAt: started } });
  }

  private async mirror(data: Prisma.TradePaymentUncheckedCreateInput): Promise<string | null> {
    try {
      const p = await this.prisma.tradePayment.create({ data: { ...data, status: 'PENDING' }, select: { id: true } });
      return p.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null;
      throw e;
    }
  }
}
