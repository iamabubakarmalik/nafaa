/**
 * Frame for the sign-in and application pages: a brand panel (side on
 * desktop, top on phones) and the form.
 */

import type { ReactNode } from 'react';
import { BadgeCheck, MapPin, Wallet } from 'lucide-react';
import { LogoMark } from '@/ui/Logo';

const POINTS = [
  { icon: MapPin, text: 'Dukaanon ko Nafaa dikhayein ya apna link bhejein' },
  { icon: BadgeCheck, text: 'Har Signup aur Visit app me record hota hai' },
  { icon: Wallet, text: 'Commission seedha JazzCash, Easypaisa ya bank me' },
];

export function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-full lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <aside className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-5 pb-8 pt-6 text-white lg:flex lg:min-h-full lg:flex-col lg:px-10 lg:py-10">
        <span className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-20 -start-16 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-10 w-10 rounded-xl ring-2 ring-white/30" />
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">Nafaa</p>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/80">Partner</p>
          </div>
        </div>
        <div className="relative mt-6 lg:mt-auto">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight lg:text-[2rem]">Nafaa ke saath kamayein</h1>
          <p className="mt-2 max-w-sm text-[0.9375rem] text-white/85">Pakistan ki dukaanon ko digital banayein aur har kamyab Signup par Commission payein.</p>
          <ul className="mt-5 hidden space-y-3 lg:block">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-[0.9375rem] text-white/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><p.icon className="h-[1.125rem] w-[1.125rem]" /></span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 hidden text-[0.75rem] text-white/60 lg:block">© Nafaa · partner.nafaa.pk</p>
      </aside>
      <main className="flex justify-center px-4 py-6 sm:py-10 lg:items-center lg:px-10">
        <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}>{children}</div>
      </main>
    </div>
  );
}
