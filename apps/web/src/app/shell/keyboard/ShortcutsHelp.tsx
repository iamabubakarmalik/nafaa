/**
 * Keyboard shortcuts overlay, opened with "?" from any page or from the
 * command palette. Shows the app-wide keys plus the keys of the current page,
 * read from the page itself: buttons whose title ends in a key in brackets,
 * e.g. title="Bill scan (B)", or that carry aria-keyshortcuts.
 */

import { useMemo, type ReactNode } from 'react';
import { create } from 'zustand';
import { Kbd, Modal } from '@/design-system/components';
import { isVisible } from '@/design-system/keyboard/keys';
import { GO_TO } from './useGlobalKeys';
import { t } from '@core/i18n';

export const useShortcutsHelp = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD = isMac ? '⌘' : t('Ctrl');
const ALT = isMac ? '⌥' : t('Alt');

type Row = [keys: ReactNode, label: string];

const KEY_IN_TITLE = /\(((?:Ctrl|Alt|Shift|⌘|⌥)\s?\+\s?\S{1,6}|F\d{1,2}|Esc|Enter|[A-Z0-9/?+\-=.])\)\s*$/i;

/** Keys the current page shows on its buttons. */
function pageShortcuts(): Row[] {
  const root = document.getElementById('main-content');
  if (!root) return [];
  const rows = new Map<string, string>();
  root.querySelectorAll<HTMLElement>('[title],[aria-keyshortcuts]').forEach((el) => {
    if (!isVisible(el)) return;
    const aria = el.getAttribute('aria-keyshortcuts');
    const title = el.getAttribute('title') ?? '';
    const m = title.match(KEY_IN_TITLE);
    const key = aria || m?.[1];
    if (!key || rows.has(key.toUpperCase())) return;
    const label = (m ? title.replace(KEY_IN_TITLE, '') : title || el.getAttribute('aria-label') || el.textContent || '').trim();
    if (label) rows.set(key.toUpperCase(), label);
  });
  return [...rows].map(([k, label]) => [<Kbd key={k}>{k}</Kbd>, label]);
}

const keys = (...k: string[]) => <span className="inline-flex flex-wrap items-center gap-1">{k.map((x) => <Kbd key={x}>{x}</Kbd>)}</span>;

export function ShortcutsHelp() {
  const { open, setOpen } = useShortcutsHelp();
  // Read when opened so it matches the page on screen.
  const page = useMemo(() => (open ? pageShortcuts() : []), [open]);
  if (!open) return null;

  const sections: Array<{ title: string; rows: Row[] }> = [
    ...(page.length ? [{ title: t('Is page par'), rows: page }] : []),
    {
      title: t('Har jagah'),
      rows: [
        [keys(MOD, 'K'), t('Search aur commands (page, product, customer, bill)')],
        [keys(ALT, 'N'), t('Create menu (naya bill, product, customer…)')],
        [keys('/'), t('Page ka search box')],
        [keys('?'), t('Yeh shortcuts')],
        [keys(MOD, 'B'), t('Sidebar chhota / bara')],
        [keys(t('Tab')), t('Agli cheez par (Shift+Tab: pichli)')],
      ],
    },
    {
      title: t('Seedha jayein: G phir…'),
      rows: GO_TO.map((g) => [keys('G', g.key.toUpperCase()), g.label] as Row),
    },
    {
      title: t('List aur table'),
      rows: [
        [keys('↑', '↓'), t('Agli / pichli line (search se ↓ list mein)')],
        [keys(t('Enter')), t('Line kholein')],
        [keys(t('Space')), t('Line chunein (jahan select hota hai)')],
        [keys(t('Home'), t('End')), t('Pehli / aakhri line')],
        [keys('PgUp', 'PgDn'), t('Pichla / agla page')],
        [keys(t('Esc')), t('Search saaf karein, phir bahar')],
      ],
    },
    {
      title: t('Form aur dialog'),
      rows: [
        [keys(MOD, 'S'), t('Save karein')],
        [keys(MOD, t('Enter')), t('Dialog ka form bhejein')],
        [keys(t('Enter')), t('Agla khana (jaldi wale form) / ek khane wala dialog bhejein')],
        [keys(t('Esc')), t('Band karein ya wapas jayein')],
        [keys('↑', '↓'), t('Menu aur filter ke andar chalein, Enter se chunein')],
      ],
    },
  ];

  return (
    <Modal open onClose={() => setOpen(false)} size="lg" title={t('Keyboard shortcuts')} description={t('Mouse ke bagair poori app chalayein')}>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <h3 className="mb-2 text-[0.8125rem] font-semibold text-slate-900">{s.title}</h3>
            <dl className="space-y-1.5">
              {s.rows.map(([k, label], i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-[0.8125rem]">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="shrink-0">{k}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
