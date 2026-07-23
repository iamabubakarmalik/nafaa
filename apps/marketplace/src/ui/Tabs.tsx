import { ReactNode, createContext, useContext } from 'react';
import { cn } from '@lib/cn';

interface TabsContextValue {
  value: string;
  onChange: (v: string) => void;
}
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ value, onChange, children, className }: {
  value: string; onChange: (v: string) => void; children: ReactNode; className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={cn('', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className, variant = 'default' }: {
  children: ReactNode; className?: string; variant?: 'default' | 'pills' | 'underline';
}) {
  return (
    <div className={cn(
      'flex items-center gap-1',
      variant === 'default' && 'p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl',
      variant === 'pills' && 'gap-2',
      variant === 'underline' && 'border-b border-slate-200 dark:border-neutral-800 gap-6',
      className,
    )}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className, variant = 'default' }: {
  value: string; children: ReactNode; className?: string; variant?: 'default' | 'pills' | 'underline';
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be inside <Tabs>');
  const active = ctx.value === value;

  return (
    <button
      onClick={() => ctx.onChange(value)}
      className={cn(
        'font-bold transition whitespace-nowrap',
        variant === 'default' && cn(
          'px-4 py-2 rounded-lg text-sm',
          active ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
        ),
        variant === 'pills' && cn(
          'px-4 py-2 rounded-full text-sm',
          active ? 'bg-brand-600 text-white shadow-brand' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-neutral-700',
        ),
        variant === 'underline' && cn(
          'px-1 py-3 border-b-2 text-sm -mb-px',
          active ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
        ),
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: {
  value: string; children: ReactNode; className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return <div className={cn('mt-4 animate-fade-in', className)}>{children}</div>;
}
