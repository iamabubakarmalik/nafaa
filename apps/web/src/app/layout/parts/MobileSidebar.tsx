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
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // ESC closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className="absolute left-0 top-0 bottom-0 w-[320px] max-w-[88vw] bg-slate-950 text-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-250 safe-top safe-bottom safe-left"
        style={{ background: 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition ring-1 ring-slate-700 active:scale-95 text-white"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>

        <Sidebar
          tenantName={tenantName}
          tenantSlug={tenantSlug}
          businessType={businessType}
          role={role}
          permissions={permissions}
          onItemClick={onClose}
        />
      </aside>
    </div>
  );
}
