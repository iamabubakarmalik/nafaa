import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import type { PermissionKey } from '@/lib/permissions';

interface Props {
  permission: PermissionKey;
  children: ReactNode;
}

export default function PermissionRoute({ permission, children }: Props) {
  const allowed = usePermission(permission);

  if (allowed) return <>{children}</>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-50 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8 text-rose-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Access Restricted</h2>
        <p className="mt-2 text-sm text-slate-600">
          Aap ke account ko is section ka access nahi diya gaya.
          Owner se permission enable karwa lein.
        </p>
      </div>
    </div>
  );
}
