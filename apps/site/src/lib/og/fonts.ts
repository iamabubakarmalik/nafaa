/**
 * Fonts for OG cards: Inter 400 and 600 (latin subset, WOFF, from Fontsource,
 * SIL OFL; see src/assets/fonts/OFL.txt). Satori reads TTF, OTF and WOFF but
 * not WOFF2 or variable fonts, which is why these are separate static files.
 *
 * Read once per server process. The `process.cwd()` join is the pattern Next
 * documents for Node-runtime OG routes. To be sure Vercel's file tracing ships
 * the fonts, next.config should list them under `outputFileTracingIncludes`
 * (`'/**': ['./src/assets/fonts/**']`).
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ImageResponse } from 'next/og';

type ImageResponseOptions = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>;
export type OgFont = NonNullable<ImageResponseOptions['fonts']>[number];

export const OG_FONT_FAMILY = 'Inter';

const FONT_FILES = [
  { file: 'inter-latin-400-normal.woff', weight: 400 },
  { file: 'inter-latin-600-normal.woff', weight: 600 },
] as const;

let fontsPromise: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ file, weight }) => ({
      name: OG_FONT_FAMILY,
      data: await readFile(path.join(process.cwd(), 'src/assets/fonts', file)),
      weight,
      style: 'normal' as const,
    })),
  ).catch((error: unknown) => {
    // Let the next request try again instead of caching the failure.
    fontsPromise = null;
    throw error;
  });
  return fontsPromise;
}
