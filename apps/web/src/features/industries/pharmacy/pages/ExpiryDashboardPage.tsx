import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Pill, AlertTriangle, Calendar, TrendingDown, Package, Sparkles,
} from 'lucide-react';
import { batchesApi } from '../api/batches.api';
import { formatPKR } from '@/lib/format';

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const expiry = new Date(date);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ExpiryDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['batches-stats'],
    queryFn: batchesApi.stats,
  });

  const { data: expiringSoon = [] } = useQuery({
    queryKey: ['batches-expiring-soon'],
    queryFn: () => batchesApi.expiringSoon(30),
  });

  const { data: expired = [] } = useQuery({
    queryKey: ['batches-expired'],
    queryFn: batchesApi.expired,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-rose-900 via-rose-700 to-pink-600 text-white p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Pill className="h-7 w-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Pharmacy Module
            </div>
            <h1 className="mt-2 text-3xl font-extrabold">Expiry Dashboard</h1>
            <p className="text-sm text-white/80 mt-1">Track expiry-sensitive inventory</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-slate-600" />
            <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold">Total Batches</div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-emerald-600" />
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Total Stock</div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900">{stats?.totalQuantity ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-amber-600" />
            <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Expiring Soon</div>
          </div>
          <div className="text-3xl font-extrabold text-amber-900">{stats?.expiringSoon ?? 0}</div>
          <p className="text-[10px] text-amber-700 font-semibold mt-1">Within 30 days</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <div className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Expired</div>
          </div>
          <div className="text-3xl font-extrabold text-rose-900">{stats?.expired ?? 0}</div>
          <p className="text-[10px] text-rose-700 font-semibold mt-1">Remove immediately</p>
        </div>
      </div>

      {expired.length > 0 && (
        <div className="rounded-3xl bg-white border-2 border-rose-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h3 className="font-extrabold text-rose-900">Expired Batches ({expired.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {expired.slice(0, 10).map((batch) => {
              const days = daysUntil(batch.expiryDate);
              return (
                <Link
                  key={batch.id}
                  to={`/products/${batch.productId}/edit`}
                  className="flex items-center justify-between p-3 hover:bg-rose-50/40 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900">{batch.product?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">#{batch.batchNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-rose-700">{batch.quantity} {batch.product?.unit}</div>
                    <div className="text-[10px] text-rose-600 font-bold">
                      Expired {Math.abs(days || 0)}d ago
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="rounded-3xl bg-white border-2 border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-600" />
            <h3 className="font-extrabold text-amber-900">Expiring Soon ({expiringSoon.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {expiringSoon.slice(0, 15).map((batch) => {
              const days = daysUntil(batch.expiryDate);
              return (
                <Link
                  key={batch.id}
                  to={`/products/${batch.productId}/edit`}
                  className="flex items-center justify-between p-3 hover:bg-amber-50/40 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900">{batch.product?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">#{batch.batchNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-amber-700">{batch.quantity} {batch.product?.unit}</div>
                    <div className="text-[10px] text-amber-600 font-bold">{days}d remaining</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {expired.length === 0 && expiringSoon.length === 0 && (
        <div className="rounded-3xl bg-white border-2 border-emerald-200 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 mx-auto flex items-center justify-center mb-3">
            <Sparkles className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="font-extrabold text-emerald-900">All Clear! 🎉</h3>
          <p className="text-sm text-emerald-700 mt-1">No expiring or expired batches</p>
        </div>
      )}
    </div>
  );
}
