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
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-[320px] max-w-[88vw] bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-250">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition ring-1 ring-slate-700 active:scale-95"
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
