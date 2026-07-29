import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@core/lib/cn';

export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={cn('relative group', className)}>
      {label && (
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
          {label}
        </div>
      )}
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 z-10 h-7 w-7 rounded-lg bg-slate-700/80 hover:bg-slate-600 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-slate-300" />
        )}
      </button>
      <pre className="p-3.5 rounded-xl bg-slate-900 dark:bg-neutral-950 text-slate-100 text-[10.5px] leading-relaxed font-mono overflow-x-auto ring-1 ring-slate-700/50">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CopyField({
  value,
  label,
  mono = true,
  secret = false,
}: {
  value: string;
  label: string;
  mono?: boolean;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div>
      <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            'flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700',
            'bg-slate-50 dark:bg-neutral-800 text-xs text-slate-800 dark:text-slate-200',
            mono && 'font-mono',
          )}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-[10px] font-extrabold text-slate-600 shrink-0"
          >
            {revealed ? 'HIDE' : 'SHOW'}
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 flex items-center justify-center shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 text-emerald-600" />
          )}
        </button>
      </div>
    </div>
  );
}
