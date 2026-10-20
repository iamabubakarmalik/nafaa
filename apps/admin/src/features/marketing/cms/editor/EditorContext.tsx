/**
 * Editor-wide context: the CMS config, the entry's type and locale, and the
 * resolved entry/media references. Pickers add what they pick, so labels and
 * thumbnails show at once without waiting for the next save.
 */
import { createContext, useContext } from 'react';
import type { AdminEntryRef, CmsConfig, CmsEntryType, PublicMedia } from '../contract/cms-contract';

export interface EditorContextValue {
  config: CmsConfig | undefined;
  entryId: string;
  entryType: CmsEntryType;
  locale: string;
  refs: Record<string, AdminEntryRef>;
  mediaRefs: Record<string, PublicMedia>;
  addRefs: (refs: AdminEntryRef[]) => void;
  addMedia: (media: PublicMedia[]) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

/** Outside the editor (e.g. the new-entry dialog) pickers still work without labels cache. */
const FALLBACK: EditorContextValue = {
  config: undefined,
  entryId: '',
  entryType: 'PAGE',
  locale: 'en',
  refs: {},
  mediaRefs: {},
  addRefs: () => undefined,
  addMedia: () => undefined,
};

export function useEditor(): EditorContextValue {
  return useContext(EditorContext) ?? FALLBACK;
}
