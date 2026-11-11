/** Feature switches for the mobile app. Everything is on unless turned off here; the web is not affected. */

import { Lightbulb, Power, RotateCcw, Save, ToggleRight, Smartphone, EyeOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Alert, PageHero, PageShell, Skeleton, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminMobileApi } from '@/api/admin-mobile.api';
import { num } from '@/features/shared/kit';
import { cn } from '@/lib/cn';
import { Card, Pill, Toggle } from '../components/MobileUi';
import { useMobileConfig } from '../components/useMobileConfig';

export default function MobileFlagsPage() {
  const guide = usePageGuide();
  const cfg = useMobileConfig();
  const { data: meta } = useQuery({ queryKey: ['admin-mobile-config'], queryFn: adminMobileApi.config });
  const d = cfg.draft;
  const catalog = meta?.catalog ?? [];
  const offCount = d ? Object.values(d.flags).filter((v) => v === false).length : 0;
  const total = catalog.reduce((s, g) => s + g.flags.length, 0);

  const setFlag = (key: string, on: boolean) =>
    cfg.setDraft((prev) => {
      if (!prev) return prev;
      const flags = { ...prev.flags };
      // Stored only when off; on is the default.
      if (on) delete flags[key]; else flags[key] = false;
      return { ...prev, flags };
    });

  return (
    <PageShell>
      <PageHero
        title="Feature switches"
        chip={cfg.dirty ? 'Unsaved changes' : undefined}
        busy={cfg.saving}
        loading={!d}
        actions={
          <>
            <button type="button" className={heroButton} onClick={() => cfg.setDraft((p) => (p ? { ...p, flags: {} } : p))} disabled={!offCount}><Power className="h-4 w-4" /> Turn all on</button>
            <button type="button" className={heroButton} onClick={cfg.reset} disabled={!cfg.dirty}><RotateCcw className="h-4 w-4" /> Undo changes</button>
            <button type="button" className={heroPrimaryButton} onClick={cfg.save} disabled={!cfg.dirty || cfg.saving}><Save className="h-4 w-4" /> Save</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={d ? [
          { label: 'Switches', value: num(total) },
          { label: 'On', value: num(total - offCount) },
          { label: 'Off', value: num(offCount) },
          { label: 'Groups', value: num(catalog.length) },
        ] : undefined}
      />

      {offCount > 0 && <Alert tone="warning"><b>{offCount}</b> switch{offCount === 1 ? ' is' : 'es are'} off{cfg.dirty ? ' (not saved yet)' : ''}.</Alert>}

      {!d ? <Skeleton className="h-64 rounded-3xl" /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          {catalog.map((group) => (
            <Card key={group.id} title={group.label} subtitle={group.help}
              className={group.id === 'kill' ? 'border-rose-200' : undefined}
              action={<Pill tone={group.flags.some((f) => d.flags[f.key] === false) ? 'amber' : 'emerald'}>
                {group.flags.filter((f) => d.flags[f.key] !== false).length}/{group.flags.length} on
              </Pill>}>
              <div className="divide-y divide-slate-100">
                {group.flags.map((f) => {
                  const on = d.flags[f.key] !== false;
                  return (
                    <div key={f.key} className="flex items-center justify-between gap-4 py-2.5">
                      <div className="min-w-0">
                        <div className={cn('text-[0.875rem] font-medium', on ? 'text-slate-900' : 'text-rose-700')}>{f.label}</div>
                        <div className="text-[0.6875rem] text-slate-500">{f.help ?? <code>{f.key}</code>}</div>
                      </div>
                      <Toggle checked={on} onChange={(v) => setFlag(f.key, v)} label={f.label} />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Feature switches"
          description="Hide a module or trim the POS in every app at once. Everything is on unless you turn it off. The web is not affected."
          flowTitle="How a switch works"
          flow={[
            { label: 'Turn off', hint: 'Here', icon: ToggleRight, color: '#4f46e5' },
            { label: 'Save', hint: 'Whole list is saved', icon: Save, color: '#0284c7' },
            { label: 'Apps update', hint: 'Within a minute', icon: Smartphone, color: '#d97706' },
            { label: 'Feature hidden', hint: 'In the app only', icon: EyeOff, color: '#e11d48' },
          ]}
          steps={[
            { icon: ToggleRight, color: '#4f46e5', title: 'Switch', text: 'Turn a feature off to hide it in the mobile app. Turn it back on any time.' },
            { icon: Save, color: '#0284c7', title: 'Save', text: 'Nothing changes until you press Save.' },
            { icon: Power, color: '#059669', title: 'Turn all on', text: 'Resets every switch to on. Press Save to apply it.' },
          ]}
          tips={['Only switches that are off are stored; on is the default.', 'Groups show how many of their switches are on.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
