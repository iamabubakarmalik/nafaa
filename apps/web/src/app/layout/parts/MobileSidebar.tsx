import { useEffect, useRef, useState } from 'react';
import { cn } from '@core/lib/cn';
import { Sidebar } from './Sidebar';

interface Props {
  open: boolean;
  onClose: () => void;
  tenantName?: string;
  tenantSlug?: string;
  businessType?: string;
  role?: any;
  permissions?: string[];
}

/**
 * Phone / tablet menu. Slides in from the left, closes on backdrop tap,
 * Escape, a link tap, or a swipe to the left.
 */
export function MobileSidebar({ open, onClose, ...rest }: Props) {
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);

  // Lock page scroll while open
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
    if (s.horizontal) setDrag(Math.min(0, dx));
  };
  const onTouchEnd = () => {
    if (drag < -80) onClose();
    setDrag(0);
    start.current = null;
  };

  return (
    <div className={cn('fixed inset-0 z-[60] lg:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn('absolute inset-0 bg-slate-950/50 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        style={open && drag ? { opacity: Math.max(0.2, 1 + drag / 320) } : undefined}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: open ? `translateX(${drag}px)` : 'translateX(-105%)',
          transition: drag ? 'none' : 'transform 320ms cubic-bezier(.32,.72,0,1)',
        }}
        className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col bg-[#eef0f3] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl dark:bg-slate-950"
      >
        <Sidebar {...rest} onItemClick={onClose} onClose={onClose} />
      </aside>
    </div>
  );
}