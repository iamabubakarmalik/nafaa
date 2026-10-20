/**
 * DiagramSpec editor (API-CONTRACT 4.4): a kind picker, label overrides for
 * the bespoke kinds, and node/edge, spoke or item tables for flow, hub and
 * timeline. There is no diagram preview here; the preview drawer shows the
 * real site render (ARCH 13).
 */
import {
  BESPOKE_DIAGRAM_KINDS,
  DATA_DIAGRAM_KINDS,
  DIAGRAM_LABEL_KEYS,
  DIAGRAM_LABEL_MAX,
  DIAGRAM_LIMITS,
  isBespokeDiagramKind,
  type DiagramKind,
} from '../contract/cms-contract';
import { IconPicker } from './IconPicker';
import { HrefField } from './LinkFields';
import { Field, Grid, ListEditor, SelectField, TextField, Toggle } from './ui';

/** Draft diagram: any subset of one of the DiagramSpec shapes. */
export type DiagramDraft = { kind?: DiagramKind; [key: string]: unknown };

type Err = (path: string) => string | undefined;

const KIND_LABEL: Record<DiagramKind, string> = {
  'offline-sync': 'Offline sync',
  'fbr-invoice': 'FBR invoice',
  'khata-cycle': 'Khata cycle',
  'multi-branch': 'Multi-branch',
  'order-to-cash': 'Order to cash',
  'store-sync': 'Store sync',
  'api-webhooks': 'API + webhooks',
  'service-process': 'Service process',
  flow: 'Flow (apne nodes)',
  hub: 'Hub (beech + spokes)',
  timeline: 'Timeline',
};

export function emptyDiagram(kind: DiagramKind): DiagramDraft {
  if (kind === 'flow') return { kind, nodes: [{ id: 'step-1', label: '' }, { id: 'step-2', label: '' }], edges: [{ from: 'step-1', to: 'step-2' }], animate: true };
  if (kind === 'hub') return { kind, center: { label: 'Nafaa' }, spokes: [{ label: '' }, { label: '' }, { label: '' }], animate: true };
  if (kind === 'timeline') return { kind, items: [{ date: '', label: '' }, { date: '', label: '' }], animate: true };
  return { kind, animate: true };
}

interface FlowNode { id?: string; label?: string; icon?: string; note?: string }
interface FlowEdge { from?: string; to?: string; label?: string }
interface Spoke { label?: string; icon?: string; href?: string }
interface TimelineItem { date?: string; label?: string; note?: string }

export function DiagramEditor({ value, onChange, errors }: { value: DiagramDraft | undefined; onChange: (next: DiagramDraft) => void; errors?: Err }) {
  const d = value ?? { kind: 'flow' };
  const kind = d.kind;
  const set = (patch: Record<string, unknown>) => onChange({ ...d, ...patch });
  const e: Err = (p) => errors?.(p);

  return (
    <div className="space-y-4">
      <Grid>
        <SelectField<DiagramKind>
          label="Diagram kism"
          required
          value={kind}
          onChange={(k) => k && onChange(emptyDiagram(k))}
          options={[
            ...BESPOKE_DIAGRAM_KINDS.map((k) => ({ value: k, label: `${KIND_LABEL[k]} (bana hua)` })),
            ...DATA_DIAGRAM_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] })),
          ]}
          error={e('kind')}
        />
        <Field label="Animation">
          <div className="pt-1.5">
            <Toggle checked={d.animate !== false} onChange={(animate) => set({ animate })} label="Chalta hua (scroll par)" />
          </div>
        </Field>
      </Grid>

      {kind && isBespokeDiagramKind(kind) && (
        <Field label="Labels" hint="Khali chhorein to default text dikhega">
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(DIAGRAM_LABEL_KEYS[kind]).map(([key, def]) => {
              const labels = (d.labels as Record<string, string> | undefined) ?? {};
              return (
                <TextField
                  key={key}
                  label={<span className="font-mono text-[11px] text-neutral-500">{key}</span>}
                  value={labels[key]}
                  placeholder={def}
                  chars={{ max: DIAGRAM_LABEL_MAX }}
                  error={e(`labels.${key}`)}
                  onChange={(v) => {
                    const next = { ...labels };
                    if (v.trim()) next[key] = v;
                    else delete next[key];
                    set({ labels: Object.keys(next).length ? next : undefined });
                  }}
                />
              );
            })}
          </div>
        </Field>
      )}

      {kind === 'flow' && (
        <>
          <ListEditor<FlowNode>
            label="Nodes"
            items={d.nodes as FlowNode[] | undefined}
            onChange={(nodes) => set({ nodes })}
            min={DIAGRAM_LIMITS.flowNodes.min}
            max={DIAGRAM_LIMITS.flowNodes.max}
            create={() => ({ id: `step-${((d.nodes as unknown[] | undefined)?.length ?? 0) + 1}`, label: '' })}
            itemTitle={(n, i) => n.label || `Node ${i + 1}`}
            addLabel="Node shamil karein"
            error={e('nodes')}
            compact
            render={(n, update, i) => (
              <>
                <Grid>
                  <TextField label="Label" value={n.label} onChange={(label) => update({ ...n, label })} chars={{ max: DIAGRAM_LABEL_MAX }} error={e(`nodes[${i}].label`)} required />
                  <TextField label="Id" value={n.id} onChange={(id) => update({ ...n, id })} mono error={e(`nodes[${i}].id`)} required />
                </Grid>
                <Grid>
                  <IconPicker value={n.icon} onChange={(icon) => update({ ...n, icon })} label="Icon" error={e(`nodes[${i}].icon`)} />
                  <TextField label="Note" value={n.note} onChange={(note) => update({ ...n, note: note || undefined })} chars={{ max: 120 }} />
                </Grid>
              </>
            )}
          />
          <ListEditor<FlowEdge>
            label="Teer (edges)"
            items={d.edges as FlowEdge[] | undefined}
            onChange={(edges) => set({ edges })}
            max={DIAGRAM_LIMITS.flowEdgesMax}
            create={() => ({ from: '', to: '' })}
            itemTitle={(ed) => `${ed.from || '?'} → ${ed.to || '?'}`}
            addLabel="Teer shamil karein"
            compact
            render={(ed, update, i) => {
              const ids = ((d.nodes as FlowNode[] | undefined) ?? []).map((n) => n.id).filter((x): x is string => !!x);
              const opts = ids.map((id) => ({ value: id, label: id }));
              return (
                <div className="grid gap-3 sm:grid-cols-3">
                  <SelectField label="Se" value={ed.from} onChange={(from) => update({ ...ed, from })} options={opts} emptyLabel="—" error={e(`edges[${i}].from`)} />
                  <SelectField label="Tak" value={ed.to} onChange={(to) => update({ ...ed, to })} options={opts} emptyLabel="—" error={e(`edges[${i}].to`)} />
                  <TextField label="Label" value={ed.label} onChange={(label) => update({ ...ed, label: label || undefined })} chars={{ max: 32 }} />
                </div>
              );
            }}
          />
        </>
      )}

      {kind === 'hub' && (
        <>
          <Grid>
            <TextField
              label="Beech ka label"
              required
              value={(d.center as Spoke | undefined)?.label}
              onChange={(label) => set({ center: { ...(d.center as object), label } })}
              chars={{ max: DIAGRAM_LABEL_MAX }}
              error={e('center.label')}
            />
            <IconPicker value={(d.center as Spoke | undefined)?.icon} onChange={(icon) => set({ center: { ...(d.center as object), icon } })} label="Beech ka icon" />
          </Grid>
          <ListEditor<Spoke>
            label="Spokes"
            items={d.spokes as Spoke[] | undefined}
            onChange={(spokes) => set({ spokes })}
            min={DIAGRAM_LIMITS.hubSpokes.min}
            max={DIAGRAM_LIMITS.hubSpokes.max}
            create={() => ({ label: '' })}
            itemTitle={(s, i) => s.label || `Spoke ${i + 1}`}
            error={e('spokes')}
            compact
            render={(s, update, i) => (
              <>
                <Grid>
                  <TextField label="Label" required value={s.label} onChange={(label) => update({ ...s, label })} chars={{ max: DIAGRAM_LABEL_MAX }} error={e(`spokes[${i}].label`)} />
                  <IconPicker value={s.icon} onChange={(icon) => update({ ...s, icon })} label="Icon" />
                </Grid>
                <HrefField value={s.href} onChange={(href) => update({ ...s, href })} keywords={false} label="Link (optional)" error={e(`spokes[${i}].href`)} />
              </>
            )}
          />
        </>
      )}

      {kind === 'timeline' && (
        <ListEditor<TimelineItem>
          label="Waqt ke qadam"
          items={d.items as TimelineItem[] | undefined}
          onChange={(items) => set({ items })}
          min={DIAGRAM_LIMITS.timelineItems.min}
          max={DIAGRAM_LIMITS.timelineItems.max}
          create={() => ({ date: '', label: '' })}
          itemTitle={(t, i) => [t.date, t.label].filter(Boolean).join(' · ') || `Qadam ${i + 1}`}
          error={e('items')}
          compact
          render={(t, update, i) => (
            <>
              <Grid>
                <TextField label="Date / waqt" required value={t.date} onChange={(date) => update({ ...t, date })} placeholder="Din 1, Hafta 2, 2026…" chars={{ max: 40 }} error={e(`items[${i}].date`)} />
                <TextField label="Label" required value={t.label} onChange={(label) => update({ ...t, label })} chars={{ max: 60 }} error={e(`items[${i}].label`)} />
              </Grid>
              <TextField label="Note" value={t.note} onChange={(note) => update({ ...t, note: note || undefined })} chars={{ max: 160 }} />
            </>
          )}
        />
      )}
    </div>
  );
}
