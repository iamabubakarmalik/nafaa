/** Frame for the signed-out admin screens (sign in, accept invite). */

import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen-dvh items-center justify-center overflow-hidden bg-shell-canvas p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-4 text-[1.5rem] font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-[0.875rem] text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200/80 sm:p-8">{children}</div>
        <p className="mt-6 text-center text-[0.75rem] text-slate-400">© {new Date().getFullYear()} Nafaa · Admin panel. Every action here is logged.</p>
      </div>
    </div>
  );
}
