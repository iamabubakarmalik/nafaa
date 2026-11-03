/** Feature switches for the mobile app. Everything is on unless turned off here; the web is not affected. */

import { Power, RotateCcw, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminMobileApi } from '@/api/admin-mobile.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Card, MobileHero, Pill, Toggle } from '../components/MobileUi';
import { useMobileConfig } from '../components/useMobileConfig';

export default function MobileFlagsPage() {
  const cfg = useMobileConfig();
  const { data: meta } = useQuery({ queryKey: ['admin-mobile-config'], queryFn: adminMobileApi.config });
  const d = cfg.draft;
  const catalog = meta?.catalog ?? [];
  const offCount = d ? Object.values(d.flags).filter((v) => v === false).length : 0;

  const setFlag = (key: string, on: boolean) =>
    cfg.setDraft((prev) => {
      if (!prev) return prev;
      const flags = { ...prev.flags };
      // Stored only when off; on is the default.
      if (on) delete flags[key]; else flags[key] = false;
      return { ...prev, flags };
    });

  return (
    <div className="space-y-6">
      <MobileHero title="Feature switches" subtitle="Hide a module, trim the POS, or switch a feature off for every app at once. Everything is on unless you turn it off; the web is not affected.">
        <Button variant="secondary" onClick={() => cfg.setDraft((p) => (p ? { ...p, flags: {} } : p))} disabled={!offCount}><Power className="h-4 w-4" />Turn all on</Button>
        <Button variant="secondary" onClick={cfg.reset} disabled={!cfg.dirty}><RotateCcw className="h-4 w-4" />Undo changes</Button>
        <Button onClick={cfg.save} loading={cfg.saving} disabled={!cfg.dirty}><Save className="h-4 w-4" />Save</Button>
      </MobileHero>

      {offCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>{offCount}</b> switch{offCount === 1 ? ' is' : 'es are'} off{cfg.dirty ? ' (not saved yet)' : ''}.
        </div>
      )}

      {!d ? <div className="h-64 animate-pulse rounded-3xl bg-slate-100" /> : (
        <div className="grid gap-6 xl:grid-cols-3">
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
                    <div key={f.key} className={cn('flex items-center justify-between gap-4 py-2.5', !on && 'opacity-90')}>
                      <div className="min-w-0">
                        <div className={cn('text-sm font-medium', on ? 'text-slate-900' : 'text-rose-700')}>{f.label}</div>
                        <div className="text-[11px] text-slate-500">{f.help ?? <code>{f.key}</code>}</div>
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
    </div>
  );
}
