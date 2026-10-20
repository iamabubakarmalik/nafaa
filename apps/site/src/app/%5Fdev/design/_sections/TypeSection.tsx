import { cx } from '@/components/ui';
import { typeScale, type TypeToken } from '@/styles/scale';
import { Code, DevSection, Group, Specimen } from './shared';

const CLASS: Record<TypeToken, string> = {
  display: 'text-display text-fg-strong',
  h1: 'text-h1 text-fg-strong',
  h2: 'text-h2 text-fg-strong',
  h3: 'text-h3 text-fg-strong',
  h4: 'text-h4 text-fg-strong',
  'body-lg': 'text-body-lg text-fg-muted',
  body: 'text-body text-fg',
  small: 'text-small text-fg-subtle',
  eyebrow: 'text-eyebrow uppercase text-link',
};

const SAMPLE: Record<TypeToken, string> = {
  display: 'Your shop, on one screen',
  h1: 'Point of sale for Pakistani shops',
  h2: 'Stock, khata and daily reports',
  h3: 'Closing the day at the counter',
  h4: 'A card title in the h4 step',
  'body-lg':
    'Lead paragraphs and the short answer at the top of a page use this size, so the first few lines read easily on a phone.',
  body: 'Body text is 16px with a 1.65 line height. Roman Urdu reads the same way: Aaj ki Sale, Profit aur Expense ek nazar mein.',
  small: 'Captions, sources and meta lines, for example a last-updated date.',
  eyebrow: 'Section label',
};

export function TypeSection() {
  return (
    <DevSection
      id="type"
      title="Typography"
      intro={
        <>
          Inter variable through <Code>next/font</Code> (latin subset, one preloaded file) with{' '}
          <Code>cv11</Code> and <Code>ss01</Code>. Sizes are fluid with <Code>clamp()</Code>; heading level and
          visual size are set separately.
        </>
      }
    >
      <Group title="Scale">
        <div className="divide-y divide-line rounded-lg border border-line bg-surface">
          {(Object.keys(typeScale) as TypeToken[]).map((token) => {
            const step = typeScale[token];
            return (
              <div key={token} className="grid gap-4 p-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
                <div className="text-small">
                  <div className="font-mono text-xs font-medium text-fg-strong">text-{token}</div>
                  <div className="mt-2 space-y-0.5 font-mono text-xs leading-5 text-fg-subtle">
                    <div className="break-words">{step.size}</div>
                    <div>
                      lh {step.lineHeight} · wt {step.weight} · tr {step.tracking}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-fg-muted">{step.use}</div>
                </div>
                <p className={cx('min-w-0', CLASS[token])}>{SAMPLE[token]}</p>
              </div>
            );
          })}
        </div>
      </Group>

      <Group title="Weights and figures">
        <Specimen className="grid gap-8 md:grid-cols-2">
          <div className="space-y-2 text-h3 text-fg-strong">
            <p className="font-normal">Regular 400</p>
            <p className="font-medium">Medium 500</p>
            <p className="font-semibold">Semibold 600</p>
            <p className="font-650">Heading 650</p>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-fg-subtle">Tabular figures for prices and tables</div>
              <p className="mt-1 text-h3 tabular-nums text-fg-strong">1,234,567.89</p>
            </div>
            <div>
              <div className="text-xs text-fg-subtle">System monospace for code</div>
              <p className="mt-1 font-mono text-small text-fg-strong">GET /public/site/entry?path=/pricing</p>
            </div>
          </div>
        </Specimen>
      </Group>
    </DevSection>
  );
}
