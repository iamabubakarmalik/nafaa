import type { Metadata } from 'next';
import { Container, Heading, LinkCard, Section, Text } from '@/components/ui';
import { Palette, Workflow } from 'lucide-react';

export const metadata: Metadata = { title: 'Internal galleries' };

/** Index of the internal galleries. Other agents add their galleries here. */
export default function DevIndexPage() {
  return (
    <Section>
      <Container>
        <Heading as="h1">Internal galleries</Heading>
        <Text size="lg" className="mt-3 max-w-measure">
          Review pages for the site&apos;s building blocks. Not indexed, and not served in production.
        </Text>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <LinkCard
              href="/_dev/design"
              icon={Palette}
              title="Design system"
              description="Tokens, type, spacing, primitives, section themes and motion."
              cta="Open"
            />
          </li>
          <li>
            <LinkCard
              href="/_dev/diagrams"
              icon={Workflow}
              title="Diagrams and frames"
              description="Code-drawn diagrams, screenshot frames and callouts."
              cta="Open"
            />
          </li>
        </ul>
      </Container>
    </Section>
  );
}
