'use client';

/**
 * The decorative mock-ups of the platform bento and the solutions selector,
 * drawn in the browser. The server sends only the icon name; the drawing
 * code (visuals.tsx, solutionScenes.tsx) loads in its own chunk once the
 * section is about a screen away (RenderNear), so the mock-ups add nothing
 * to the server HTML, the page payload or hydration. They are aria-hidden
 * and data-free, and their containers keep the layout until they arrive.
 */
import dynamic from 'next/dynamic';
import { RenderNear } from '@/components/islands/RenderNear';

const PlatformVisual = dynamic(() => import('./visuals').then((m) => m.PlatformVisual));
const SolutionScene = dynamic(() => import('./solutionScenes').then((m) => m.SolutionScene));

export function LazyPlatformVisual({ icon }: { icon: string }) {
  return (
    <RenderNear>
      <PlatformVisual icon={icon} />
    </RenderNear>
  );
}

export function LazySolutionScene({ icon }: { icon: string }) {
  return (
    <RenderNear>
      <SolutionScene icon={icon} />
    </RenderNear>
  );
}
