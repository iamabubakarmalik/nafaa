/**
 * Sale done: change to give back (or advance kept in khata), credit added,
 * and print / share actions. Closes itself after a few seconds when the
 * counter has auto-close on.
 */

import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, MessageCircle, Printer } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';

export interface PosLastSale {
  id: string;
  number: string;
  change: number;
  total: number;
  /** The change was kept in the customer's khata as an advance. */
  deposited: boolean;
  /** Amount that went on credit. */
  credit?: number;
}

export function PosSuccessModal({ lastSale, autoPrint, autoClose, onPrintAgain, onShare, onClose }: {
  lastSale: PosLastSale;
  autoPrint?: boolean;
  autoClose?: boolean;
  onPrintAgain: () => void;
  /** Send the bill on WhatsApp. */
  onShare?: () => void;
  onClose: () => void;
}) {
  // P prints again, W sends on WhatsApp; Enter (on "Nayi sale") closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); onPrintAgain(); }
      if ((e.key === 'w' || e.key === 'W') && onShare) { e.preventDefault(); onShare(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrintAgain, onShare]);
  // Printing can take focus away; bring it back to "Nayi sale" so Enter starts the next bill.
  useEffect(() => {
    const t = setTimeout(() => {
      const btn = document.querySelector<HTMLElement>('[data-pos-new-sale]');
      if (btn && !btn.closest('[role="dialog"]')?.contains(document.activeElement)) btn.focus();
    }, 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <Modal open onClose={onClose} size="sm" hideClose>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 className="mt-3 text-lg font-semibold text-slate-900">Sale ho gayi</h2>
        <p className="font-mono text-[0.8125rem] text-slate-500">{lastSale.number} · {formatPKR(lastSale.total)}</p>
        {autoPrint && <p className="mt-1 inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Printer className="h-3.5 w-3.5" /> Bill print ho raha hai</p>}

        {lastSale.change > 0 && (
          <div className={`mt-4 w-full rounded-xl px-4 py-3 ${lastSale.deposited ? 'bg-brand-50' : 'bg-success-50'}`}>
            <div className={`text-[0.8125rem] font-medium ${lastSale.deposited ? 'text-brand-800' : 'text-success-800'}`}>
              {lastSale.deposited ? 'Khate mein advance jama' : 'Customer ko wapas dein'}
            </div>
            <div className={`text-3xl font-bold tabular-nums ${lastSale.deposited ? 'text-brand-800' : 'text-success-800'}`}>{formatPKR(lastSale.change)}</div>
          </div>
        )}
        {!!lastSale.credit && lastSale.credit > 0 && (
          <div className="mt-3 w-full rounded-xl bg-amber-50 px-4 py-3">
            <div className="text-[0.8125rem] font-medium text-amber-800">Khate mein udhaar</div>
            <div className="text-2xl font-bold tabular-nums text-amber-800">{formatPKR(lastSale.credit)}</div>
          </div>
        )}

        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={onPrintAgain}>Print <kbd className="ml-1 rounded bg-slate-100 px-1 font-mono text-[0.625rem] text-slate-500">P</kbd></Button>
          {onShare
            ? <Button variant="secondary" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={onShare}>WhatsApp <kbd className="ml-1 rounded bg-slate-100 px-1 font-mono text-[0.625rem] text-slate-500">W</kbd></Button>
            : <span />}
          <Button className="col-span-2" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={onClose} data-autofocus data-pos-new-sale>Nayi sale <kbd className="ml-1 rounded bg-white/20 px-1 font-mono text-[0.625rem]">Enter</kbd></Button>
        </div>
        {autoClose && <p className="mt-2 text-[0.6875rem] text-slate-400">Kuch second me khud band ho jayega</p>}
      </div>
    </Modal>
  );
}

export default PosSuccessModal;
