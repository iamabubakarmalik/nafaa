/**
 * COD reconciliation: a courier's payment statement (CSV or XLSX from TCS,
 * Leopards, PostEx, Trax, M&P, …) against the shop's orders. Pure functions:
 * columns are found by their header names (the shop can map the rest), rows
 * are matched to orders by CN, else by order number, and sorted into
 *
 *   matched   the row and the order agree on the amount, or differ by `diff`
 *   unknown   in the statement, not in Nafaa
 *   missing   delivered in Nafaa with the money still with the courier, not
 *             in the statement
 */

export const STATEMENT_FIELDS = ['cn', 'orderRef', 'amount', 'charge', 'codFee', 'tax', 'net', 'status'] as const;
export type StatementField = (typeof STATEMENT_FIELDS)[number];
export type ColumnMap = Partial<Record<StatementField, number>>;

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Header names couriers use, exact first, then words a header may contain. */
const NAMES: Record<StatementField, { exact: string[]; has: string[] }> = {
  cn: {
    exact: ['cn', 'cnno', 'cnnumber', 'cnnum', 'consignment', 'consignmentno', 'consignmentnumber', 'trackingnumber', 'trackingno', 'tracking',
      'trackno', 'tracknumber', 'trackingid', 'awb', 'awbno', 'awbnumber', 'bookedpacketcn', 'shipmentno', 'shipmentnumber', 'cnid'],
    has: ['consignment', 'tracking', 'awb'],
  },
  orderRef: {
    exact: ['orderref', 'orderreference', 'orderid', 'ordernumber', 'orderno', 'refno', 'referenceno', 'reference', 'customerreference',
      'customerref', 'shipperref', 'shipperreference', 'orderrefno', 'bookedpacketorderid'],
    has: ['orderref', 'orderid', 'orderno', 'ordernumber'],
  },
  codFee: {
    exact: ['codcharges', 'codcharge', 'codfee', 'codfees', 'codservicecharges', 'cashhandlingcharges', 'cashhandling', 'handlingcharges', 'codhandlingcharges'],
    has: ['codcharge', 'codfee', 'handling'],
  },
  tax: {
    exact: ['gst', 'salestax', 'tax', 'fuelsurcharge', 'fsc', 'gstamount', 'taxamount'],
    has: ['gst', 'salestax', 'surcharge'],
  },
  charge: {
    exact: ['deliverycharges', 'deliverycharge', 'shipmentcharges', 'shipmentcharge', 'shippingcharges', 'shippingcharge', 'charges', 'couriercharges',
      'servicecharges', 'freight', 'freightcharges', 'weightcharges', 'bookingcharges', 'totalcharges', 'deliveryfee', 'shippingfee', 'reversalcharges'],
    has: ['charges', 'charge', 'freight'],
  },
  net: {
    exact: ['netamount', 'netpayable', 'payable', 'netpayment', 'amountpayable', 'netcod', 'netpaid', 'paidamount', 'payableamount', 'netsettlement'],
    has: ['netamount', 'payable', 'netpay'],
  },
  amount: {
    exact: ['codamount', 'cod', 'collectedamount', 'amountcollected', 'codcollected', 'invoiceamount', 'bookedpacketcollectamount', 'collectamount',
      'amount', 'orderamount', 'totalamount', 'cashcollected', 'codvalue', 'collection'],
    has: ['codamount', 'collect', 'invoiceamount'],
  },
  status: {
    exact: ['status', 'deliverystatus', 'shipmentstatus', 'orderstatus', 'packetstatus', 'bookedpacketstatus'],
    has: ['status'],
  },
};

/** Fields in the order they claim columns, so "COD charges" is a fee before "COD" can take it as the amount. */
const CLAIM_ORDER: StatementField[] = ['cn', 'orderRef', 'codFee', 'tax', 'net', 'amount', 'charge', 'status'];

export function detectColumns(headers: unknown[]): ColumnMap {
  const keys = headers.map(norm);
  const map: ColumnMap = {};
  const used = new Set<number>();
  for (const pass of ['exact', 'has'] as const) {
    for (const f of CLAIM_ORDER) {
      if (map[f] !== undefined) continue;
      const i = keys.findIndex((k, idx) => !used.has(idx) && !!k && (pass === 'exact' ? NAMES[f].exact.includes(k) : NAMES[f].has.some((w) => k.includes(w))));
      if (i >= 0) { map[f] = i; used.add(i); }
    }
  }
  return map;
}

/** A money cell: "Rs 1,234.50", "(120)" and "-120" read as positive amounts; anything else is null. */
export function parseMoney(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(Math.abs(v) * 100) / 100 : null;
  const s = String(v ?? '').replace(/rs\.?|pkr|,|\s/gi, '').replace(/^\((.*)\)$/, '$1');
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(Math.abs(Number(s)) * 100) / 100;
}

/** CN as couriers print it, without spaces, dashes or case. */
export const cnKey = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const refKey = (v: unknown) => String(v ?? '').replace(/^#+/, '').trim().toUpperCase();

export interface StatementRow {
  line: number;
  cn: string | null;
  orderRef: string | null;
  /** COD the courier collected. */
  amount: number;
  /** Delivery charge deducted (with tax). */
  charge: number;
  codFee: number;
  /** What the courier paid for this row. */
  net: number | null;
  status: string | null;
}

/** Reads statement rows with a column map. Rows with neither a CN nor an order number are skipped (totals, blank lines, notes). */
export function readStatement(rows: unknown[][], map: ColumnMap, firstLine = 2): StatementRow[] {
  const out: StatementRow[] = [];
  const cell = (r: unknown[], f: StatementField) => (map[f] === undefined ? undefined : r[map[f]!]);
  rows.forEach((r, i) => {
    if (!Array.isArray(r)) return;
    // CNs and order numbers carry digits; "Total" or "Grand total" rows do not.
    const cn0 = cnKey(cell(r, 'cn'));
    const cn = cn0.length >= 4 && /\d/.test(cn0) ? cn0 : null;
    const ref0 = refKey(cell(r, 'orderRef'));
    const orderRef = /\d/.test(ref0) ? ref0 : null;
    if (!cn && !orderRef) return;
    const amount0 = parseMoney(cell(r, 'amount'));
    const charge0 = parseMoney(cell(r, 'charge'));
    const tax = parseMoney(cell(r, 'tax')) ?? 0;
    const codFee = parseMoney(cell(r, 'codFee')) ?? 0;
    const net = parseMoney(cell(r, 'net'));
    let amount = amount0 ?? 0;
    let charge = (charge0 ?? 0) + tax;
    // Only the paid amount and the deductions: the collection is their sum.
    if (amount0 === null && net !== null) amount = net + charge + codFee;
    // Collection and paid amount but no charge column: the gap is the charge.
    if (charge0 === null && map.tax === undefined && map.codFee === undefined && amount0 !== null && net !== null && amount0 > net) charge = amount0 - net;
    const status = cell(r, 'status');
    out.push({
      line: firstLine + i,
      cn,
      orderRef,
      amount: Math.round(amount * 100) / 100,
      charge: Math.round(charge * 100) / 100,
      codFee: Math.round(codFee * 100) / 100,
      net,
      status: status === undefined || status === null || status === '' ? null : String(status).slice(0, 60),
    });
  });
  return out;
}

export interface ReconcileOrder {
  id: string;
  number: string;
  trackingNumber: string | null;
  courierCode: string | null;
  orderStatus: string;
  paymentStatus: string;
  /** COD the courier should have collected. */
  expected: number;
  deliveredAt: Date | null;
}

export interface MatchedRow {
  row: StatementRow;
  order: ReconcileOrder;
  by: 'CN' | 'ORDER';
  /** received − expected */
  diff: number;
  ok: boolean;
  /** Already marked paid in Nafaa. */
  settled: boolean;
  /** The parcel came back; the row carries its charges only. */
  returned: boolean;
}

export interface ReconcileResult {
  matched: MatchedRow[];
  unknown: StatementRow[];
  missing: ReconcileOrder[];
}

/**
 * Matches statement rows to orders. `candidates` are every order the rows may
 * name (any status); `waiting` are the delivered orders whose money is still
 * with this courier. A CN or order number seen twice in the statement is
 * matched once; the second row counts as unknown.
 */
export function matchStatement(rows: StatementRow[], candidates: ReconcileOrder[], waiting: ReconcileOrder[], tolerance = 1): ReconcileResult {
  const byCn = new Map<string, ReconcileOrder>();
  const byRef = new Map<string, ReconcileOrder>();
  for (const o of candidates) {
    if (o.trackingNumber) byCn.set(cnKey(o.trackingNumber), o);
    byRef.set(refKey(o.number), o);
  }
  const taken = new Set<string>();
  const matched: MatchedRow[] = [];
  const unknown: StatementRow[] = [];
  for (const row of rows) {
    let order = row.cn ? byCn.get(row.cn) : undefined;
    let by: MatchedRow['by'] = 'CN';
    if (!order && row.orderRef) { order = byRef.get(row.orderRef); by = 'ORDER'; }
    if (!order || taken.has(order.id)) { unknown.push(row); continue; }
    taken.add(order.id);
    const returned = order.orderStatus === 'RETURNED';
    const diff = Math.round((row.amount - (returned ? 0 : order.expected)) * 100) / 100;
    matched.push({ row, order, by, diff, ok: Math.abs(diff) <= tolerance, settled: order.paymentStatus === 'PAID', returned });
  }
  const missing = waiting.filter((o) => !taken.has(o.id));
  return { matched, unknown, missing };
}
