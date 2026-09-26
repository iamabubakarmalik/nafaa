import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCheck, X, Clock } from 'lucide-react';
import { salesApi, type SaleReceiver } from '@modules/sales/sales/api/sales.api';

export interface PosReceiverValue {
  name: string;
  phone: string;
}

export const emptyReceiver = (): PosReceiverValue => ({ name: '', phone: '' });

/**
 * "Maal lene kaun aaya hai?"
 *
 * Factory aur bari dukaan ka udhaar khata mahine bhar chalta hai, aur
 * maal khud malik nahi — uska driver, mulazim ya ghar ka koi fard le
 * kar jata hai. Pehle bill par sirf khate ka naam hota tha; mahine ke
 * aakhir me hisaab kholte waqt jhagra hota tha ke "ye maal kis ne
 * uthaya tha" aur dukaan-daar ke paas koi jawab nahi hota tha.
 *
 * Pichhle naam neeche chips me aate hain kyunke wohi banda baar baar
 * aata hai. Ek click se naam aur phone dono bhar jate hain — aur isi
 * se hijje bhi ek jaise rehte hain (Bilal / bilal / Balal alag alag
 * record ban kar poori list be-kaar kar dete thay).
 *
 * Khana khali chhora ja sakta hai: jab khud khate wala aaya ho to
 * kuch likhne ki zaroorat nahi, sale wese hi ho jati hai.
 */
export function PosReceiverField({
  customerId,
  customerName,
  value,
  onChange,
  compact = false,
}: {
  customerId?: string;
  customerName?: string;
  value: PosReceiverValue;
  onChange: (next: PosReceiverValue) => void;
  compact?: boolean;
}) {
  const [showPhone, setShowPhone] = useState(false);

  const { data: previous = [] } = useQuery({
    queryKey: ['sale-receivers', customerId],
    queryFn: () => salesApi.receivers(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60_000,
  });

  /* Jo naam abhi likha hua hai wo chips me dobara dikhane ka faida
     nahi — us par click karne se kuch badlega hi nahi. */
  const chips = useMemo(
    () => (previous as SaleReceiver[]).filter(
      (r) => r.name.toLowerCase() !== value.name.trim().toLowerCase(),
    ).slice(0, 6),
    [previous, value.name],
  );

  const pick = (r: SaleReceiver) => {
    onChange({ name: r.name, phone: r.phone ?? '' });
    if (r.phone) setShowPhone(true);
  };

  return (
    <div className={[
      'rounded-2xl border-2 border-amber-200 dark:border-amber-500/30',
      'bg-amber-50/70 dark:bg-amber-500/10',
      compact ? 'p-3' : 'p-3.5',
    ].join(' ')}>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
          <UserCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
            Maal lene kaun aaya hai?
          </div>
          <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 truncate">
            {customerName
              ? `${customerName} khud aaye hain to khali chhor dein`
              : 'Optional — khali bhi chhor sakte hain'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Naam — jaise Bilal (driver)"
          className="h-11 flex-1 min-w-0 rounded-xl border-2 border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
        />
        {value.name.trim() && (
          <button
            type="button"
            onClick={() => { onChange(emptyReceiver()); setShowPhone(false); }}
            title="Saaf karein"
            className="h-11 w-11 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-500/30 text-slate-500 flex items-center justify-center shrink-0 hover:border-rose-400 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {value.name.trim() && (
        showPhone ? (
          <input
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="Phone (optional)"
            inputMode="tel"
            className="mt-2 h-10 w-full rounded-xl border-2 border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 px-3 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowPhone(true)}
            className="mt-1.5 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 hover:underline"
          >
            + Phone bhi likhein
          </button>
        )
      )}

      {chips.length > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-amber-800 dark:text-amber-300 mb-1.5">
            <Clock className="h-3 w-3" /> Pehle aaye hain
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((r) => (
              <button
                key={r.name}
                type="button"
                onClick={() => pick(r)}
                className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-500/30 text-[11px] font-extrabold text-slate-800 dark:text-slate-100 hover:border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition active:scale-[0.97] max-w-full truncate"
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PosReceiverField;
