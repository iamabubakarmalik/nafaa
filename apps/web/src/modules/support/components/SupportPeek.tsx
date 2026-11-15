/**
 * A welcome or check-in message from the Nafaa team, shown as a small
 * WhatsApp-style preview above the chat button: the agent's name and the
 * first two lines. Clicking it opens the chat; × closes it.
 *
 * Only on the dashboard (never on the POS counter or with the chat open),
 * three seconds after the page opens, and once per message on this browser.
 * Landing on the dashboard also refreshes the team status (at most once a
 * minute), which is where a waiting check-in message comes from.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { useAiStore, useCanUseAi } from '@modules/ai-assistant';
import { displayName, previewText, useSupportStore } from '../store';
import { timeOf } from '../lib/format';

const DELAY_MS = 3000;
const REFRESH_EVERY_MS = 60_000;
let lastDashboardRefresh = 0;

const onDashboard = (path: string) => path === '/dashboard' || path === '/';

export function SupportPeek() {
  const peek = useSupportStore((s) => s.peek);
  const panelOpen = useSupportStore((s) => s.panelOpen);
  const openPanel = useSupportStore((s) => s.openPanel);
  const dismiss = useSupportStore((s) => s.dismissPeek);
  const peekShown = useSupportStore((s) => s.peekShown);
  const refreshStatus = useSupportStore((s) => s.refreshStatus);
  const canAi = useCanUseAi();
  const aiOpen = useAiStore((s) => s.open);
  const { pathname } = useLocation();
  const dashboard = onDashboard(pathname);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);

  // A waiting check-in message is found through the status call.
  useEffect(() => {
    if (!dashboard || Date.now() - lastDashboardRefresh < REFRESH_EVERY_MS) return;
    lastDashboardRefresh = Date.now();
    void refreshStatus();
  }, [dashboard, refreshStatus]);

  const id = peek?.message.id ?? null;
  const allowed = !!id && dashboard && !panelOpen;

  // Wait 3 seconds on the dashboard, then slide in.
  useEffect(() => {
    setReady(false);
    setShown(false);
    if (!allowed) return;
    let popped = false;
    const timer = window.setTimeout(() => {
      popped = true;
      setReady(true);
      requestAnimationFrame(() => setShown(true));
      if (id) peekShown(id);
    }, DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      // Shown once: leaving the dashboard (or opening the chat) puts it away for good.
      if (popped) dismiss();
    };
  }, [allowed, id, peekShown, dismiss]);

  if (!peek || !allowed || !ready) return null;

  const m = peek.message;
  const name = displayName(m);
  const aboveAi = canAi && !aiOpen;
  const close = () => { setShown(false); window.setTimeout(dismiss, 200); };

  return (
    <div
      role="status"
      className={cn(
        'fixed end-5 z-[61] w-[min(19rem,calc(100vw-2.5rem))] print:hidden',
        aboveAi ? 'bottom-[9.25rem]' : 'bottom-[5rem]',
        'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      )}
    >
      <div className="relative rounded-2xl rounded-ee-md bg-white shadow-xl ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => openPanel()}
          className="flex w-full items-start gap-2.5 rounded-2xl rounded-ee-md p-3 pe-8 text-start transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={t('Nafaa team ka message: chat kholein')}
        >
          <span className="relative shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[0.875rem] font-bold text-brand-fg">
              {(name || 'N').charAt(0).toUpperCase()}
            </span>
            <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[0.8125rem] font-semibold text-slate-900">
                {name ? t('{{name}} (Nafaa team)', { name }) : t('Nafaa team')}
              </span>
              <span className="shrink-0 text-[0.6875rem] tabular-nums text-slate-400">{timeOf(m.createdAt)}</span>
            </span>
            <span className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug text-slate-600">{previewText(m)}</span>
            <span className="mt-1.5 inline-block text-[0.75rem] font-semibold text-brand-700">{t('Reply karein')}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={close}
          aria-label={t('Band karein')}
          className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
