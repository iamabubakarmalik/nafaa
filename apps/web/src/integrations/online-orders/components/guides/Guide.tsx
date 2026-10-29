/**
 * Step-by-step setup guides for channels, couriers and payment gateways.
 * A guide is plain data (numbered steps, where to click on the partner's
 * side, how to test, common problems with their fix); GuideCard shows it in
 * a page and GuideButton opens it in a dialog.
 */

import { useState, type ReactNode } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, ExternalLink, FlaskConical, LifeBuoy } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';

export interface GuideStep {
  title: ReactNode;
  /** Where to click on the partner's side, e.g. ['Shopify admin', 'Settings', 'Apps']. */
  path?: string[];
  body?: ReactNode;
  /** Shows the step as done (live status from the channel). */
  done?: boolean;
}

export interface GuideFix { q: string; a: ReactNode }

export interface GuideData {
  brand: BrandName;
  title: string;
  intro?: ReactNode;
  steps: GuideStep[];
  /** How to check it works. */
  test?: ReactNode[];
  errors?: GuideFix[];
  links?: Array<{ label: string; href: string }>;
}

function Path({ parts }: { parts: string[] }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1 text-[0.75rem] font-medium text-slate-600">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5">{p}</span>
        </span>
      ))}
    </span>
  );
}

export function GuideSteps({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold',
            s.done ? 'bg-success-100 text-success-700' : 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100')}>
            {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className={cn('text-[0.875rem] font-semibold', s.done ? 'text-slate-500' : 'text-slate-900')}>{s.title}</p>
            {s.path && <Path parts={s.path} />}
            {s.body && <div className="mt-1.5 space-y-2 text-[0.8125rem] leading-relaxed text-slate-600">{s.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function GuideFixes({ errors }: { errors: GuideFix[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {errors.map((x) => (
        <li key={x.q}>
          <details className="group py-2.5">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.84375rem] font-medium text-slate-900">
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" /> {x.q}
            </summary>
            <div className="mt-1.5 pl-6 text-[0.8125rem] leading-relaxed text-slate-600">{x.a}</div>
          </details>
        </li>
      ))}
    </ul>
  );
}

/** The full guide: steps, then "how to test" and "common problems". */
export function GuideBody({ guide, children }: { guide: GuideData; children?: ReactNode }) {
  return (
    <div className="space-y-5">
      {guide.intro && <p className="text-[0.8125rem] leading-relaxed text-slate-600">{guide.intro}</p>}
      <GuideSteps steps={guide.steps} />
      {children}
      {guide.test && guide.test.length > 0 && (
        <div className="rounded-2xl bg-success-50 p-3.5 ring-1 ring-inset ring-success-200">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-success-900"><FlaskConical className="h-4 w-4" /> Test kaise karein</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.8125rem] text-success-900">
            {guide.test.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}
      {guide.errors && guide.errors.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-900"><LifeBuoy className="h-4 w-4 text-slate-500" /> Aam masle aur hal</p>
          <div className="mt-1"><GuideFixes errors={guide.errors} /></div>
        </div>
      )}
      {guide.links && guide.links.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
          {guide.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
              {l.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** Guide as a page section, with the partner's logo in the header. */
export function GuideCard({ guide, actions, children, className }: { guide: GuideData; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5', className)}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <BrandLogo name={guide.brand} size={36} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">{guide.title}</h2>
          <p className="text-[0.75rem] text-slate-500">{guide.steps.length} qadam · har qadam par kahan click karna hai</p>
        </div>
        {actions}
      </header>
      <GuideBody guide={guide}>{children}</GuideBody>
    </section>
  );
}

/** "Guide" button that opens the guide in a dialog (bottom sheet on phones). */
export function GuideButton({ guide, label = 'Guide', variant = 'secondary', size = 'sm', className }: {
  guide: GuideData; label?: string; variant?: 'secondary' | 'ghost' | 'outline'; size?: 'xs' | 'sm'; className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)} leftIcon={<BookOpen className="h-4 w-4" />}>{label}</Button>
      <Modal open={open} onClose={() => setOpen(false)} size="lg"
        title={<span className="flex items-center gap-2.5"><BrandLogo name={guide.brand} size={28} />{guide.title}</span>}>
        <GuideBody guide={guide} />
      </Modal>
    </>
  );
}
