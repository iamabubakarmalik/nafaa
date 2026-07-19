import { Cable, DollarSign, MapPin, StickyNote, AlertTriangle, Package } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import type { MobileWizardBasic, MobileWizardAccessoryStock } from '../../hooks/useMobileWizard';

interface Props {
  basic: MobileWizardBasic;
  bucketName: string;
  variantTempId: string | null;
  stock: MobileWizardAccessoryStock | undefined;
  onChange: (patch: Partial<MobileWizardAccessoryStock>) => void;
}

export function MobileAccessoryStockCard({ basic, bucketName, stock, onChange }: Props) {
  const currentUnits = Number(stock?.currentStock ?? 0);
  const salePrice = Number(basic.salePrice || 0);
  const lowAlert = Number(stock?.lowStockAlert ?? 5);
  const isLow = currentUnits > 0 && currentUnits <= lowAlert;
  const stockValue = currentUnits * salePrice;

  return (
    <div className="p-4 border-t border-slate-100 bg-gradient-to-br from-emerald-50 to-white space-y-4">
      <div className="rounded-xl bg-white border-2 border-emerald-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cable className="h-4 w-4 text-emerald-700" />
          <div className="font-extrabold text-slate-900 text-sm">
            Accessory Stock for {bucketName}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Current Stock (units)"
            type="number"
            step="1"
            value={stock?.currentStock ?? 0}
            onChange={(e) => onChange({ currentStock: Number(e.target.value || 0) })}
            hint="Kitne units available hain"
          />
          <Input
            label="Low Stock Alert"
            type="number"
            step="1"
            value={stock?.lowStockAlert ?? 5}
            onChange={(e) => onChange({ lowStockAlert: Number(e.target.value || 0) })}
            hint="Below this → alert"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white border-2 border-slate-200 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Rack / Location"
            value={stock?.rackNumber ?? ''}
            onChange={(e) => onChange({ rackNumber: e.target.value })}
            placeholder="Rack-3, Shelf-A"
            leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <StickyNote className="h-3 w-3" /> Notes
            </label>
            <input
              value={stock?.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Any note"
            />
          </div>
        </div>
      </div>

      {currentUnits > 0 && (
        <div className={[
          'rounded-xl border-2 p-3 flex items-center justify-between',
          isLow ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300',
        ].join(' ')}>
          <div className="flex items-center gap-2">
            {isLow && <AlertTriangle className="h-4 w-4 text-amber-700" />}
            <div>
              <div className={[
                'text-[10px] uppercase tracking-wider font-extrabold',
                isLow ? 'text-amber-700' : 'text-emerald-700',
              ].join(' ')}>
                Stock Value
              </div>
              <div className="text-lg font-extrabold tabular-nums text-slate-900">
                {formatPKRFull(stockValue)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-0.5 justify-end">
              <Package className="h-2.5 w-2.5" /> Stock
            </div>
            <div className={[
              'text-lg font-extrabold tabular-nums',
              isLow ? 'text-amber-700' : 'text-emerald-700',
            ].join(' ')}>
              {currentUnits} units
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
