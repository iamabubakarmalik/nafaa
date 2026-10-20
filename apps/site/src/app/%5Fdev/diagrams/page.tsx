/**
 * /_dev/diagrams: gallery of the code-drawn diagrams and screenshot frames
 * (F3). Internal only; the parent layout makes it noindex and 404s it in
 * production unless SITE_DEV_PAGES=true.
 */
import type { Metadata } from 'next';
import { Container, Heading, Section, Text } from '@/components/ui';
import { DiagramGallery } from '@/components/diagrams/gallery/DiagramGallery';
import styles from '@/components/diagrams/gallery/gallery.module.css';
import { FramesGallery } from '@/components/frames/FramesGallery';

export const metadata: Metadata = {
  title: 'Diagrams and frames',
  description: 'Internal gallery of the code-drawn diagrams and screenshot frames.',
};

export default function DiagramsDevPage() {
  return (
    <Section>
      <Container size="wide" className={styles.lab}>
        <Heading as="h1">Diagrams and frames</Heading>
        <Text size="lg" className="mt-3 max-w-measure">
          Every diagram kind, both layouts (resize below 56rem for the phone layout), a dark band, a static diagram, and every
          screenshot frame. Sample content only.
        </Text>
        <label className={styles.toggle}>
          <input type="checkbox" className={styles.rmToggle} /> Preview reduced motion
        </label>
        <DiagramGallery />
        <FramesGallery />
      </Container>
    </Section>
  );
}
