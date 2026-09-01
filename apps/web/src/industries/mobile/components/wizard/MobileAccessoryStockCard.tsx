import { Cable, MapPin, StickyNote, AlertTriangle, Package } from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { MobileWizardBasic, MobileWizardAccessoryStock } from '../../hooks/useMobileWizard';

interface Props {
  basic: MobileWizardBasic;
  bucketName: string;
  variantTempId: string | null;
  stock: MobileWizardAccessoryStock | undefined;
  onChange: (patch: Partial<MobileWizardAccessoryStock>) => void;
}

const QUICK_QTY = [5, 10, 25, 50, 100];

export function MobileAccessoryStockCard({ basic, bucketName, stock, onChange }: Props) {
  const currentUnits = Number(stock?.currentStock ?? 0);
  const salePrice = Number(basic.salePrice || 0);
  const costPrice = Number(basic.costPrice || 0);
  const lowAlert = Number(stock?.lowStockAlert ?? 5);
  const isLow = currentUnits > 0 && currentUnits <= lowAlert;
  const stockValue = currentUnits * salePrice;
  const stockCost = currentUnits * costPrice;
  const potentialProfit = stockValue - stockCost;

  return (
    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 space-y-4">
      <div className="rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cable className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          <div className="font-extrabold text-slate-900 dark:text-white text-sm">
            Stock for {bucketName}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Current Stock (units)"
              type="number"
              step="1"
              min="0"
              value={stock?.currentStock ?? 0}
              onChange={(e) => onChange({ currentStock: Math.max(0, Number(e.target.value || 0)) })}
              hint="Kitne pieces available hain"
            />
            {/* ⚡ Quick qty chips */}
            <div className="mt-1.5 flex gap-1 flex-wrap">
              {QUICK_QTY.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChange({ currentStock: q })}
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border-2 transition active:scale-95 tabular-nums ${
                    currentUnits === q
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Low Stock Alert"
            type="number"
            step="1"
            min="0"
            value={stock?.lowStockAlert ?? 5}
            onChange={(e) => onChange({ lowStockAlert: Math.max(0, Number(e.target.value || 0)) })}
            hint="Is se kam → dashboard alert"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Rack / Location"
            value={stock?.rackNumber ?? ''}
            onChange={(e) => onChange({ rackNumber: e.target.value })}
            placeholder="Rack-3, Shelf-A"
            leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 items-center gap-1">
              <StickyNote className="h-3 w-3 inline" /> Notes
            </label>
            <input
              value={stock?.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
              placeholder="Any note"
            />
          </div>
        </div>
      </div>

      {currentUnits > 0 && (
        <div className={[
          'rounded-xl border-2 p-3',
          isLow
            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
            : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40',
        ].join(' ')}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {isLow && <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />}
              <div>
                <div className={[
                  'text-[10px] uppercase tracking-wider font-extrabold',
                  isLow ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
                ].join(' ')}>
                  {isLow ? '⚠️ Low stock — sale value' : 'Stock Sale Value'}
                </div>
                <div className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {formatPKRFull(stockValue)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-0.5 justify-end">
                <Package className="h-2.5 w-2.5" /> Stock
              </div>
              <div className={[
                'text-lg font-extrabold tabular-nums',
                isLow ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
              ].join(' ')}>
                {currentUnits} units
              </div>
            </div>
          </div>
          {costPrice > 0 && (
            <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-500 dark:text-slate-400">Cost: {formatPKRFull(stockCost)}</span>
              <span className={potentialProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                Potential profit: {formatPKRFull(potentialProfit)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
