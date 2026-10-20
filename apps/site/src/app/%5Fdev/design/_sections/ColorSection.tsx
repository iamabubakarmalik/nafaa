import colors from 'tailwindcss/colors';
import { Badge, Table, TBody, THead, Td, Th, Tr, cx } from '@/components/ui';
import { Code, DevSection, Group, WHITE, brandChannels, contrast, hexToRgb, rgbToHex, type Rgb } from './shared';

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;

// Class names are listed in full so Tailwind can see them.
const BRAND_BG: Record<(typeof STEPS)[number], string> = {
  '50': 'bg-brand-50', '100': 'bg-brand-100', '200': 'bg-brand-200', '300': 'bg-brand-300',
  '400': 'bg-brand-400', '500': 'bg-brand-500', '600': 'bg-brand-600', '700': 'bg-brand-700',
  '800': 'bg-brand-800', '900': 'bg-brand-900', '950': 'bg-brand-950',
};

const SLATE_BG: Record<(typeof STEPS)[number], string> = {
  '50': 'bg-slate-50', '100': 'bg-slate-100', '200': 'bg-slate-200', '300': 'bg-slate-300',
  '400': 'bg-slate-400', '500': 'bg-slate-500', '600': 'bg-slate-600', '700': 'bg-slate-700',
  '800': 'bg-slate-800', '900': 'bg-slate-900', '950': 'bg-slate-950',
};

const BRAND_ROLES: Partial<Record<(typeof STEPS)[number], string>> = {
  '50': 'Tints',
  '500': 'Brand mark',
  '600': 'Icons, accents',
  '700': 'Text, buttons',
  '800': 'Hover',
};

function Swatch({ step, swatchClass, rgb, role }: { step: string; swatchClass: string; rgb: Rgb; role?: string }) {
  const ratio = contrast(rgb, WHITE);
  return (
    <li className="min-w-0">
      <div className={cx('h-14 rounded-md ring-1 ring-inset ring-slate-950/5', swatchClass)} />
      <div className="mt-2 text-small">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-fg-strong">{step}</span>
          <span className="font-mono text-xs text-fg-subtle">{rgbToHex(rgb)}</span>
        </div>
        <div className="mt-0.5 font-mono text-xs tabular-nums text-fg-subtle">
          {ratio.toFixed(2)}
          <span className="sr-only"> to 1 on white</span>
          {ratio >= 4.5 ? ' AA' : ratio >= 3 ? ' UI' : ''}
        </div>
        {role ? <div className="mt-0.5 truncate text-xs text-fg-muted">{role}</div> : null}
      </div>
    </li>
  );
}

const SEMANTIC = [
  { token: 'canvas', swatch: 'bg-canvas', use: 'bg-canvas', note: 'Section background' },
  { token: 'surface', swatch: 'bg-surface', use: 'bg-surface', note: 'Cards, tables, fields' },
  { token: 'surface-2', swatch: 'bg-surface-2', use: 'bg-surface-2', note: 'Table heads, hover' },
  { token: 'fg-strong', swatch: 'bg-fg-strong', use: 'text-fg-strong', note: 'Headings' },
  { token: 'fg', swatch: 'bg-fg', use: 'text-fg', note: 'Body text' },
  { token: 'fg-muted', swatch: 'bg-fg-muted', use: 'text-fg-muted', note: 'Lead and secondary text' },
  { token: 'fg-subtle', swatch: 'bg-fg-subtle', use: 'text-fg-subtle', note: 'Meta, captions' },
  { token: 'line', swatch: 'bg-line', use: 'border-line', note: 'Hairlines, borders' },
  { token: 'link', swatch: 'bg-link', use: 'text-link', note: 'Links, eyebrows' },
] as const;

const THEMES = ['theme-default', 'theme-muted', 'theme-ink'] as const;

export function ColorSection() {
  const brand = brandChannels();
  return (
    <DevSection
      id="colour"
      title="Colour"
      intro={
        <>
          The brand scale is copied from the web app by <Code>scripts/sync-tokens.mjs</Code>, so the site and the
          product share one green. Neutrals are Tailwind slate. Contrast is measured against white.
        </>
      }
    >
      <Group title="Brand" note="Green text on white uses 700. White text sits on 700 or darker.">
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-11">
          {STEPS.map((step) => (
            <Swatch
              key={step}
              step={step}
              swatchClass={BRAND_BG[step]}
              rgb={brand[step] ?? [0, 0, 0]}
              role={BRAND_ROLES[step]}
            />
          ))}
        </ul>
      </Group>

      <Group title="Slate" note="Neutrals. Ink bands use slate-950.">
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-11">
          {STEPS.map((step) => (
            <Swatch key={step} step={step} swatchClass={SLATE_BG[step]} rgb={hexToRgb(colors.slate[step])} />
          ))}
        </ul>
      </Group>

      <Group
        title="Semantic colours"
        note={
          <>
            Set per section theme as <Code>--c-*</Code>. Components use only these.
          </>
        }
      >
        <Table caption="Semantic colour tokens by section theme" minWidth="lg">
          <THead>
            <Tr>
              <Th>Token</Th>
              <Th>Default</Th>
              <Th>Muted</Th>
              <Th>Ink</Th>
              <Th>Class</Th>
              <Th>Use</Th>
            </Tr>
          </THead>
          <TBody>
            {SEMANTIC.map((row) => (
              <Tr key={row.token}>
                <Td align="middle" className="font-mono text-xs text-fg-strong">{row.token}</Td>
                {THEMES.map((theme) => (
                  <Td key={theme} align="middle">
                    <span className={cx(theme, 'inline-flex rounded-md bg-canvas p-1.5 ring-1 ring-inset ring-slate-950/10')}>
                      <span className={cx('block size-6 rounded-sm ring-1 ring-inset ring-slate-950/10', row.swatch)} />
                    </span>
                  </Td>
                ))}
                <Td align="middle" className="font-mono text-xs">{row.use}</Td>
                <Td align="middle" className="text-fg-muted">{row.note}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Group>

      <Group title="Status tints" note="For badges and callouts only.">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand" dot>
            Brand
          </Badge>
          <Badge tone="info" dot>
            Info
          </Badge>
          <Badge tone="warning" dot>
            Warning
          </Badge>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="outline">Outline</Badge>
        </div>
      </Group>
    </DevSection>
  );
}
