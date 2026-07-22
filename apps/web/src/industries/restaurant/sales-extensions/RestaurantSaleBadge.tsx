import { Utensils, Bike, ShoppingBag, Car, ChefHat, Home } from 'lucide-react';
import { useRestaurantOrderForSale } from '../hooks/useRestaurantOrderForSale';

const MODE_ICONS: Record<string, any> = {
  DINE_IN: Utensils,
  DELIVERY: Bike,
  TAKEAWAY: ShoppingBag,
  DRIVE_THRU: Car,
  ROOM_SERVICE: Home,
  PICKUP: ShoppingBag,
};

/**
 * Restaurant badge shown next to sale number in the Sales list.
 * Reveals table number (if dine-in) or the order mode.
 * If the sale isn\'t a restaurant order, renders nothing.
 */
export function RestaurantSaleBadge({ sale }: { sale: any }) {
  const { data: order } = useRestaurantOrderForSale(sale?.id, sale?.saleNumber);
  if (!order) return null;

  const Icon = MODE_ICONS[order.mode] ?? ChefHat;
  const label = order.table
    ? `TABLE ${order.table.tableNumber}`
    : order.mode.replace(/_/g, ' ');

  return (
    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-extrabold inline-flex items-center gap-1">
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
