import { Receipt, WifiOff } from 'lucide-react';
import { Backdrop, Card, IconTile, LinkButton, Section, SectionHeader, type SectionTheme } from '@/components/ui';
import { Code, DevSection } from './shared';

const BANDS: { theme: SectionTheme; title: string; intro: string; backdrop: 'grid' | 'dots' | 'glow' }[] = [
  {
    theme: 'default',
    title: 'Default band',
    intro: 'White canvas. Most sections use it, with the brand grid behind a hero.',
    backdrop: 'grid',
  },
  {
    theme: 'muted',
    title: 'Muted band',
    intro: 'Slate-50 canvas with hairlines top and bottom, to separate neighbouring sections.',
    backdrop: 'dots',
  },
  {
    theme: 'ink',
    title: 'Ink band',
    intro: 'Slate-950 for contrast moments such as a closing call to action. Text and links switch automatically.',
    backdrop: 'glow',
  },
];

export function ThemesSection() {
  return (
    <DevSection
      id="themes"
      title="Section themes"
      intro={
        <>
          <Code>Section theme=&quot;default | muted | ink&quot;</Code> swaps the semantic colours for everything
          inside. Nothing below takes a colour prop.
        </>
      }
    >
      <div className="space-y-6">
        {BANDS.map((band) => (
          <Section
            key={band.theme}
            as="div"
            theme={band.theme}
            spacing="compact"
            className="overflow-hidden rounded-xl border border-line"
          >
            <Backdrop variant={band.backdrop} />
            <div className="grid gap-10 px-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center">
              <SectionHeader eyebrow={band.theme} title={band.title} intro={band.intro} as="h3" size="h3">
                <LinkButton href="#themes" variant={band.theme === 'ink' ? 'on-ink' : 'primary'} arrow>
                  Primary action
                </LinkButton>
                <LinkButton href="#themes" variant="secondary">
                  Secondary
                </LinkButton>
              </SectionHeader>
              <div className="grid gap-3">
                <Card padding="sm" className="flex items-start gap-4">
                  <IconTile icon={WifiOff} />
                  <div>
                    <p className="text-h4 text-fg-strong">Card on {band.theme}</p>
                    <p className="mt-1 text-small text-fg-muted">Surface, border and text follow the band.</p>
                  </div>
                </Card>
                <Card padding="sm" className="flex items-start gap-4">
                  <IconTile icon={Receipt} />
                  <div>
                    <p className="text-h4 text-fg-strong">Second card</p>
                    <p className="mt-1 text-small text-fg-subtle">Subtle text keeps AA contrast here too.</p>
                  </div>
                </Card>
              </div>
            </div>
          </Section>
        ))}
      </div>
    </DevSection>
  );
}
