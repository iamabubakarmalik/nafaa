/** Forms for the opening blocks: hero and answerBox. */
import { BLOCK_LIMITS, TEXT_LIMITS, countWords, type Frame, type HeroMedia } from '../../contract/cms-contract';
import { DiagramEditor, emptyDiagram, type DiagramDraft } from '../../fields/DiagramEditor';
import { CtaField } from '../../fields/LinkFields';
import { MarkdownEditor } from '../../fields/MarkdownEditor';
import { MediaField } from '../../fields/MediaField';
import { Field, Grid, ListEditor, Segmented, SelectField, Section, TextArea, TextField } from '../../fields/ui';
import { FRAME_OPTIONS, scoped, type BlockFormProps } from '../types';

interface MediaDraft { kind?: HeroMedia['kind']; mediaId?: string; frame?: Frame; url?: string; diagram?: DiagramDraft }

export function HeroForm({ block, set, err, title }: BlockFormProps<'hero'>) {
  const media = block.media as MediaDraft | undefined;
  const setMedia = (m: MediaDraft | undefined) => set({ media: m as unknown as HeroMedia | undefined });
  return (
    <div className="space-y-5">
      <Section title="Text">
        <Grid>
          <TextField label="Eyebrow" value={block.eyebrow} onChange={(eyebrow) => set({ eyebrow: eyebrow || undefined })} chars={{ max: 60 }} placeholder="Chhota label upar" error={err('eyebrow')} />
          <Segmented
            label="Layout"
            value={block.layout}
            onChange={(layout) => set({ layout })}
            options={[
              { value: 'split', label: 'Split' },
              { value: 'centered', label: 'Centered' },
            ]}
            error={err('layout')}
          />
        </Grid>
        <TextField label="Heading (H1)" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 160 }} placeholder={title || 'Entry ka title'} hint="Khali ho to entry ka title H1 banega" error={err('heading')} />
        <MarkdownEditor label="Sub-heading" required inline rows={3} value={block.sub} onChange={(sub) => set({ sub })} words={TEXT_LIMITS.heroSubWords} error={err('sub')} />
        <ListEditor<string>
          label="Badges"
          hint="Chhote trust points, sirf sach (jaise FBR & PRA approved POS integrator token se)"
          items={block.badges}
          onChange={(badges) => set({ badges: badges.length ? badges : undefined })}
          max={BLOCK_LIMITS.heroBadgesMax}
          create={() => ''}
          itemTitle={(b, i) => b || `Badge ${i + 1}`}
          addLabel="Badge shamil karein"
          compact
          render={(b, update, i) => <TextField value={b} onChange={update} chars={{ max: 120 }} error={err(`badges[${i}]`)} />}
        />
      </Section>
      <Section title="Buttons">
        <CtaField label="Primary button" value={block.primaryCta} onChange={(c) => set({ primaryCta: c as typeof block.primaryCta })} errors={scoped(err, 'primaryCta')} />
        <CtaField label="Secondary button" optional value={block.secondaryCta} onChange={(c) => set({ secondaryCta: c as typeof block.secondaryCta })} errors={scoped(err, 'secondaryCta')} />
      </Section>
      <Section title="Media">
        <Segmented
          value={media?.kind ?? 'none'}
          onChange={(kind) => {
            if (kind === 'none') return setMedia(undefined);
            if (kind === 'diagram') return setMedia({ kind, diagram: emptyDiagram('offline-sync') });
            if (kind === 'screenshot') return setMedia({ kind, frame: 'browser' });
            setMedia({ kind });
          }}
          options={[
            { value: 'none', label: 'Kuch nahi' },
            { value: 'screenshot', label: 'Screenshot' },
            { value: 'diagram', label: 'Diagram' },
            { value: 'image', label: 'Image' },
          ]}
        />
        {media?.kind === 'screenshot' && (
          <>
            <MediaField label="Screenshot" required kinds={['SCREENSHOT', 'IMAGE']} value={media.mediaId} onChange={(mediaId) => setMedia({ ...media, mediaId })} error={err('media.mediaId')} />
            <Grid>
              <SelectField<Frame> label="Frame" value={media.frame} onChange={(frame) => setMedia({ ...media, frame })} options={FRAME_OPTIONS} error={err('media.frame')} />
              <TextField label="Address bar text" value={media.url} onChange={(url) => setMedia({ ...media, url: url || undefined })} placeholder="app.nafaa.pk/pos" mono />
            </Grid>
          </>
        )}
        {media?.kind === 'image' && <MediaField label="Image" required value={media.mediaId} onChange={(mediaId) => setMedia({ ...media, mediaId })} error={err('media.mediaId')} />}
        {media?.kind === 'diagram' && <DiagramEditor value={media.diagram} onChange={(diagram) => setMedia({ ...media, diagram })} errors={scoped(err, 'media.diagram')} />}
      </Section>
    </div>
  );
}

interface Fact { label?: string; value?: string }

export function AnswerBoxForm({ block, set, err, summary }: BlockFormProps<'answerBox'>) {
  const answerWords = countWords(block.answer ?? summary ?? '');
  return (
    <div className="space-y-5">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} placeholder="Short answer" error={err('heading')} />
      <MarkdownEditor
        label="Jawab"
        inline
        rows={3}
        value={block.answer}
        onChange={(answer) => set({ answer: answer || undefined })}
        words={TEXT_LIMITS.answerWords}
        hint={block.answer ? undefined : summary ? `Khali hai, to entry ka summary dikhega (${answerWords} alfaaz)` : 'Khali hai aur entry ka summary bhi khali hai'}
        error={err('answer')}
      />
      <ListEditor<Fact>
        label="Key facts"
        items={block.facts as Fact[] | undefined}
        onChange={(facts) => set({ facts: facts as typeof block.facts })}
        min={BLOCK_LIMITS.answerFacts.min}
        max={BLOCK_LIMITS.answerFacts.max}
        create={() => ({ label: '', value: '' })}
        itemTitle={(f, i) => f.label || `Fact ${i + 1}`}
        addLabel="Fact shamil karein"
        error={err('facts')}
        compact
        render={(f, update, i) => (
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <TextField label="Label" required value={f.label} onChange={(label) => update({ ...f, label })} chars={{ max: 60 }} error={err(`facts[${i}].label`)} />
            <TextField label="Value" required value={f.value} onChange={(value) => update({ ...f, value })} chars={{ max: 300 }} hint="Price ho to token use karein" error={err(`facts[${i}].value`)} />
          </div>
        )}
      />
      <Field label="Roman Urdu summary" hint="Asaan Roman Urdu, 60 alfaaz tak">
        <TextArea value={block.romanUrdu} onChange={(romanUrdu) => set({ romanUrdu: romanUrdu || undefined })} words={{ max: TEXT_LIMITS.romanUrduMaxWords }} rows={3} placeholder="Mukhtasar: …" error={err('romanUrdu')} />
      </Field>
    </div>
  );
}
