import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, CreditCard, Search, CheckCircle2, Package } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { gamingTopupsApi } from '../../api/topups.api';

interface Props {
  provider: string;
  topupType: string;
  denomination: number;
  onConfirm: (topup: any) => void;
  onClose: () => void;
}

export function TopupPickerModal({ provider, topupType, denomination, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');

  const { data: topups = [], isLoading } = useQuery({
    queryKey: ['topups-for-pos', provider],
    queryFn: () => gamingTopupsApi.list({ provider, available: true }),
  });

  const filtered = topups.filter((t: any) =>
    t.topupType === topupType &&
    Number(t.denominationValue) === Number(denomination) &&
    (search.trim() === '' ||
      t.topupNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.cardSerial || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200">

        <div className="shrink-0 bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white px-5 py-4 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <CreditCard className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">
              Pick a card to sell
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold leading-tight truncate">
              {provider.replace(/_/g, ' ')}
            </h3>
            <div className="text-sm font-bold text-amber-200">
              {topupType} • ${denomination} • {filtered.length} available
            </div>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 p-4 border-b-2 border-slate-100">
          <div className="relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by card number / serial..."
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-slate-500 font-semibold">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">No cards available</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Add more from /gaming/topups</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((t: any) => (
                <button key={t.id} onClick={() => onConfirm(t)}
                  className="w-full rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:shadow-lg p-3 flex items-center gap-3 transition group active:scale-[0.98]">
                  <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-mono font-extrabold text-slate-900 text-sm truncate">{t.topupNumber}</div>
                    {t.cardSerial && (
                      <div className="text-[10px] font-mono text-slate-600 mt-0.5">Serial: {t.cardSerial}</div>
                    )}
                    {t.expiryDate && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-600">
                        Expires {new Date(t.expiryDate).toLocaleDateString('en-PK')}
                      </div>
                    )}
                    {t.regionRestriction && (
                      <div className="text-[10px] font-extrabold text-amber-700 mt-0.5">Region: {t.regionRestriction}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(t.sellingPrice)}</div>
                    <div className="text-[10px] text-slate-500 font-bold">cost {formatPKR(t.costPrice)}</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-amber-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
