import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronDown, Check, Sparkles, ArrowRight, Store, ShoppingBag,
  Zap, TrendingUp,
} from 'lucide-react';
import { useWorkspaceStore, WORKSPACES, type WorkspaceId } from '@core/stores/workspace.store';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { activeWorkspace, setWorkspace } = useWorkspaceStore();

  const current = WORKSPACES[activeWorkspace];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Auto-detect workspace from URL
  useEffect(() => {
    const isMarketplaceRoute = location.pathname.startsWith('/marketplace');
    if (isMarketplaceRoute && activeWorkspace !== 'marketplace') {
      setWorkspace('marketplace');
    } else if (!isMarketplaceRoute && activeWorkspace !== 'pos') {
      // Only auto-switch if we're on a clearly non-marketplace path
      if (
        location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/pos') ||
        location.pathname.startsWith('/products') ||
        location.pathname.startsWith('/customers') ||
        location.pathname.startsWith('/sales') ||
        location.pathname.startsWith('/inventory')
      ) {
        setWorkspace('pos');
      }
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
        className={`group relative flex items-center gap-2 h-11 pl-2 pr-3 rounded-2xl transition-all shadow-md overflow-hidden ${
          open ? 'ring-2 ring-white/40 scale-[1.02]' : 'hover:ring-2 hover:ring-white/25'
        }`}
        style={{
          background: activeWorkspace === 'marketplace'
            ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
            : 'linear-gradient(135deg, #059669 0%, #14b8a6 100%)',
        }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        <div className="relative h-8 w-8 rounded-xl bg-white/25 backdrop-blur flex items-center justify-center shadow-inner ring-1 ring-white/30">
          <span className="text-lg leading-none">{current.emoji}</span>
        </div>
        <div className="relative hidden sm:block text-left">
          <div className="text-[9px] font-black uppercase tracking-widest text-white/80 leading-none">
            Workspace
          </div>
          <div className="text-sm font-black text-white leading-tight mt-0.5">
            {current.shortLabel}
          </div>
        </div>
        <ChevronDown
          className={`relative h-4 w-4 text-white/90 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[380px] rounded-3xl bg-white border-2 border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* HEADER */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-4">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Switch Workspace
                </div>
                <div className="text-sm font-black">Choose your view</div>
              </div>
              <div className="ml-auto text-[9px] font-mono font-bold px-2 py-1 rounded-md bg-white/15 backdrop-blur border border-white/20">
                ⌘⇧W
              </div>
            </div>
          </div>

          {/* WORKSPACE CARDS */}
          <div className="p-3 space-y-2">
            {(Object.values(WORKSPACES) as Array<typeof WORKSPACES[WorkspaceId]>).map((ws) => {
              const isActive = ws.id === activeWorkspace;
              return (
                <button
                  key={ws.id}
                  onClick={() => switchTo(ws.id)}
                  className={`group/card relative w-full text-left rounded-2xl overflow-hidden transition-all ${
                    isActive
                      ? 'ring-2 ring-current shadow-lg scale-[1.01]'
                      : 'hover:shadow-md hover:scale-[1.01]'
                  }`}
                  style={{
                    color: isActive ? (ws.id === 'marketplace' ? '#a855f7' : '#059669') : undefined,
                  }}
                >
                  {/* Gradient background */}
                  <div className={`relative bg-gradient-to-br ${ws.gradient} text-white p-4`}>
                    <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-white/10 blur-2xl" />

                    <div className="relative flex items-start gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shadow-inner ring-2 ring-white/30 shrink-0">
                        {ws.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-lg leading-tight">{ws.label}</span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/25 backdrop-blur text-[9px] font-black uppercase tracking-wider">
                              <Check className="h-2.5 w-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/85 font-medium mt-1 leading-snug">
                          {ws.description}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-white/90">
                          {ws.id === 'pos' ? (
                            <>
                              <Store className="h-2.5 w-2.5" />
                              <span>Inventory · Sales · Reports</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-2.5 w-2.5" />
                              <span>Storefront · Orders · Growth</span>
                            </>
                          )}
                          <ArrowRight className={`h-2.5 w-2.5 ml-auto transition-transform ${isActive ? '' : 'group-hover/card:translate-x-1'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 text-amber-500" />
              Switch anytime — your data stays synced
            </p>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[9px] font-black text-slate-500">
              ⌘⇧W
            </kbd>
          </div>
        </div>
      )}
    </div>
  );
}
