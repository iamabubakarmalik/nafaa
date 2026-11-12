/**
 * Left column of the theme editor: the page's sections in order, with the
 * shared header (announcement + header) above and the footer below. Rows
 * can be dragged, hidden, removed or opened for editing.
 */

import { ChevronRight, Eye, EyeOff, GripVertical, Lock, Palette, Plus, Trash2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { GlobalKey, Section, ThemeSchema } from '../../api/stores.api';
import { globalLabel, sectionIcon, sectionLabel, sectionSummary } from '../../lib/sections';
import { DragList } from '../DragList';

export type Selection =
  | { kind: 'global'; key: GlobalKey }
  | { kind: 'section'; id: string }
  | { kind: 'block'; sectionRef: { kind: 'global'; key: GlobalKey } | { kind: 'section'; id: string }; blockId: string }
  | { kind: 'theme' };

const row = 'group flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-[0.8125rem] transition';

export function SectionTree({ schema, global, sections, fixed, selectedId, onSelect, onReorder, onToggle, onToggleGlobal, onRemove, onAdd }: {
  schema: ThemeSchema;
  global: Record<GlobalKey, Section>;
  sections: Section[];
  /** Section types the template cannot lose (main product, cart...). */
  fixed: string[];
  selectedId: string | null;
  onSelect: (s: Selection) => void;
  onReorder: (next: Section[]) => void;
  onToggle: (id: string) => void;
  onToggleGlobal: (key: GlobalKey) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const schemaOf = (type: string) => schema.sections.find((x) => x.type === type);

  const GlobalRow = ({ k }: { k: GlobalKey }) => {
    const sec = global[k];
    const Icon = sectionIcon(sec?.type ?? (k === 'announcement' ? 'announcement_bar' : k));
    const active = selectedId === `global:${k}`;
    return (
      <div className={cn(row, active ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'text-slate-700 hover:bg-slate-100', sec?.hidden && 'opacity-60')}>
        <span className="w-4" />
        <button type="button" onClick={() => onSelect({ kind: 'global', key: k })} className="flex min-w-0 flex-1 items-center gap-2 text-start">
          <Icon className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate font-medium">{globalLabel(k)}</span>
        </button>
        {k === 'announcement' ? (
          <button type="button" onClick={() => onToggleGlobal(k)} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
            title={sec?.hidden ? t('Dikhayein') : t('Chhupayein')} aria-label={sec?.hidden ? t('Dikhayein') : t('Chhupayein')}>
            {sec?.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        ) : <Lock className="h-3.5 w-3.5 text-slate-300" aria-label={t('Har page par')} />}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 px-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{t('Har page par (upar)')}</p>
        <GlobalRow k="announcement" />
        <GlobalRow k="header" />
      </div>

      <div>
        <p className="mb-1 px-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{t('Is page ke hisse')}</p>
        {sections.length === 0 && <p className="px-2 py-2 text-[0.8125rem] text-slate-500">{t('Abhi koi hissa nahi. Neeche se add karein.')}</p>}
        <DragList items={sections} getKey={(s) => s.id} onReorder={onReorder}
          renderItem={(sec) => {
            const def = schemaOf(sec.type);
            const Icon = sectionIcon(sec.type);
            const active = selectedId === sec.id;
            const locked = fixed.includes(sec.type);
            const sum = sectionSummary(sec);
            return (
              <div className={cn(row, active ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'text-slate-700 hover:bg-slate-100', sec.hidden && 'opacity-60')}>
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 group-hover:text-slate-500" aria-label={t('Khench kar jagah badlein')} />
                <button type="button" onClick={() => onSelect({ kind: 'section', id: sec.id })} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{sectionLabel(sec.type, def)}</span>
                    {sum && <span className="block truncate text-[0.6875rem] text-slate-500">{sum}</span>}
                  </span>
                </button>
                <span className="flex items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button type="button" onClick={() => onToggle(sec.id)} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                    title={sec.hidden ? t('Dikhayein') : t('Chhupayein')} aria-label={sec.hidden ? t('Dikhayein') : t('Chhupayein')}>
                    {sec.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  {!locked && (
                    <button type="button" onClick={() => onRemove(sec.id)} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                      title={t('Hatayein')} aria-label={t('Hatayein')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
                {sec.hidden && <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:hidden" />}
              </div>
            );
          }} />
        <button type="button" onClick={onAdd}
          className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
          <Plus className="h-4 w-4" />{t('Hissa add karein')}
        </button>
      </div>

      <div>
        <p className="mb-1 px-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{t('Har page par (neeche)')}</p>
        <GlobalRow k="footer" />
      </div>

      <button type="button" onClick={() => onSelect({ kind: 'theme' })}
        className={cn(row, 'border-t border-slate-100 pt-3', selectedId === 'theme' ? 'text-brand-800' : 'text-slate-700 hover:bg-slate-100')}>
        <Palette className="h-4 w-4 text-slate-500" />
        <span className="flex-1 font-medium">{t('Rang, font aur design')}</span>
        <ChevronRight className="h-4 w-4 text-slate-400 rtl-flip" />
      </button>
    </div>
  );
}
