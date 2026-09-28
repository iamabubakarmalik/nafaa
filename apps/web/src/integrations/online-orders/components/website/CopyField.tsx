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
      <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-center gap-1.5">
        <code
          className={cn(
            'min-w-0 flex-1 truncate rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[12.5px] font-semibold text-slate-800',
            'dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100',
          )}
          title={shown ? value : undefined}
        >
          {display}
        </code>
        {secret && (
          <button onClick={() => setShown((s) => !s)} className={btn} title={shown ? 'Chhupao' : 'Dikhao'}>
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button onClick={copy} className={cn(btn, 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600')} title="Copy">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

const btn =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800';
