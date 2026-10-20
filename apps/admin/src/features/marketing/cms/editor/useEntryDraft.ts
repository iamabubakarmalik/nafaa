/**
 * Draft state for the entry editor (ARCH 5.3 step 1): local edits, a 2 s
 * debounced PATCH with the entry `version`, conflict (409) handling and a
 * flush() that actions such as Publish and Preview await first.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, apiErrorStatus, cmsApi, cmsKeys } from '@/api/marketing/marketing-cms.api';
import type { AdminEntry, PatchEntryBody, SeoReport } from '../contract/cms-contract';

/** Fields the editor may change (PATCH body minus `version`). */
export type EditableKey = Exclude<keyof PatchEntryBody, 'version'>;
export type DraftPatch = Partial<Pick<AdminEntry, EditableKey & keyof AdminEntry>>;

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

const AUTOSAVE_MS = 2000;

export function useEntryDraft(initial: AdminEntry) {
  const qc = useQueryClient();
  const [entry, setEntry] = useState<AdminEntry>(initial);
  const [pending, setPending] = useState<DraftPatch>({});
  const [state, setState] = useState<SaveState>('saved');
  const [error, setError] = useState<string | null>(null);
  const [seo, setSeo] = useState<SeoReport | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const pendingRef = useRef<DraftPatch>({});
  const versionRef = useRef(initial.version);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const conflictRef = useRef(false);

  /** The entry as the editor shows it: server copy with unsaved edits on top. */
  const view = useMemo(() => ({ ...entry, ...pending }) as AdminEntry, [entry, pending]);

  const save = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (conflictRef.current) return false;
    if (inflight.current) {
      await inflight.current;
      if (Object.keys(pendingRef.current).length === 0) return true;
    }
    const sent = pendingRef.current;
    if (Object.keys(sent).length === 0) return true;

    const run = (async () => {
      setState('saving');
      try {
        const res = await cmsApi.patchEntry(entry.id, { version: versionRef.current, ...sent } as PatchEntryBody);
        versionRef.current = res.entry.version;
        // Keep edits made while the request was in flight.
        const rest: DraftPatch = {};
        for (const [k, v] of Object.entries(pendingRef.current) as [keyof DraftPatch, unknown][]) {
          if ((sent as Record<string, unknown>)[k] !== v) (rest as Record<string, unknown>)[k] = v;
        }
        pendingRef.current = rest;
        setPending(rest);
        setEntry((prev) => ({ ...res.entry, refs: { ...prev.refs, ...res.entry.refs }, mediaRefs: { ...prev.mediaRefs, ...res.entry.mediaRefs } }));
        setSeo(res.seo);
        setSavedAt(new Date().toISOString());
        setError(null);
        setState(Object.keys(rest).length ? 'dirty' : 'saved');
        qc.setQueryData(cmsKeys.entry(entry.id), res.entry);
        qc.invalidateQueries({ queryKey: cmsKeys.entriesAll });
        return true;
      } catch (err) {
        if (apiErrorStatus(err) === 409) {
          conflictRef.current = true;
          setState('conflict');
          setError('Ye entry kisi aur ne badal di hai.');
        } else {
          setState('error');
          setError(apiErrorMessage(err, 'Save nahi hua'));
        }
        return false;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    const ok = await run;
    if (ok && Object.keys(pendingRef.current).length) schedule();
    return ok;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, qc]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  }, [save]);

  const update = useCallback(
    (patch: DraftPatch) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      setPending(pendingRef.current);
      if (!conflictRef.current) {
        setState('dirty');
        schedule();
      }
    },
    [schedule],
  );

  /** Saves now; resolves false when there was a conflict or an error. */
  const flush = useCallback(() => save(), [save]);

  /** Replaces local state with a fresh server copy (after publish, restore, conflict reload). */
  const replace = useCallback(
    (next: AdminEntry, opts: { keepEdits?: boolean } = {}) => {
      versionRef.current = next.version;
      conflictRef.current = false;
      setEntry((prev) => ({ ...next, refs: { ...prev.refs, ...next.refs }, mediaRefs: { ...prev.mediaRefs, ...next.mediaRefs } }));
      qc.setQueryData(cmsKeys.entry(next.id), next);
      qc.invalidateQueries({ queryKey: cmsKeys.entriesAll });
      if (!opts.keepEdits) {
        pendingRef.current = {};
        setPending({});
        setState('saved');
      } else if (Object.keys(pendingRef.current).length) {
        setState('dirty');
        schedule();
      } else {
        setState('saved');
      }
      setError(null);
    },
    [qc, schedule],
  );

  /** Conflict: load the other person's version and drop local edits. */
  const reloadFromServer = useCallback(async () => {
    const fresh = await cmsApi.entry(entry.id);
    replace(fresh);
  }, [entry.id, replace]);

  /** Conflict: keep local edits and write them over the newer version. */
  const overwrite = useCallback(async () => {
    const fresh = await cmsApi.entry(entry.id);
    replace(fresh, { keepEdits: true });
    await save();
  }, [entry.id, replace, save]);

  const addRefs = useCallback((refs: AdminEntry['refs'][string][]) => {
    setEntry((prev) => ({ ...prev, refs: { ...prev.refs, ...Object.fromEntries(refs.map((r) => [r.id, r])) } }));
  }, []);
  const addMedia = useCallback((media: AdminEntry['mediaRefs'][string][]) => {
    setEntry((prev) => ({ ...prev, mediaRefs: { ...prev.mediaRefs, ...Object.fromEntries(media.map((m) => [m.id, m])) } }));
  }, []);

  // Warn before leaving with unsaved edits; flush on unmount.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pendingRef.current).length) {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (Object.keys(pendingRef.current).length && !conflictRef.current) void save();
    };
  }, [save]);

  return { entry: view, server: entry, pending, state, error, seo, setSeo, savedAt, update, flush, replace, reloadFromServer, overwrite, addRefs, addMedia };
}

export type EntryDraft = ReturnType<typeof useEntryDraft>;
