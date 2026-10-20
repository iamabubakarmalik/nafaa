/**
 * cta (API-CONTRACT 4.8): the call-to-action band. On default and muted
 * sections it is a contained dark panel with a soft brand glow; on an ink
 * section it sits directly on the band.
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { CtaButton } from './parts/CtaButton';
import { InlineMarkdown } from './rich-text/Markdown';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

export function CtaBand({ block, ctx }: BlockProps<'cta'>) {
  const onBand = ctx.theme === 'ink';
  return (
    <Container>
      <div
        className={cx(
          'theme-ink relative isolate overflow-hidden text-center',
          onBand ? 'px-2 py-6' : 'rounded-xl bg-canvas px-6 py-16 shadow-e3 ring-1 ring-white/5 md:px-12 md:py-20',
        )}
        {...reveal(ctx.index, 'scale')}
      >
        {!onBand ? (
          <>
            <div aria-hidden className="bg-glow pointer-events-none absolute inset-0 -z-10" />
            <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
          </>
        ) : null}
        <h2 id={ctx.headingId} className="mx-auto max-w-[36rem] text-h2 text-fg-strong">
          {block.heading}
        </h2>
        {block.body ? (
          <p className="mx-auto mt-4 max-w-[36rem] text-body-lg text-fg-muted">
            <InlineMarkdown text={block.body} />
          </p>
        ) : null}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <CtaButton cta={block.primaryCta} size="lg" onInk area="cta" />
          {block.secondaryCta ? (
            <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="cta" className="!border-white/15 !bg-white/5 !text-white hover:!bg-white/10" />
          ) : null}
        </div>
      </div>
    </Container>
  );
}
