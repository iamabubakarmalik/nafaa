/**
 * Editing one section in the theme editor: its settings form and its
 * blocks (slides, questions, badges...). Blocks can be added, dragged into
 * order, hidden, removed and opened for their own settings.
 */

import { ArrowLeft, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Menu, MenuItem } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { Block, Section, SectionSchema } from '../../api/stores.api';
import { newBlock, sectionIcon, sectionLabel } from '../../lib/sections';
import { DragList } from '../DragList';
import { SettingsForm } from '../SettingsForm';

type Change = (next: Section, tag?: string) => void;

export function SectionPanel({ storeId, section, def, urdu, onChange, onBack, openBlockId, onOpenBlock }: {
  storeId: string;
  section: Section;
  def: SectionSchema | undefined;
  urdu: boolean;
  onChange: Change;
  onBack: () => void;
  openBlockId: string | null;
  onOpenBlock: (id: string | null) => void;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const Icon = sectionIcon(section.type);
  const blocks = section.blocks ?? [];
  const block = openBlockId ? blocks.find((b) => b.id === openBlockId) : undefined;
  const blockDef = block ? def?.blocks.find((b) => b.type === block.type) : undefined;
  const setBlocks = (next: Block[], tag?: string) => onChange({ ...section, blocks: next }, tag);
  const maxBlocks = def?.maxBlocks ?? 30;

  if (block) {
    return (
      <div>
        <Back onClick={() => onOpenBlock(null)} label={sectionLabel(section.type, def)} />
        <h3 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">{blockDef ? t(blockDef.label) : block.type}</h3>
        <SettingsForm storeId={storeId} fields={blockDef?.settings ?? []} values={block.settings ?? {}} urdu={urdu}
          onChange={(settings, tag) => setBlocks(blocks.map((b) => (b.id === block.id ? { ...b, settings } : b)), tag && `${block.id}:${tag}`)} />
        <button type="button" onClick={() => { setBlocks(blocks.filter((b) => b.id !== block.id)); onOpenBlock(null); }}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] font-medium text-rose-600 hover:bg-rose-50">
          <Trash2 className="h-4 w-4" />{t('Ye hissa hatayein')}
        </button>
      </div>
    );
  }

  const canAdd = !!def?.blocks.length && blocks.length < maxBlocks;
  const countOf = (type: string) => blocks.filter((b) => b.type === type).length;

  return (
    <div>
      <Back onClick={onBack} label={t('Sab hisse')} />
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>
        <h3 className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-slate-900">{sectionLabel(section.type, def)}</h3>
      </div>

      {!def && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-[0.8125rem] text-amber-800">{t('Ye hissa is design me nahi pehchana gaya. Ise waise hi rakha gaya hai.')}</p>}

      <SettingsForm storeId={storeId} fields={def?.settings ?? []} values={section.settings ?? {}} urdu={urdu}
        onChange={(settings, tag) => onChange({ ...section, settings }, tag && `${section.id}:${tag}`)} />

      {!!def?.blocks.length && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wider text-slate-500">{t('Andar ke hisse')}</p>
          <DragList items={blocks} getKey={(b) => b.id} onReorder={(next) => setBlocks(next)}
            renderItem={(b) => {
              const bd = def.blocks.find((x) => x.type === b.type);
              const title = String((b.settings?.heading ?? b.settings?.title ?? b.settings?.question ?? b.settings?.name ?? '') || '') || (bd ? t(bd.label) : b.type);
              return (
                <div className={cn('group flex items-center gap-2 rounded-xl px-2 py-1.5 text-[0.8125rem] text-slate-700 hover:bg-slate-100', b.hidden && 'opacity-60')}>
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" aria-label={t('Khench kar jagah badlein')} />
                  <button type="button" onClick={() => onOpenBlock(b.id)} className="min-w-0 flex-1 truncate text-start font-medium">{typeof title === 'string' ? title : ''}</button>
                  <button type="button" onClick={() => setBlocks(blocks.map((x) => (x.id === b.id ? { ...x, hidden: !x.hidden } : x)))}
                    className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700" aria-label={b.hidden ? t('Dikhayein') : t('Chhupayein')}>
                    {b.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            }} />
          {canAdd && (
            <>
              <button ref={addRef} type="button" onClick={() => setAddOpen((o) => !o)}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
                <Plus className="h-4 w-4" />{t('Andar hissa add karein')}
              </button>
              <Menu open={addOpen} onClose={() => setAddOpen(false)} anchorRef={addRef} align="start" label={t('Andar hissa add karein')}>
                {def.blocks.map((bd) => {
                  const full = bd.limit != null && countOf(bd.type) >= bd.limit;
                  return (
                    <MenuItem key={bd.type} disabled={full} onClick={() => { const nb = newBlock(def, bd.type); setBlocks([...blocks, nb]); onOpenBlock(nb.id); setAddOpen(false); }}>
                      {t(bd.label)}
                    </MenuItem>
                  );
                })}
              </Menu>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[0.8125rem] font-medium text-slate-600 hover:bg-slate-100">
      <ArrowLeft className="h-4 w-4 rtl-flip" />{label}
    </button>
  );
}
