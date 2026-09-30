import { useEffect, useMemo } from 'react';
import { QrCode } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { postToDisplay } from '@core/hardware/customerDisplay';
import { qrFor, usePayQrs } from './payQr';
import { qrSvg } from './qrSvg';

/**
 * Checkout me: chuna hua tareeqa (Bank/Raast, JazzCash, Easypaisa) ka QR
 * dukaan ne lagaya ho to raqam wala QR — customer apne app se scan kare.
 * Customer display khula ho to wahan bhi bara QR.
 */
export function PayQrPanel({ method, amount, shopName }: { method: string; amount: number; shopName?: string }) {
  const qrs = usePayQrs();
  const r = useMemo(() => qrFor(qrs, method, amount), [qrs, method, amount]);
  const svg = useMemo(() => (r ? qrSvg(r.text, 200) : ''), [r]);

  useEffect(() => {
    if (!r) return;
    postToDisplay({ kind: 'qr', shopName: shopName ?? '', amount, label: r.qr.label, merchantName: r.qr.merchantName, svg: qrSvg(r.text, 360) });
  }, [r, amount, shopName]);

  if (!r) return null;
  return (
    <div className="flex items-center gap-4 rounded-2xl border-4 border-violet-200 bg-violet-50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
      <div className="shrink-0 rounded-xl bg-white p-1.5 shadow" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="min-w-0 text-sm">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300"><QrCode className="h-3.5 w-3.5" /> {r.qr.label} QR</div>
        <div className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{formatPKR(amount)}</div>
        <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{r.qr.merchantName}</div>
        <p className="mt-1 text-[11.5px] font-semibold text-slate-500">
          Customer bank / JazzCash / Easypaisa app se scan kare{r.qr.amountInQr ? ' — raqam khud aa jayegi' : ' aur raqam likhe'}. <b>Apne phone par paisa aane ka message dekh kar</b> hi "Confirm" karein.
        </p>
      </div>
    </div>
  );
}
