import { Layers, Scissors, MapPin, Ruler } from 'lucide-react';
import { formatPKR } from '@/lib/format';
import type { CarpetRollDetail, CarpetCutPieceDetail } from '@/api/stock-report.api';

interface Props {
  rolls: CarpetRollDetail[];
  cutPieces: CarpetCutPieceDetail[];
}

export function CarpetDetailTable({ rolls, cutPieces }: Props) {
  if (rolls.length === 0 && cutPieces.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-6 text-center">
        <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-700">No carpet stock</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Koi active roll ya cut piece nahi
        </p>
      </div>
    );
  }

  const totalRollSqft = rolls.reduce((s, r) => s + r.remainingSqft, 0);
  const totalCutSqft = cutPieces.reduce((s, c) => s + c.totalSqft, 0);
  const totalRollValue = rolls.reduce((s, r) => s + r.remainingSqft * r.costPerSqft, 0);
  const totalCutValue = cutPieces.reduce((s, c) => s + c.salePrice, 0);

  return (
    <div className="space-y-4">
      {/* CARPET ROLLS TABLE */}
      {rolls.length > 0 && (
        <div className="rounded-2xl bg-white border-2 border-emerald-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-b-2 border-emerald-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-900 text-sm">
                  {rolls.length} Active Roll{rolls.length !== 1 ? 's' : ''}
                </h4>
                <p className="text-[10px] text-emerald-700 font-bold">
                  Total: {totalRollSqft.toFixed(2)} sqft • Value: {formatPKR(totalRollValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-emerald-50/50 border-b border-emerald-200">
                <tr>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-emerald-900 w-10">#</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-emerald-900">Roll #</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-emerald-900">Variant</th>
                  <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-emerald-900">Dimensions</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-emerald-900">Remaining</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-emerald-900">Original</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-emerald-900">Cost/Sqft</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-emerald-900">Sale/Sqft</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-emerald-900">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {rolls.map((r, idx) => {
                  const fullWidth = r.widthFt + r.widthInch / 12;
                  const percentRemaining =
                    r.originalLengthFt > 0
                      ? (r.remainingLengthFt / r.originalLengthFt) * 100
                      : 0;
                  return (
                    <tr key={r.id} className="hover:bg-emerald-50/30 transition">
                      <td className="px-3 py-2.5 text-emerald-500 font-mono text-[10px]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-extrabold text-emerald-900 text-xs">
                          {r.rollNumber}
                        </div>
                        {r.designCode && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {r.designCode}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.variantName ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700">
                            {r.variantColorHex && (
                              <span
                                className="h-2 w-2 rounded-full border border-slate-300"
                                style={{ backgroundColor: r.variantColorHex }}
                              />
                            )}
                            {r.variantName}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="text-[11px] font-bold text-slate-900">
                          {r.widthFt}ft{Number((r as any).widthInch || 0) > 0 ? ` ${(r as any).widthInch}in` : ''} × {r.remainingLengthFt}ft{Number((r as any).remainingLengthInch || 0) > 0 ? ` ${(r as any).remainingLengthInch}in` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="font-extrabold text-emerald-700 tabular-nums">
                          {r.remainingSqft.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-emerald-600 font-bold">sqft</div>
                        <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden w-16 ml-auto">
                          <div
                            className={`h-full ${
                              percentRemaining > 50
                                ? 'bg-emerald-500'
                                : percentRemaining > 20
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(percentRemaining, 3)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[10px] text-slate-600 font-bold tabular-nums">
                        {r.originalLengthFt.toFixed(1)}ft
                        <div className="text-[9px] text-slate-500">
                          {percentRemaining.toFixed(0)}%
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-700 tabular-nums">
                        {formatPKR(r.costPerSqft)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[11px] font-bold text-emerald-700 tabular-nums">
                        {formatPKR(r.salePricePerSqft)}
                      </td>
                      <td className="px-3 py-2.5 text-[10px]">
                        {r.shopName && (
                          <div className="font-bold text-slate-700 inline-flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {r.shopName}
                          </div>
                        )}
                        {r.rackNumber && (
                          <div className="text-[9px] text-slate-500 font-bold mt-0.5">
                            Rack: {r.rackNumber}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUT PIECES TABLE */}
      {cutPieces.length > 0 && (
        <div className="rounded-2xl bg-white border-2 border-violet-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                <Scissors className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-violet-900 text-sm">
                  {cutPieces.length} Cut Piece{cutPieces.length !== 1 ? 's' : ''}
                </h4>
                <p className="text-[10px] text-violet-700 font-bold">
                  Total: {totalCutSqft.toFixed(2)} sqft • Listed: {formatPKR(totalCutValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-violet-50/50 border-b border-violet-200">
                <tr>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900 w-10">#</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900">Piece Code</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900">Variant</th>
                  <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-violet-900">Dimensions</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-violet-900">Sqft</th>
                  <th className="px-3 py-2 text-right font-bold uppercase tracking-wider text-violet-900">Sale Price</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900">Condition</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-violet-900">From Roll</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100">
                {cutPieces.map((cp, idx) => (
                  <tr key={cp.id} className="hover:bg-violet-50/30 transition">
                    <td className="px-3 py-2.5 text-violet-500 font-mono text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-mono font-extrabold text-violet-900 text-xs">
                        {cp.pieceCode}
                      </div>
                      {cp.rackNumber && (
                        <div className="text-[9px] text-slate-500 mt-0.5 inline-flex items-center gap-0.5">
                          <MapPin className="h-2 w-2" />
                          {cp.rackNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {cp.variantName ? (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700">
                          {cp.variantColorHex && (
                            <span
                              className="h-2 w-2 rounded-full border border-slate-300"
                              style={{ backgroundColor: cp.variantColorHex }}
                            />
                          )}
                          {cp.variantName}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-900">
                      {cp.widthFt}ft{Number((cp as any).widthInch || 0) > 0 ? ` ${(cp as any).widthInch}in` : ''} × {cp.lengthFt}ft{Number((cp as any).lengthInch || 0) > 0 ? ` ${(cp as any).lengthInch}in` : ''}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-extrabold text-violet-700 tabular-nums">
                        {cp.totalSqft.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-violet-600 font-bold">sqft</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] font-extrabold text-emerald-700 tabular-nums">
                      {formatPKR(cp.salePrice)}
                    </td>
                    <td className="px-3 py-2.5 text-[10px]">
                      {cp.condition ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                          {cp.condition}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {cp.sourceRollNumber ? (
                        <span className="font-mono text-[10px] font-bold text-emerald-700">
                          {cp.sourceRollNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
