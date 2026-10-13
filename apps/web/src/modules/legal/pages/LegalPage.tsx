/**
 * Terms of service and privacy policy with a contents list, print / PDF and
 * a link to support.
 *
 * Keys: 1 terms · 2 privacy.
 */

import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, FileText, HelpCircle, Lock, Shield } from 'lucide-react';
import { Kbd, PageHero, PageShell, ViewTabs, heroButton } from '@/design-system/components';
import { PrintButton, type PrintDoc } from '@core/print';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '../content';

type Tab = 'terms' | 'privacy';
const TITLE: Record<Tab, string> = { terms: 'Istemaal ki shartein (Terms)', privacy: 'Privacy policy' };

export default function LegalPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'privacy' ? 'privacy' : 'terms';
  const setTab = (t: Tab) => setParams((x) => { const n = new URLSearchParams(x); if (t === 'terms') n.delete('tab'); else n.set('tab', t); return n; }, { replace: true });
  const sections = tab === 'terms' ? TERMS : PRIVACY;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('terms');
      if (e.key === '2') setTab('privacy');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const doc = (): PrintDoc => ({
    title: TITLE[tab],
    subtitle: 'Nafaa POS',
    meta: [['Aakhri tabdeeli', LEGAL_UPDATED]],
    sections: sections.map((s) => ({ kind: 'text' as const, title: s.title, text: s.content })),
  });

  return (
    <PageShell>
      <PageHero
        title="Terms aur privacy"
        chip={<><CalendarDays />Aakhri tabdeeli: {LEGAL_UPDATED}</>}
        meta="Nafaa istemaal karne ki shartein aur aap ke data ki hifazat"
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={doc} label="Print" /></span>
          <Link to="/help" className={heroButton}><HelpCircle className="h-4 w-4" /> Madad</Link>
        </>}
      />

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> / <Kbd>2</Kbd> se badlein</>}
        tabs={[{ id: 'terms', label: 'Terms', icon: FileText }, { id: 'privacy', label: 'Privacy', icon: Shield }]} />

      {tab === 'privacy' && (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-[0.8125rem] font-medium text-emerald-900 ring-1 ring-emerald-100">
          <Lock className="h-4 w-4 shrink-0" /> Aap ka karobari data aap ka hai — kabhi bhi Backup page se poora download kar sakte hain.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Fehrist" className="h-fit rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 lg:sticky lg:top-4">
          <p className="px-2 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">Fehrist</p>
          <ol className="space-y-0.5">
            {sections.map((s, i) => (
              <li key={s.title}>
                <a href={`#legal-${tab}-${i}`} className="block truncate rounded-lg px-2 py-1.5 text-[0.8125rem] text-slate-700 hover:bg-slate-50 hover:text-slate-900">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="space-y-3">
          {sections.map((s, i) => (
            <section key={s.title} id={`legal-${tab}-${i}`} className="scroll-mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-2 whitespace-pre-line text-[0.875rem] leading-relaxed text-slate-600">{s.content}</p>
            </section>
          ))}
        </article>
      </div>
    </PageShell>
  );
}
