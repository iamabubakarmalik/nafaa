/**
 * Layout for the screens a visitor sees before the app shell: sign-in,
 * sign-up, password reset, email check and the Google steps.
 *
 * Desktop: brand panel on the left, form on the right. Phone: the form alone
 * with the logo on top. Colors come from the brand tokens, so light and dark
 * mode and the accent color follow the design system.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, BookOpenCheck, Building2, CheckCircle2, Lock, WifiOff } from 'lucide-react';
import { Logo } from '@core/components/brand/Logo';
import { cn } from '@core/lib/cn';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitch } from '@core/i18n/components/LanguagePicker';
import { t } from '@core/i18n';

type Side = 'signin' | 'signup';

const POINTS: Record<Side, { title: ReactNode; text: string; items: Array<{ icon: typeof Lock; label: string; text: string }> }> = {
  signin: {
    title: t('Aap ki dukaan,\naap ke haath me.'),
    text: t('Sale, stock, khata aur profit — sab ek jagah, har din ka pura hisaab.'),
    items: [
      { icon: WifiOff, label: t('Net ke bina bhi chalta hai'), text: t('Sale ruk-ti nahi, net aate hi sab sync.') },
      { icon: BookOpenCheck, label: t('Khata aur udhaar'), text: t('Har customer ka hisaab saaf.') },
      { icon: BarChart3, label: t('Net profit'), text: t('Cost, expenses aur return ke baad.') },
      { icon: Building2, label: t('Har branch alag'), text: t('Ek account, kai dukaanen.') },
    ],
  },
  signup: {
    title: t('Do minute me\ndukaan tayyar.'),
    text: t('Apna kaam chunein — Nafaa usi hisaab se screens, bill aur reports set kar deta hai.'),
    items: [
      { icon: CheckCircle2, label: t('Aap ke kaam ke hisaab se'), text: t('Pharmacy, kiryana, mobile, restaurant aur bohat kuch.') },
      { icon: WifiOff, label: t('Net ke bina bhi'), text: t('Sale chalti rahe, baad me sync.') },
      { icon: Lock, label: t('Data mehfooz'), text: t('Har login aur device ka record.') },
    ],
  },
};

interface AuthLayoutProps {
  children: ReactNode;
  side?: Side;
  /** Wider form column (sign-up with industry cards). */
  wide?: boolean;
}

export function AuthLayout({ children, side = 'signin', wide }: AuthLayoutProps) {
  const copy = POINTS[side];
  return (
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div aria-hidden className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full bg-brand-500 opacity-40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -start-20 h-96 w-96 rounded-full bg-brand-600 opacity-50 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />

        <div className="relative flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="text-xl font-bold tracking-tight">{t('Nafaa')}</div>
            <div className="text-xs text-white/70">{t('Dukaan ka pura hisaab')}</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="whitespace-pre-line text-4xl font-bold leading-tight tracking-tight xl:text-[2.75rem]">{copy.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">{copy.text}</p>
          <ul className="mt-8 space-y-3">
            {copy.items.map(({ icon: Icon, label, text }) => (
              <li key={label} className="flex items-start gap-3 rounded-xl bg-ink-white/10 p-3 ring-1 ring-inset ring-ink-white/15">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/70">
          <span>{t('© {{value}} Nafaa', { value: new Date().getFullYear() })}</span>
          <span className="flex items-center gap-3">
            <Link to="/legal" className="hover:text-white">{t('Privacy')}</Link>
            <Link to="/legal" className="hover:text-white">{t('Terms')}</Link>
          </span>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link to="/login" className="flex shrink-0 items-center gap-2 lg:invisible" aria-label="Nafaa">{/* i18n-ignore: brand */}
            <Logo size={32} />
            <span className="hidden text-lg font-bold tracking-tight text-slate-900 min-[420px]:inline">Nafaa</span>{/* i18n-ignore: brand */}
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <LanguageSwitch className="w-[13rem] sm:w-[14.5rem]" />
            <ThemeToggle className="shrink-0" />
          </div>
        </div>

        <div className={cn('mx-auto flex w-full flex-1 flex-col justify-center py-8', wide ? 'max-w-xl' : 'max-w-[26rem]')}>
          {children}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <Lock className="h-3 w-3" aria-hidden /> {' '}{t('Mehfooz connection · aap ka password kabhi kisi ko nahi dikhta')}
        </p>
      </main>
    </div>
  );
}

/** Title block at the top of an auth form. */
export function AuthHeading({ icon, title, subtitle }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
          {icon}
        </div>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{subtitle}</p>}
    </div>
  );
}

/** "ya" divider between Google and the email form. */
export function OrDivider({ label = t('ya email se') }: { label?: string }) {
  return (
    <div className="relative my-5 flex items-center" role="separator">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="px-3 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
