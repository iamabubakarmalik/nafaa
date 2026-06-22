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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center"
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
