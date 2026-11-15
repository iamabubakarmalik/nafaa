/**
 * Live support entry points, mounted by the app shell:
 *
 *   SupportPanel      the chat as a floating card at the bottom right (full
 *                     screen on phones); Expand opens the /support page.
 *   SupportLauncher   the round chat button with the unread badge. It sits
 *                     above the Nafaa AI button, and hides on the POS
 *                     counter, on /support and while the panel is open.
 *   SupportTopbarButton  the header icon with the same badge.
 *   SupportHost       boots the connection and renders the panel, launcher,
 *                     the welcome / check-in preview and the call card.
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Headset, MessageCircle } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { useAiStore, useCanUseAi } from '@modules/ai-assistant';
import { useSupportBoot } from '../hooks/useSupportBoot';
import { useSupportStore } from '../store';
import { SupportChat } from './SupportChat';
import { CallOverlay } from './CallOverlay';
import { SupportPeek } from './SupportPeek';

const onSupportPage = (path: string) => path === '/support' || path.startsWith('/support/');

function Badge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn('absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[0.6875rem] font-bold text-white ring-2 ring-white', className)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function SupportPanel() {
  const open = useSupportStore((s) => s.panelOpen);
  const close = useSupportStore((s) => s.closePanel);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const shown = open && !onSupportPage(pathname);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, close]);

  if (!shown) return null;
  return (
    <section
      aria-label={t('Nafaa Support chat')}
      className="fixed inset-0 z-[75] flex flex-col overflow-hidden bg-white shadow-2xl sm:inset-auto sm:bottom-5 sm:end-5 sm:h-[min(42rem,calc(100dvh-2.5rem))] sm:w-[25rem] sm:rounded-3xl sm:ring-1 sm:ring-slate-200 print:hidden"
    >
      <SupportChat variant="panel" onClose={close} onExpand={() => { close(); navigate('/support'); }} />
    </section>
  );
}

export function SupportLauncher() {
  const open = useSupportStore((s) => s.panelOpen);
  const toggle = useSupportStore((s) => s.togglePanel);
  const unread = useSupportStore((s) => s.unread);
  const canAi = useCanUseAi();
  const aiOpen = useAiStore((s) => s.open);
  const { pathname } = useLocation();
  if (open || pathname.startsWith('/pos') || onSupportPage(pathname)) return null;
  // The Nafaa AI button takes the corner when it is shown.
  const aboveAi = canAi && !aiOpen && !pathname.startsWith('/ai');
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={unread ? t('Support chat kholein ({{count}} naye message)', { count: unread }) : t('Support chat kholein')}
      title={t('Help & Support')}
      className={cn(
        'fixed z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-brand-fg shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 print:hidden',
        aboveAi ? 'bottom-[5.5rem] end-6' : 'bottom-5 end-5',
      )}
    >
      <MessageCircle className="h-6 w-6" />
      <Badge count={unread} className="-end-1 -top-1" />
    </button>
  );
}

export function SupportTopbarButton() {
  const open = useSupportStore((s) => s.panelOpen);
  const toggle = useSupportStore((s) => s.togglePanel);
  const unread = useSupportStore((s) => s.unread);
  const { pathname } = useLocation();
  if (onSupportPage(pathname)) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={unread ? t('Support chat kholein ({{count}} naye message)', { count: unread }) : t('Support chat kholein')}
      aria-pressed={open}
      title={t('Help & Support')}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        open && 'bg-brand-50 text-brand-700',
      )}
    >
      <Headset className="h-[1.125rem] w-[1.125rem]" />
      <Badge count={unread} className="-end-1 -top-1 h-4 min-w-4 text-[0.625rem]" />
    </button>
  );
}

export function SupportHost() {
  useSupportBoot();
  return (
    <>
      <SupportPanel />
      <SupportLauncher />
      <SupportPeek />
      <CallOverlay />
    </>
  );
}
