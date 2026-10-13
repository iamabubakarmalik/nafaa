/** Side panel with one audit event: what happened, why it stands out, who, and where to check it. */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Clock, Store, UserRound, X } from 'lucide-react';
import { Button, IconButton } from '@/design-system/components';
import type { AuditEvent } from '../api';
import { SEVERITY_META, TYPE_META, eventLink, whenFull } from '../meta';
import { eventValue } from '../print';
import { SeverityPill, TypeIcon } from './parts';

export const flagTone = (f: string): 'rose' | 'amber' | 'slate' =>
  /Bari|Chori|Bina customer|Khud report|Apne hi|kam nikle|Had \(/.test(f) ? 'rose' : /waqt ke baad|Wajah nahi|purana|baad cancel|Naya device|Nakam|Gum/.test(f) ? 'amber' : 'slate';

function Row({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <div className="text-[0.875rem] text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export function EventDrawer({ e, fmt, onStaff, onClose }: {
  e: AuditEvent;
  fmt: { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean };
  /** Narrow the whole report to this person. */
  onStaff: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const t = TYPE_META[e.type];
  const link = eventLink(e);
  const value = eventValue(e, fmt);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={e.title}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 gap-3">
            <TypeIcon type={e.type} />
            <div className="min-w-0">
              <p className="text-[0.75rem] font-semibold" style={{ color: t.color }}>{t.label}</p>
              <h2 className="text-[1rem] font-semibold text-slate-900">{e.title}</h2>
            </div>
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <div>
              <SeverityPill s={e.severity} />
              <p className="mt-1 text-[0.75rem] text-slate-500">{SEVERITY_META[e.severity].hint}</p>
            </div>
            {value !== '—' && (
              <div className="text-right">
                <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">{t.money === 'cost' ? 'Nuqsan (lagat)' : e.type === 'drawer' ? 'Farq' : 'Raqam'}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
              </div>
            )}
          </div>

          {e.flags.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-500" />Kyun nazar me aaya</h3>
              <ul className="space-y-1.5">
                {e.flags.map((f) => {
                  const tone = flagTone(f);
                  return (
                    <li key={f} className="flex items-center gap-2 text-[0.875rem] text-slate-700">
                      <span className={tone === 'rose' ? 'h-2 w-2 rounded-full bg-rose-500' : tone === 'amber' ? 'h-2 w-2 rounded-full bg-amber-500' : 'h-2 w-2 rounded-full bg-slate-300'} />{f}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {e.detail && (
            <section className="rounded-xl bg-white p-3 text-[0.875rem] text-slate-700 ring-1 ring-slate-200">
              <p className="mb-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">Tafseel / wajah</p>
              {e.detail}
            </section>
          )}

          <section className="divide-y divide-slate-100">
            <Row icon={Clock} label="Kab" value={<>{whenFull(e.at)}{e.afterHours && <span className="ml-1.5 text-[0.75rem] font-medium text-amber-700">· dukaan ke waqt ke baad</span>}</>} />
            <Row icon={UserRound} label="Kis ne" value={e.userName ?? 'Pata nahi'} />
            {e.shopName && <Row icon={Store} label="Branch" value={e.shopName} />}
          </section>

          <p className="rounded-xl bg-sky-50 p-3 text-[0.8125rem] leading-relaxed text-sky-900 ring-1 ring-sky-100">{t.hint}</p>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-3">
          {e.userId && <Button variant="secondary" onClick={() => { onStaff(e.userId!); onClose(); }}><UserRound className="h-4 w-4" />Is bande ke sab kaam</Button>}
          {link && <Link to={link.to} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg hover:bg-brand-700">{link.label}<ArrowUpRight className="h-4 w-4" /></Link>}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
