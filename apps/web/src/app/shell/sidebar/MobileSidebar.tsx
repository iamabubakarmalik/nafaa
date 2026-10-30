import { useEffect, useRef, useState } from 'react';
import { cn } from '@core/lib/cn';
import { Sidebar, type SidebarProps } from './Sidebar';
import { isRtl, t as tr } from '@core/i18n';

/**
 * Phone and tablet menu. Slides in from the left and closes on a backdrop
 * tap, Escape, a link tap, or a swipe to the left.
 */

type Props = Omit<SidebarProps, 'collapsed' | 'onToggleCollapse' | 'onItemClick' | 'onClose'> & {
  open: boolean;
  onClose: () => void;
  /** Dark or brand sidebar style from Settings → Appearance. */
  dark?: boolean;
  surface?: React.CSSProperties;
};
export function MobileSidebar({ open, onClose, dark, surface, ...rest }: Props) {
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);

  // Lock page scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, horizontal: null };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (s.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.horizontal = Math.abs(dx) > Math.abs(dy);
    // Swiping toward the edge the drawer came from closes it.
    if (s.horizontal) setDrag(isRtl() ? Math.max(0, dx) : Math.min(0, dx));
  };
  const onTouchEnd = () => {
    if (Math.abs(drag) > 80) onClose();
    setDrag(0);
    start.current = null;
  };

  return (
    <div className={cn('fixed inset-0 z-[60] lg:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn('absolute inset-0 bg-slate-950/50 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        style={open && drag ? { opacity: Math.max(0.2, 1 - Math.abs(drag) / 320) } : undefined}
      />
      <aside
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label={tr('Main menu')}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          ...surface,
          // The drawer opens from the start edge: the left in English, the right in Urdu.
          transform: open ? `translateX(${drag}px)` : (isRtl() ? 'translateX(105%)' : 'translateX(-105%)'),
          transition: drag ? 'none' : 'transform 320ms cubic-bezier(.32,.72,0,1)',
        }}
        className={cn('absolute inset-y-0 start-0 flex w-[86vw] max-w-[320px] flex-col bg-shell-sidebar pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-[rgb(var(--fg))] shadow-2xl', dark && 'dark')}
      >
        <Sidebar {...rest} onItemClick={onClose} onClose={onClose} />
      </aside>
    </div>
  );
}