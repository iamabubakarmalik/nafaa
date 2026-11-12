/**
 * Dialogs of the theme editor: add a section (grouped list), publish with a
 * short note, and the publish history with rollback.
 */

import { useState } from 'react';
import { History, RotateCcw, Rocket, Search } from 'lucide-react';
import { Badge, Button, Input, Modal } from '@/design-system/components';
import { t } from '@core/i18n';
import type { Section, SectionSchema, ThemeSchema, ThemeVersionRow, TemplateKey } from '../../api/stores.api';
import { CATEGORY_LABELS, addableSections, sectionIcon, sectionLabel } from '../../lib/sections';

export function AddSectionModal({ open, onClose, schema, template, current, onPick }: {
  open: boolean; onClose: () => void; schema: ThemeSchema; template: TemplateKey; current: Section[]; onPick: (def: SectionSchema) => void;
}) {
  const [q, setQ] = useState('');
  const list = addableSections(schema, template, current).filter((s) => !q || sectionLabel(s.type, s).toLowerCase().includes(q.toLowerCase()) || s.label.toLowerCase().includes(q.toLowerCase()));
  const cats = (Object.keys(CATEGORY_LABELS) as SectionSchema['category'][]).filter((c) => list.some((s) => s.category === c));
  return (
    <Modal open={open} onClose={onClose} size="lg" title={t('Hissa add karein')} description={t('Chunein, page ke aakhir me lag jayega. Phir khench kar jagah badlein.')}>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Dhoondein: banner, FAQ, video...')} leftIcon={<Search className="h-4 w-4" />} />
      <div className="mt-4 max-h-[60vh] space-y-4 overflow-auto">
        {cats.map((c) => (
          <div key={c}>
            <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{CATEGORY_LABELS[c]}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.filter((s) => s.category === c).map((s) => {
                const Icon = sectionIcon(s.type);
                return (
                  <button key={s.type} type="button" onClick={() => { onPick(s); onClose(); setQ(''); }}
                    className="flex items-center gap-2.5 rounded-xl bg-white p-2.5 text-start ring-1 ring-slate-200 hover:bg-brand-50 hover:ring-brand-200">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-slate-800">{sectionLabel(s.type, s)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!list.length && <p className="py-6 text-center text-[0.875rem] text-slate-500">{t('Kuch nahi mila')}</p>}
      </div>
    </Modal>
  );
}

export function PublishModal({ open, onClose, busy, onPublish }: { open: boolean; onClose: () => void; busy: boolean; onPublish: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('Website par lagayein?')}
      description={t('Abhi tak ki sab tabdeeliyan customers ko nazar aane lagengi. Purana design history me rahega.')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
        <Button loading={busy} onClick={() => onPublish(note.trim())} leftIcon={<Rocket className="h-4 w-4" />}>{t('Publish')}</Button>
      </>}>
      <Input label={t('Note (zaroori nahi)')} value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder={t('Misal: Eid ka banner')} />
    </Modal>
  );
}

export function VersionsModal({ open, onClose, versions, busyId, onRollback }: {
  open: boolean; onClose: () => void; versions: ThemeVersionRow[]; busyId: string | null; onRollback: (v: ThemeVersionRow, publish: boolean) => void;
}) {
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const rows = versions.filter((v) => v.status !== 'DRAFT');
  return (
    <Modal open={open} onClose={onClose} size="lg" title={t('Purane design')} description={t('Har publish yahan save hota hai. Koi bhi wapas laa sakte hain.')}>
      {!rows.length ? (
        <div className="flex flex-col items-center py-8 text-center text-slate-500">
          <History className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-[0.875rem]">{t('Abhi tak kuch publish nahi hua')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900">
                  {t('Version {{n}}', { n: v.version })}
                  {v.status === 'PUBLISHED' && <Badge variant="success" size="xs" dot>{t('Live')}</Badge>}
                </p>
                <p className="text-[0.75rem] text-slate-500">{fmt(v.publishedAt)}{v.publishedBy ? ` · ${v.publishedBy}` : ''}{v.note ? ` · ${v.note}` : ''}</p>
              </div>
              {v.status !== 'PUBLISHED' && (
                <div className="flex gap-1.5">
                  <Button size="xs" variant="secondary" loading={busyId === `${v.id}:0`} onClick={() => onRollback(v, false)} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>{t('Editor me laayein')}</Button>
                  <Button size="xs" loading={busyId === `${v.id}:1`} onClick={() => onRollback(v, true)}>{t('Wapas live karein')}</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
