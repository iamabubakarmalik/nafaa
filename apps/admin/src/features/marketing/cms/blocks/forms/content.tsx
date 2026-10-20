/** Forms for content blocks: richText, steps, callout, screenshot, diagram, codeSample. */
import { useState } from 'react';
import { BLOCK_LIMITS, CODE_LANGUAGES, type CodeLanguage, type Frame } from '../../contract/cms-contract';
import { DiagramEditor, type DiagramDraft } from '../../fields/DiagramEditor';
import { MarkdownEditor } from '../../fields/MarkdownEditor';
import { MediaField, MediaThumb } from '../../fields/MediaField';
import { useEditor } from '../../editor/EditorContext';
import { Grid, ListEditor, Segmented, SelectField, Section, TextArea, TextField, Toggle } from '../../fields/ui';
import { FRAME_OPTIONS, scoped, type BlockFormProps } from '../types';

export function RichTextForm({ block, set, err }: BlockFormProps<'richText'>) {
  return <MarkdownEditor label="Text" required rows={16} value={block.markdown} onChange={(markdown) => set({ markdown })} error={err('markdown')} />;
}

interface Step { title?: string; body?: string; mediaId?: string }

export function StepsForm({ block, set, err }: BlockFormProps<'steps'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" required value={block.heading} onChange={(heading) => set({ heading })} chars={{ max: 120 }} error={err('heading')} />
      <MarkdownEditor label="Intro" inline rows={2} value={block.intro} onChange={(intro) => set({ intro: intro || undefined })} error={err('intro')} />
      <Toggle checked={block.howTo} onChange={(howTo) => set({ howTo: howTo || undefined })} label="HowTo schema" hint="Sirf asal qadam ba qadam hidayat ke liye" />
      <ListEditor<Step>
        label="Qadam"
        items={block.items as Step[] | undefined}
        onChange={(items) => set({ items: items as typeof block.items })}
        min={BLOCK_LIMITS.stepsItems.min}
        max={BLOCK_LIMITS.stepsItems.max}
        create={() => ({ title: '', body: '' })}
        itemTitle={(s, i) => `${i + 1}. ${s.title || 'Qadam'}`}
        addLabel="Qadam shamil karein"
        error={err('items')}
        render={(s, update, i) => (
          <>
            <TextField label="Title" required value={s.title} onChange={(title) => update({ ...s, title })} chars={{ max: 120 }} error={err(`items[${i}].title`)} />
            <MarkdownEditor label="Tafseel" required rows={4} value={s.body} onChange={(body) => update({ ...s, body })} error={err(`items[${i}].body`)} />
            <MediaField label="Screenshot (optional)" kinds={['SCREENSHOT', 'IMAGE']} value={s.mediaId} onChange={(mediaId) => update({ ...s, mediaId })} />
          </>
        )}
      />
    </div>
  );
}

export function CalloutForm({ block, set, err }: BlockFormProps<'callout'>) {
  return (
    <div className="space-y-5">
      <Segmented
        label="Tone"
        value={block.tone}
        onChange={(tone) => set({ tone })}
        options={[
          { value: 'info', label: 'Info' },
          { value: 'tip', label: 'Tip' },
          { value: 'warning', label: 'Warning' },
        ]}
        error={err('tone')}
      />
      <TextField label="Title" value={block.title} onChange={(title) => set({ title: title || undefined })} chars={{ max: 120 }} error={err('title')} />
      <MarkdownEditor label="Text" required rows={5} value={block.body} onChange={(body) => set({ body })} error={err('body')} />
    </div>
  );
}

interface CalloutPoint { x?: number; y?: number; label?: string }

export function ScreenshotForm({ block, set, err }: BlockFormProps<'screenshot'>) {
  const { mediaRefs } = useEditor();
  const media = block.mediaId ? mediaRefs[block.mediaId] : undefined;
  const callouts = (block.callouts as CalloutPoint[] | undefined) ?? [];
  const [placing, setPlacing] = useState(false);
  return (
    <div className="space-y-5">
      <MediaField label="Screenshot" required kinds={['SCREENSHOT', 'IMAGE']} value={block.mediaId} onChange={(mediaId) => set({ mediaId })} error={err('mediaId')} hint="Sirf asal app ki tasveer" />
      <Grid>
        <SelectField<Frame> label="Frame" value={block.frame} onChange={(frame) => set({ frame })} options={FRAME_OPTIONS} error={err('frame')} />
        <TextField label="Address bar text" value={block.url} onChange={(url) => set({ url: url || undefined })} placeholder="app.nafaa.pk/khata" mono />
      </Grid>
      <Segmented
        label="Layout"
        value={block.layout}
        onChange={(layout) => set({ layout })}
        options={[
          { value: 'full', label: 'Poori chaurai' },
          { value: 'split-left', label: 'Tasveer left' },
          { value: 'split-right', label: 'Tasveer right' },
        ]}
        error={err('layout')}
      />
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <MarkdownEditor label="Text" rows={4} value={block.body} onChange={(body) => set({ body: body || undefined })} error={err('body')} />
      <TextField label="Caption" value={block.caption} onChange={(caption) => set({ caption: caption || undefined })} chars={{ max: 300 }} />

      <Section
        title="Callouts"
        description="Tasveer par click karke nishaan lagayein (6 tak)"
        actions={
          media && callouts.length < BLOCK_LIMITS.screenshotCalloutsMax ? (
            <button type="button" onClick={() => setPlacing((p) => !p)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${placing ? 'bg-emerald-600 text-white' : 'border border-neutral-300 text-neutral-700'}`}>
              {placing ? 'Tasveer par click karein…' : '+ Nishaan'}
            </button>
          ) : undefined
        }
      >
        {media && (
          <div
            className={`relative overflow-hidden rounded-lg border border-neutral-200 ${placing ? 'cursor-crosshair ring-2 ring-emerald-500/30' : ''}`}
            onClick={(e) => {
              if (!placing) return;
              const r = e.currentTarget.getBoundingClientRect();
              const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
              const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
              set({ callouts: [...callouts, { x, y, label: '' }] as typeof block.callouts });
              setPlacing(false);
            }}
          >
            <MediaThumb media={media} className="w-full" />
            {callouts.map((c, i) => (
              <span key={i} className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shadow ring-2 ring-white" style={{ left: `${c.x ?? 0}%`, top: `${c.y ?? 0}%` }}>
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <ListEditor<CalloutPoint>
          items={callouts}
          onChange={(next) => set({ callouts: (next.length ? next : undefined) as typeof block.callouts })}
          max={BLOCK_LIMITS.screenshotCalloutsMax}
          create={() => ({ x: 50, y: 50, label: '' })}
          itemTitle={(c, i) => `${i + 1}. ${c.label || 'Nishaan'}`}
          addLabel="Nishaan shamil karein"
          compact
          render={(c, update, i) => (
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <TextField label="Label" required value={c.label} onChange={(label) => update({ ...c, label })} chars={{ max: 80 }} error={err(`callouts[${i}].label`)} />
              <TextField label="X %" value={String(c.x ?? '')} onChange={(x) => update({ ...c, x: Number(x) })} error={err(`callouts[${i}].x`)} />
              <TextField label="Y %" value={String(c.y ?? '')} onChange={(y) => update({ ...c, y: Number(y) })} error={err(`callouts[${i}].y`)} />
            </div>
          )}
        />
      </Section>
    </div>
  );
}

export function DiagramForm({ block, set, err }: BlockFormProps<'diagram'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <TextArea label="Caption" required value={block.caption} onChange={(caption) => set({ caption })} chars={{ max: 300 }} rows={2} hint="Screen reader aur Google ke liye: diagram kya dikhata hai" error={err('caption')} />
      <DiagramEditor value={block.diagram as DiagramDraft | undefined} onChange={(diagram) => set({ diagram: diagram as typeof block.diagram })} errors={scoped(err, 'diagram')} />
    </div>
  );
}

interface CodeTab { label?: string; language?: CodeLanguage; code?: string }

export function CodeSampleForm({ block, set, err }: BlockFormProps<'codeSample'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <ListEditor<CodeTab>
        label="Tabs"
        items={block.tabs as CodeTab[] | undefined}
        onChange={(tabs) => set({ tabs: tabs as typeof block.tabs })}
        min={BLOCK_LIMITS.codeTabs.min}
        max={BLOCK_LIMITS.codeTabs.max}
        create={() => ({ label: '', language: 'bash', code: '' })}
        itemTitle={(t, i) => t.label || `Tab ${i + 1}`}
        addLabel="Tab shamil karein"
        error={err('tabs')}
        render={(t, update, i) => (
          <>
            <Grid>
              <TextField label="Label" required value={t.label} onChange={(label) => update({ ...t, label })} chars={{ max: 40 }} error={err(`tabs[${i}].label`)} />
              <SelectField<CodeLanguage> label="Language" value={t.language} onChange={(language) => update({ ...t, language })} options={CODE_LANGUAGES.map((l) => ({ value: l, label: l }))} error={err(`tabs[${i}].language`)} />
            </Grid>
            <TextArea label="Code" required mono rows={8} value={t.code} onChange={(code) => update({ ...t, code })} error={err(`tabs[${i}].code`)} />
          </>
        )}
      />
      <TextField label="Caption" value={block.caption} onChange={(caption) => set({ caption: caption || undefined })} chars={{ max: 300 }} />
    </div>
  );
}
