import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Utensils, ShoppingBag, Bike, Car, Home, Package,
  Users, MapPin, MessageSquare, Sparkles, ChevronDown, Check,
} from 'lucide-react';
import { tablesApi, type TableStatus } from '@industries/restaurant/api/tables.api';
import type { OrderMode } from '@industries/restaurant/api/orders.api';

const MODES: { value: OrderMode; label: string; icon: any; color: string }[] = [
  { value: 'DINE_IN', label: 'Dine-in', icon: Utensils, color: 'emerald' },
  { value: 'TAKEAWAY', label: 'Takeaway', icon: ShoppingBag, color: 'blue' },
  { value: 'DELIVERY', label: 'Delivery', icon: Bike, color: 'violet' },
  { value: 'DRIVE_THRU', label: 'Drive-thru', icon: Car, color: 'amber' },
  { value: 'ROOM_SERVICE', label: 'Room', icon: Home, color: 'pink' },
  { value: 'PICKUP', label: 'Pickup', icon: Package, color: 'cyan' },
];

const STATUS_DOT: Record<TableStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-rose-500',
  RESERVED: 'bg-amber-500',
  CLEANING: 'bg-blue-500',
  OUT_OF_SERVICE: 'bg-slate-400',
};

interface Props {
  orderMode: OrderMode;
  onChangeMode: (mode: OrderMode) => void;
  selectedTableId: string;
  onSelectTable: (id: string) => void;
  numberOfGuests: number;
  onChangeGuests: (n: number) => void;
  deliveryAddress: string;
  onChangeDeliveryAddress: (v: string) => void;
  deliveryNotes: string;
  onChangeDeliveryNotes: (v: string) => void;
  specialRequests: string;
  onChangeSpecialRequests: (v: string) => void;
}

export function RestaurantModeBar({
  orderMode, onChangeMode,
  selectedTableId, onSelectTable,
  numberOfGuests, onChangeGuests,
  deliveryAddress, onChangeDeliveryAddress,
  deliveryNotes, onChangeDeliveryNotes,
  specialRequests, onChangeSpecialRequests,
}: Props) {
  const [showTablePicker, setShowTablePicker] = useState(false);

  const { data: tables = [] } = useQuery({
    queryKey: ['pos-restaurant-tables'],
    queryFn: () => tablesApi.list({}),
    enabled: orderMode === 'DINE_IN',
    refetchInterval: 30_000,
  });

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  return (
    <section className="rounded-2xl bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-orange-950/30 dark:via-neutral-900 dark:to-red-950/30 border-2 border-orange-200 dark:border-orange-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-orange-200 dark:border-orange-800 bg-white/50 dark:bg-neutral-900/50 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-orange-600" />
        <span className="text-xs uppercase tracking-widest font-extrabold text-orange-800 dark:text-orange-400">
          Restaurant Order
        </span>
      </div>

      {/* Mode Picker */}
      <div className="p-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = orderMode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => onChangeMode(m.value)}
                className={
                  'p-2 rounded-xl border-2 text-center transition ' +
                  (active
                    ? 'border-orange-500 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 shadow'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-orange-300')
                }
              >
                <Icon className="h-4 w-4 mx-auto mb-1" />
                <div className="text-[10px] font-extrabold">{m.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dine-in Table Picker */}
      {orderMode === 'DINE_IN' && (
        <div className="px-3 pb-3 space-y-2">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <button
              onClick={() => setShowTablePicker(!showTablePicker)}
              className={
                'h-11 px-3 rounded-xl border-2 text-left flex items-center justify-between gap-2 transition ' +
                (selectedTable
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800'
                  : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-orange-300')
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <Utensils className="h-4 w-4 shrink-0" />
                {selectedTable ? (
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold truncate">
                      Table {selectedTable.tableNumber}
                      {selectedTable.tableName && ' — ' + selectedTable.tableName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {selectedTable.capacity} seats • {selectedTable.section || 'Main'}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-extrabold">Select Table *</span>
                )}
              </div>
              <ChevronDown className={'h-4 w-4 shrink-0 transition ' + (showTablePicker ? 'rotate-180' : '')} />
            </button>

            <div className="inline-flex items-center bg-white dark:bg-neutral-800 rounded-xl border-2 border-slate-200 dark:border-neutral-700 overflow-hidden">
              <button
                onClick={() => onChangeGuests(Math.max(1, numberOfGuests - 1))}
                className="h-11 w-9 hover:bg-slate-100 text-slate-700 font-extrabold"
              >
                −
              </button>
              <div className="h-11 min-w-[60px] flex items-center justify-center gap-1 px-2 border-x border-slate-200 dark:border-neutral-700">
                <Users className="h-3 w-3 text-slate-500" />
                <span className="text-sm font-extrabold tabular-nums">{numberOfGuests}</span>
              </div>
              <button
                onClick={() => onChangeGuests(numberOfGuests + 1)}
                className="h-11 w-9 bg-orange-600 text-white hover:bg-orange-700 font-extrabold"
              >
                +
              </button>
            </div>
          </div>

          {showTablePicker && (
            <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 max-h-64 overflow-y-auto p-2">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {tables.length === 0 ? (
                  <div className="col-span-6 py-4 text-center text-xs font-semibold text-slate-500">
                    No tables configured. <a href="/restaurant/tables" className="text-orange-600 underline">Add tables</a>
                  </div>
                ) : (
                  tables.map((t) => {
                    const active = selectedTableId === t.id;
                    const dotClass = STATUS_DOT[t.status];
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTable(t.id);
                          setShowTablePicker(false);
                        }}
                        className={
                          'relative aspect-square rounded-lg border-2 p-1.5 flex flex-col items-center justify-center transition ' +
                          (active
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow'
                            : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-orange-300')
                        }
                      >
                        <div className={'absolute top-1 right-1 h-2 w-2 rounded-full ' + dotClass} />
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {t.tableNumber}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 mt-0.5">
                          {t.capacity} seats
                        </div>
                        {active && <Check className="absolute bottom-1 left-1 h-3 w-3 text-emerald-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivery fields */}
      {orderMode === 'DELIVERY' && (
        <div className="px-3 pb-3 space-y-2">
          <div>
            <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-1">Delivery Address *</label>
            <div className="relative">
              <MapPin className="h-4 w-4 text-violet-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={deliveryAddress}
                onChange={(e) => onChangeDeliveryAddress(e.target.value)}
                placeholder="House #, Street, Area, City"
                className="h-11 w-full rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 pl-10 pr-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div>
            <input
              value={deliveryNotes}
              onChange={(e) => onChangeDeliveryNotes(e.target.value)}
              placeholder="Landmark, gate code, delivery instructions..."
              className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      )}

      {/* Special Requests (all modes) */}
      <div className="px-3 pb-3">
        <div className="relative">
          <MessageSquare className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={specialRequests}
            onChange={(e) => onChangeSpecialRequests(e.target.value)}
            placeholder="Special requests (allergies, extra plates, less spicy...)"
            className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 pr-3 text-xs font-bold focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>
    </section>
  );
}
