import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Zap, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { quickKeysApi, type QuickKey } from '@industries/retail/api/quick-keys.api';
import { combosApi } from '@industries/retail/api/combos.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';

interface Props {
  onProductAdd: (product: any) => void;
  onComboAdd: (combo: any) => void;
  shopId?: string;
}

const COLLAPSED_KEY = 'nafaa.pos.quickaccess-collapsed';

export function RetailQuickKeysBar({ onProductAdd, onComboAdd, shopId }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  const { data: keys = [] } = useQuery({
    queryKey: ['pos-quick-keys', shopId],
    queryFn: () => quickKeysApi.list(shopId),
    staleTime: 60_000,
  });

  const { data: combos = [] } = useQuery({
    queryKey: ['pos-combos'],
    queryFn: () => combosApi.list({ status: 'ACTIVE', featured: true }),
    staleTime: 60_000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const match = keys.find((k) => k.hotkey?.toUpperCase() === e.key.toUpperCase());
      if (match) {
        e.preventDefault();
        handleKeyClick(match);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [keys]);

  const handleKeyClick = async (key: QuickKey) => {
    try {
      if (key.productId) {
        const product = await productsApi.getOne(key.productId);
        onProductAdd(product);
      } else if (key.comboId) {
        const combo = await combosApi.getOne(key.comboId);
        onComboAdd(combo);
      }
    } catch (e) { console.error(e); }
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
  };

  const total = keys.length + combos.length;
  if (total === 0) return null;

  return (
    <section className="rounded-xl bg-gradient-to-r from-amber-50 via-white to-orange-50 dark:from-amber-950/20 dark:via-neutral-900 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 overflow-hidden">
      {/* Header — compact */}
      <button
        onClick={toggleCollapsed}
        className="w-full px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-800 dark:text-amber-400">
            Quick Access
          </span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-[9px] font-extrabold text-amber-700 dark:text-amber-300">
            {total}
          </span>
          {collapsed && combos.length > 0 && (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {combos.length} combos • {keys.length} shortcuts
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="px-2 pb-2 space-y-2">
          {/* Combos — horizontal scroll, compact */}
          {combos.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-1 px-1">
                <Sparkles className="h-2.5 w-2.5 text-violet-600" />
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-400">
                  Combos
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {combos.map((combo) => (
                  <button
                    key={combo.id}
                    onClick={() => onComboAdd(combo)}
                    className="group shrink-0 rounded-lg border border-violet-200 dark:border-violet-800 bg-white dark:bg-neutral-900 px-2 py-1.5 hover:border-violet-500 hover:shadow-md transition text-left flex items-center gap-2"
                  >
                    <div className="text-base">🎁</div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate max-w-[120px]">
                        {combo.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-extrabold text-violet-700 dark:text-violet-400 tabular-nums">
                          {formatPKR(combo.comboPrice)}
                        </span>
                        {combo.savingsPercentage > 0 && (
                          <span className="px-1 rounded bg-emerald-500 text-white text-[8px] font-extrabold">
                            -{combo.savingsPercentage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick keys — inline chips */}
          {keys.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {keys.map((key) => (
                <button
                  key={key.id}
                  onClick={() => handleKeyClick(key)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 hover:shadow-md hover:-translate-y-0.5 transition active:scale-95"
                  style={{ borderColor: key.color || undefined }}
                  title={key.label + (key.hotkey ? ' [' + key.hotkey + ']' : '')}
                >
                  <span className="text-base">{key.icon || '⚡'}</span>
                  <span className="text-[11px] font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                    {key.label}
                  </span>
                  {key.hotkey && (
                    <span className="px-1 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[8px] font-mono font-extrabold">
                      {key.hotkey}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
