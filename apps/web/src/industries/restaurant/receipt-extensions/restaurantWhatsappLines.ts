/**
 * Extra WhatsApp lines contributed by the Restaurant pack.
 *
 * Called by the shared receipt WhatsApp builder — its return value
 * is inserted right after the item list, before the payment summary.
 *
 * Reads restaurant-specific data (table, mode, KOT, service, tax, tip)
 * directly off the sale if it has already been enriched with the
 * linked RestaurantOrder. If not, returns an empty array so nothing
 * breaks.
 */
export function restaurantWhatsappLines(sale: any): string[] {
  const order = sale?.__restaurantOrder;
  if (!order) return [];

  const lines: string[] = [];

  lines.push('');
  lines.push('┌─────────────────────────┐');
  lines.push('│   🍽️ *RESTAURANT INFO*   │');
  lines.push('└─────────────────────────┘');

  if (order.table) {
    lines.push(`🪑 Table: *${order.table.tableNumber}*`);
  }
  lines.push(`📋 Mode: *${String(order.mode).replace(/_/g, ' ')}*`);

  if (order.numberOfGuests) {
    lines.push(`👥 Guests: ${order.numberOfGuests}`);
  }
  if (order.kots && order.kots.length > 0) {
    lines.push(`🧾 KOT #: \`${order.kots[0].kotNumber}\``);
  }
  if (order.specialRequests) {
    lines.push('');
    lines.push(`📝 Special: _${order.specialRequests}_`);
  }

  return lines;
}
