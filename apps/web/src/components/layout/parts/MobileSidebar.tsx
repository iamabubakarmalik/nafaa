import { useEffect } from 'react';
import { X } from 'lucide-react';
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

export function MobileSidebar({
  open, onClose, tenantName, tenantSlug, businessType, role, permissions,
}: Props) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay with fade */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sidebar with slide-in animation */}
      <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-250">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition ring-1 ring-slate-700"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Sidebar content */}
        <Sidebar
          tenantName={tenantName}
          tenantSlug={tenantSlug}
          businessType={businessType}
          role={role}
          permissions={permissions}
          onItemClick={onClose}
        />

        {/* Swipe indicator (right edge) */}
        <div className="absolute top-1/2 -right-1 w-1 h-16 rounded-full bg-slate-700/50 opacity-50" />
      </aside>
    </div>
  );
}
