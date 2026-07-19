import { Ruler, DollarSign, MapPin, StickyNote, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import type { CarpetWizardBasic, CarpetWizardFtStock } from '../../hooks/useCarpetWizard';

interface Props {
  basic: CarpetWizardBasic;
  bucketName: string;
  variantTempId: string | null;
  ftStock: CarpetWizardFtStock | undefined;
  onChange: (patch: Partial<CarpetWizardFtStock>) => void;
}

export function CarpetFtStockCard({ basic, bucketName, ftStock, onChange }: Props) {
  const currentFt = Number(ftStock?.currentFt ?? 0);
  const salePerFt = Number(ftStock?.salePricePerFt ?? basic.salePricePerSqft ?? 0);
  const costPerFt = Number(ftStock?.costPerFt ?? basic.costPricePerSqft ?? 0);
  const stockValue = currentFt * salePerFt;
  const lowAlert = Number(ftStock?.lowStockAlertFt ?? 5);
  const isLow = currentFt > 0 && currentFt <= lowAlert;

  return (
    <div className="p-4 border-t border-slate-100 bg-gradient-to-br from-blue-50 to-white space-y-4">
      <div className="rounded-xl bg-white border-2 border-blue-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Ruler className="h-4 w-4 text-blue-700" />
          <div className="font-extrabold text-slate-900 text-sm">
            Running-Feet Stock for {bucketName}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Current Stock (feet)"
            type="number"
            step="0.1"
            value={ftStock?.currentFt ?? 0}
            onChange={(e) => onChange({ currentFt: Number(e.target.value || 0) })}
            hint="Kitne feet available hain abhi"
          />
          <Input
            label="Low Stock Alert (feet)"
            type="number"
            step="1"
            value={ftStock?.lowStockAlertFt ?? 5}
            onChange={(e) => onChange({ lowStockAlertFt: Number(e.target.value || 0) })}
            hint="Below this → alert"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white border-2 border-emerald-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-700" />
          <div className="font-extrabold text-slate-900 text-sm">Pricing per foot</div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            label="Cost / ft (PKR)"
            type="number"
            step="0.01"
            value={ftStock?.costPerFt ?? costPerFt}
            onChange={(e) => onChange({ costPerFt: Number(e.target.value || 0) })}
          />
          <Input
            label="Sale / ft (PKR)"
            type="number"
            step="0.01"
            value={ftStock?.salePricePerFt ?? salePerFt}
            onChange={(e) => onChange({ salePricePerFt: Number(e.target.value || 0) })}
          />
          <Input
            label="Wholesale / ft (PKR)"
            type="number"
            step="0.01"
            value={ftStock?.wholesalePricePerFt ?? 0}
            onChange={(e) => onChange({ wholesalePricePerFt: Number(e.target.value || 0) })}
          />
        </div>
      </div>

      <div className="rounded-xl bg-white border-2 border-slate-200 p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Rack / Location"
            value={ftStock?.rackNumber ?? ''}
            onChange={(e) => onChange({ rackNumber: e.target.value })}
            placeholder="Wall-3, Rack-2"
            leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <StickyNote className="h-3 w-3" /> Notes
            </label>
            <input
              value={ftStock?.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Any note"
            />
          </div>
        </div>
      </div>

      {currentFt > 0 && (
        <div
          className={[
            'rounded-xl border-2 p-3 flex items-center justify-between',
            isLow ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            {isLow && <AlertTriangle className="h-4 w-4 text-amber-700" />}
            <div>
              <div
                className={[
                  'text-[10px] uppercase tracking-wider font-extrabold',
                  isLow ? 'text-amber-700' : 'text-emerald-700',
                ].join(' ')}
              >
                Stock Value
              </div>
              <div className="text-lg font-extrabold tabular-nums text-slate-900">
                {formatPKRFull(stockValue)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Stock</div>
            <div
              className={[
                'text-lg font-extrabold tabular-nums',
                isLow ? 'text-amber-700' : 'text-emerald-700',
              ].join(' ')}
            >
              {currentFt.toFixed(1)} ft
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
