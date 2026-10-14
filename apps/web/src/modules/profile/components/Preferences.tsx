/** Preferences tab: light / dark theme for this account and links to the detailed settings. */

import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Monitor, Moon, Palette, Printer, Sun } from 'lucide-react';
import { Card } from '@/design-system/components';
import { useAppearance, useAppearanceStore } from '@/design-system';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';

const MODES = [
  { value: 'light' as const, label: 'Din (light)', icon: Sun },
  { value: 'dark' as const, label: 'Raat (dark)', icon: Moon },
  { value: 'system' as const, label: 'Device jaisa', icon: Monitor },
];

export function Preferences() {
  const { mode } = useAppearance();
  const setMode = useAppearanceStore((s) => s.setMode);
  const canPrint = usePermission(PERMISSIONS.POS_USE);
  const canSettings = usePermission(PERMISSIONS.SETTINGS_VIEW);

  const links = [
    { to: '/settings/appearance', icon: Palette, title: 'Rang, font aur size', text: 'Apna rang, likhai ka size aur safhe ki chaurai', show: true },
    { to: '/settings/printing', icon: Printer, title: 'Print settings', text: 'Printer, kaghaz ka size aur bill ka design', show: canPrint },
    { to: '/settings/notifications', icon: Bell, title: 'Notifications', text: 'Kab aur kaise khabar aaye', show: canSettings },
  ].filter((l) => l.show);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-3xl" title="Theme" description="Sirf aap ke account par lagta hai, har device par">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)}
              className={cn('flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[0.8125rem] font-semibold ring-1 transition',
                mode === m.value ? 'bg-brand-50 text-brand-800 ring-2 ring-brand-500' : 'bg-white text-slate-700 ring-slate-200 hover:ring-slate-300')}>
              <m.icon className="h-5 w-5" />{m.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl" flush title="Aur settings">
        <ul className="divide-y divide-slate-100">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><l.icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-semibold text-slate-900">{l.title}</span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{l.text}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
