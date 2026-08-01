import { Package, Copy, Trash2, Plus, DollarSign, MapPin, Ruler, Hash } from 'lucide-react';
import type { CarpetWizardPieceLine, CarpetWizardBasic } from '../../hooks/useCarpetWizard';

interface Props {
  basic: CarpetWizardBasic;
  bucketName: string;
  bucketColorHex?: string;
  variantTempId: string | null;
  lines: CarpetWizardPieceLine[];
  onAdd: () => void;
  onUpdate: (tempId: string, patch: Partial<CarpetWizardPieceLine>) => void;
  onDuplicate: (tempId: string) => void;
  onRemove: (tempId: string) => void;
}

export function CarpetPiecesTable({
  bucketName, lines, onAdd, onUpdate, onDuplicate, onRemove,
}: Props) {
  const totalPieces = lines.reduce((a, l) => a + Number(l.quantity || 0), 0);
  const totalSqft = lines.reduce((a, l) => {
    const w = Number(l.widthFt) + Number(l.widthInch || 0) / 12;
    const h = Number(l.lengthFt) + Number(l.lengthInch || 0) / 12;
    return a + w * h * Number(l.quantity || 0);
  }, 0);
  const totalValue = lines.reduce(
    (a, l) => a + Number(l.salePricePerPiece || 0) * Number(l.quantity || 0),
    0,
  );

  if (lines.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-violet-50 mx-auto flex items-center justify-center mb-2">
          <Package className="h-7 w-7 text-violet-400" />
        </div>
        <div className="text-sm font-extrabold text-slate-700">No pieces added for {bucketName}</div>
        <div className="text-xs text-slate-500 font-semibold mt-1">
          Click <strong>Add Piece Line</strong> to add mats / rugs / centre pieces
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <ColHead label="Piece Code" icon={Hash} />
              <ColHead label="Width" hint="ft × in" icon={Ruler} />
              <ColHead label="Length" hint="ft × in" icon={Ruler} />
              <ColHead label="Qty" hint="# of pieces" />
              <ColHead label="Sqft each" hint="calculated" />
              <ColHead label="Cost/pc" icon={DollarSign} />
              <ColHead label="Sale/pc" icon={DollarSign} />
              <ColHead label="Rack" icon={MapPin} />
              <ColHead label="" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l) => {
              const w = Number(l.widthFt) + Number(l.widthInch || 0) / 12;
              const h = Number(l.lengthFt) + Number(l.lengthInch || 0) / 12;
              const sqft = w * h;
              return (
                <tr key={l.tempId} className="hover:bg-slate-50/50">
                  <td className="px-2 py-1.5">
                    <input
                      value={l.pieceCode}
                      onChange={(e) => onUpdate(l.tempId, { pieceCode: e.target.value })}
                      className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-violet-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1 items-center">
                      <NumCell value={l.widthFt} onChange={(v: number) => onUpdate(l.tempId, { widthFt: v })} suffix="ft" width="w-14" />
                      <NumCell value={l.widthInch} onChange={(v: number) => onUpdate(l.tempId, { widthInch: v })} suffix="in" width="w-12" max={11} />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1 items-center">
                      <NumCell value={l.lengthFt} onChange={(v: number) => onUpdate(l.tempId, { lengthFt: v })} suffix="ft" width="w-14" />
                      <NumCell value={l.lengthInch} onChange={(v: number) => onUpdate(l.tempId, { lengthInch: v })} suffix="in" width="w-12" max={11} />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <NumCell
                      value={l.quantity}
                      onChange={(v: number) => onUpdate(l.tempId, { quantity: v })}
                      width="w-14"
                      accent="violet"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div
                      className={[
                        'text-xs font-extrabold tabular-nums',
                        sqft > 0 ? 'text-violet-700' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {sqft.toFixed(1)}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <NumCell
                      value={l.costPricePerPiece}
                      onChange={(v: number) => onUpdate(l.tempId, { costPricePerPiece: v })}
                      width="w-20"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <NumCell
                      value={l.salePricePerPiece}
                      onChange={(v: number) => onUpdate(l.tempId, { salePricePerPiece: v })}
                      width="w-20"
                      accent="emerald"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={l.rackNumber}
                      onChange={(e) => onUpdate(l.tempId, { rackNumber: e.target.value })}
                      placeholder="Wall-1"
                      className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDuplicate(l.tempId)}
                        className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(l.tempId)}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-violet-50/50 p-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] font-extrabold text-violet-800 pl-1">
          <span>📦 {totalPieces} pieces</span>
          <span className="text-violet-400">•</span>
          <span>📐 {totalSqft.toFixed(1)} sqft total</span>
          <span className="text-violet-400">•</span>
          <span>💰 Rs {totalValue.toLocaleString('en-PK')}</span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="px-2.5 py-1 rounded-lg bg-white border-2 border-dashed border-violet-300 hover:border-violet-500 hover:bg-violet-50 text-violet-700 text-[11px] font-extrabold inline-flex items-center gap-1 transition"
        >
          <Plus className="h-3 w-3" /> Add Piece Line
        </button>
      </div>
    </>
  );
}

function ColHead({ label, hint, icon: Icon }: { label: string; hint?: string; icon?: any }) {
  return (
    <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">
      <div className="flex items-center gap-0.5">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </div>
      {hint && <div className="text-[9px] font-bold text-slate-400 normal-case">{hint}</div>}
    </th>
  );
}

function NumCell({
  value, onChange, suffix, width = 'w-20', accent, max,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  width?: string;
  accent?: 'emerald' | 'violet';
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const v = e.target.value === '' ? 0 : Number(e.target.value);
          if (max !== undefined && v > max) return;
          onChange(v);
        }}
        placeholder="0"
        className={[
          'h-8 rounded-lg border-2 px-2 text-xs font-bold tabular-nums text-right focus:outline-none',
          width,
          accent === 'emerald'
            ? 'border-emerald-200 bg-emerald-50/50 focus:border-emerald-500 text-emerald-800'
            : accent === 'violet'
              ? 'border-violet-200 bg-violet-50/50 focus:border-violet-500 text-violet-800'
              : 'border-slate-200 focus:border-emerald-500',
          suffix ? 'pr-6' : '',
        ].join(' ')}
      />
      {suffix && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
