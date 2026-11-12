/**
 * Rich text box for website pages, blog posts, collections and product web
 * descriptions. It edits HTML in place (headings, bold, lists, links,
 * quotes and images). Images go through the shared upload service. The API
 * sanitises the HTML before it is stored, so this editor only has to produce
 * plain, tidy markup.
 */

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Bold, Code2, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Pilcrow, Quote, RemoveFormatting, Underline,
} from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { uploadImage } from '../lib/upload';

type Cmd = { icon: typeof Bold; label: string; run: () => void };

export function RichTextEditor({ value, onChange, placeholder, minHeight = 220, disabled }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Remember the last HTML we produced, so outside updates replace the content
  // but our own typing does not move the caret.
  const last = useRef(value);

  useEffect(() => {
    if (!ref.current || source) return;
    if (value !== last.current || ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
      last.current = value;
    }
  }, [value, source]);

  const emit = () => {
    const html = ref.current?.innerHTML ?? '';
    const clean = html === '<br>' ? '' : html;
    last.current = clean;
    onChange(clean);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt(t('Link ka pata (https://...)'));
    if (!url) return;
    exec('createLink', /^(https?:|mailto:|tel:|\/)/i.test(url) ? url : `https://${url}`);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      exec('insertHTML', `<img src="${url}" alt="" />`);
    } catch {
      toast.error(t('Tasveer upload nahi hui'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cmds: Cmd[] = [
    { icon: Pilcrow, label: t('Aam text'), run: () => exec('formatBlock', '<p>') },
    { icon: Heading2, label: t('Bari heading'), run: () => exec('formatBlock', '<h2>') },
    { icon: Heading3, label: t('Chhoti heading'), run: () => exec('formatBlock', '<h3>') },
    { icon: Bold, label: t('Mota'), run: () => exec('bold') },
    { icon: Italic, label: t('Tircha'), run: () => exec('italic') },
    { icon: Underline, label: t('Neeche line'), run: () => exec('underline') },
    { icon: List, label: t('List'), run: () => exec('insertUnorderedList') },
    { icon: ListOrdered, label: t('Number list'), run: () => exec('insertOrderedList') },
    { icon: Quote, label: t('Quote'), run: () => exec('formatBlock', '<blockquote>') },
    { icon: Link2, label: t('Link'), run: addLink },
    { icon: RemoveFormatting, label: t('Formatting hatayein'), run: () => exec('removeFormat') },
  ];

  const btn = 'flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40';

  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100', disabled && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/70 px-1.5 py-1">
        {cmds.map((c) => (
          <button key={c.label} type="button" className={btn} title={c.label} aria-label={c.label} disabled={disabled || source}
            onMouseDown={(e) => e.preventDefault()} onClick={c.run}>
            <c.icon className="h-4 w-4" />
          </button>
        ))}
        <button type="button" className={btn} title={t('Tasveer lagayein')} aria-label={t('Tasveer lagayein')} disabled={disabled || source || uploading}
          onMouseDown={(e) => e.preventDefault()} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button type="button" className={cn(btn, source && 'bg-slate-200 text-slate-900')} title={t('HTML dekhein')} aria-label={t('HTML dekhein')}
          disabled={disabled} onClick={() => setSource((s) => !s)}>
          <Code2 className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {source ? (
        <textarea value={value} onChange={(e) => { last.current = e.target.value; onChange(e.target.value); }} disabled={disabled}
          className="block w-full resize-y border-0 bg-white p-3 font-mono text-[0.78125rem] text-slate-800 focus:outline-none focus:ring-0" style={{ minHeight }} />
      ) : (
        <div ref={ref} contentEditable={!disabled} suppressContentEditableWarning onInput={emit} onBlur={emit}
          data-placeholder={placeholder ?? t('Yahan likhein...')}
          className={cn(
            'prose-store max-w-none px-3.5 py-3 text-[0.875rem] leading-relaxed text-slate-800 focus:outline-none',
            'empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]',
            '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-[1.125rem] [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-2.5 [&_h3]:text-[1rem] [&_h3]:font-semibold',
            '[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:ps-5',
            '[&_blockquote]:my-2 [&_blockquote]:border-s-4 [&_blockquote]:border-slate-200 [&_blockquote]:ps-3 [&_blockquote]:text-slate-600',
            '[&_a]:text-brand-700 [&_a]:underline [&_img]:my-2 [&_img]:max-h-72 [&_img]:rounded-lg',
          )}
          style={{ minHeight }} />
      )}
    </div>
  );
}
