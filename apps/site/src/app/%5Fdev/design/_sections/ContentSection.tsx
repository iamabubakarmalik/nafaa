import { Prose, Table, TBody, THead, Td, Th, Tr } from '@/components/ui';
import { motion } from '@/styles/scale';
import { Code, DevSection, Group } from './shared';

export function ContentSection() {
  return (
    <DevSection
      id="content"
      title="Prose and tables"
      intro={
        <>
          CMS Markdown renders inside <Code>Prose</Code> (68ch, 17px, 1.75 line height). Tables use real{' '}
          <Code>&lt;table&gt;</Code> markup with a caption and scroll inside their own frame on phones.
        </>
      }
    >
      <Group title="Prose">
        <div className="rounded-lg border border-line bg-surface p-6 md:p-10">
          <Prose>
            <p>
              Long-form pages (guides, blog posts, glossary terms) are written in Markdown in the admin panel and
              rendered on the server. Links such as <a href="#content">the pricing page</a> use the link colour,
              and <strong>bold text</strong> steps up to the heading colour.
            </p>
            <h3>A third-level heading</h3>
            <p>
              Inline code looks like <code>{'{{price:min.monthly}}'}</code>. Lists keep a comfortable rhythm:
            </p>
            <ul>
              <li>Unordered items use a subtle marker.</li>
              <li>Each item wraps with balanced line lengths.</li>
            </ul>
            <ol>
              <li>Ordered steps use tabular numerals.</li>
              <li>Headings get a scroll margin for anchor links.</li>
            </ol>
            <blockquote>
              <p>Quotes sit behind a thin brand rule.</p>
            </blockquote>
            <h4>A fourth-level heading</h4>
            <p>Body text closes the section.</p>
          </Prose>
        </div>
      </Group>

      <Group title="Table">
        <Table caption="Motion tokens" showCaption minWidth="sm">
          <THead>
            <Tr>
              <Th>Token</Th>
              <Th>Value</Th>
              <Th>Use</Th>
            </Tr>
          </THead>
          <TBody>
            <Tr>
              <Td className="font-mono text-xs">--ease-out</Td>
              <Td className="font-mono text-xs">{motion.easing.out}</Td>
              <Td>Entrances, hovers, reveals</Td>
            </Tr>
            <Tr>
              <Td className="font-mono text-xs">--ease-in-out</Td>
              <Td className="font-mono text-xs">{motion.easing['in-out']}</Td>
              <Td>Loops (packets travelling)</Td>
            </Tr>
            <Tr>
              <Td className="font-mono text-xs">--d-fast</Td>
              <Td className="font-mono text-xs">{motion.duration.fast}</Td>
              <Td>Colour and press feedback</Td>
            </Tr>
            <Tr>
              <Td className="font-mono text-xs">--d-base</Td>
              <Td className="font-mono text-xs">{motion.duration.base}</Td>
              <Td>Card lift</Td>
            </Tr>
            <Tr>
              <Td className="font-mono text-xs">--d-slow</Td>
              <Td className="font-mono text-xs">{motion.duration.slow}</Td>
              <Td>Node pop-in</Td>
            </Tr>
            <Tr>
              <Td className="font-mono text-xs">--d-draw</Td>
              <Td className="font-mono text-xs">{motion.duration.draw}</Td>
              <Td>Diagram lines drawing in</Td>
            </Tr>
          </TBody>
        </Table>
      </Group>
    </DevSection>
  );
}
