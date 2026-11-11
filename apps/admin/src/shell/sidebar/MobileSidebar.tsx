/**
 * Phone and tablet menu: slides in from the left and closes on a backdrop
 * tap, Escape, a link tap or a swipe to the left (same behavior as the
 * merchant app's drawer).
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Sidebar } from './Sidebar';

export function MobileSidebar({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

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
        aria-label="Main menu"
        onTouchStart={(e) => { const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY, horizontal: null }; }}
        onTouchMove={(e) => {
          const s = start.current;
          if (!s) return;
          const t = e.touches[0];
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (s.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.horizontal = Math.abs(dx) > Math.abs(dy);
          if (s.horizontal) setDrag(Math.min(0, dx));
        }}
        onTouchEnd={() => { if (Math.abs(drag) > 80) onClose(); setDrag(0); start.current = null; }}
        style={{
          transform: open ? `translateX(${drag}px)` : 'translateX(-105%)',
          transition: drag ? 'none' : 'transform 320ms cubic-bezier(.32,.72,0,1)',
        }}
        className="absolute inset-y-0 start-0 flex w-[86vw] max-w-[320px] flex-col bg-shell-sidebar pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-[rgb(var(--fg))] shadow-2xl"
      >
        <Sidebar onItemClick={onClose} onClose={onClose} onLogout={onLogout} />
      </aside>
    </div>
  );
}
