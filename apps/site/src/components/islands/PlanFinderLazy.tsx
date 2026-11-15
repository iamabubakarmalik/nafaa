'use client';

/**
 * The plan finder in its own chunk. Still server-rendered; the code loads
 * only on pages that render it, instead of joining the islands chunk that
 * every page built from the shared templates downloads.
 */
import dynamic from 'next/dynamic';

export const PlanFinderLazy = dynamic(() => import('./PlanFinder').then((m) => m.PlanFinder));
