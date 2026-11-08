/**
 * Step-by-step guide for a page: an optional flow diagram, numbered cards,
 * quick tips and keyboard shortcuts. `usePageGuide` adds the "G" shortcut.
 *
 *   const guide = usePageGuide();
 *   <button onClick={guide.open}>…</button>
 *   {guide.isOpen && <PageGuide title=… steps=… onClose={guide.close} />}
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowRight, Lightbulb } from 'lucide-react';
import { Kbd, Modal } from '@/design-system/components';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { t as tr } from '@core/i18n';

export interface GuideStep {
  icon: LucideIcon;
  color: string;
  title: string;
  text: string;
}

/** One box in the guide's flow diagram. */
export interface GuideFlowNode {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  color?: string;
}

export function PageGuide({ title, description, flow, flowTitle, steps, tips, shortcuts, footer, onClose }: {
  title: string;
  description?: string;
  /** Diagram of how the work moves on this page, left to right. */
  flow?: GuideFlowNode[];
  flowTitle?: string;
  steps: GuideStep[];
  tips?: string[];
  shortcuts?: Array<[string, string]>;
  footer?: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="lg" title={title} description={description ?? tr('{{count}} cheezein, bas itna yaad rakhein', { count: steps.length })}>
      {!!flow?.length && <GuideFlow nodes={flow} title={flowTitle} />}
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${st.color}17`, color: st.color }}>
              <st.icon className="h-5 w-5" />
              <span className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-semibold text-slate-900">{st.title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{st.text}</p>
            </div>
          </li>
        ))}
      </ol>
      {!!tips?.length && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-100">
          <p className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900"><Lightbulb className="h-4 w-4" /> {' '}{tr('Kaam ki baatein')}</p>
          <ul className="space-y-1 text-[0.8125rem] leading-relaxed text-amber-900">
            {tips.map((t) => <li key={t} className="flex gap-2"><span aria-hidden>•</span><span>{t}</span></li>)}
          </ul>
        </div>
      )}
      {(!!shortcuts?.length || footer) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          {!!shortcuts?.length && (
            <div className="flex flex-wrap items-center gap-3 text-[0.75rem] text-slate-600">
              <span className="font-semibold text-slate-900">{tr('Jaldi ke liye:')}</span>
              {shortcuts.map(([k, label]) => <span key={k} className="inline-flex items-center gap-1"><Kbd>{k}</Kbd> {label}</span>)}
            </div>
          )}
          {footer}
        </div>
      )}
    </Modal>
  );
}

/** The flow diagram: boxes joined by arrows, a row on wide screens and a column on phones. */
export function GuideFlow({ nodes, title }: { nodes: GuideFlowNode[]; title?: string }) {
  return (
    <figure className="mb-4 rounded-2xl bg-white p-3.5 ring-1 ring-slate-200">
      <figcaption className="mb-2.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{title ?? tr('Kaam kaise chalta hai')}</figcaption>
      <ol className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
        {nodes.map((n, i) => {
          const color = n.color ?? '#0ea5e9';
          const Icon = n.icon;
          return (
            <li key={`${n.label}-${i}`} className="flex flex-col items-center gap-1.5 sm:flex-row">
              <div className="flex min-w-[7.5rem] items-center gap-2 rounded-xl px-3 py-2 ring-1" style={{ backgroundColor: `${color}12`, boxShadow: `inset 0 0 0 1px ${color}33` }}>
                {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color }} />}
                <div className="min-w-0">
                  <div className="text-[0.8125rem] font-semibold leading-tight text-slate-900">{n.label}</div>
                  {n.hint && <div className="text-[0.6875rem] leading-tight text-slate-500">{n.hint}</div>}
                </div>
              </div>
              {i < nodes.length - 1 && (
                <>
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block rtl:rotate-180" aria-hidden />
                  <ArrowDown className="h-4 w-4 shrink-0 text-slate-400 sm:hidden" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

/** Open state plus the "G" shortcut. */
export function usePageGuide() {
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { isOpen, open: () => setOpen(true), close: () => setOpen(false) };
}
