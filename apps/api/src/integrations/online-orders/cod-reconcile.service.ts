import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { COURIERS, courierName } from './couriers';
import { paidAdvance } from './order-money';
import { shopDue } from './shop-due';
import { ColumnMap, ReconcileOrder, STATEMENT_FIELDS, detectColumns, matchStatement, readStatement } from './cod-reconcile';
import { OrderCostsService } from './order-costs.service';
import { r2 } from './order-costs';
import { emitOrderStatus } from './order-events';

const MAX_ROWS = 5000;

/**
 * COD reconciliation against a courier's payment statement: preview (match
 * rows to orders) and settle (mark the matched orders paid and keep the
 * charges the courier deducted as the order's costs). The web reads the file
 * and sends its header and rows; nothing of the file is stored.
 */
@Injectable()
export class CodReconcileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costs: OrderCostsService,
  ) {}

  async preview(user: AuthenticatedUser, scope: ShopScope, body: { headers?: unknown[]; rows?: unknown[][]; mapping?: ColumnMap; courier?: string }) {
    const headers = Array.isArray(body?.headers) ? body.headers.slice(0, 60).map((h) => String(h ?? '').slice(0, 80)) : [];
    const raw = Array.isArray(body?.rows) ? body.rows.slice(0, MAX_ROWS) : [];
    if (!headers.length || !raw.length) throw new BadRequestException('File me koi row nahi mili');
    const detected = detectColumns(headers);
    const mapping: ColumnMap = {};
    for (const f of STATEMENT_FIELDS) {
      const v = body?.mapping && f in body.mapping ? body.mapping[f] : detected[f];
      if (v !== undefined && v !== null && Number.isInteger(v) && v >= 0 && v < headers.length) mapping[f] = v;
    }
    const needs: string[] = [];
    if (mapping.cn === undefined && mapping.orderRef === undefined) needs.push('cn');
    if (mapping.amount === undefined && mapping.net === undefined) needs.push('amount');
    if (needs.length) return { headers, detected, mapping, needs, rows: 0 };

    const rows = readStatement(raw.map((r) => (Array.isArray(r) ? r.slice(0, 60) : [])), mapping);
    const base: Prisma.ChannelOrderWhereInput = { tenantId: user.tenantId, ...(scope.whereLoose as any) };
    const cns = [...new Set(rows.map((r) => r.cn).filter((x): x is string => !!x))];
    const refs = [...new Set(rows.map((r) => r.orderRef).filter((x): x is string => !!x))];
    const byCnIds = cns.length
      ? (await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM channel_orders
          WHERE "tenantId" = ${user.tenantId} AND "trackingNumber" IS NOT NULL
            AND upper(regexp_replace("trackingNumber", '[^A-Za-z0-9]', '', 'g')) IN (${Prisma.join(cns)})`).map((r) => r.id)
      : [];
    const select = {
      id: true, externalOrderNumber: true, externalOrderId: true, trackingNumber: true, courierCode: true, orderStatus: true, paymentStatus: true,
      total: true, metadata: true, deliveredAt: true, customerName: true, customerCity: true,
    } as const;
    const candidates = await this.prisma.channelOrder.findMany({
      where: {
        ...base,
        AND: [{ OR: [
          ...(byCnIds.length ? [{ id: { in: byCnIds } }] : []),
          ...(refs.length ? [{ externalOrderNumber: { in: [...refs, ...refs.map((r) => `#${r}`)] } }, { externalOrderId: { in: refs } }] : []),
        ] }],
      },
      select,
      take: MAX_ROWS * 2,
    });

    // Courier of the statement: chosen, else the one most matched orders were sent with.
    const counts = new Map<string, number>();
    for (const o of candidates) if (o.courierCode) counts.set(o.courierCode, (counts.get(o.courierCode) ?? 0) + 1);
    const courier = body?.courier && COURIERS.some((c) => c.code === body.courier)
      ? body.courier
      : [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const waiting = courier
      ? await this.prisma.channelOrder.findMany({
          where: { ...base, courierCode: courier, orderStatus: 'DELIVERED', paymentStatus: 'COLLECTED', nafaaSaleId: { not: null } },
          select, orderBy: { deliveredAt: 'asc' }, take: 5000,
        })
      : [];

    const asOrder = (o: (typeof candidates)[number]): ReconcileOrder & { customerName: string; customerCity: string | null } => ({
      id: o.id,
      number: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, ''),
      trackingNumber: o.trackingNumber,
      courierCode: o.courierCode,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      expected: (o.metadata as any)?.cod ? r2(Math.max(0, shopDue(o) - paidAdvance(o.metadata))) : 0,
      deliveredAt: o.deliveredAt,
      customerName: o.customerName,
      customerCity: o.customerCity,
    });
    const result = matchStatement(rows, candidates.filter((o) => !(o.metadata as any)?.test).map(asOrder), waiting.map(asOrder));
    const now = Date.now();
    const sum = (xs: number[]) => r2(xs.reduce((t, x) => t + x, 0));
    return {
      headers, detected, mapping, needs: [] as string[], rows: rows.length,
      courier: courier ? { code: courier, name: courierName(courier) } : null,
      hasCharges: mapping.charge !== undefined || mapping.tax !== undefined || (mapping.amount !== undefined && mapping.net !== undefined),
      hasCodFee: mapping.codFee !== undefined,
      matched: result.matched.map((m) => ({
        orderId: m.order.id, number: m.order.number, customerName: (m.order as any).customerName, city: (m.order as any).customerCity,
        cn: m.row.cn ?? m.order.trackingNumber, by: m.by, line: m.row.line,
        expected: m.returned ? 0 : m.order.expected, received: m.row.amount, diff: m.diff, ok: m.ok,
        charge: m.row.charge, codFee: m.row.codFee, net: m.row.net, status: m.row.status,
        settled: m.settled, returned: m.returned, orderStatus: m.order.orderStatus,
      })),
      unknown: result.unknown.map((r) => ({ line: r.line, cn: r.cn, orderRef: r.orderRef, amount: r.amount, charge: r.charge, status: r.status })),
      missing: result.missing.map((o) => ({
        orderId: o.id, number: o.number, cn: o.trackingNumber, customerName: (o as any).customerName, city: (o as any).customerCity,
        expected: o.expected, deliveredAt: o.deliveredAt, days: o.deliveredAt ? Math.floor((now - o.deliveredAt.getTime()) / 86_400_000) : null,
      })),
      totals: {
        statement: sum(rows.map((r) => r.amount)),
        charges: sum(rows.map((r) => r.charge + r.codFee)),
        matchedExpected: sum(result.matched.map((m) => (m.returned ? 0 : m.order.expected))),
        matchedReceived: sum(result.matched.map((m) => m.row.amount)),
        missingValue: sum(result.missing.map((o) => o.expected)),
        unknownValue: sum(result.unknown.map((r) => r.amount)),
      },
    };
  }

  /**
   * "Paisa mil gaya" for statement rows: delivered orders still with the
   * courier become paid (with the statement reference), and the charges the
   * courier deducted are kept on the order as its actual costs. Returned
   * parcels only take their charges. Orders already paid keep their status
   * and only take the charges.
   */
  async settle(user: AuthenticatedUser, scope: ShopScope, body: {
    reference?: string; withCharges?: boolean;
    items?: Array<{ orderId?: string; received?: number; charge?: number | null; codFee?: number | null }>;
  }) {
    const items = (Array.isArray(body?.items) ? body.items : []).filter((i) => typeof i?.orderId === 'string').slice(0, MAX_ROWS);
    if (!items.length) throw new BadRequestException('Koi order nahi chuna');
    const reference = body?.reference?.trim().slice(0, 120) || null;
    const orders = await this.prisma.channelOrder.findMany({
      where: { tenantId: user.tenantId, ...(scope.whereLoose as any), id: { in: items.map((i) => i.orderId!) } },
      select: { id: true, orderStatus: true, paymentStatus: true, nafaaSaleId: true, metadata: true },
    });
    const now = new Date();
    let settled = 0, charged = 0, skipped = 0;
    for (const it of items) {
      const o = orders.find((x) => x.id === it.orderId);
      if (!o) { skipped++; continue; }
      const money = (v: unknown) => (v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : r2(Number(v)));
      if (o.orderStatus === 'DELIVERED' && o.paymentStatus !== 'PAID' && o.nafaaSaleId) {
        const meta = (o.metadata ?? {}) as any;
        const done = await this.prisma.channelOrder.updateMany({
          where: { id: o.id, paymentStatus: { not: 'PAID' } },
          data: {
            paymentStatus: 'PAID', paymentReceivedAt: now, codSettledAt: now, codSettlementRef: reference,
            metadata: { ...meta, codStatement: { received: money(it.received), at: now.toISOString(), by: user.id } },
          },
        });
        settled += done.count;
      }
      // After the payment update, which wrote the metadata read above.
      if (body.withCharges !== false) {
        const charge = money(it.charge);
        const codFee = money(it.codFee);
        const values: Record<string, number> = {};
        if (charge !== null) { values.courierCharge = charge; if (o.orderStatus === 'RETURNED') values.rtoCost = 0; }
        if (codFee !== null) values.codFee = codFee;
        if (Object.keys(values).length) { await this.costs.saveCosts(o.id, values, 'STATEMENT'); charged++; }
      }
      emitOrderStatus({ tenantId: user.tenantId, orderId: o.id, status: 'SETTLED' });
    }
    return { settled, charged, skipped };
  }
}

