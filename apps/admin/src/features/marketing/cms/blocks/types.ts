/** Props shared by every block form. */
import type { BlockType, CmsEntryType } from '../contract/cms-contract';
import type { DraftOf } from './registry';

export interface BlockFormProps<T extends BlockType> {
  block: DraftOf<T>;
  /** Shallow patch of the block's props. */
  set: (patch: Partial<DraftOf<T>>) => void;
  /** Contract error for a path relative to the block ("items[0].title"). */
  err: (path: string) => string | undefined;
  entryType: CmsEntryType;
  /** Entry summary, shown where a block falls back to it. */
  summary: string | null;
  /** Entry title, shown where a block falls back to it. */
  title: string;
}

/** Scopes an error lookup to a nested object ("primaryCta" → "label"). */
export function scoped(err: (path: string) => string | undefined, prefix: string) {
  return (path: string) => err(`${prefix}.${path}`);
}

export const FRAME_OPTIONS = [
  { value: 'browser', label: 'Browser' },
  { value: 'phone', label: 'Phone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'none', label: 'Frame nahi' },
] as const;
