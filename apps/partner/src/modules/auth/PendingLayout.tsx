/**
 * Frame for partners who are not active yet (under review, suspended or
 * rejected): brand bar and log out, no app navigation.
 */

import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { ConfirmHost } from '@/design-system/components';
import { LogoMark } from '@/ui/Logo';
import { PageSkeleton } from '@/ui/QueryState';
import { useLogout } from './useLogout';

export default function PendingLayout() {
  const logout = useLogout();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-[0.9375rem] font-extrabold tracking-tight text-slate-900">Nafaa <span className="text-brand-700">Partner</span></span>
          </Link>
          <button type="button" onClick={logout} className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.875rem] font-semibold text-slate-600 hover:bg-slate-100">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>
      <ConfirmHost />
    </div>
  );
}
