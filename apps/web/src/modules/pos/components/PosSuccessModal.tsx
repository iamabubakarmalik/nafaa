/**
 * Sale done: change to give back (or advance kept in khata), credit added,
 * and print / share actions. Closes itself after a few seconds when the
 * counter has auto-close on.
 */

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
          <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={onPrintAgain}>Print</Button>
          {onShare
            ? <Button variant="secondary" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={onShare}>WhatsApp</Button>
            : <span />}
          <Button className="col-span-2" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={onClose} data-autofocus>Nayi sale</Button>
        </div>
        {autoClose && <p className="mt-2 text-[0.6875rem] text-slate-400">Kuch second me khud band ho jayega</p>}
      </div>
    </Modal>
  );
}

export default PosSuccessModal;
