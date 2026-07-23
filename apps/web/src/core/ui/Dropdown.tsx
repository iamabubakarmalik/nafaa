import { ReactNode, useEffect, useRef, useState, createContext, useContext } from 'react';
import { cn } from '@core/lib/cn';

interface DropdownContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const DropdownContext = createContext<DropdownContextValue | null>(null);

export function Dropdown({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className={cn('relative inline-block', className)}>{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({ children }: { children: ReactNode }) {
  const ctx = useContext(DropdownContext)!;
  return <div onClick={() => ctx.setOpen(!ctx.open)}>{children}</div>;
}

export function DropdownMenu({ children, align = 'end', className }: {
  children: ReactNode; align?: 'start' | 'end'; className?: string;
}) {
  const ctx = useContext(DropdownContext)!;
  if (!ctx.open) return null;
  return (
    <div className={cn(
      'absolute z-50 mt-2 min-w-[200px] rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft-lg py-1 animate-slide-down',
      align === 'end' ? 'right-0' : 'left-0',
      className,
    )}>
      {children}
    </div>
  );
}

export function DropdownItem({
  onClick, icon: Icon, children, danger, className,
}: {
  onClick?: () => void; icon?: any; children: ReactNode; danger?: boolean; className?: string;
}) {
  const ctx = useContext(DropdownContext)!;
  return (
    <button
      onClick={() => { onClick?.(); ctx.setOpen(false); }}
      className={cn(
        'w-full px-3 py-2 text-left text-sm font-semibold flex items-center gap-2.5 transition',
        danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-800',
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{children}</span>
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-slate-100 dark:bg-neutral-800" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </div>
  );
}
