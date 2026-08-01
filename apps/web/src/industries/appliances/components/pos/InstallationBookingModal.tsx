import { useState } from 'react';
import { X, HardHat, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

interface Props {
  line: any;
  onConfirm: (date: string, timeSlot: string) => void;
  onClose: () => void;
}

const TIME_SLOTS = [
  '09:00 - 11:00',
  '11:00 - 13:00',
  '13:00 - 15:00',
  '15:00 - 17:00',
  '17:00 - 19:00',
];

export function InstallationBookingModal({ line, onConfirm, onClose }: Props) {
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');

  // Min date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const canConfirm = date && slot;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">

        <div className="shrink-0 bg-gradient-to-br from-amber-600 to-orange-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">Book Installation</div>
              <h3 className="text-lg font-extrabold leading-tight">{line.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!line.installationCovered && line.installationCharge > 0 && (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
              <div className="text-xs uppercase font-extrabold text-amber-800">Installation Charge</div>
              <div className="text-3xl font-extrabold text-amber-900 tabular-nums mt-1">
                {formatPKR(line.installationCharge)}
              </div>
            </div>
          )}

          {line.installationCovered && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              <div>
                <div className="font-extrabold text-emerald-900">Free Installation Included</div>
                <div className="text-xs text-emerald-700 font-bold">Price mein shamil hai</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5 inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Installation Date
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={minDateStr}
              className="h-14 w-full rounded-2xl border-4 border-slate-200 bg-white px-4 text-lg font-extrabold focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200" />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time Slot
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((s) => (
                <button key={s} onClick={() => setSlot(s)}
                  className={['h-12 rounded-xl border-2 text-sm font-extrabold transition',
                    slot === s ? 'border-amber-600 bg-amber-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'].join(' ')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <button onClick={onClose} className="flex-1 h-14 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold transition">
            Cancel
          </button>
          <button onClick={() => onConfirm(date, slot)} disabled={!canConfirm}
            className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 text-white font-extrabold shadow-md disabled:opacity-50 transition inline-flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}
