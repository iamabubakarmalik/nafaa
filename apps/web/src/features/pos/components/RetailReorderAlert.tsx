import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { reorderApi } from '@/features/industries/retail/api/reorder.api';

const DISMISS_KEY = 'nafaa.pos.reorder-alert-dismissed';

export function RetailReorderAlert() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const t = localStorage.getItem(DISMISS_KEY);
      if (!t) return false;
      // Dismiss for 1 hour
      return Date.now() - parseInt(t, 10) < 60 * 60 * 1000;
    } catch { return false; }
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['reorder-pending-count'],
    queryFn: () => reorderApi.list('PENDING'),
    staleTime: 5 * 60 * 1000,
  });

  const critical = suggestions.filter((s) => s.daysOfStockLeft < 3);

  if (dismissed || critical.length === 0) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  };

  return (
    <div className="mx-3 mt-3 rounded-xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 via-white to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 dark:border-rose-800 shadow-sm px-3 py-2 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 animate-pulse">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold text-rose-900 dark:text-rose-300">
          {critical.length} product{critical.length !== 1 ? 's' : ''} khatam hone wali hai
        </div>
        <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
          Less than 3 days stock — reorder karo abhi
        </div>
      </div>
      <Link
        to="/retail/reorders"
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow shrink-0"
      >
        View
        <ArrowRight className="h-3 w-3" />
      </Link>
      <button
        onClick={handleDismiss}
        className="h-7 w-7 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 flex items-center justify-center shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
