/**
 * Toolbar above a sheet grid: undo / redo, set one column for the selected
 * rows, find and replace, add and delete rows.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Redo2, Replace, Trash2, Undo2, Wand2 } from 'lucide-react';
import { Button, Checkbox, Input, Modal, Select } from '@/design-system/components';
import type { GridColumn } from './SheetGrid';
import type { CellPatch, GridRow } from './useSheetRows';

interface Props {
  columns: GridColumn[];
  /** Rows the tools work on: the selected rows, else every row in view. */
  rows: GridRow[];
  selected: Set<number>;
  onEdit: (patches: CellPatch[]) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddRow?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function SheetTools({ columns, rows, selected, onEdit, canUndo, canRedo, onUndo, onRedo, onAddRow, onDelete, extra }: Props) {
  const editable = columns.filter((c) => !c.lock || rows.some((r) => !c.lock!(r.id)));
  const [setOpen, setSetOpen] = useState(false);
  const [setKey, setSetKey] = useState('');
  const [setValue, setSetValue] = useState('');
  const [findOpen, setFindOpen] = useState(false);
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [findKey, setFindKey] = useState('all');
  const [whole, setWhole] = useState(false);

  const targets = selected.size ? rows.filter((r) => selected.has(r.id)) : rows;
  const targetText = selected.size ? `${selected.size} chuni hui lines` : `sab ${rows.length} lines`;

  const applySet = () => {
    const col = columns.find((c) => c.key === setKey);
    if (!col) return;
    const patches = targets.filter((r) => !col.lock?.(r.id)).map((r) => ({ id: r.id, key: col.key, value: setValue.trim() }));
    onEdit(patches);
    toast.success(`${patches.length} lines me ${col.label} = "${setValue.trim() || 'khaali'}"`);
    setSetOpen(false);
  };

  const applyReplace = () => {
    if (!find) return;
    const cols = findKey === 'all' ? editable : editable.filter((c) => c.key === findKey);
    const re = new RegExp(whole ? `^${escape(find)}$` : escape(find), 'gi');
    const patches: CellPatch[] = [];
    for (const r of targets) {
      for (const c of cols) {
        if (c.lock?.(r.id)) continue;
        const v = r.cells[c.key] ?? '';
        if (!v && !(whole && find === '')) continue;
        const next = v.replace(re, replace);
        if (next !== v) patches.push({ id: r.id, key: c.key, value: next });
      }
    }
    if (!patches.length) { toast.info(`"${find}" kahin nahi mila`); return; }
    onEdit(patches);
    toast.success(`${patches.length} cells badle — Ctrl+Z se wapas`);
    setFindOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" leftIcon={<Undo2 className="h-4 w-4" />} disabled={!canUndo} onClick={onUndo} title="Wapas (Ctrl+Z)">Wapas</Button>
      <Button size="sm" variant="secondary" leftIcon={<Redo2 className="h-4 w-4" />} disabled={!canRedo} onClick={onRedo} title="Dobara (Ctrl+Y)">Dobara</Button>
      <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
      <Button size="sm" variant="secondary" leftIcon={<Wand2 className="h-4 w-4" />} onClick={() => { setSetKey(editable[0]?.key ?? ''); setSetOpen(true); }}>
        Column ek saath {selected.size ? `(${selected.size})` : ''}
      </Button>
      <Button size="sm" variant="secondary" leftIcon={<Replace className="h-4 w-4" />} onClick={() => setFindOpen(true)}>Dhoondein / badlein</Button>
      {onAddRow && <Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={onAddRow}>Line jodein</Button>}
      {onDelete && selected.size > 0 && (
        <Button size="sm" variant="secondary" leftIcon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>{selected.size} lines hatayein</Button>
      )}
      {extra}

      <Modal open={setOpen} onClose={() => setSetOpen(false)} title="Ek column ek saath badlein" description={`Ye value ${targetText} me lagegi.`}
        footer={<>
          <Button variant="secondary" onClick={() => setSetOpen(false)}>Wapas</Button>
          <Button onClick={applySet} disabled={!setKey}>Lagayein</Button>
        </>}>
        <div className="space-y-3">
          <Select label="Column" value={setKey} onChange={(e) => setSetKey(e.target.value)} options={editable.map((c) => ({ value: c.key, label: c.label }))} />
          <Input label="Nayi value" value={setValue} onChange={(e) => setSetValue(e.target.value)} placeholder="jaise Rice, kg, 0"
            list={columns.find((c) => c.key === setKey)?.options?.length ? `sheet-opts-${setKey}` : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter') applySet(); }}
            hint="Khaali chhorein to cell khaali ho jayega" />
        </div>
      </Modal>

      <Modal open={findOpen} onClose={() => setFindOpen(false)} title="Dhoondein aur badlein" description={`${targetText} me dhoondta hai.`}
        footer={<>
          <Button variant="secondary" onClick={() => setFindOpen(false)}>Wapas</Button>
          <Button onClick={applyReplace} disabled={!find}>Sab badlein</Button>
        </>}>
        <div className="space-y-3">
          <Input label="Dhoondein" value={find} onChange={(e) => setFind(e.target.value)} placeholder="jaise Pcs" />
          <Input label="Is se badlein" value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="jaise pcs" onKeyDown={(e) => { if (e.key === 'Enter') applyReplace(); }} />
          <Select label="Kis column me" value={findKey} onChange={(e) => setFindKey(e.target.value)}
            options={[{ value: 'all', label: 'Sab columns' }, ...editable.map((c) => ({ value: c.key, label: c.label }))]} />
          <Checkbox label="Sirf poora cell milaayein" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
        </div>
      </Modal>
    </div>
  );
}
