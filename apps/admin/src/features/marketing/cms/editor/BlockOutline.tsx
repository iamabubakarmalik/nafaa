/**
 * Left column: the block outline (drag to reorder, duplicate, hide, delete)
 * and the add-block palette grouped by purpose, limited to the blocks the
 * entry type allows.
 */
import { useMemo, useState } from 'react';
import { Copy, Eye, EyeOff, GripVertical, Plus, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { BlockType, CmsEntryType, DraftBlock } from '../contract/cms-contract';
import { BLOCK_GROUPS, BLOCK_META, blockSummary } from '../blocks/registry';
import { Modal } from '../fields/ui';

export function BlockOutline({
  blocks,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onToggleHidden,
  onDelete,
  onAdd,
  allowed,
  problemIds,
  entryType,
}: {
  blocks: DraftBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (type: BlockType, at: number) => void;
  allowed: readonly BlockType[];
  /** Blocks with contract errors or API issues. */
  problemIds: Set<string>;
  entryType: CmsEntryType;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [paletteAt, setPaletteAt] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Blocks ({blocks.length})</p>
        <button type="button" onClick={() => setPaletteAt(blocks.length)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
          <Plus className="h-3.5 w-3.5" /> Block
        </button>
      </div>
      <ol className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {blocks.map((b, i) => {
          const meta = BLOCK_META[b.type as BlockType];
          const Icon = meta?.icon;
          const active = b.id === selectedId;
          const notAllowed = !allowed.includes(b.type as BlockType);
          return (
            <li
              key={b.id}
              draggable
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setDragOver(i);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null && dragFrom !== i) onMove(dragFrom, i);
                setDragFrom(null);
                setDragOver(null);
              }}
              className={cn('group relative', dragOver === i && dragFrom !== null && dragFrom !== i && (dragFrom < i ? 'after:absolute after:-bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:rounded after:bg-emerald-500' : 'before:absolute before:-top-0.5 before:left-2 before:right-2 before:h-0.5 before:rounded before:bg-emerald-500'))}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(b.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelect(b.id);
                  if (e.altKey && e.key === 'ArrowUp' && i > 0) onMove(i, i - 1);
                  if (e.altKey && e.key === 'ArrowDown' && i < blocks.length - 1) onMove(i, i + 1);
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 transition',
                  active ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-neutral-100',
                  b.hidden && 'opacity-50',
                  dragFrom === i && 'opacity-40',
                )}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-neutral-300 group-hover:text-neutral-400" />
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md', active ? 'bg-white text-emerald-700 shadow-sm' : 'bg-neutral-100 text-neutral-500')}>
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn('truncate text-[13px] font-medium', active ? 'text-emerald-900' : 'text-neutral-800')}>{meta?.label ?? b.type}</span>
                    {(problemIds.has(b.id) || notAllowed) && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', notAllowed ? 'bg-rose-500' : 'bg-amber-500')} title={notAllowed ? 'Allowed nahi' : 'Kuch cheezein baqi'} />}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-500">{blockSummary(b)}</span>
                </span>
                <span className="hidden shrink-0 items-center group-hover:flex">
                  <button type="button" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(b.id); }} className="rounded p-1 text-neutral-400 hover:bg-white hover:text-neutral-700">
                    <Copy className="h-3 w-3" />
                  </button>
                  <button type="button" title={b.hidden ? 'Dikhayein' : 'Chhupayein'} onClick={(e) => { e.stopPropagation(); onToggleHidden(b.id); }} className="rounded p-1 text-neutral-400 hover:bg-white hover:text-neutral-700">
                    {b.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  <button type="button" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(b.id); }} className="rounded p-1 text-neutral-400 hover:bg-white hover:text-rose-600">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </div>
              <button
                type="button"
                title="Yahan block daalein"
                onClick={() => setPaletteAt(i + 1)}
                className="absolute -bottom-2 left-1/2 z-10 hidden h-4 w-4 -translate-x-1/2 place-items-center rounded-full bg-emerald-600 text-white shadow group-hover:grid"
              >
                <Plus className="h-3 w-3" />
              </button>
            </li>
          );
        })}
        {blocks.length === 0 && (
          <li>
            <button type="button" onClick={() => setPaletteAt(0)} className="w-full rounded-xl border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-500 hover:border-emerald-400 hover:text-emerald-700">
              Pehla block shamil karein
            </button>
          </li>
        )}
      </ol>
      <BlockPalette
        open={paletteAt !== null}
        onClose={() => setPaletteAt(null)}
        allowed={allowed}
        entryType={entryType}
        blocks={blocks}
        onPick={(t) => {
          onAdd(t, paletteAt ?? blocks.length);
          setPaletteAt(null);
        }}
      />
    </div>
  );
}

function BlockPalette({ open, onClose, onPick, allowed, blocks, entryType }: { open: boolean; onClose: () => void; onPick: (t: BlockType) => void; allowed: readonly BlockType[]; blocks: DraftBlock[]; entryType: CmsEntryType }) {
  const [q, setQ] = useState('');
  const has = (t: BlockType) => blocks.some((b) => b.type === t && !b.hidden);
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    return BLOCK_GROUPS.map((g) => ({
      ...g,
      items: allowed.filter((t) => BLOCK_META[t].group === g.key && (!s || BLOCK_META[t].label.toLowerCase().includes(s) || BLOCK_META[t].help.toLowerCase().includes(s))),
    })).filter((g) => g.items.length);
  }, [allowed, q]);
  return (
    <Modal open={open} onClose={onClose} title="Block shamil karein" description={`Sirf woh blocks jo is type (${entryType}) par allowed hain`} width="lg">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dhoondein: table, faq, diagram…" className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
      </div>
      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{g.label}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.items.map((t) => {
                const m = BLOCK_META[t];
                const single = (t === 'hero' || t === 'faq') && has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={single}
                    onClick={() => onPick(t)}
                    className="group flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-white group-hover:text-emerald-700">
                      <m.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-neutral-900">{m.label}</span>
                      <span className="block text-xs text-neutral-500">{single ? 'Sirf ek ho sakta hai, pehle se hai' : m.help}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
