import { StickyNote } from 'lucide-react';
import { useRestaurantOrderForSale } from '../hooks/useRestaurantOrderForSale';

/**
 * Meta strip shown right under the receipt header for restaurant sales.
 * Table number / mode / guest count / KOT reference — all at a glance.
 */
export function RestaurantReceiptMeta({ sale }: { sale: any }) {
  const { data: order } = useRestaurantOrderForSale(sale?.id, sale?.saleNumber);
  if (!order) return null;

  return (
    <div className="px-8 py-4 bg-gradient-to-r from-orange-50 via-white to-red-50 border-b-2 border-orange-200 print:bg-white print:border-slate-300">
      <div className="grid sm:grid-cols-4 gap-3">
        {order.table && (
          <div>
            <div className="text-[10px] uppercase font-extrabold text-orange-700">Table</div>
            <div className="font-extrabold text-slate-900 text-lg">
              {order.table.tableNumber}
              {order.table.tableName && (
                <span className="text-sm text-slate-600 ml-1">({order.table.tableName})</span>
              )}
            </div>
          </div>
        )}
        <div>
          <div className="text-[10px] uppercase font-extrabold text-orange-700">Order Mode</div>
          <div className="font-extrabold text-slate-900">
            {order.mode.replace(/_/g, ' ')}
          </div>
        </div>
        {order.numberOfGuests ? (
          <div>
            <div className="text-[10px] uppercase font-extrabold text-orange-700">Guests</div>
            <div className="font-extrabold text-slate-900">{order.numberOfGuests} people</div>
          </div>
        ) : null}
        {order.kots && order.kots.length > 0 && (
          <div>
            <div className="text-[10px] uppercase font-extrabold text-orange-700">KOT #</div>
            <div className="font-extrabold text-slate-900 font-mono">
              {order.kots[0].kotNumber}
            </div>
          </div>
        )}
      </div>
      {order.specialRequests && (
        <div className="mt-2 pt-2 border-t border-orange-200 flex items-start gap-2">
          <StickyNote className="h-3 w-3 text-orange-600 mt-0.5" />
          <div className="text-xs italic text-slate-700">
            <strong>Special Request:</strong> {order.specialRequests}
          </div>
        </div>
      )}
    </div>
  );
}
