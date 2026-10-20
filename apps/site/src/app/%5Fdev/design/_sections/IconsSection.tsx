import {
  BookOpen,
  ChartColumn,
  Cloud,
  Package,
  Printer,
  Receipt,
  ScanBarcode,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon, IconTile } from '@/components/ui';
import { Code, DevSection, Group, Specimen } from './shared';

const SET: [string, LucideIcon][] = [
  ['store', Store],
  ['shopping-cart', ShoppingCart],
  ['receipt', Receipt],
  ['scan-barcode', ScanBarcode],
  ['package', Package],
  ['book-open', BookOpen],
  ['wallet', Wallet],
  ['users', Users],
  ['truck', Truck],
  ['printer', Printer],
  ['wifi-off', WifiOff],
  ['cloud', Cloud],
  ['chart-column', ChartColumn],
];

export function IconsSection() {
  return (
    <DevSection
      id="icons"
      title="Icons"
      intro={
        <>
          Lucide only, 1.75 stroke. The CMS stores icon names; <Code>src/lib/icons.ts</Code> maps them to
          components on the server, so icons cost no client JavaScript.
        </>
      }
    >
      <Group title="Set" note="Sizes sm 16, md 20, lg 24">
        <Specimen>
          <ul className="grid grid-cols-3 gap-6 sm:grid-cols-5 lg:grid-cols-7">
            {SET.map(([name, glyph]) => (
              <li key={name} className="flex flex-col items-center gap-2 text-center">
                <span className="flex items-end gap-2 text-fg-strong">
                  <Icon icon={glyph} size="sm" />
                  <Icon icon={glyph} size="md" />
                  <Icon icon={glyph} size="lg" />
                </span>
                <span className="font-mono text-[0.6875rem] text-fg-subtle">{name}</span>
              </li>
            ))}
          </ul>
        </Specimen>
      </Group>

      <Group title="Icon tiles and accents" note="A block may set --accent (RGB channels), for example an industry colour.">
        <Specimen className="flex flex-wrap items-center gap-6">
          <IconTile icon={Store} />
          <IconTile icon={Store} size="lg" />
          <div className="flex items-center gap-3" style={{ '--accent': '3 105 161' }}>
            <IconTile icon={Truck} size="lg" />
            <span className="text-small text-fg-muted">
              <Code>--accent: 3 105 161</Code>
            </span>
          </div>
          <div className="theme-ink flex items-center gap-3 rounded-lg bg-canvas p-3">
            <IconTile icon={Cloud} />
            <span className="text-small text-fg-muted">On ink</span>
          </div>
        </Specimen>
      </Group>
    </DevSection>
  );
}
