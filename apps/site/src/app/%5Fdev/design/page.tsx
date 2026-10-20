/**
 * /_dev/design: the design system gallery (tokens, type, primitives, section
 * themes, motion). Internal only: noindex, and 404 in production unless
 * SITE_DEV_PAGES=true (see ../layout.tsx).
 */
import type { Metadata } from 'next';
import { Backdrop, Badge, Container, Eyebrow, Heading, Text } from '@/components/ui';
import { ColorSection } from './_sections/ColorSection';
import { ComponentsSection } from './_sections/ComponentsSection';
import { ContentSection } from './_sections/ContentSection';
import { IconsSection } from './_sections/IconsSection';
import { LayoutSection } from './_sections/LayoutSection';
import { MotionSection } from './_sections/MotionSection';
import { ThemesSection } from './_sections/ThemesSection';
import { TypeSection } from './_sections/TypeSection';
import './dev.css';

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Internal gallery of the nafaa.pk design system.',
};

const TOC = [
  { id: 'colour', label: 'Colour' },
  { id: 'type', label: 'Typography' },
  { id: 'layout', label: 'Space, radius, depth' },
  { id: 'components', label: 'Primitives' },
  { id: 'content', label: 'Prose and tables' },
  { id: 'icons', label: 'Icons' },
  { id: 'themes', label: 'Section themes' },
  { id: 'motion', label: 'Motion' },
] as const;

export default function DesignSystemPage() {
  return (
    <>
      <header className="theme-default relative isolate overflow-hidden border-b border-line">
        <Backdrop variant="grid" />
        <Container size="wide" className="pb-14 pt-16 md:pb-20 md:pt-24">
          <Eyebrow>Nafaa site · internal</Eyebrow>
          <Heading as="h1" size="display" className="mt-4 max-w-[16ch]">
            Design system
          </Heading>
          <Text size="lg" className="mt-5 max-w-measure">
            Tokens, type, primitives, section themes and motion for the new nafaa.pk. Light, calm and product-led:
            the colour comes from the product, the motion explains, and nothing waits on JavaScript to appear.
          </Text>
          <div className="mt-8 flex flex-wrap gap-2">
            <Badge tone="brand" dot>
              Tokens synced from apps/web
            </Badge>
            <Badge tone="outline">Next 15 · Tailwind 3.4</Badge>
            <Badge tone="outline">Zero-JS reveal</Badge>
            <Badge tone="outline">Reduced motion respected</Badge>
          </div>
        </Container>
      </header>

      <Container size="wide" className="py-14 md:py-20">
        <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Sections" className="mb-12 lg:mb-0">
            <ul className="flex flex-wrap gap-2 lg:sticky lg:top-8 lg:flex-col lg:gap-0.5">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block rounded-md border border-line px-3 py-1.5 text-small text-fg-muted transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong lg:border-0 lg:px-2.5"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0">
            <ColorSection />
            <TypeSection />
            <LayoutSection />
            <ComponentsSection />
            <ContentSection />
            <IconsSection />
            <ThemesSection />
            <MotionSection />
          </div>
        </div>
      </Container>
    </>
  );
}
