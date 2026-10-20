/**
 * callout (API-CONTRACT 4.20): an info, tip or warning box with Markdown
 * body. `role="note"`, with the tone spelled out for screen readers.
 */
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { cx } from '@/components/ui/cx';
import { Markdown } from './rich-text/Markdown';
import { scopedSlugger } from './rich-text/slug';
import type { BlockProps } from './types';

const TONES = {
  info: {
    box: 'border-sky-200 bg-sky-50/70 ink:border-sky-400/20 ink:bg-sky-400/[0.06]',
    icon: 'text-sky-700 ink:text-sky-300',
    path: <path d="M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />,
    label: 'Note',
  },
  tip: {
    box: 'border-brand-200 bg-brand-50/70 ink:border-brand-400/20 ink:bg-brand-400/[0.06]',
    icon: 'text-brand-700 ink:text-brand-300',
    path: <path d="M15 14c.2-1 .7-1.7 1.5-2.5A4.6 4.6 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" />,
    label: 'Tip',
  },
  warning: {
    box: 'border-amber-200 bg-amber-50/80 ink:border-amber-400/25 ink:bg-amber-400/[0.07]',
    icon: 'text-amber-700 ink:text-amber-300',
    path: <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3ZM12 9v4M12 17h.01" />,
    label: 'Warning',
  },
} as const;

export function Callout({ block, ctx }: BlockProps<'callout'>) {
  const tone = TONES[block.tone];
  return (
    <Container size="prose">
      <aside role="note" aria-label={block.title || tone.label} className={cx('flex gap-4 rounded-lg border p-5 md:p-6', tone.box)}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={cx('mt-0.5 size-5 shrink-0', tone.icon)} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {tone.path}
        </svg>
        <div className="min-w-0">
          {block.title ? <p className="font-semibold text-fg-strong">{block.title}</p> : null}
          <Prose className={cx('text-[0.975rem] text-fg', block.title && 'mt-1.5')}>
            <Markdown text={block.body} opts={{ media: ctx.entry.media, locale: ctx.locale, slugger: scopedSlugger(block.id), idPrefix: block.id }} />
          </Prose>
        </div>
      </aside>
    </Container>
  );
}
