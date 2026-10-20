import { BookOpen, Boxes, CalendarDays, MessageCircle, ShoppingCart } from 'lucide-react';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Divider,
  Eyebrow,
  Kbd,
  LinkButton,
  LinkCard,
  Skeleton,
  TextLink,
  VisuallyHidden,
} from '@/components/ui';
import { Code, DevSection, Group, Specimen } from './shared';

export function ComponentsSection() {
  return (
    <DevSection
      id="components"
      title="Primitives"
      intro={
        <>
          Server components in <Code>src/components/ui</Code>. They read the semantic colours, so the same
          component works on white, muted and ink bands.
        </>
      }
    >
      <Group title="Buttons" note="Variants: primary, secondary, ghost, on-ink. Sizes: sm, md, lg.">
        <Specimen className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href="#components" arrow>
              Get started
            </LinkButton>
            <LinkButton href="#components" variant="secondary" icon={CalendarDays}>
              Book a demo
            </LinkButton>
            <LinkButton href="#components" variant="ghost" icon={MessageCircle}>
              Talk on WhatsApp
            </LinkButton>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
          <div className="theme-ink flex flex-wrap items-center gap-3 rounded-lg bg-canvas p-6">
            <LinkButton href="#components" variant="on-ink" arrow>
              On ink
            </LinkButton>
            <LinkButton href="#components">Primary</LinkButton>
            <LinkButton href="#components" variant="secondary">
              Secondary
            </LinkButton>
            <LinkButton href="#components" variant="ghost">
              Ghost
            </LinkButton>
          </div>
        </Specimen>
      </Group>

      <Group title="Labels and text">
        <Specimen className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand" dot>
                Live
              </Badge>
              <Badge tone="info">Guide</Badge>
              <Badge tone="warning">Beta</Badge>
              <Badge>Retail</Badge>
              <Badge tone="outline">v1</Badge>
            </div>
            <Eyebrow>Inventory</Eyebrow>
            <p className="text-small text-fg-muted">
              Open search with <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
              <VisuallyHidden> (Control and K)</VisuallyHidden>
            </p>
          </div>
          <div className="space-y-6">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '#components' },
                { label: 'Industries', href: '#components' },
                { label: 'Bakery' },
              ]}
            />
            <p className="text-body text-fg">
              An inline <TextLink href="#components">text link</TextLink> has a quiet underline that firms up on
              hover.
            </p>
            <Divider label="or" />
          </div>
        </Specimen>
      </Group>

      <Group title="Cards" note="LinkCard lifts on hover; the whole card is one link.">
        <ul className="grid gap-4 md:grid-cols-3">
          <li>
            <LinkCard
              href="#components"
              icon={ShoppingCart}
              meta="Product"
              title="Point of sale"
              description="Sales, returns and receipts at the counter."
              cta="Learn more"
              headingAs="h4"
            />
          </li>
          <li>
            <LinkCard
              href="#components"
              icon={BookOpen}
              meta="Product"
              title="Khata"
              description="Udhaar sales and payments for each customer."
              cta="Learn more"
              headingAs="h4"
            />
          </li>
          <li>
            <LinkCard
              href="#components"
              icon={Boxes}
              meta="Product"
              title="Inventory"
              description="Stock levels, purchases and transfers between branches."
              cta="Learn more"
              headingAs="h4"
            />
          </li>
        </ul>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <h4 className="text-h4 text-fg-strong">Card</h4>
            <p className="mt-2 text-small text-fg-muted">
              A plain bordered surface with <Code>padding</Code> none, sm, md or lg.
            </p>
          </Card>
          <Card padding="sm" className="space-y-3" as="div">
            <span className="sr-only">Loading placeholder</span>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </Card>
        </div>
      </Group>
    </DevSection>
  );
}
