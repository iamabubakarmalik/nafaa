/**
 * FinalCta: a `cta` block as the closing panel of a showcase page. A dark
 * panel (in both site themes) with a slowly turning conic aurora and a
 * masked grid, the block's heading, body and buttons, and an optional line
 * of facts under the buttons.
 */
import { CtaButton } from '@/components/blocks/parts/CtaButton';
import { InlineMarkdown } from '@/components/blocks/rich-text/Markdown';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import type { Block } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import type { TrustItem } from './kit';
import styles from './showcase.module.css';

type CtaBlock = Extract<Block, { type: 'cta' }>;

export function FinalCta({ block, headingId, facts = [] }: { block: CtaBlock; headingId: string; facts?: TrustItem[] }) {
  return (
    <Container>
      <div className={cx(styles.ctaPanel, 'theme-ink px-6 py-20 text-center md:px-16 md:py-28')} data-reveal="scale">
        <div aria-hidden className={styles.ctaAurora} />
        <div aria-hidden className={styles.ctaGrid} />
        <h2 id={headingId} className="mx-auto max-w-[44rem] text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] font-650 leading-[1.08] tracking-[-0.03em] text-white">
          {block.heading}
        </h2>
        {block.body ? (
          <p className="mx-auto mt-5 max-w-[38rem] text-body-lg text-slate-300">
            <InlineMarkdown text={block.body} />
          </p>
        ) : null}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <CtaButton cta={block.primaryCta} size="lg" onInk area="cta" />
          {block.secondaryCta ? (
            <CtaButton cta={block.secondaryCta} size="lg" fallbackVariant="secondary" area="cta" className="!border-white/15 !bg-white/5 !text-white hover:!bg-white/10" />
          ) : null}
        </div>
        {facts.length ? (
          <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-small text-slate-400">
            {facts.map((fact) => (
              <li key={fact.label} className="inline-flex items-center gap-2">
                <CmsIcon name={fact.icon} size={15} className="text-brand-300" />
                {fact.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Container>
  );
}
