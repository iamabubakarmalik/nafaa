import { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@core/lib/cn';

/** Ek line ki cheez (URL, key) — ek click me copy. Secret ho to chhupi rehti hai. */
export function CopyField({ label, value, secret, hint }: { label: string; value: string; secret?: boolean; hint?: string }) {
  const [shown, setShown] = useState(!secret);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      toast.success(`${label} copy ho gaya`);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const display = shown ? value : value.slice(0, 6) + '•'.repeat(Math.max(8, Math.min(value.length - 10, 28))) + value.slice(-4);

  return (
    <div>
      <div className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="flex items-center gap-1.5">
        <code
          className={cn(
            'min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[0.78125rem] font-semibold text-slate-800',
          )}
          title={shown ? value : undefined}
        >
          {display}
        </code>
        {secret && (
          <button type="button" onClick={() => setShown((s) => !s)} className={btn} title={shown ? 'Chhupao' : 'Dikhao'} aria-label={shown ? 'Chhupao' : 'Dikhao'}>
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button type="button" onClick={copy} className={cn(btn, 'border-brand-600 bg-brand-600 text-brand-fg hover:bg-brand-700')} title="Copy" aria-label={`${label} copy`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {hint && <div className="mt-1 text-[0.6875rem] text-slate-500">{hint}</div>}
    </div>
  );
}

const btn =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50';
