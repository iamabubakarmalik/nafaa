'use client';

/**
 * FBR Tier-1 checker island. One question per category of section 2(43A)
 * of the Sales Tax Act, 1990 (as printed in FBR's POS booklet; see
 * facts.ts). Any "yes" makes the shop a Tier-1 retailer; "not sure" answers
 * are listed as things to confirm. The result never says more than the law
 * text does, and points to the source.
 */
import { useState } from 'react';
import { TIER1 } from './facts';
import { Glyph, ResultPanel, SmallButton, SourceNote, ToolFrame, InputsPanel, useToolUsed } from './kit';

type Answer = 'yes' | 'no' | 'unsure';

const ANSWERS: { value: Answer; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
];

export type Tier1Verdict = 'tier1' | 'check' | 'not-listed' | 'incomplete';

export function tier1Verdict(answers: Partial<Record<string, Answer>>): Tier1Verdict {
  const values = TIER1.criteria.map((c) => answers[c.clause]);
  if (values.includes('yes')) return 'tier1';
  if (values.some((v) => v === undefined)) return 'incomplete';
  if (values.includes('unsure')) return 'check';
  return 'not-listed';
}

export default function FbrTier1Checker() {
  const used = useToolUsed('fbr-tier-1-checker');
  const [answers, setAnswers] = useState<Partial<Record<string, Answer>>>({});
  const verdict = tier1Verdict(answers);
  const answered = TIER1.criteria.filter((c) => answers[c.clause]).length;
  const yes = TIER1.criteria.filter((c) => answers[c.clause] === 'yes');
  const unsure = TIER1.criteria.filter((c) => answers[c.clause] === 'unsure');

  const set = (clause: string, value: Answer) => {
    used();
    setAnswers((prev) => ({ ...prev, [clause]: value }));
  };

  return (
    <ToolFrame label="FBR Tier-1 retailer checker">
      <InputsPanel>
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-small text-fg-muted">
            {answered} of {TIER1.criteria.length} answered
          </p>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div
              className="h-full origin-left rounded-full bg-brand-600 transition-transform duration-base ease-out [transform:scaleX(var(--p))]"
              style={{ '--p': answered / TIER1.criteria.length }}
            />
          </div>
        </div>
        <ol className="divide-y divide-line">
          {TIER1.criteria.map((c, i) => (
            <li key={c.clause} className="py-4 first:pt-0 last:pb-0">
              <fieldset>
                <legend className="flex gap-3 text-body text-fg-strong">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold tabular-nums text-fg-muted">
                    {i + 1}
                  </span>
                  <span>{c.question}</span>
                </legend>
                <div className="mt-3 flex flex-wrap gap-2 pl-9">
                  {ANSWERS.map((a) => {
                    const checked = answers[c.clause] === a.value;
                    return (
                      <label
                        key={a.value}
                        className={[
                          'cursor-pointer rounded-full border px-3.5 py-1.5 text-small font-medium transition-[background-color,border-color,color] duration-fast',
                          checked
                            ? a.value === 'yes'
                              ? 'border-brand-700 bg-brand-700 text-white'
                              : 'border-fg-strong bg-fg-strong text-canvas'
                            : 'border-line-strong text-fg-muted hover:border-fg-subtle hover:text-fg-strong',
                        ].join(' ')}
                      >
                        <input type="radio" name={`tier1-${c.clause}`} value={a.value} checked={checked} onChange={() => set(c.clause, a.value)} className="sr-only" />
                        {a.label}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 pl-9 text-xs text-fg-subtle">Section 2(43A)({c.clause})</p>
              </fieldset>
            </li>
          ))}
        </ol>
      </InputsPanel>

      <ResultPanel>
        <p className="text-eyebrow uppercase text-fg-subtle">Result</p>
        {verdict === 'tier1' ? (
          <>
            <p className="mt-2 text-h3 text-fg-strong">You are a Tier-1 retailer</p>
            <p className="mt-3 text-small text-fg-muted">
              A retailer in any one category is Tier-1. You answered yes to clause{yes.length > 1 ? 's' : ''}{' '}
              {yes.map((c) => `(${c.clause})`).join(', ')}.
            </p>
            <ul className="mt-5 space-y-3 text-small text-fg">
              <li className="flex gap-2.5">
                <span className="mt-0.5 text-brand-400">{Glyph.check}</span>
                Tier-1 retailers must link their POS with FBR&apos;s system for real-time reporting of sales (section 3(9A)).
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 text-brand-400">{Glyph.check}</span>
                If an outlet is not integrated in a tax period, the adjustable input tax for that whole period is reduced by {TIER1.inputTaxReductionPercent}% (section 8B(6)).
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 text-brand-400">{Glyph.check}</span>
                FBR can direct gas and electricity companies to disconnect notified Tier-1 retailers who do not integrate (section 14AB).
              </li>
            </ul>
          </>
        ) : verdict === 'check' ? (
          <>
            <p className="mt-2 text-h3 text-fg-strong">Confirm {unsure.length === 1 ? 'one point' : `${unsure.length} points`}</p>
            <p className="mt-3 text-small text-fg-muted">
              You said no to the rest. If any of {unsure.map((c) => `(${c.clause})`).join(', ')} applies to you, you are Tier-1. Your electricity bills,
              card machine agreement and supplier invoices show most of these.
            </p>
          </>
        ) : verdict === 'not-listed' ? (
          <>
            <p className="mt-2 text-h3 text-fg-strong">None of the listed categories apply</p>
            <p className="mt-3 text-small text-fg-muted">
              On these answers you are not in categories (a) to (g). FBR can also prescribe other persons or classes as Tier-1 under clause (h), so check
              any FBR notice that names your trade.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-h3 text-fg-strong">Answer each question</p>
            <p className="mt-3 text-small text-fg-muted">One &quot;yes&quot; is enough to make a shop Tier-1. The result updates as you answer.</p>
          </>
        )}
        {answered > 0 ? (
          <SmallButton variant="ghost" className="mt-5 -ml-2 text-fg-muted" onClick={() => setAnswers({})}>
            {Glyph.reset} Start again
          </SmallButton>
        ) : null}
        <SourceNote source={TIER1.source}>This checks the categories in the law text; it is not tax advice.</SourceNote>
      </ResultPanel>
    </ToolFrame>
  );
}
