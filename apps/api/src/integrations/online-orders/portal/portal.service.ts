/**
 * Customer portal: a no-login page the shop sends on WhatsApp. An ORDER link
 * opens one order; a CUSTOMER link lists the orders of one phone number in
 * one business. The customer sees the order, its courier journey and the
 * bill, and can ask for a return, exchange, cancel, address change or the
 * same order again. Requests land in the shop's "Returns & exchanges" queue;
 * approving one runs the existing paths (cancel, order edit, new order with
 * replacementOf). Stock comes back only through the return scan.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { StorageService } from '../../../core/storage/storage.service';
import { OnlineOrdersService } from '../online-orders.service';
import { OrderToolsService } from '../order-tools.service';
import { OrderEntryService } from '../order-entry.service';
import { readForm } from '../storefront.service';
import { journeyOf, publicJourney } from '../tracking-map';
import { courierLink, courierName } from '../couriers';
import { appendTimeline } from '../order-metadata';
import { boardOf } from '../order-board';
import {
  MAX_PHOTOS, OPEN_STATUSES, PORTAL_TOKEN_RE, REQUEST_STATUSES, type RequestStatus, type RequestType, allowedRequests, approvedStatus,
  canMove, isRequestType, linkCanSee, phoneKey, pickLines,
} from './portal-rules';

type Link = NonNullable<Awaited<ReturnType<PrismaService['customerPortalLink']['findUnique']>>>;

const ORDER_SELECT = {
  id: true, tenantId: true, shopId: true, integrationId: true, externalOrderId: true, externalOrderNumber: true,
  customerName: true, customerPhone: true, customerAddress: true, customerCity: true, items: true,
  subtotal: true, deliveryFee: true, discount: true, total: true, paymentMethod: true, paymentStatus: true, orderStatus: true, stage: true,
  receivedAt: true, acceptedAt: true, dispatchedAt: true, deliveredAt: true, cancelledAt: true, returnedAt: true,
  courierCode: true, courierName: true, trackingNumber: true, courierBookedAt: true, metadata: true, deletedAt: true,
} satisfies Prisma.ChannelOrderSelect;
type PortalOrder = Prisma.ChannelOrderGetPayload<{ select: typeof ORDER_SELECT }>;

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order mil gaya — confirm ho raha hai', ACCEPTING: 'Confirm ho raha hai', CONFIRMED: 'Confirm ho gaya',
  PREPARING: 'Tayyar ho raha hai', READY: 'Pack ho gaya', OUT_FOR_DELIVERY: 'Raste me hai', DELIVERED: 'Deliver ho gaya',
  CANCELLED: 'Cancel ho gaya', REJECTED: 'Cancel ho gaya', RETURNED: 'Wapas chala gaya',
};
const LINK_DAYS = 120;
const n = (v: unknown) => Number(v ?? 0) || 0;
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max) || null;
const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly orders: OnlineOrdersService,
    private readonly tools: OrderToolsService,
    private readonly entry: OrderEntryService,
  ) {}

  webBase() {
    return (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC (token)
  // ═══════════════════════════════════════════════════════════

  private async link(token: string): Promise<Link> {
    if (!PORTAL_TOKEN_RE.test(token ?? '')) throw new NotFoundException('Link sahi nahi');
    const link = await this.prisma.customerPortalLink.findUnique({ where: { token } });
    if (!link || link.revokedAt || (link.expiresAt && link.expiresAt <= new Date())) throw new NotFoundException('Ye link band ho chuka — dukaan se naya link mangwayein');
    return link;
  }

  /** The order a link may open; any other id is "not found", never "forbidden", so ids cannot be probed. */
  private async scopedOrder(link: Link, orderId?: string | null): Promise<PortalOrder> {
    const id = link.kind === 'ORDER' ? link.channelOrderId : orderId;
    if (!id) throw new NotFoundException('Order nahi mila');
    const o = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: link.tenantId }, select: ORDER_SELECT });
    if (!o || !linkCanSee(link, o)) throw new NotFoundException('Order nahi mila');
    return o;
  }

  private async brand(tenantId: string, integrationId?: string | null) {
    const [tenant, settings, ch] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, phone: true } }),
      this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { logoUrl: true } }),
      integrationId ? this.prisma.integration.findUnique({ where: { id: integrationId }, select: { config: true } }) : null,
    ]);
    const form = ch ? readForm(ch.config) : null;
    return { shop: tenant?.name ?? '', phone: tenant?.phone ?? null, logoUrl: form?.logoUrl || settings?.logoUrl || null, accent: form?.accent || '#059669' };
  }

  private touch(link: Link) {
    void this.prisma.customerPortalLink.update({ where: { id: link.id }, data: { openCount: { increment: 1 }, lastOpenedAt: new Date() } }).catch(() => null);
  }

  /** Opening page: the order (ORDER link) or the customer's order list (CUSTOMER link). */
  async open(token: string) {
    const link = await this.link(token);
    this.touch(link);
    if (link.kind === 'ORDER') {
      const o = await this.scopedOrder(link);
      return { kind: 'ORDER', brand: await this.brand(link.tenantId, o.integrationId), order: await this.present(o) };
    }
    const last7 = (link.phone ?? '').slice(-7);
    const rows = last7.length === 7
      ? await this.prisma.channelOrder.findMany({
        where: { tenantId: link.tenantId, deletedAt: null, customerPhone: { contains: last7 } },
        orderBy: { receivedAt: 'desc' },
        take: 200,
        select: ORDER_SELECT,
      })
      : [];
    const mine = rows.filter((o) => linkCanSee(link, o)).slice(0, 50);
    return {
      kind: 'CUSTOMER',
      brand: await this.brand(link.tenantId, mine[0]?.integrationId),
      name: mine[0]?.customerName ?? null,
      orders: mine.map((o) => ({
        id: o.id, no: orderNo(o), status: o.orderStatus, label: STATUS_LABEL[o.orderStatus] ?? o.orderStatus,
        total: n(o.total), at: o.receivedAt, items: this.lines(o).length,
      })),
    };
  }

  /** One order of a CUSTOMER link. */
  async order(token: string, orderId: string) {
    const link = await this.link(token);
    const o = await this.scopedOrder(link, orderId);
    return { brand: await this.brand(link.tenantId, o.integrationId), order: await this.present(o) };
  }

  private lines(o: PortalOrder) {
    return (Array.isArray(o.items) ? o.items : []) as Array<{ name?: string; variant?: string; sku?: string; quantity?: number; price?: number; productId?: string; variantId?: string | null; image?: string }>;
  }

  private async present(o: PortalOrder) {
    const requests = await this.prisma.customerPortalRequest.findMany({
      where: { channelOrderId: o.id, tenantId: o.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, status: true, reason: true, note: true, items: true, decisionNote: true, refundNote: true, pickupCourier: true, pickupTracking: true, createdAt: true, decidedAt: true },
    });
    const lines = this.lines(o);
    const open = requests.filter((r) => (OPEN_STATUSES as string[]).includes(r.status)).map((r) => r.type);
    const events = Array.isArray((o.metadata as any)?.courierTrail?.events) ? (o.metadata as any).courierTrail.events : [];
    return {
      id: o.id,
      no: orderNo(o),
      status: o.orderStatus,
      label: STATUS_LABEL[o.orderStatus] ?? o.orderStatus,
      customer: { name: o.customerName, phone: o.customerPhone, address: o.customerAddress, city: o.customerCity },
      items: lines.map((l, index) => ({ index, name: l.name ?? '', variant: l.variant ?? null, quantity: n(l.quantity), price: n(l.price), image: l.image ?? null, product: !!l.productId })),
      money: { subtotal: n(o.subtotal), deliveryFee: n(o.deliveryFee), discount: n(o.discount), total: n(o.total), paid: o.paymentStatus === 'PAID', method: o.paymentMethod },
      steps: [
        { key: 'received', label: 'Order mila', at: o.receivedAt },
        { key: 'confirmed', label: 'Confirm', at: o.acceptedAt },
        { key: 'dispatched', label: 'Courier ko diya', at: o.dispatchedAt },
        { key: 'delivered', label: 'Deliver', at: o.deliveredAt },
      ],
      closed: o.cancelledAt || o.returnedAt ? { label: STATUS_LABEL[o.orderStatus], at: o.cancelledAt ?? o.returnedAt } : null,
      courier: o.trackingNumber ? { name: o.courierName ?? courierName(o.courierCode), trackingNumber: o.trackingNumber, site: courierLink(o.courierCode, o.trackingNumber) } : null,
      journey: o.trackingNumber ? publicJourney(journeyOf({
        events, orderStatus: o.orderStatus, bookedAt: o.courierBookedAt, dispatchedAt: o.dispatchedAt, deliveredAt: o.deliveredAt, returnedAt: o.returnedAt,
        originCity: null, destinationCity: o.customerCity,
      })) : null,
      requests,
      allowed: allowedRequests({ orderStatus: o.orderStatus, dispatchedAt: o.dispatchedAt, deliveredAt: o.deliveredAt, hasProducts: lines.some((l) => !!l.productId) }, open),
    };
  }

  /** Presigned upload for one request photo (images only, 5 MB, the business's own folder). */
  async uploadUrl(token: string, body: { fileName?: string; contentType?: string; fileSize?: number }) {
    const link = await this.link(token);
    const type = String(body?.contentType ?? '');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new BadRequestException('Sirf tasveer (JPG, PNG) bhejein');
    const size = Number(body?.fileSize) || 0;
    if (!(size > 0) || size > 5 * 1024 * 1024) throw new BadRequestException('Tasveer 5 MB se choti honi chahiye');
    return this.storage.getPresignedUploadUrl({ fileName: String(body?.fileName ?? 'photo.jpg').slice(0, 80), contentType: type, fileSize: size, folder: `portal/${link.tenantId}` });
  }

  async createRequest(token: string, body: {
    orderId?: string; type?: string; reason?: string; note?: string; items?: unknown; photos?: unknown;
    pickup?: { mode?: string; address?: string; city?: string; slot?: string }; address?: { name?: string; phone?: string; address?: string; city?: string };
  }) {
    const link = await this.link(token);
    const o = await this.scopedOrder(link, body?.orderId);
    const type = String(body?.type ?? '').toUpperCase();
    if (!isRequestType(type)) throw new BadRequestException('Request ki qism chunein');
    const view = await this.present(o);
    if (!view.allowed.includes(type)) throw new BadRequestException('Is order par ye request abhi nahi ho sakti');

    const lines = this.lines(o);
    const items = type === 'RETURN' || type === 'EXCHANGE' ? pickLines(body?.items, lines) : [];
    if ((type === 'RETURN' || type === 'EXCHANGE') && !items.length) throw new BadRequestException('Kaun si cheez wapas karni hai — chunein');
    const reason = text(body?.reason, 200);
    if ((type === 'RETURN' || type === 'EXCHANGE' || type === 'CANCEL') && !reason) throw new BadRequestException('Wajah likhein');
    const base = `${process.env.AWS_S3_PUBLIC_URL ?? ''}/portal/${link.tenantId}/`;
    const photos = Array.isArray(body?.photos)
      ? body.photos.map((p) => String(p)).filter((p) => p.startsWith('https://') && (!process.env.AWS_S3_PUBLIC_URL || p.startsWith(base)) && p.includes(`/portal/${link.tenantId}/`)).slice(0, MAX_PHOTOS)
      : [];
    let address: Prisma.InputJsonValue | undefined;
    if (type === 'ADDRESS') {
      const a = body?.address ?? {};
      const next = { name: text(a.name, 100), phone: text(a.phone, 20), address: text(a.address, 400), city: text(a.city, 80) };
      if (!next.address && !next.city && !next.phone && !next.name) throw new BadRequestException('Naya address ya phone likhein');
      if (next.phone && (next.phone.replace(/\D/g, '').length < 10)) throw new BadRequestException('Sahi phone number likhein');
      address = next;
    }
    const pickup = type === 'RETURN' || type === 'EXCHANGE'
      ? { mode: body?.pickup?.mode === 'DROP_OFF' ? 'DROP_OFF' : 'PICKUP', address: text(body?.pickup?.address, 400) ?? o.customerAddress, city: text(body?.pickup?.city, 80) ?? o.customerCity, slot: text(body?.pickup?.slot, 60) }
      : undefined;

    const req = await this.prisma.customerPortalRequest.create({
      data: {
        tenantId: o.tenantId, shopId: o.shopId, channelOrderId: o.id, linkId: link.id, type,
        reason, note: text(body?.note, 500), items: items.length ? items : undefined, photos: photos.length ? photos : undefined, pickup, address,
      },
    });
    await appendTimeline(this.prisma, o.id, {
      at: new Date().toISOString(), by: null, byName: 'Customer', from: boardOf(o), to: '', note: `Customer request: ${type}${reason ? ` — ${reason}` : ''}`,
    }).catch(() => null);
    return { ok: true, id: req.id, order: await this.present(o) };
  }

  async withdraw(token: string, id: string) {
    const link = await this.link(token);
    const req = await this.prisma.customerPortalRequest.findFirst({ where: { id, tenantId: link.tenantId } });
    if (!req) throw new NotFoundException('Request nahi mili');
    const o = await this.scopedOrder(link, req.channelOrderId);
    if (!canMove(req.status, 'WITHDRAWN')) throw new BadRequestException('Ye request ab wapas nahi ho sakti');
    await this.prisma.customerPortalRequest.update({ where: { id }, data: { status: 'WITHDRAWN', decidedAt: new Date() } });
    return { ok: true, order: await this.present(o) };
  }

  // ═══════════════════════════════════════════════════════════
  // SHOP
  // ═══════════════════════════════════════════════════════════

  /** Link for an order, or for every order of its customer; reuses a live one. */
  async makeLink(user: AuthenticatedUser, scope: ShopScope, body: { orderId?: string; kind?: string }) {
    const kind = body?.kind === 'CUSTOMER' ? 'CUSTOMER' : 'ORDER';
    const o = await this.prisma.channelOrder.findFirst({
      where: { id: String(body?.orderId ?? ''), tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as Prisma.ChannelOrderWhereInput) },
      select: { id: true, customerPhone: true, customerName: true, externalOrderNumber: true, externalOrderId: true },
    });
    if (!o) throw new NotFoundException('Order nahi mila');
    const phone = phoneKey(o.customerPhone);
    if (kind === 'CUSTOMER' && !phone) throw new BadRequestException('Is order par customer ka phone nahi');
    const where: Prisma.CustomerPortalLinkWhereInput = kind === 'ORDER'
      ? { tenantId: user.tenantId, kind, channelOrderId: o.id, revokedAt: null }
      : { tenantId: user.tenantId, kind, phone, revokedAt: null };
    let link = await this.prisma.customerPortalLink.findFirst({ where: { ...where, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(Date.now() + 7 * 86_400_000) } }] }, orderBy: { createdAt: 'desc' } });
    if (!link) {
      link = await this.prisma.customerPortalLink.create({
        data: {
          tenantId: user.tenantId, token: crypto.randomBytes(18).toString('base64url'), kind,
          channelOrderId: kind === 'ORDER' ? o.id : null, phone, createdById: user.id,
          expiresAt: new Date(Date.now() + LINK_DAYS * 86_400_000),
        },
      });
    }
    const url = `${this.webBase()}/my/${kind === 'CUSTOMER' ? 'c/' : ''}${link.token}`;
    return { url, kind, expiresAt: link.expiresAt, phone: o.customerPhone, name: o.customerName, no: orderNo(o) };
  }

  async listRequests(user: AuthenticatedUser, scope: ShopScope, q: { status?: string; type?: string; search?: string }) {
    const status = (REQUEST_STATUSES as readonly string[]).includes(String(q?.status)) ? String(q.status) : q?.status === 'all' ? null : 'OPEN';
    const where: Prisma.CustomerPortalRequestWhereInput = {
      tenantId: user.tenantId,
      ...(scope.whereLoose as Prisma.CustomerPortalRequestWhereInput),
      ...(status === 'OPEN' ? { status: { in: OPEN_STATUSES } } : status ? { status } : {}),
      ...(isRequestType(String(q?.type)) && { type: String(q.type) }),
    };
    const [rows, counts] = await Promise.all([
      this.prisma.customerPortalRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 }),
      this.prisma.customerPortalRequest.groupBy({ by: ['status', 'type'], where: { tenantId: user.tenantId, ...(scope.whereLoose as Prisma.CustomerPortalRequestWhereInput) }, _count: { _all: true } }),
    ]);
    const orders = rows.length
      ? await this.prisma.channelOrder.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.channelOrderId))] } }, select: ORDER_SELECT })
      : [];
    const byId = new Map(orders.map((o) => [o.id, o]));
    const search = q?.search?.trim().toLowerCase();
    const items = rows.map((r) => {
      const o = byId.get(r.channelOrderId);
      const lines = o ? this.lines(o) : [];
      return {
        ...r,
        order: o ? {
          id: o.id, no: orderNo(o), status: o.orderStatus, total: n(o.total), customerName: o.customerName, customerPhone: o.customerPhone,
          customerCity: o.customerCity, customerAddress: o.customerAddress, dispatched: !!o.dispatchedAt, trackingNumber: o.trackingNumber, courierCode: o.courierCode,
        } : null,
        lines: ((r.items as Array<{ index: number; qty: number }> | null) ?? []).map((x) => ({ ...x, name: lines[x.index]?.name ?? '', variant: lines[x.index]?.variant ?? null, price: n(lines[x.index]?.price) })),
      };
    }).filter((r) => !search || `${r.order?.no ?? ''} ${r.order?.customerName ?? ''} ${r.order?.customerPhone ?? ''}`.toLowerCase().includes(search));
    const summary = { open: 0, requested: 0, approved: 0, done: 0, rejected: 0, returns: 0, exchanges: 0, cancels: 0, addresses: 0, reorders: 0 };
    for (const c of counts) {
      const k = c._count._all;
      if (c.status === 'REQUESTED') { summary.requested += k; summary.open += k; }
      if (c.status === 'APPROVED') { summary.approved += k; summary.open += k; }
      if (c.status === 'DONE') summary.done += k;
      if (c.status === 'REJECTED') summary.rejected += k;
      if (!(OPEN_STATUSES as string[]).includes(c.status)) continue;
      if (c.type === 'RETURN') summary.returns += k;
      if (c.type === 'EXCHANGE') summary.exchanges += k;
      if (c.type === 'CANCEL') summary.cancels += k;
      if (c.type === 'ADDRESS') summary.addresses += k;
      if (c.type === 'REORDER') summary.reorders += k;
    }
    return { items, summary };
  }

  private async request(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const r = await this.prisma.customerPortalRequest.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as Prisma.CustomerPortalRequestWhereInput) } });
    if (!r) throw new NotFoundException('Request nahi mili');
    return r;
  }

  private async move(user: AuthenticatedUser, id: string, from: string, to: RequestStatus, data: Prisma.CustomerPortalRequestUpdateInput = {}) {
    if (!canMove(from, to)) throw new BadRequestException('Ye request pehle hi tay ho chuki');
    // Guard against two staff acting at once: only moves from the status we read.
    const res = await this.prisma.customerPortalRequest.updateMany({ where: { id, status: from }, data: { ...(data as any), status: to, decidedById: user.id, decidedAt: new Date() } });
    if (!res.count) throw new BadRequestException('Request kisi aur ne badal di — page refresh karein');
  }

  /**
   * Approve. Cancel → the order's cancel; address → the order edit (before
   * dispatch only); exchange → a replacement order (items at 0, linked with
   * replacementOf); reorder → a new order waiting for the shop's confirm;
   * return → approved with the pickup (courier and CN typed by the shop,
   * since no connected courier books reverse pickups by API).
   */
  async approve(user: AuthenticatedUser, scope: ShopScope, id: string, body: { note?: string; pickupCourier?: string; pickupTracking?: string }) {
    const r = await this.request(user, scope, id);
    if (!canMove(r.status, 'APPROVED') && !canMove(r.status, 'DONE')) throw new BadRequestException('Ye request pehle hi tay ho chuki');
    const type = r.type as RequestType;
    const note = text(body?.note, 500);
    const o = await this.prisma.channelOrder.findFirst({ where: { id: r.channelOrderId, tenantId: user.tenantId }, select: ORDER_SELECT });
    if (!o) throw new NotFoundException('Order nahi mila');
    const orderScope = new ShopScope(o.shopId ?? null, !o.shopId);
    let resultOrderId: string | null = null;

    if (type === 'CANCEL') {
      await this.orders.cancel(user, orderScope, o.id, r.reason ? `Customer: ${r.reason}` : 'Customer ne cancel karwaya');
    } else if (type === 'ADDRESS') {
      const a = (r.address ?? {}) as { name?: string | null; phone?: string | null; address?: string | null; city?: string | null };
      await this.tools.editOrder(user, orderScope, o.id, {
        ...(a.name && { customerName: a.name }), ...(a.phone && { customerPhone: a.phone }),
        ...(a.address && { customerAddress: a.address }), ...(a.city && { customerCity: a.city }),
      });
    } else if (type === 'EXCHANGE' || type === 'REORDER') {
      const lines = this.lines(o);
      const picked = type === 'EXCHANGE'
        ? ((r.items as Array<{ index: number; qty: number }> | null) ?? []).map((x) => ({ l: lines[x.index], qty: x.qty }))
        : lines.map((l) => ({ l, qty: n(l.quantity) || 1 }));
      const items = picked.filter((x) => x.l?.productId).map((x) => ({
        productId: x.l.productId, variantId: x.l.variantId ?? null, quantity: x.qty, price: type === 'EXCHANGE' ? 0 : n(x.l.price),
      }));
      if (!items.length) throw new BadRequestException('Is order ki cheezein products se juri nahi — naya order khud banayein');
      const made = await this.entry.createManual(user, orderScope, {
        source: 'MANUAL',
        customer: { name: o.customerName, phone: o.customerPhone ?? undefined, address: o.customerAddress ?? undefined, city: o.customerCity ?? undefined },
        items,
        deliveryFee: type === 'REORDER' ? n(o.deliveryFee) : 0,
        ...(type === 'EXCHANGE' && { replacementOf: o.id }),
        notes: type === 'EXCHANGE' ? `Exchange #${orderNo(o)}${r.reason ? ` — ${r.reason}` : ''}` : `Customer ne #${orderNo(o)} dobara mangwaya`,
      });
      resultOrderId = (made.order as { id?: string } | null)?.id ?? null;
    }

    const to = approvedStatus(type);
    await this.move(user, id, r.status, to, {
      decisionNote: note, resultOrderId,
      ...(type === 'RETURN' || type === 'EXCHANGE' ? { pickupCourier: text(body?.pickupCourier, 40), pickupTracking: text(body?.pickupTracking, 60) } : {}),
    });
    await this.orders.addTimeline(user, o.id, '', `Customer request approved: ${type}`).catch(() => null);
    return { ok: true, status: to, resultOrderId };
  }

  async reject(user: AuthenticatedUser, scope: ShopScope, id: string, body: { note?: string }) {
    const r = await this.request(user, scope, id);
    const note = text(body?.note, 500);
    if (!note) throw new BadRequestException('Customer ko wajah batayein');
    await this.move(user, id, r.status, 'REJECTED', { decisionNote: note });
    return { ok: true };
  }

  /** Return or exchange finished (parcel back through the return scan). */
  async done(user: AuthenticatedUser, scope: ShopScope, id: string, body: { note?: string }) {
    const r = await this.request(user, scope, id);
    if (r.status !== 'APPROVED') throw new BadRequestException('Pehle request approve karein');
    await this.move(user, id, r.status, 'DONE', { ...(text(body?.note, 500) && { decisionNote: text(body?.note, 500) }) });
    return { ok: true };
  }

  async refundNote(user: AuthenticatedUser, scope: ShopScope, id: string, body: { note?: string; amount?: number }) {
    const r = await this.request(user, scope, id);
    if (r.type !== 'RETURN' && r.type !== 'CANCEL' && r.type !== 'EXCHANGE') throw new ForbiddenException('Is request par refund nahi');
    const amount = body?.amount === undefined || body?.amount === null ? null : Number(body.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new BadRequestException('Refund ki raqam sahi likhein');
    await this.prisma.customerPortalRequest.update({ where: { id }, data: { refundNote: text(body?.note, 500), refundAmount: amount } });
    return { ok: true };
  }
}
