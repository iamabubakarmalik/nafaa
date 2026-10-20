import { cx } from '@/components/ui';
import { radii, shadows, widths } from '@/styles/scale';
import { Code, DevSection, Group, Specimen } from './shared';

const SPACING = [
  { step: '1', cls: 'w-1' },
  { step: '2', cls: 'w-2' },
  { step: '3', cls: 'w-3' },
  { step: '4', cls: 'w-4' },
  { step: '6', cls: 'w-6' },
  { step: '8', cls: 'w-8' },
  { step: '12', cls: 'w-12' },
  { step: '16', cls: 'w-16' },
  { step: '24', cls: 'w-24' },
  { step: '32', cls: 'w-32' },
] as const;

// Bar widths are relative to the widest container (80rem); 68ch is about 37rem in Inter.
const WIDTHS = [
  { name: 'wide', value: widths.wide, bar: 'w-full', use: 'Full-bleed media rows' },
  { name: 'container', value: widths.container, bar: 'w-[90%]', use: 'Default page width' },
  { name: 'measure', value: widths.measure, bar: 'w-[52.5%]', use: 'Section intros' },
  { name: 'prose', value: widths.prose, bar: 'w-[46%]', use: 'Long-form text' },
] as const;

const RADIUS_CLASS: Record<keyof typeof radii, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

const RADIUS_USE: Record<keyof typeof radii, string> = {
  sm: 'Kbd, swatches',
  md: 'Buttons, icon tiles',
  lg: 'Cards, frames, tables',
  xl: 'Large panels',
};

const SHADOW_CLASS: Record<keyof typeof shadows, string> = {
  e1: 'shadow-e1',
  e2: 'shadow-e2',
  e3: 'shadow-e3',
};

const SHADOW_USE: Record<keyof typeof shadows, string> = {
  e1: 'Resting cards and buttons',
  e2: 'Card hover',
  e3: 'Floating screenshot frames',
};

export function LayoutSection() {
  return (
    <DevSection
      id="layout"
      title="Space, radius and depth"
      intro="Tailwind's 4px scale for spacing, plus two fluid layout tokens. Four radii cover almost everything; three shadows, all low-alpha slate."
    >
      <Group title="Layout tokens" note="Live values at this viewport">
        <Specimen className="grid gap-8 md:grid-cols-2">
          <div className="flex items-end gap-5">
            <div className="h-section w-10 rounded-sm bg-brand-100 ring-1 ring-inset ring-brand-600/20" />
            <div className="text-small">
              <div className="font-mono text-xs font-medium text-fg-strong">--section-y</div>
              <div className="mt-1 font-mono text-xs text-fg-subtle">clamp(4rem, 3rem + 4vw, 8rem)</div>
              <div className="mt-1 text-fg-muted">Vertical rhythm of every Section</div>
            </div>
          </div>
          <div className="flex items-end gap-5">
            <div className="h-10 w-gutter rounded-sm bg-brand-100 ring-1 ring-inset ring-brand-600/20" />
            <div className="text-small">
              <div className="font-mono text-xs font-medium text-fg-strong">--gutter</div>
              <div className="mt-1 font-mono text-xs text-fg-subtle">clamp(1.25rem, 0.75rem + 2vw, 2rem)</div>
              <div className="mt-1 text-fg-muted">Side padding of every Container</div>
            </div>
          </div>
        </Specimen>
      </Group>

      <Group title="Widths">
        <Specimen className="space-y-4">
          {WIDTHS.map((w) => (
            <div key={w.name}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-small">
                <span>
                  <span className="font-mono text-xs font-medium text-fg-strong">max-w-{w.name}</span>
                  <span className="ml-2 font-mono text-xs text-fg-subtle">{w.value}</span>
                </span>
                <span className="text-xs text-fg-muted">{w.use}</span>
              </div>
              <div className={cx('h-2 rounded-full bg-brand-200', w.bar)} />
            </div>
          ))}
        </Specimen>
      </Group>

      <Group title="Spacing" note="Tailwind steps; 1 step = 4px">
        <Specimen>
          <ul className="space-y-2.5">
            {SPACING.map((s) => (
              <li key={s.step} className="flex items-center gap-4">
                <span className="w-10 shrink-0 font-mono text-xs text-fg-strong">{s.step}</span>
                <span className="w-12 shrink-0 font-mono text-xs text-fg-subtle">{Number(s.step) * 4}px</span>
                <span className={cx('h-3 rounded-sm bg-brand-500/80', s.cls)} />
              </li>
            ))}
          </ul>
        </Specimen>
      </Group>

      <div className="grid gap-12 lg:grid-cols-2">
        <Group title="Radius">
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(radii) as (keyof typeof radii)[]).map((name) => (
              <div key={name} className={cx('border border-line bg-surface p-5', RADIUS_CLASS[name])}>
                <div className="font-mono text-xs font-medium text-fg-strong">
                  rounded-{name} <span className="text-fg-subtle">{radii[name]}</span>
                </div>
                <div className="mt-1 text-xs text-fg-muted">{RADIUS_USE[name]}</div>
              </div>
            ))}
          </div>
        </Group>

        <Group title="Elevation">
          <div className="grid gap-4 rounded-xl bg-surface-3 p-5 ring-1 ring-inset ring-line">
            {(Object.keys(shadows) as (keyof typeof shadows)[]).map((name) => (
              <div key={name} className={cx('rounded-lg bg-white p-4', SHADOW_CLASS[name])}>
                <div className="font-mono text-xs font-medium text-slate-900">shadow-{name}</div>
                <div className="mt-1 text-xs text-slate-600">{SHADOW_USE[name]}</div>
              </div>
            ))}
          </div>
        </Group>
      </div>

      <p className="text-small text-fg-subtle">
        Borders are <Code>border-line</Code> (slate-200 on light bands). No raw hex values or inline styles in
        components; ESLint blocks both (inline <Code>style</Code> may only set CSS custom properties).
      </p>
    </DevSection>
  );
}
