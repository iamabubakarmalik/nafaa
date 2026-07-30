import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { hasPermission, isOwner, type PermissionKey } from '@core/lib/permissions';

interface RoleGuardProps {
  children: ReactNode;
  requireOwner?: boolean;
  requirePermission?: PermissionKey;
  fallbackPath?: string;
}

export function RoleGuard({
  children,
  requireOwner,
  requirePermission,
  fallbackPath,
}: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  const userIsOwner = isOwner(user.role);

  if (requireOwner && !userIsOwner) {
    if (fallbackPath) return <Navigate to={fallbackPath} replace />;
    return <AccessDenied reason="OWNER_ONLY" />;
  }

  if (requirePermission && !hasPermission(user.role, user.permissions, requirePermission)) {
    if (fallbackPath) return <Navigate to={fallbackPath} replace />;
    return <AccessDenied reason="NO_PERMISSION" permission={requirePermission} />;
  }

  return <>{children}</>;
}

function AccessDenied({ reason, permission }: { reason: string; permission?: string }) {
  const goBack = () => window.history.back();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-300 p-8 text-center shadow-lg">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-rose-900">Access Denied</h2>
        <p className="mt-2 text-sm text-rose-800 font-semibold">
          {reason === 'OWNER_ONLY'
            ? 'Sirf shop Owner is page ko access kar sakta hai.'
            : 'Aap ke paas is feature ka permission nahi hai.'}
        </p>
        {permission && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-mono font-bold">
            {permission}
          </div>
        )}
        <p className="mt-4 text-xs text-rose-700">
          Apni shop ke Owner se baat karein.
        </p>
        <button
          onClick={goBack}
          className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Wapas jaein
        </button>
      </div>
    </div>
  );
}

export function OwnerOnly({ children }: { children: ReactNode }) {
  return <RoleGuard requireOwner>{children}</RoleGuard>;
}
