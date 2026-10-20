/**
 * Building blocks for the design gallery only: a titled section, a specimen
 * frame and colour helpers. Not for use on public pages.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

export function DevSection({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line pb-20 pt-12 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="text-h2 text-fg-strong">
        {title}
      </h2>
      {intro ? <p className="mt-3 max-w-measure text-body-lg text-fg-muted">{intro}</p> : null}
      <div className="mt-10 space-y-12">{children}</div>
    </section>
  );
}

export function Group({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-h4 text-fg-strong">{title}</h3>
        {note ? <p className="text-small text-fg-subtle">{note}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Specimen({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-lg border border-line bg-surface p-6 md:p-8', className)}>{children}</div>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm bg-surface-3 px-1.5 py-0.5 font-mono text-[0.8125rem] text-fg-strong">{children}</code>
  );
}

/* ─── Colour helpers (values read from the generated tokens file) ───────── */

export type Rgb = readonly [number, number, number];

export function brandChannels(): Record<string, Rgb> {
  const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  const out: Record<string, Rgb> = {};
  for (const match of css.matchAll(/--brand-(\d+):\s*(\d+)\s+(\d+)\s+(\d+);/g)) {
    out[match[1]!] = [Number(match[2]), Number(match[3]), Number(match[4])];
  }
  return out;
}

export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export const WHITE: Rgb = [255, 255, 255];
