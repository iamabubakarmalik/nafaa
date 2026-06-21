import { CheckCircle2, AlertTriangle, AlertOctagon, Clock, Shield } from 'lucide-react';
import {
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '@/features/industries/mobile/api/imei.api';

interface Props {
  value: PtaStatus;
  onChange: (value: PtaStatus) => void;
  label?: string;
  hint?: string;
  taxPaid?: number;
  onTaxPaidChange?: (value: number) => void;
  showTaxField?: boolean;
}

const STATUSES: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

const ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

const DESCRIPTIONS: Record<PtaStatus, string> = {
  APPROVED: 'PTA approved, no tax due',
  NON_PTA: 'Imported, tax not paid',
  PATCH: 'Patched / non-genuine',
  PENDING: 'Registration in progress',
  EXEMPT: 'Local / tax-exempt',
};

export function PtaStatusSelect({
  value, onChange, label = 'PTA Status', hint, taxPaid, onTaxPaidChange, showTaxField,
}: Props) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
      )}

      <div className="grid grid-cols-5 gap-1.5">
        {STATUSES.map((status) => {
          const Icon = ICONS[status];
          const colors = PTA_STATUS_COLORS[status];
          const active = value === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() => onChange(status)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 transition ${
                active
                  ? `${colors.bg} ${colors.border} shadow-sm`
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
              title={DESCRIPTIONS[status]}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? colors.text : 'text-slate-400'}`} />
              <span className={`text-[9px] font-bold ${active ? colors.text : 'text-slate-500'}`}>
                {PTA_STATUS_LABELS[status].split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}

      {/* Tax paid field shown when status is APPROVED or PATCH */}
      {showTaxField && (value === 'APPROVED' || value === 'PATCH') && onTaxPaidChange && (
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            PTA Tax Paid (PKR)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={taxPaid ?? ''}
            onChange={(e) => onTaxPaidChange(Number(e.target.value) || 0)}
            placeholder="0"
            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Amount paid for PTA tax (kept for warranty / customer records)
          </p>
        </div>
      )}

      {/* PTA verification helper */}
      {value === 'PENDING' && (
        <a
          href="https://dirbs.pta.gov.pk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline"
        >
          🔗 Verify on DIRBS PTA Portal
        </a>
      )}
    </div>
  );
}
