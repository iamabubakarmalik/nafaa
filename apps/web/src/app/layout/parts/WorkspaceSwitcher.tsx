import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useWorkspaceStore, WORKSPACES, type WorkspaceId } from '@core/stores/workspace.store';
import { cn } from '@core/lib/cn';
import { Kbd, Panel, useDismiss } from './shell-ui';

/** ⌥W opens it (⌘⇧W would close the browser window) */
export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { activeWorkspace, setWorkspace } = useWorkspaceStore();
  const current = WORKSPACES[activeWorkspace];
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyW') { e.preventDefault(); setOpen((v) => !v); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Follow the URL: marketplace pages switch to marketplace, core POS pages back to POS
  useEffect(() => {
    const p = location.pathname;
    const isMarketplaceRoute = p.startsWith('/marketplace');
    if (isMarketplaceRoute && activeWorkspace !== 'marketplace') setWorkspace('marketplace');
    else if (!isMarketplaceRoute && activeWorkspace !== 'pos'
      && ['/dashboard', '/pos', '/products', '/customers', '/sales', '/inventory'].some((x) => p.startsWith(x))) {
      setWorkspace('pos');
    }
  }, [location.pathname, activeWorkspace, setWorkspace]);

  const switchTo = (id: WorkspaceId) => {
    setWorkspace(id);
    navigate(WORKSPACES[id].rootPath);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Workspace: ${current.label}. Switch workspace`}
        className={cn(
          'flex h-10 items-center gap-2 rounded-xl border px-1.5 pr-2 transition sm:pr-2.5',
          open ? 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
        )}
      >
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-[15px] leading-none shadow-sm', current.gradient)}>
          {current.emoji}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[10px] font-medium leading-none text-slate-500">Workspace</span>
          <span className="mt-0.5 block max-w-[110px] truncate text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">{current.shortLabel}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      <Panel open={open} onClose={close} align="left" widthClass="sm:w-[360px]" label="Switch workspace">
        <div className="flex items-center justify-between px-4 pb-2 pt-3 sm:pt-4">
          <div>
            <div className="text-[15px] font-semibold">Workspaces</div>
            <div className="text-[12px] text-slate-500">Same data, different tools</div>
          </div>
          <Kbd className="hidden sm:inline-flex">⌥W</Kbd>
        </div>
        <div className="space-y-1.5 overflow-y-auto p-2 pt-1">
          {(Object.values(WORKSPACES) as Array<(typeof WORKSPACES)[WorkspaceId]>).map((ws) => {
            const active = ws.id === activeWorkspace;
            return (
              <button key={ws.id} onClick={() => switchTo(ws.id)}
                className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                  active ? 'border-emerald-500/60 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                    : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60')}>
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-sm', ws.gradient)}>{ws.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{ws.label}</span>
                    {active && <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Current</span>}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">{ws.description}</span>
                </span>
                {active && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />}
              </button>
            );
          })}
        </div>
        <div className="border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500 dark:border-slate-800">
          Your products, sales and customers stay in sync across workspaces.
        </div>
      </Panel>
    </div>
  );
}