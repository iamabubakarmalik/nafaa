'use client';
/** Segmented tabs (buttons). Link tabs on server pages use the same look via tabClass. */
import { cn } from './cn';
import { tabClass } from './tabClass';


export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: Array<{ id: T; label: string; count?: number }>; className?: string }) {
  return (
    <div role="tablist" className={cn('scroll-x', className)}>
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={value === it.id} type="button" onClick={() => onChange(it.id)} className={tabClass(value === it.id)}>
          {it.label}
          {it.count !== undefined && <span className="num ms-1.5 opacity-60">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}
