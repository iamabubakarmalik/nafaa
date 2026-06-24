import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { Sidebar } from './parts/Sidebar';
import { MobileSidebar } from './parts/MobileSidebar';
import { Topbar } from './parts/Topbar';
import { DesktopUpdateBanner } from '@/features/desktop/components/DesktopUpdateBanner';

export default function AppShell() {
  const navigate = useNavigate();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Logout karna chahte hain?')) return;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // silent
    } finally {
      logout();
      toast.success('Logout ho gaya');
      navigate('/login');
    }
  };

  return (
    <div className="h-screen bg-slate-100 overflow-hidden">
      <div className="h-full grid lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex h-screen flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white border-r border-slate-800/50">
          <Sidebar
            tenantName={tenant?.name}
            tenantSlug={tenant?.slug}
            businessType={(tenant as any)?.businessType}
            role={user?.role}
            permissions={user?.permissions}
          />
        </aside>

        {/* MOBILE SIDEBAR */}
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          tenantName={tenant?.name}
          tenantSlug={tenant?.slug}
          businessType={(tenant as any)?.businessType}
          role={user?.role}
          permissions={user?.permissions}
        />

        {/* MAIN */}
        <div className="min-w-0 h-screen flex flex-col overflow-hidden">
          <Topbar
            user={user}
            tenant={tenant}
            onOpenMobileSidebar={() => setMobileOpen(true)}
            onLogout={handleLogout}
          />

          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
            <DesktopUpdateBanner />
        <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
