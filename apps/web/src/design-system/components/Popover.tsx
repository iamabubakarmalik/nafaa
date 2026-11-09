/**
 * Anchored popup rendered in a portal, so no table, card or scrolling
 * ancestor can clip it. It opens below its trigger and flips above when the
 * space below is short; the height is capped to the space it gets, and it
 * stays inside the screen sideways. Outside click, Escape, scrolling the page
 * or resizing closes it.
 *
 * `Menu` is the same popup with menu keys (↑ ↓ Home End, type-ahead) and
 * focus handling; `MenuItem`, `MenuLabel` and `MenuSeparator` keep every
 * menu in the app looking the same.
 */

import {
  forwardRef, useCallback, useLayoutEffect, useRef, useState, useEffect,
  type ButtonHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@core/lib/cn';
import { handleMenuKey, useMenuFocus } from '../keyboard';

const GAP = 4;
const EDGE = 8;

interface Place { top: number; left: number; maxHeight: number; up: boolean }

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The element the popup hangs from (usually the trigger button). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Which edge of the trigger the popup lines up with. */
  align?: 'start' | 'end';
  /** Prefer opening upwards (a bar at the bottom of the screen). */
  preferUp?: boolean;
  /** Width class, e.g. "w-60". */
  width?: string;
  role?: 'menu' | 'dialog' | 'listbox';
  label?: string;
  className?: string;
  /** Close when the page scrolls (default). Popups with a text field keep this off. */
  closeOnScroll?: boolean;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover({
  open, onClose, anchorRef, align = 'end', preferUp, width = 'w-60', role = 'dialog', label, className, closeOnScroll = true, onKeyDown, children,
}, forwarded) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const setRefs = useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    if (typeof forwarded === 'function') forwarded(el);
    else if (forwarded) forwarded.current = el;
  }, [forwarded]);

  const measure = useCallback(() => {
    const a = anchorRef.current?.getBoundingClientRect();
    const el = ref.current;
    if (!a || !el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const natural = el.scrollHeight;
    const w = el.offsetWidth;
    const below = vh - a.bottom - GAP - EDGE;
    const above = a.top - GAP - EDGE;
    const up = preferUp ? !(above < Math.min(natural, 240) && below > above) : (below < Math.min(natural, 280) && above > below);
    const room = Math.max(120, up ? above : below);
    const height = Math.min(natural, room);
    let left = align === 'end' ? a.right - w : a.left;
    // RTL pages mirror the start/end edges.
    if (document.documentElement.dir === 'rtl') left = align === 'end' ? a.left : a.right - w;
    left = Math.min(Math.max(EDGE, left), vw - w - EDGE);
    const top = up ? a.top - GAP - height : a.bottom + GAP;
    setPlace({ top, left, maxHeight: room, up });
  }, [anchorRef, align, preferUp]);

  useLayoutEffect(() => {
    if (!open) { setPlace(null); return; }
    measure();
  }, [open, measure]);

  // Content can grow after the first paint (data loads in); keep the popup placed.
  useEffect(() => {
    if (!open || !ref.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (closeOnScroll) closeRef.current(); else measure();
    };
    const onResize = () => measure();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, anchorRef, closeOnScroll, measure]);

  if (!open) return null;
  return createPortal(
    <div ref={setRefs} role={role} aria-label={label} onKeyDown={onKeyDown}
      style={place ? { top: place.top, left: place.left, maxHeight: place.maxHeight } : { top: -9999, left: -9999 }}
      className={cn('fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 text-slate-700 shadow-xl',
        'animate-in fade-in duration-100', place?.up ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1', width, className)}>
      {children}
    </div>,
    document.body,
  );
});

/** Popup menu with menu keys; focus moves in on open and back to the trigger on close. */
export function Menu({ open, onClose, anchorRef, children, ...rest }: Omit<PopoverProps, 'role' | 'onKeyDown'>) {
  const menuRef = useRef<HTMLDivElement>(null);
  useMenuFocus(open, menuRef, anchorRef);
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') { onClose(); return; }
    if (menuRef.current && handleMenuKey(e, menuRef.current)) e.preventDefault();
  };
  return <Popover ref={menuRef} open={open} onClose={onClose} anchorRef={anchorRef} role="menu" onKeyDown={onKey} {...rest}>{children}</Popover>;
}

export const MenuItem = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode; tone?: 'default' | 'danger'; hint?: ReactNode; checked?: boolean;
}>(function MenuItem({ icon, tone = 'default', hint, checked, className, children, ...props }, ref) {
  return (
    <button ref={ref} type="button" role={checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={checked}
      className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[0.8125rem] font-medium outline-none transition',
        'focus-visible:bg-slate-100 disabled:cursor-default disabled:opacity-50',
        tone === 'danger' ? 'text-rose-700 hover:bg-rose-50 focus-visible:bg-rose-50' : 'text-slate-700 hover:bg-slate-50',
        '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0', tone === 'danger' ? '' : '[&>svg]:text-slate-500', className)}
      {...props}>
      {icon}
      <span className="min-w-0 flex-1">{children}</span>
      {hint != null && <span className="shrink-0 text-[0.75rem] tabular-nums text-slate-400">{hint}</span>}
    </button>
  );
});

export function MenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('px-2.5 pb-1 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400', className)}>{children}</p>;
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-slate-100" />;
}
