/**
 * Rows the restaurant adds under the bill header: order number, token,
 * table, order type, waiter and guests. The shared receipt page merges them
 * after building the bill, so print, PDF and auto print carry them. A row
 * the bill already shows (same label) is not repeated there.
 */

import type { ReceiptRowDoc } from '@core/receipt/types';
import { ordersApi } from '../api/orders.api';
import { MODE_META } from './orderMeta';

export async function restaurantReceiptRows(sale: { id: string }): Promise<ReceiptRowDoc[]> {
  const [found] = await ordersApi.list({ saleId: sale.id });
  if (!found) return [];
  // The single order carries the waiter's name; the list has only the id.
  const order = found.waiterId ? await ordersApi.getOne(found.id).catch(() => found) : found;
  const waiter = order.waiter?.fullName ?? order.waiterName;
  const table = order.table as { tableNumber?: string; tableName?: string | null } | null | undefined;
  const rows: Array<ReceiptRowDoc | null> = [
    { label: 'Order #', value: order.orderNumber },
    order.token ? { label: 'Token', value: String(order.token), bold: true } : null,
    table?.tableNumber ? { label: 'Table', value: `${table.tableNumber}${table.tableName ? ` (${table.tableName})` : ''}`, bold: true } : null,
    { label: 'Order', value: MODE_META[order.mode]?.label ?? order.mode },
    waiter ? { label: 'Waiter', value: waiter } : null,
    order.numberOfGuests ? { label: 'Mehman', value: String(order.numberOfGuests) } : null,
  ];
  return rows.filter((r): r is ReceiptRowDoc => !!r && !!r.value);
}
