'use client';

/** "Report this store" (contract 5.6): a small dialog that files an abuse report with Nafaa. */
import { Flag, X } from 'lucide-react';
import { useState } from 'react';
import type { ReportReason } from '@/lib/api';
import { sf } from '@/lib/client/sf';

const REASONS: Array<[ReportReason, string]> = [
  ['SCAM', 'Scam or fraud'],
  ['NOT_DELIVERED', 'Paid but not delivered'],
  ['FAKE_PRODUCTS', 'Fake or copied products'],
  ['OFFENSIVE', 'Offensive content'],
  ['COPYRIGHT', 'Uses my brand or photos'],
  ['OTHER', 'Something else'],
];

export function ReportStore() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SCAM');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [hp, setHp] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 opacity-70 hover:opacity-100">
        <Flag size={12} /> Report this store
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4 text-fg" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md animate-rise rounded-card bg-bg p-5 shadow-pop">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Report this store to Nafaa</h2>
              <button type="button" className="icon-btn -me-2" aria-label="Close" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            {state === 'done' ? (
              <p className="py-6 text-center text-[15px]">Thank you. The Nafaa team will look into it.</p>
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setState('busy');
                  try {
                    await sf('report', { reason, details, contact, pageUrl: window.location.href, hp });
                    setState('done');
                  } catch {
                    setState('error');
                  }
                }}
              >
                <select className="field" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                  {REASONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <textarea className="field min-h-[96px]" maxLength={2000} placeholder="What happened? (order number, dates)" value={details} onChange={(e) => setDetails(e.target.value)} />
                <input className="field" placeholder="Your phone or email (optional)" value={contact} onChange={(e) => setContact(e.target.value)} />
                <input className="hidden" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden="true" />
                {state === 'error' && <p className="text-[13px] text-sale">Could not send. Please try again.</p>}
                <button type="submit" className="btn btn-primary btn-block" disabled={state === 'busy'}>
                  Send report
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
