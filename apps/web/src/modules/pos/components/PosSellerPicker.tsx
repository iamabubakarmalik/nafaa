import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCheck, ChevronDown } from 'lucide-react';
import { commissionApi } from '@modules/hr/commission/api/commission.api';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   BIKRI KIS KE NAAM
   ─────────────────────────────────────────────────────────────
   Counter par aksar ek hi banda bill banata hai. Magar becha kisi
   aur ne hota hai — grahak ko usi ne samjhaya, usi ne dikhaya.
   Commission us ko milni chahiye, bill banane wale ko nahi.

   Is liye checkout par ek chhota sa khana: "bikri kis ke naam".
   Pehle se bill banane wale ka apna naam chuna hota hai, to jin
   dukaanon me aisa nahi hota un ko kuch karna hi nahi parta.

   Ye khana sirf TAB dikhta hai jab commission kisi par chaalu ho.
   Jo dukaan commission deti hi nahi, uske counter par ye faltu
   cheez nazar nahi aati.
   ═════════════════════════════════════════════════════════════ */

export function PosSellerPicker({
  value, onChange, compact,
}: {
  /** Chuna hua banda — khali to bill banane wala khud */
  value?: string;
  onChange: (userId: string | undefined) => void;
  compact?: boolean;
}) {
  const me = useAuthStore((s) => s.user);

  /* `people` har jagah cache hoti hai, is liye POS khulte hi
     dobara nahi mangwayi jati */
  const { data } = useQuery({
    queryKey: ['commission-people'],
    queryFn: () => commissionApi.people(),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const sellers = useMemo(
    () => (data?.people ?? []).filter((p) => p.enrolled && p.userId),
    [data],
  );

  /* Commission kisi par chaalu nahi — khana dikhane ka koi faida nahi.
     Isi tarah agar akela banda main khud hoon: dropdown me ek hi naam
     hota, aur ek option wali list counter par sirf jagah ghairti hai.
     Doosra banda chaalu hote hi ye khud aa jata hai. */
  if (sellers.length === 0) return null;
  if (sellers.length === 1 && sellers[0].userId === me?.id) return null;

  const current = value ?? me?.id ?? '';
  const chosen = sellers.find((p) => p.userId === current);
  const meSeller = sellers.find((p) => p.userId === me?.id);
  const isMe = current === me?.id;

  return (
    <div className={compact ? '' : 'mt-2'}>
      <label className="block mb-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Bikri kis ke naam
      </label>
      <div className="relative">
        <UserCheck className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${
          isMe ? 'text-slate-400' : 'text-emerald-600'
        }`} />
        <select
          value={current}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={`h-11 w-full rounded-xl border-2 bg-white dark:bg-slate-800 pl-9 pr-8 text-sm font-bold text-slate-900 dark:text-white appearance-none focus:outline-none transition ${
            isMe
              ? 'border-slate-200 dark:border-slate-700 focus:border-sky-500'
              : 'border-emerald-400 dark:border-emerald-500/60 focus:border-emerald-500'
          }`}
        >
          {/* Apna naam hamesha pehle — aam din yehi chuna rehta hai */}
          {me?.id && (
            <option value={me.id}>
              {meSeller?.name ?? me.fullName ?? 'Main'} (main khud)
            </option>
          )}
          {sellers
            .filter((p) => p.userId !== me?.id)
            .map((p) => (
              <option key={p.userId!} value={p.userId!}>
                {p.name}{p.staff?.designation ? ` — ${p.staff.designation}` : ''}
              </option>
            ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      </div>
      {!isMe && chosen && (
        <p className="mt-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
          Is bill ki commission <strong>{chosen.name}</strong> ko jayegi
        </p>
      )}
      {isMe && !meSeller && (
        <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          Aap par commission chaalu nahi — is bill ki koi commission nahi banegi
        </p>
      )}
    </div>
  );
}

export default PosSellerPicker;
