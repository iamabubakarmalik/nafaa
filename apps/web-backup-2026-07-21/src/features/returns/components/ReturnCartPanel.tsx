import {
  ArrowLeftRight, RotateCcw, Layers, Scissors, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { ReturnCartLine } from './ReturnCartLine';
import type { ReturnLine } from './return-types';
import type { PaymentMethod } from '@/api/sales.api';

const paymentLabels: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank',
};

interface Props {
  returnLines: ReturnLine[];
  reason: string;
  refundMethod: PaymentMethod;
  notes: string;
  loading: boolean;
  onReasonChange: (v: string) => void;
  onRefundMethodChange: (m: PaymentMethod) => void;
  onNotesChange: (v: string) => void;
  onQuantityChange: (saleItemId: string, qty: number) => void;
  onRemoveLine: (saleItemId: string) => void;
  onEditCarpetLine: (lineIndex: number) => void;
  onSubmit: () => void;
}

export function ReturnCartPanel({
  returnLines, reason, refundMethod, notes, loading,
  onReasonChange, onRefundMethodChange, onNotesChange,
  onQuantityChange, onRemoveLine, onEditCarpetLine, onSubmit,
}: Props) {
  const totalRefund = returnLines.reduce((s, l) => s + l.price * l.quantity, 0);

  const carpetCartCount = returnLines.filter((l) => l.isCarpet).length;
  const willCreatePieces = returnLines.filter(
    (l) => l.isCarpet && l.carpetOptions?.createCutPiece && !l.carpetOptions?.isDamaged,
  ).length;
  const willCreateDamaged = returnLines.filter(
    (l) => l.isCarpet && l.carpetOptions?.createCutPiece && l.carpetOptions?.isDamaged,
  ).length;
  const unconfiguredCarpet = returnLines.filter(
    (l) => l.isCarpet && !l.carpetOptions,
  ).length;

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center shadow">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Return Items</h3>
          <p className="text-sm text-slate-500">
            Quantity adjust karein + carpet items pe options configure karein
          </p>
        </div>
      </div>

      {/* Carpet inventory preview banner */}
      {carpetCartCount > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-emerald-700" />
            <div className="font-bold text-emerald-900 text-sm">
              Carpet Inventory Actions
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white p-2 text-center">
              <div className="text-[9px] uppercase font-bold text-emerald-700">Cart</div>
              <div className="text-lg font-extrabold text-emerald-900">{carpetCartCount}</div>
              <div className="text-[9px] text-emerald-700 font-bold">carpet items</div>
            </div>
            <div className="rounded-lg bg-white p-2 text-center">
              <div className="text-[9px] uppercase font-bold text-emerald-700">Resellable</div>
              <div className="text-lg font-extrabold text-emerald-900">{willCreatePieces}</div>
              <div className="text-[9px] text-emerald-700 font-bold">pieces</div>
            </div>
            <div className="rounded-lg bg-white p-2 text-center">
              <div className="text-[9px] uppercase font-bold text-rose-700">Damaged</div>
              <div className="text-lg font-extrabold text-rose-900">{willCreateDamaged}</div>
              <div className="text-[9px] text-rose-700 font-bold">pieces</div>
            </div>
          </div>
          {unconfiguredCarpet > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <div className="text-[11px] text-amber-900 font-bold">
                {unconfiguredCarpet} carpet item{unconfiguredCarpet !== 1 ? 's' : ''} need configuration
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cart lines */}
      {returnLines.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <ArrowLeftRight className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">No items added yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Left side se sale select karein aur items add karein
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {returnLines.map((line, index) => (
            <ReturnCartLine
              key={line.saleItemId}
              line={line}
              onQuantityChange={(qty) => onQuantityChange(line.saleItemId, qty)}
              onRemove={() => onRemoveLine(line.saleItemId)}
              onConfigureCarpet={
                line.isCarpet ? () => onEditCarpetLine(index) : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Reason + Refund method */}
      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <Input
          label="Reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Damaged, wrong item, color mismatch..."
        />
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Refund Method
          </label>
          <select
            value={refundMethod}
            onChange={(e) => onRefundMethodChange(e.target.value as PaymentMethod)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold"
          >
            <option value="CASH">💵 Cash</option>
            <option value="JAZZCASH">📱 JazzCash</option>
            <option value="EASYPAISA">⚡ EasyPaisa</option>
            <option value="CARD">💳 Card</option>
            <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
          </select>
        </div>
      </div>
      <Input
        label="Notes (optional)"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Additional notes"
      />

      {/* Refund summary */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-200 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-rose-700 font-bold">
            Total Refund
          </div>
          <div className="text-3xl font-extrabold text-rose-900 mt-1">
            {formatPKR(totalRefund)}
          </div>
          <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
            {returnLines.length} item{returnLines.length !== 1 ? 's' : ''} • via{' '}
            {paymentLabels[refundMethod]}
            {willCreatePieces > 0 && (
              <span className="ml-2 text-emerald-700">
                • {willCreatePieces} cut piece{willCreatePieces !== 1 ? 's' : ''} will be created
              </span>
            )}
          </div>
        </div>
        <RotateCcw className="h-12 w-12 text-rose-300" />
      </div>

      {/* Submit button */}
      <Button
        className="w-full bg-orange-600 hover:bg-orange-700"
        size="lg"
        loading={loading}
        onClick={onSubmit}
        disabled={returnLines.length === 0 || unconfiguredCarpet > 0}
      >
        {unconfiguredCarpet > 0 ? (
          <>
            <AlertTriangle className="h-4 w-4" />
            Configure {unconfiguredCarpet} carpet item{unconfiguredCarpet !== 1 ? 's' : ''}
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4" />
            Process Return • {formatPKR(totalRefund)}
          </>
        )}
      </Button>

      {/* Quick action hint */}
      {willCreatePieces + willCreateDamaged > 0 && (
        <div className="text-[10px] text-center text-slate-500 font-semibold">
          <CheckCircle2 className="h-3 w-3 inline text-emerald-600 mr-1" />
          Backend will auto-create{' '}
          <strong>{willCreatePieces + willCreateDamaged} cut piece(s)</strong> on submit
        </div>
      )}
    </div>
  );
}
