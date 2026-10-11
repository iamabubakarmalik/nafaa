/**
 * Workspace switcher (Business POS / Nafaa Marketplace).
 *
 * Opens with Alt/⌥+W (Ctrl/⌘+Shift+W would close the browser window). The
 * workspace also follows the URL: marketplace routes switch to Marketplace,
 * core POS routes switch back.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useWorkspaceStore, WORKSPACES, type WorkspaceId } from '@core/stores/workspace.store';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { cn } from '@core/lib/cn';
import { BrandMark } from '../sidebar/BrandMark';
import { Kbd } from '@/design-system/components';
import { Panel, useDismiss } from '../ui';

const POS_ROUTES = ['/dashboard', '/pos', '/products', '/customers', '/sales', '/inventory'];

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const industry = useCurrentIndustry();
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

  useEffect(() => {
    const path = location.pathname;
    const marketplaceRoute = path.startsWith('/marketplace');
    if (marketplaceRoute && activeWorkspace !== 'marketplace') setWorkspace('marketplace');
    else if (!marketplaceRoute && activeWorkspace !== 'pos' && POS_ROUTES.some((x) => path.startsWith(x))) setWorkspace('pos');
  }, [location.pathname, activeWorkspace, setWorkspace]);

  const switchTo = (id: WorkspaceId) => {
    setWorkspace(id);
    navigate(WORKSPACES[id].rootPath);
    setOpen(false);
  };

  const mark = (id: WorkspaceId, size?: 'md' | 'lg', className?: string) => (
    <BrandMark industryId={industry?.id} marketplace={id === 'marketplace'} size={size} className={className} />
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Workspace: ${current.label}. Switch workspace`}
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-1 pr-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:pr-2.5',
          open && 'border-slate-300 bg-slate-50',
        )}
      >
        {mark(activeWorkspace, 'md', 'h-7 w-7 rounded-md [&_svg]:h-4 [&_svg]:w-4')}
        <span className="hidden text-left sm:block">
          <span className="block text-[0.6875rem] font-medium leading-none text-slate-500">Workspace</span>
          <span className="mt-0.5 block max-w-[7rem] truncate text-[0.8125rem] font-semibold leading-tight text-slate-900">{current.shortLabel}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      <Panel open={open} onClose={close} align="left" widthClass="sm:w-[22rem]" label="Switch workspace">
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Workspaces</h2>
            <p className="text-[0.75rem] text-slate-500">Same data, different tools</p>
          </div>
          <Kbd className="hidden sm:inline-flex">Alt W</Kbd>
        </div>
        <div className="space-y-1 p-2" role="listbox" aria-label="Workspaces">
          {(Object.values(WORKSPACES) as Array<(typeof WORKSPACES)[WorkspaceId]>).map((ws) => {
            const active = ws.id === activeWorkspace;
            return (
              <button
                type="button"
                key={ws.id}
                role="option"
                aria-selected={active}
                onClick={() => switchTo(ws.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition',
                  active ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50',
                )}
              >
                {mark(ws.id, 'lg')}
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-semibold text-slate-900">{ws.label}</span>
                  <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">{ws.description}</span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-label="Current workspace" />}
              </button>
            );
          })}
        </div>
        <p className="border-t border-slate-200 px-4 py-2.5 text-[0.75rem] text-slate-500">
          Products, sales and customers stay in sync across workspaces.
        </p>
      </Panel>
    </div>
  );
}
