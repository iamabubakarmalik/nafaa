/**
 * Fonts.
 *
 * Bundled: Inter (Latin) and Noto Naskh Arabic (Urdu), loaded once at start
 * (`useBundledFonts`). Any other font chosen in Appearance (here or on the
 * web) is downloaded from Google Fonts in the background; until it arrives
 * the bundled font is used, so text never disappears.
 */

import * as Font from 'expo-font';
import { useEffect } from 'react';
import { create } from 'zustand';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  NotoNaskhArabic_400Regular, NotoNaskhArabic_500Medium, NotoNaskhArabic_600SemiBold, NotoNaskhArabic_700Bold,
} from '@expo-google-fonts/noto-naskh-arabic';
import { BUNDLED, WEIGHT_NUM, findLatinFont, findUrduFont, type FontWeight } from '../tokens/typography';

export function useBundledFonts(): boolean {
  const [loaded, error] = Font.useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    NotoNaskhArabic_400Regular, NotoNaskhArabic_500Medium, NotoNaskhArabic_600SemiBold, NotoNaskhArabic_700Bold,
  });
  // A font error must never block the app; system fonts take over.
  return loaded || !!error;
}

interface RemoteFonts {
  /** family -> weights that finished loading */
  ready: Record<string, number[]>;
  pending: Record<string, boolean>;
  failed: Record<string, boolean>;
}

export const useRemoteFonts = create<RemoteFonts>(() => ({ ready: {}, pending: {}, failed: {} }));

const remoteName = (family: string, weight: number) => `gf_${family.replace(/\s+/g, '_')}_${weight}`;

/** Downloads a Google Font family (all weights it has). Resolves true when usable. */
export async function loadGoogleFont(family: string): Promise<boolean> {
  const state = useRemoteFonts.getState();
  if (state.ready[family]?.length) return true;
  if (state.pending[family]) return false;
  useRemoteFonts.setState((s) => ({ pending: { ...s.pending, [family]: true } }));
  try {
    const url = `https://fonts.googleapis.com/css?family=${encodeURIComponent(family).replace(/%20/g, '+')}:400,500,600,700,800`;
    const css = await fetch(url).then((r) => (r.ok ? r.text() : ''));
    const faces = [...css.matchAll(/font-weight:\s*(\d+);[\s\S]*?src:\s*url\(([^)]+)\)/g)].map((m) => ({ weight: Number(m[1]), uri: m[2] }));
    const unique = faces.filter((f, i) => faces.findIndex((x) => x.weight === f.weight) === i);
    if (!unique.length) throw new Error('no faces');
    await Font.loadAsync(Object.fromEntries(unique.map((f) => [remoteName(family, f.weight), { uri: f.uri }])));
    useRemoteFonts.setState((s) => ({
      ready: { ...s.ready, [family]: unique.map((f) => f.weight).sort() },
      pending: { ...s.pending, [family]: false },
    }));
    return true;
  } catch {
    useRemoteFonts.setState((s) => ({ pending: { ...s.pending, [family]: false }, failed: { ...s.failed, [family]: true } }));
    return false;
  }
}

/** Starts downloads for the chosen fonts when they are not bundled. */
export function useChosenFonts(latinId: string, urduId: string, needUrdu: boolean) {
  useEffect(() => {
    const latin = findLatinFont(latinId);
    if (latin.family) void loadGoogleFont(latin.family);
    const urdu = findUrduFont(urduId);
    if (needUrdu && urdu.family) void loadGoogleFont(urdu.family);
  }, [latinId, urduId, needUrdu]);
}

export interface FontSet {
  latin: Record<FontWeight, string | undefined>;
  urdu: Record<FontWeight, string>;
}

function nearest(weights: number[], want: number): number {
  return weights.reduce((best, w) => (Math.abs(w - want) < Math.abs(best - want) ? w : best), weights[0]);
}

/** Font family names per weight for the current choice, falling back to bundled fonts. */
export function resolveFontSet(latinId: string, urduId: string, ready: RemoteFonts['ready']): FontSet {
  const weights: FontWeight[] = ['regular', 'medium', 'semibold', 'bold', 'heavy'];
  const latin = findLatinFont(latinId);
  const urdu = findUrduFont(urduId);
  const latinReady = latin.family ? ready[latin.family] : undefined;
  const urduReady = urdu.family ? ready[urdu.family] : undefined;
  const out: FontSet = { latin: {} as FontSet['latin'], urdu: {} as FontSet['urdu'] };
  for (const w of weights) {
    if (latin.id === 'system') out.latin[w] = undefined;
    else if (latin.family && latinReady?.length) out.latin[w] = remoteName(latin.family, nearest(latinReady, WEIGHT_NUM[w]));
    else out.latin[w] = BUNDLED.latin[w];
    out.urdu[w] = urdu.family && urduReady?.length ? remoteName(urdu.family, nearest(urduReady, WEIGHT_NUM[w])) : BUNDLED.urdu[w];
  }
  return out;
}
