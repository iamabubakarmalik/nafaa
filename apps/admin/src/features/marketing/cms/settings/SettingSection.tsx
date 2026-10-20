/**
 * Shared frame for one settings key: validates the value with the contract
 * schema (SETTINGS_SCHEMAS[key]), saves with PUT /settings/:key and shows
 * the key's history.
 */
import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SETTINGS_SCHEMAS, type SettingKey } from '../contract/cms-contract';
import { errorMessage, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { Card, HistoryList, btn } from '../dashboard/shared/ui';
import { settingsApi } from './settings.api';

export function SettingSection({ settingKey, title, description, buildValue, onErrors, children, aside }: {
  settingKey: SettingKey;
  title: string;
  description?: ReactNode;
  /** Returns the value to save (before contract validation). */
  buildValue: () => unknown;
  onErrors: (errors: FieldErrors) => void;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [summary, setSummary] = useState<string[]>([]);

  const save = useMutation({
    mutationFn: (value: unknown) => settingsApi.put(settingKey, value),
    onSuccess: () => {
      toast.success('Settings save ho gayi, site update ho rahi hai');
      qc.invalidateQueries({ queryKey: ['cms-settings'] });
      qc.invalidateQueries({ queryKey: ['cms-history', 'SETTING'] });
      qc.invalidateQueries({ queryKey: ['cms-llms-preview'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onSave = () => {
    const parsed = SETTINGS_SCHEMAS[settingKey].safeParse(buildValue());
    if (!parsed.success) {
      const errs = zodFieldErrors(parsed.error);
      onErrors(errs);
      setSummary(Object.entries(errs).map(([k, v]) => (k === '_' ? v : `${k}: ${v}`)));
      toast.error('Kuch fields theek karein');
      return;
    }
    onErrors({});
    setSummary([]);
    save.mutate(parsed.data);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Card
        title={title}
        actions={
          <>
            <button className={btn.ghost} onClick={() => setShowHistory((v) => !v)}>{showHistory ? 'Form' : 'History'}</button>
            <button className={btn.primary} disabled={save.isPending} onClick={onSave}>{save.isPending ? 'Save ho raha hai…' : 'Save'}</button>
          </>
        }
      >
        {description && <p className="-mt-2 mb-4 text-sm text-neutral-500">{description}</p>}
        {summary.length > 0 && (
          <ul className="mb-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
        )}
        {showHistory ? <HistoryList subject="SETTING" subjectKey={`${settingKey}:en`} /> : <div className="space-y-4">{children}</div>}
      </Card>
      {aside && <div className="space-y-6">{aside}</div>}
    </div>
  );
}

/** One editable row list (add, remove, move) for arrays inside settings. */
export function RowList<T>({ rows, onChange, render, empty, addLabel, make }: {
  rows: T[];
  onChange: (rows: T[]) => void;
  render: (row: T, set: (patch: Partial<T>) => void, index: number) => ReactNode;
  empty?: string;
  addLabel: string;
  make: () => T;
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {!rows.length && empty && <p className="text-sm text-neutral-500">{empty}</p>}
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-neutral-200 p-3">
          <div className="flex-1">{render(row, (patch) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r))), i)}</div>
          <div className="flex flex-col gap-1">
            <button type="button" className={btn.icon} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Upar">↑</button>
            <button type="button" className={btn.icon} disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Neeche">↓</button>
            <button type="button" className={btn.icon} onClick={() => onChange(rows.filter((_, k) => k !== i))} aria-label="Hatayein">✕</button>
          </div>
        </div>
      ))}
      <button type="button" className={btn.secondary} onClick={() => onChange([...rows, make()])}>+ {addLabel}</button>
    </div>
  );
}

/** "a, b" → ["a","b"]; newline lists use splitLines. */
export const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
export const splitLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
/** Empty string → undefined, so optional contract fields stay absent. */
export const opt = (s: string | undefined | null) => (s && s.trim() ? s.trim() : undefined);
