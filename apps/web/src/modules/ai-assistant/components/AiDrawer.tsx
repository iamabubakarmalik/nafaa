/**
 * Nafaa AI side panel, mounted once by the app shell.
 *
 *   AiDrawer     slides in from the right. From 1600px, when the user keeps
 *                it pinned (the default), it sits beside the page and pushes
 *                it narrower; otherwise it floats over the page with a light
 *                scrim (no layout shift), and on phones it fills the screen.
 *   AiLauncher   the floating mark at the bottom right (not on the POS
 *                counter, where it would sit over the pay button, and not
 *                while the panel or the /ai page is open), plus Alt+I.
 *   AiTopbarButton  the header icon.
 *
 * All three show only for users with `ai.use`.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@core/lib/cn';
import { hasPermission, PERMISSIONS } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import { PUSH_MIN_WIDTH, useAiStore } from '../store';
import { AiChat } from './AiChat';
import { NafaaAiMark } from './NafaaAiMark';

export function useCanUseAi(): boolean {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user?.role, user?.permissions, PERMISSIONS.AI_USE);
}

const onAiPage = (path: string) => path === '/ai' || path.startsWith('/ai/');

function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const [match, setMatch] = useState(() => { try { return window.matchMedia(query).matches; } catch { return false; } });
  useEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia(query); } catch { return; }
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** True when the panel sits beside the page: a very wide screen and the user keeps it pinned. */
export function usePushLayout(): boolean {
  const wide = useMinWidth(PUSH_MIN_WIDTH);
  const pinned = useAiStore((s) => s.pushPinned);
  return wide && pinned;
}

export function AiDrawer() {
  const can = useCanUseAi();
  const open = useAiStore((s) => s.open);
  const setOpen = useAiStore((s) => s.setOpen);
  const push = usePushLayout();
  const { pathname } = useLocation();
  const shown = can && open && !onAiPage(pathname);
  // Keep the chat mounted until the slide-out ends.
  const [mounted, setMounted] = useState(shown);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (shown) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 300);
    const back = returnFocus.current;
    returnFocus.current = null;
    if (back && document.contains(back) && back !== document.body) back.focus({ preventScroll: true });
    return () => window.clearTimeout(t);
  }, [shown]);

  if (!can) return null;
  return (
    <>
      {/* Overlay mode: a light scrim; clicking it minimizes the panel (the chat stays). */}
      {!push && shown && (
        <div className="fixed inset-0 z-[65] hidden bg-slate-950/20 sm:block print:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}
      <aside
        aria-label="Nafaa AI"
        aria-hidden={!shown}
        className={cn(
          'flex flex-col overflow-hidden border-slate-200 bg-white print:hidden',
          push
            ? cn('relative h-screen-dvh shrink-0 border-l transition-[width,visibility] duration-300 ease-out', shown ? 'visible w-[420px]' : 'invisible w-0 border-l-0')
            : cn(
              'fixed inset-0 z-[70] transition-[transform,visibility] duration-300 ease-out sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l sm:shadow-2xl',
              shown ? 'visible translate-x-0' : 'invisible translate-x-full',
            ),
        )}
      >
        <div className="flex h-full w-full flex-col sm:w-[420px]">
          {mounted && <AiChat variant="drawer" />}
        </div>
      </aside>
    </>
  );
}

export function AiLauncher() {
  const can = useCanUseAi();
  const open = useAiStore((s) => s.open);
  const toggle = useAiStore((s) => s.toggle);
  const streaming = useAiStore((s) => s.streaming);
  const { pathname } = useLocation();

  // Alt+I opens and closes the panel on every page, the POS counter included.
  useEffect(() => {
    if (!can) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyI' || e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        if (onAiPage(window.location.pathname)) return;
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [can, toggle]);

  if (!can || open || pathname.startsWith('/pos') || onAiPage(pathname)) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Nafaa AI kholein (Alt+I)"
      title="Nafaa AI (Alt+I)"
      className="group fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 print:hidden"
    >
      <NafaaAiMark size={34} state={streaming ? 'thinking' : 'idle'} />
    </button>
  );
}

export function AiTopbarButton() {
  const can = useCanUseAi();
  const open = useAiStore((s) => s.open);
  const toggle = useAiStore((s) => s.toggle);
  const { pathname } = useLocation();
  if (!can || onAiPage(pathname)) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Nafaa AI (Alt+I)"
      aria-pressed={open}
      title="Nafaa AI (Alt+I)"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        open && 'bg-brand-50',
      )}
    >
      <NafaaAiMark size={22} />
    </button>
  );
}
