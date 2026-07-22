import { useState } from 'react';
import {
  Smartphone, Copy, Trash2, Plus, ShieldCheck, Upload,
  CheckCircle2, AlertOctagon, AlertTriangle, Clock, Shield,
  ScanLine, X,
} from 'lucide-react';
import {
  PTA_STATUS_COLORS, PTA_STATUS_LABELS, type PtaStatus,
} from '../../api/imei.api';
import type { MobileWizardImeiLine, MobileWizardBasic } from '../../hooks/useMobileWizard';

interface Props {
  basic: MobileWizardBasic;
  bucketName: string;
  variantTempId: string | null;
  lines: MobileWizardImeiLine[];
  onAdd: () => void;
  onUpdate: (tempId: string, patch: Partial<MobileWizardImeiLine>) => void;
  onRemove: (tempId: string) => void;
  onBulkAdd: (imeis: string[]) => void;
}

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

const PTA_OPTIONS: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

export function MobileImeiTable({
  basic, bucketName, lines, onAdd, onUpdate, onRemove, onBulkAdd,
}: Props) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const doBulkImport = () => {
    const list = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (list.length === 0) return;
    onBulkAdd(list);
    setBulkText('');
    setBulkMode(false);
  };

  const validCount = lines.filter((l) => l.imei1?.length === 15).length;

  if (bulkMode) {
    return (
      <div className="p-4 border-t border-slate-100 bg-blue-50/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Bulk Paste IMEIs for {bucketName}
          </div>
          <button
            type="button"
            onClick={() => { setBulkMode(false); setBulkText(''); }}
            className="h-6 w-6 rounded-lg hover:bg-slate-200 flex items-center justify-center"
          >
            <X className="h-3 w-3 text-slate-500" />
          </button>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-[10px] text-amber-900 font-semibold">
          💡 Ek IMEI per line, 15 digits. Duplicates auto-skip.
        </div>
        <textarea
          rows={8}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={`354895112345678\n354895112345679\n354895112345680`}
          className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={doBulkImport}
            disabled={!bulkText.trim()}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Parse & Add {bulkText.split('\n').filter((l) => l.trim()).length} IMEIs
          </button>
          <button
            type="button"
            onClick={() => { setBulkMode(false); setBulkText(''); }}
            className="px-4 h-10 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-blue-50 mx-auto flex items-center justify-center mb-2">
          <Smartphone className="h-7 w-7 text-blue-400" />
        </div>
        <div className="text-sm font-extrabold text-slate-700">No IMEIs for {bucketName}</div>
        <div className="text-xs text-slate-500 font-semibold mt-1">
          Click <strong>+ Add IMEI</strong> ya <strong>Bulk Paste</strong>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add IMEI
          </button>
          <button
            type="button"
            onClick={() => setBulkMode(true)}
            className="px-3 py-1.5 rounded-lg bg-white border-2 border-blue-300 hover:bg-blue-50 text-blue-700 text-xs font-extrabold inline-flex items-center gap-1"
          >
            <Upload className="h-3 w-3" /> Bulk Paste
          </button>
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
              <ColHead label="#" />
              <ColHead label="IMEI 1 *" hint="15 digits" icon={Smartphone} />
              <ColHead label="IMEI 2" hint="dual-SIM" />
              <ColHead label="Serial #" />
              <ColHead label="Color" />
              <ColHead label="PTA Status" icon={ShieldCheck} />
              <ColHead label="Tax (PKR)" />
              <ColHead label="" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((l, idx) => {
              const isValid = l.imei1?.length === 15;
              const PtaIcon = PTA_ICONS[l.ptaStatus] ?? CheckCircle2;
              const ptaColors = PTA_STATUS_COLORS[l.ptaStatus];
              const showTax = l.ptaStatus === 'APPROVED' || l.ptaStatus === 'PATCH';

              return (
                <tr key={l.tempId} className={[
                  'hover:bg-slate-50/50',
                  isValid ? 'bg-emerald-50/20' : '',
                ].join(' ')}>
                  <td className="px-2 py-1.5 text-center">
                    <div className="text-[10px] font-extrabold text-slate-500">{idx + 1}</div>
                    {l.imei1 && !isValid && (
                      <AlertTriangle className="h-3 w-3 text-rose-600 mx-auto mt-0.5" />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={l.imei1}
                      onChange={(e) => onUpdate(l.tempId, { imei1: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                      placeholder="15 digits"
                      maxLength={15}
                      className={[
                        'w-36 h-8 rounded-lg border-2 px-2 text-xs font-mono font-bold focus:outline-none',
                        isValid ? 'border-emerald-300 bg-emerald-50/50 focus:border-emerald-500'
                                : l.imei1 ? 'border-rose-300 focus:border-rose-500'
                                          : 'border-slate-200 focus:border-blue-500',
                      ].join(' ')}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={l.imei2 ?? ''}
                      onChange={(e) => onUpdate(l.tempId, { imei2: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                      placeholder="Optional"
                      maxLength={15}
                      className="w-28 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={l.serialNumber ?? ''}
                      onChange={(e) => onUpdate(l.tempId, { serialNumber: e.target.value })}
                      placeholder="SN"
                      className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={l.color ?? ''}
                      onChange={(e) => onUpdate(l.tempId, { color: e.target.value })}
                      placeholder="Color"
                      className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={l.ptaStatus}
                      onChange={(e) => onUpdate(l.tempId, { ptaStatus: e.target.value as PtaStatus })}
                      className={[
                        'h-8 rounded-lg border-2 px-1 text-[10px] font-extrabold focus:outline-none',
                        ptaColors.bg, ptaColors.text, ptaColors.border,
                      ].join(' ')}
                    >
                      {PTA_OPTIONS.map((s) => (
                        <option key={s} value={s}>{PTA_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    {showTax ? (
                      <input
                        type="number"
                        step="0.01"
                        value={l.ptaTaxPaid ?? ''}
                        onChange={(e) => onUpdate(l.tempId, { ptaTaxPaid: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder="0"
                        className="w-16 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => onRemove(l.tempId)}
                      className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-blue-50/50 p-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] font-extrabold text-blue-800 pl-1">
          <span>📱 {validCount}/{lines.length} valid IMEIs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setBulkMode(true)}
            className="px-2.5 py-1 rounded-lg bg-white border-2 border-blue-300 hover:bg-blue-50 text-blue-700 text-[11px] font-extrabold inline-flex items-center gap-1"
          >
            <Upload className="h-3 w-3" /> Bulk Paste
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="px-2.5 py-1 rounded-lg bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 text-[11px] font-extrabold inline-flex items-center gap-1 transition"
          >
            <Plus className="h-3 w-3" /> Add IMEI
          </button>
        </div>
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
