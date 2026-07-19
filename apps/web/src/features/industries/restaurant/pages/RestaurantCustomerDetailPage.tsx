import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ChefHat, Utensils, Bike, ShoppingBag, Home, Car,
  Star, Crown, TrendingUp, Award, Package, Clock,
} from 'lucide-react';
import { customersApi } from '@/api/customers.api';
import { ordersApi } from '../api/orders.api';
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';
import { formatPKR } from '@/lib/format';
import { formatDateTime } from '@/features/customers/components/shared/CustomerShared';

const MODE_ICONS: Record<string, any> = {
  DINE_IN: Utensils, TAKEAWAY: ShoppingBag, DELIVERY: Bike,
  DRIVE_THRU: Car, ROOM_SERVICE: Home,
};

export default function RestaurantCustomerDetailPage() {
  const { id } = useParams();

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: !!id,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['restaurant-customer-orders', id],
    queryFn: () => ordersApi.list({}),
    enabled: !!id,
  });

  const customerOrders = allOrders.filter((o: any) => o.customerId === id);
  const dineInCount = customerOrders.filter((o: any) => o.mode === 'DINE_IN').length;
  const deliveryCount = customerOrders.filter((o: any) => o.mode === 'DELIVERY').length;
  const takeawayCount = customerOrders.filter((o: any) => o.mode === 'TAKEAWAY').length;

  // Favorite items (aggregate)
  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of customerOrders) {
    for (const item of (order.items || [])) {
      const pid = item.productId;
      const existing = itemCounts.get(pid) ?? { name: item.product?.name || 'Unknown', qty: 0, revenue: 0 };
      existing.qty += Number(item.quantity || 0);
      existing.revenue += Number(item.total || 0);
      itemCounts.set(pid, existing);
    }
  }
  const favoriteItems = Array.from(itemCounts.entries())
    .map(([pid, data]) => ({ pid, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Restaurant-specific section on top */}
      {customer && customerOrders.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-orange-600" />
            <h3 className="font-extrabold text-orange-900">🍽️ Restaurant History</h3>
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white border-2 border-orange-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-orange-700">Total Orders</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{customerOrders.length}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Dine-in</div>
              <div className="text-2xl font-extrabold text-emerald-900 mt-1">{dineInCount}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-violet-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-violet-700">Delivery</div>
              <div className="text-2xl font-extrabold text-violet-900 mt-1">{deliveryCount}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-blue-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-blue-700">Takeaway</div>
              <div className="text-2xl font-extrabold text-blue-900 mt-1">{takeawayCount}</div>
            </div>
          </div>

          {favoriteItems.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-orange-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-amber-500" />
                <h4 className="font-bold text-slate-900 text-sm">⭐ Favorite Menu Items</h4>
              </div>
              <div className="space-y-2">
                {favoriteItems.map((item, idx) => (
                  <div key={item.pid} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 rounded ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-slate-500'
                      } text-white text-xs font-extrabold flex items-center justify-center`}>
                        {idx + 1}
                      </div>
                      <span className="font-bold text-slate-900 text-sm truncate">{item.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-700">{item.qty} times</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{formatPKR(item.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customerOrders.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-orange-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-100">
                <h4 className="font-bold text-slate-900 text-sm">Recent Restaurant Orders</h4>
              </div>
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {customerOrders.slice(0, 8).map((order: any) => {
                  const ModeIcon = MODE_ICONS[order.mode] || ChefHat;
                  return (
                    <Link key={order.id} to={`/restaurant/orders/${order.id}`}
                      className="block px-4 py-3 hover:bg-orange-50 transition">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ModeIcon className="h-4 w-4 text-orange-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-mono font-extrabold text-sm text-slate-900">{order.orderNumber}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {order.mode.replace('_', ' ')}
                              {order.table && ` • Table ${order.table.tableNumber}`}
                              • {order.items?.length || 0} items
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(order.total)}</div>
                          <div className="text-[10px] text-slate-500">{formatDateTime(order.createdAt)}</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Then generic customer detail */}
      <CustomerDetailPage />
    </div>
  );
}
