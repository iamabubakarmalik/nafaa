'use client';

/**
 * Searchable Pakistani city picker (191 cities with common spellings:
 * "lhr", "pindi", "isb" all work). Keyboard friendly; big touch targets.
 */
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PROVINCES, searchCities, type Province } from '@/lib/pk-cities';

export function CitySelect({
  value,
  onChange,
  placeholder,
  compact,
  invalid,
  id,
}: {
  value: string;
  onChange: (c: { name: string; province: Province }) => void;
  placeholder: string;
  compact?: boolean;
  invalid?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCities(q, 40), [q]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => input.current?.focus(), 10);
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => setHi(0), [q]);

  const pick = (c: { name: string; province: Province }) => {
    onChange(c);
    setOpen(false);
    setQ('');
  };

  return (
    <div ref={box} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => setOpen((o) => !o)}
        className={compact ? 'inline-flex max-w-full items-center gap-1 font-semibold underline decoration-dotted underline-offset-4' : 'field flex items-center justify-between text-start'}
      >
        <span className={`truncate ${value ? '' : 'text-muted/80'}`}>{value || placeholder}</span>
        <ChevronDown size={compact ? 14 : 18} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div className={`absolute z-50 mt-1.5 w-full min-w-[260px] overflow-hidden rounded-card border border-line bg-bg text-fg shadow-pop ${compact ? 'start-0' : ''}`}>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={16} className="text-muted" />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHi((h) => Math.min(h + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHi((h) => Math.max(h - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (results[hi]) pick(results[hi]!);
                } else if (e.key === 'Escape') setOpen(false);
              }}
              placeholder={placeholder}
              className="h-12 w-full bg-transparent text-[16px] outline-none"
              autoComplete="off"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.map((c, k) => (
              <li key={c.name} role="option" aria-selected={c.name === value}>
                <button
                  type="button"
                  onMouseEnter={() => setHi(k)}
                  onClick={() => pick(c)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-start text-[15px] ${k === hi ? 'bg-surface' : ''}`}
                >
                  <span>
                    {c.name} <span className="text-[12.5px] text-muted">· {PROVINCES[c.province]}</span>
                  </span>
                  {c.name === value && <Check size={16} className="text-primary" />}
                </button>
              </li>
            ))}
            {!results.length && <li className="px-4 py-3 text-[14px] text-muted">No city found</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
