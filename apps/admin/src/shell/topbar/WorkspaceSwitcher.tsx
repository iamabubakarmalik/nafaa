/**
 * Workspace switcher in the top bar. Opens with Alt/⌥+W; the workspace itself
 * always follows the URL (see workspaceForPath).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Kbd } from '@/design-system/components';
import { Panel, useDismiss } from '@web-shell/ui';
import { cn } from '@/lib/cn';
import { WORKSPACES, workspaceForPath } from '../navigation/nav-config';
import { WorkspaceMark } from '../sidebar/WorkspaceMark';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = workspaceForPath(location.pathname);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyW') { e.preventDefault(); setOpen((v) => !v); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Workspace: ${current.label}. Switch workspace`}
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white ps-1 pe-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:pe-2.5',
          open && 'border-slate-300 bg-slate-50',
        )}
      >
        <WorkspaceMark workspace={current} size="sm" />
        <span className="hidden text-start sm:block">
          <span className="block text-[0.6875rem] font-medium leading-none text-slate-500">Workspace</span>
          <span className="mt-0.5 block max-w-[8rem] truncate text-[0.8125rem] font-semibold leading-tight text-slate-900">{current.shortLabel}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      <Panel open={open} onClose={close} align="left" widthClass="sm:w-[24rem]" label="Switch workspace">
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Workspaces</h2>
            <p className="text-[0.75rem] text-slate-500">Each area of Nafaa has its own menu</p>
          </div>
          <Kbd className="hidden sm:inline-flex">Alt W</Kbd>
        </div>
        <div className="space-y-0.5 overflow-y-auto p-2" role="listbox" aria-label="Workspaces">
          {WORKSPACES.map((ws) => {
            const active = ws.id === current.id;
            return (
              <button
                type="button"
                key={ws.id}
                role="option"
                aria-selected={active}
                onClick={() => { navigate(ws.root); setOpen(false); }}
                className={cn('flex w-full items-center gap-3 rounded-xl p-2 text-start transition', active ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50')}
              >
                <WorkspaceMark workspace={ws} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-semibold text-slate-900">{ws.label}</span>
                  <span className="mt-0.5 block truncate text-[0.75rem] leading-snug text-slate-500">{ws.description}</span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-label="Current workspace" />}
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
