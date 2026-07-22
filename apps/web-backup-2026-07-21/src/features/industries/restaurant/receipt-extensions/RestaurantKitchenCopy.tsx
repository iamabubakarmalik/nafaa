import { useRestaurantOrderForSale } from '../hooks/useRestaurantOrderForSale';

/**
 * Kitchen Copy for restaurant receipts.
 *
 * Rendered ONLY on print (`hidden print:block`), forces a new page,
 * and lays out the order for the kitchen printer: table number,
 * item names in large type, modifiers, spice level, special notes.
 *
 * If the sale isn\'t a restaurant order, renders nothing.
 */
export function RestaurantKitchenCopy({ sale }: { sale: any }) {
  const { data: order } = useRestaurantOrderForSale(sale?.id, sale?.saleNumber);
  if (!order) return null;

  const now = new Date().toLocaleString('en-PK', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="hidden print:block print:page-break-before px-8 py-6">
      <div className="text-center mb-3">
        <div className="inline-block px-4 py-2 border-4 border-double border-black">
          <div className="text-3xl font-extrabold uppercase tracking-widest">Kitchen Copy</div>
          <div className="text-xs font-mono mt-1">{order.orderNumber}</div>
        </div>
      </div>

      {order.table && (
        <div className="text-center mb-2 text-2xl font-extrabold">
          Table: {order.table.tableNumber}
        </div>
      )}

      <div className="text-center text-sm font-bold mb-3">
        {now}
        {order.numberOfGuests ? ` • ${order.numberOfGuests} guests` : ''}
      </div>

      <div className="border-t-2 border-b-2 border-black border-dashed py-2 space-y-2">
        {(order.items ?? []).map((item: any, i: number) => (
          <div key={i} className="text-lg">
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-2xl">{item.quantity}×</span>
              <span className="font-bold uppercase">{item.product?.name}</span>
            </div>
            {item.modifiers?.length > 0 && (
              <div className="pl-6 text-sm italic">
                {item.modifiers.map((m: any) => m.modifierOption?.name || m.optionName).join(', ')}
              </div>
            )}
            {item.specialInstructions && (
              <div className="pl-2 text-sm italic font-bold uppercase border-l-4 border-black mt-1">
                ⚠ {item.specialInstructions}
              </div>
            )}
            {item.spiceLevel && item.spiceLevel !== 'NONE' && (
              <div className="pl-6 text-sm font-extrabold text-red-600">
                🌶️ {item.spiceLevel}
              </div>
            )}
          </div>
        ))}
      </div>

      {order.specialRequests && (
        <div className="mt-3 border-2 border-black p-2 text-sm">
          <strong>SPECIAL:</strong> {order.specialRequests}
        </div>
      )}

      <div className="text-center text-xs mt-4 italic">--- End of Kitchen Copy ---</div>
    </div>
  );
}
