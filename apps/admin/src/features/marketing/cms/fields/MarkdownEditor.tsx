/**
 * Markdown editor for richText and other Md/InlineMd fields. Markdown stays
 * the stored format (ARCH D8), so the editor works on the text itself: a
 * toolbar for H2/H3, lists, tables, entry links (`entry:<id>`), media images
 * (`media:<id>`) and tokens, plus a preview tab and live heading checks.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Bold, Braces, Eye, Heading2, Heading3, ImageIcon, Italic, Link2, List, ListOrdered, PencilLine, Quote, Table2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TOKEN_HELP, countWords, toEntryLink } from '../contract/cms-contract';
import { useEditor } from '../editor/EditorContext';
import { stripMarkdown } from '../editor/lib';
import { EntrySearch } from './EntryPicker';
import { MediaPickerDialog } from './MediaField';
import { headingProblems, renderMarkdownPreview } from './markdown-preview';
import { Counter, Field, IconBtn, Popover, useOutsideClick } from './ui';

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** InlineMd: no headings, lists, tables or images. */
  inline?: boolean;
  rows?: number;
  words?: { min?: number; max: number };
  placeholder?: string;
}

type Panel = 'link' | 'token' | null;

/** Preview typography (scoped with arbitrary variants; no global CSS needed). */
export const PREVIEW_CLASS = [
  'text-sm leading-relaxed text-neutral-800',
  '[&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-bold',
  '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-900 first:[&_h2]:mt-0',
  '[&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-neutral-900',
  '[&_.md-bad]:rounded [&_.md-bad]:bg-amber-100 [&_.md-bad]:px-1',
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-200 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600',
  '[&_a]:text-emerald-700 [&_a]:underline [&_.md-entry]:decoration-dotted',
  '[&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:text-[12px] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-neutral-900 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:text-neutral-100',
  '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-neutral-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
  '[&_img]:my-3 [&_img]:max-h-64 [&_img]:rounded-lg',
  '[&_.md-token]:rounded [&_.md-token]:bg-emerald-50 [&_.md-token]:px-1 [&_.md-token]:font-medium [&_.md-token]:text-emerald-800 [&_.md-token]:ring-1 [&_.md-token]:ring-emerald-200',
  '[&_.md-missing]:rounded [&_.md-missing]:bg-rose-50 [&_.md-missing]:px-1 [&_.md-missing]:text-rose-700 [&_.md-empty]:text-neutral-400',
].join(' ');

export function MarkdownEditor({ value, onChange, label, hint, error, required, inline, rows, words, placeholder }: Props) {
  const { refs, mediaRefs, config, addMedia } = useEditor();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [panel, setPanel] = useState<Panel>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [url, setUrl] = useState('');
  const panelRef = useOutsideClick<HTMLDivElement>(panel !== null, () => setPanel(null));
  const text = value ?? '';

  const tokenExamples = useMemo(() => Object.fromEntries((config?.tokens ?? []).map((t) => [t.token, t.example])), [config?.tokens]);
  const problems = useMemo(() => (inline ? [] : headingProblems(text)), [text, inline]);
  const wordCount = useMemo(() => countWords(stripMarkdown(text)), [text]);

  /** Replaces the selection; `wrap` keeps the selected text between before/after. */
  const edit = (before: string, after = '', placeholderText = '') => {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const selected = text.slice(start, end) || placeholderText;
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  /** Prefixes every selected line (headings, lists, quotes). */
  const prefixLines = (prefix: (i: number) => string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const lineStart = start > 0 ? text.lastIndexOf('\n', start - 1) + 1 : 0;
    const nl = text.indexOf('\n', end);
    const lineEnd = nl === -1 ? text.length : nl;
    const block = text.slice(lineStart, lineEnd) || 'Text';
    const replaced = block
      .split('\n')
      .map((l, i) => prefix(i) + l.replace(/^(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/, ''))
      .join('\n');
    onChange(text.slice(0, lineStart) + replaced + text.slice(lineEnd));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(lineStart, lineStart + replaced.length);
    });
  };

  const insertBlock = (snippet: string) => {
    const el = ref.current;
    const pos = el?.selectionEnd ?? text.length;
    const needsGap = pos > 0 && !text.slice(0, pos).endsWith('\n\n');
    const insert = `${needsGap ? (text.slice(0, pos).endsWith('\n') ? '\n' : '\n\n') : ''}${snippet}\n`;
    onChange(text.slice(0, pos) + insert + text.slice(pos));
  };

  const linkSelection = (href: string) => {
    edit('[', `](${href})`, 'link text');
    setPanel(null);
    setUrl('');
  };

  const tokenList = (config?.tokens?.length ? config.tokens.map((t) => ({ token: t.token, description: t.example })) : TOKEN_HELP) as readonly { token: string; description: string }[];

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      aside={words ? <Counter value={wordCount} min={words.min} max={words.max} unit="words" /> : !inline ? <span className="text-[11px] text-neutral-400">{wordCount} alfaaz</span> : undefined}
    >
      <div className={cn('overflow-visible rounded-xl border bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20', error ? 'border-rose-300' : 'border-neutral-300')}>
        <div ref={panelRef} className="relative flex flex-wrap items-center gap-0.5 border-b border-neutral-100 bg-neutral-50/70 px-1.5 py-1">
          {!inline && (
            <>
              <IconBtn label="Heading 2" onClick={() => prefixLines(() => '## ')}>
                <Heading2 className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Heading 3" onClick={() => prefixLines(() => '### ')}>
                <Heading3 className="h-4 w-4" />
              </IconBtn>
              <span className="mx-1 h-4 w-px bg-neutral-200" />
            </>
          )}
          <IconBtn label="Bold" onClick={() => edit('**', '**', 'bold')}>
            <Bold className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Italic" onClick={() => edit('*', '*', 'italic')}>
            <Italic className="h-4 w-4" />
          </IconBtn>
          {!inline && (
            <>
              <IconBtn label="List" onClick={() => prefixLines(() => '- ')}>
                <List className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `)}>
                <ListOrdered className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Quote" onClick={() => prefixLines(() => '> ')}>
                <Quote className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Table" onClick={() => insertBlock('| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |')}>
                <Table2 className="h-4 w-4" />
              </IconBtn>
            </>
          )}
          <span className="mx-1 h-4 w-px bg-neutral-200" />
          <IconBtn label="Link" active={panel === 'link'} onClick={() => setPanel(panel === 'link' ? null : 'link')}>
            <Link2 className="h-4 w-4" />
          </IconBtn>
          {!inline && (
            <IconBtn label="Image" onClick={() => setMediaOpen(true)}>
              <ImageIcon className="h-4 w-4" />
            </IconBtn>
          )}
          <IconBtn label="Token (price, count, fact)" active={panel === 'token'} onClick={() => setPanel(panel === 'token' ? null : 'token')}>
            <Braces className="h-4 w-4" />
          </IconBtn>

          <div className="ml-auto flex rounded-md bg-neutral-200/60 p-0.5">
            <button type="button" onClick={() => setTab('write')} className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium', tab === 'write' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500')}>
              <PencilLine className="h-3 w-3" /> Likhein
            </button>
            <button type="button" onClick={() => setTab('preview')} className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium', tab === 'preview' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500')}>
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>

          <Popover open={panel === 'link'} className="top-full">
            <EntrySearch placeholder="Site ka page dhoondein…" onPick={(r) => linkSelection(toEntryLink(r.id))} />
            <div className="flex gap-1.5 border-t border-neutral-100 p-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ya bahar ka URL: https://fbr.gov.pk/…"
                className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
              />
              <button type="button" disabled={!/^(https?:\/\/|\/|#|mailto:)/.test(url)} onClick={() => linkSelection(url.trim())} className="rounded-lg bg-emerald-600 px-2.5 text-xs font-medium text-white disabled:opacity-40">
                Lagayein
              </button>
            </div>
          </Popover>
          <Popover open={panel === 'token'} className="top-full w-[360px] p-1">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] text-neutral-500">Token site par asal value se badal jata hai. Price kabhi khud na likhein.</p>
            <div className="max-h-64 overflow-y-auto">
              {tokenList.map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => {
                    edit(t.token, '', '');
                    setPanel(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-emerald-50"
                >
                  <code className="truncate text-xs text-emerald-800">{t.token}</code>
                  <span className="shrink-0 truncate text-[11px] text-neutral-500">{t.description}</span>
                </button>
              ))}
            </div>
          </Popover>
        </div>

        {tab === 'write' ? (
          <textarea
            ref={ref}
            value={text}
            rows={rows ?? (inline ? 2 : 10)}
            placeholder={placeholder ?? (inline ? 'Text…' : '## Heading\n\nParagraph…')}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full resize-y border-0 bg-transparent px-3 py-2.5 font-mono text-[13px] leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          />
        ) : (
          <div
            className={cn(PREVIEW_CLASS, 'min-h-[80px] px-4 py-3')}
            dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(text, { refs, media: mediaRefs, tokens: tokenExamples }) || '<p class="md-empty">Kuch nahi likha</p>' }}
          />
        )}
      </div>
      {problems.length > 0 && (
        <div className="mt-1.5 space-y-0.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
          {problems.map((p) => (
            <p key={p} className="flex items-start gap-1.5 text-[11px] text-amber-800">
              <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" /> {p}
            </p>
          ))}
        </div>
      )}
      <MediaPickerDialog
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        kinds={['IMAGE', 'SCREENSHOT', 'ILLUSTRATION', 'LOGO']}
        onSelect={(m) => {
          addMedia([m]);
          setMediaOpen(false);
          insertBlock(`![${m.alt}](media:${m.id})`);
        }}
      />
    </Field>
  );
}
