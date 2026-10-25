/**
 * answerBox (API-CONTRACT 4.2): the answer-first block for AEO. A short
 * answer (the entry summary by default), 2-8 key facts as a definition list
 * and an optional Roman Urdu summary, all in plain HTML so answer engines
 * can quote it.
 */
import { Container } from '@/components/ui/Container';
import { InlineMarkdown } from './rich-text/Markdown';
import { strings } from './lib/i18n';
import type { BlockProps } from './types';

export function AnswerBox({ block, ctx }: BlockProps<'answerBox'>) {
  const t = strings(ctx.locale);
  const answer = block.answer?.trim() || ctx.entry.summary?.trim() || '';
  const heading = block.heading?.trim() || t.shortAnswer;

  return (
    <Container>
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none">
        <div aria-hidden className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-brand-500 via-brand-600 to-brand-700" />
        <div className="grid gap-10 p-7 md:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <h2 id={ctx.headingId} className="flex items-center gap-2.5 text-eyebrow uppercase text-link">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
              </svg>
              {heading}
            </h2>
            {answer ? (
              <p className="mt-4 text-body-lg text-fg-strong">
                <InlineMarkdown text={answer} />
              </p>
            ) : null}
            {block.romanUrdu?.trim() ? (
              <div className="mt-7 rounded-lg bg-surface-2 p-5 ring-1 ring-inset ring-line">
                <p className="text-eyebrow uppercase text-fg-subtle">{t.romanUrdu}</p>
                <p lang="ur-Latn" className="mt-2 text-body text-fg">
                  {block.romanUrdu.trim()}
                </p>
              </div>
            ) : null}
          </div>
          {block.facts.length ? (
            <div>
              <p className="text-eyebrow uppercase text-fg-subtle">{t.keyFacts}</p>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {block.facts.map((fact, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-4 py-3.5">
                    <dt className="text-small font-medium text-fg-muted">{fact.label}</dt>
                    <dd className="text-small font-medium text-fg-strong">
                      <InlineMarkdown text={fact.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
