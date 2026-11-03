/**
 * Receipt design draft with a debounced save to PATCH /settings/receipt-config.
 * Edits made inside the wait go out as one request; rows still being typed
 * (a payment account without a number) stay on screen but are not saved.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RECEIPT_SETUP_KEY, useReceiptSetup, type PayAccount, type ReceiptDesign } from '@/core/receipt';
import { settingsApi } from '../api/settings';

export function useReceiptDesign() {
  const qc = useQueryClient();
  const setup = useReceiptSetup();
  const [draft, setDraft] = useState<ReceiptDesign | null>(null);
  const [saving, setSaving] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef<Partial<ReceiptDesign>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  // Take the saved design once; later refetches must not undo typing.
  useEffect(() => {
    if (setup.data && setup.isFetched && !loaded.current) { loaded.current = true; setDraft(setup.data.design); }
  }, [setup.data, setup.isFetched]);

  const flush = useCallback(async () => {
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setWaiting(false);
    setSaving(true);
    try {
      await settingsApi.saveReceiptDesign(patch);
      setFailed(false);
      await qc.invalidateQueries({ queryKey: RECEIPT_SETUP_KEY });
    } catch {
      pending.current = { ...patch, ...pending.current };
      setWaiting(true);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }, [qc]);

  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); void flush(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback(<K extends keyof ReceiptDesign>(key: K, value: ReceiptDesign[K], opts: { now?: boolean } = {}) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    const saved = key === 'payAccounts' ? (value as PayAccount[]).filter((a) => a.number.trim()) : value;
    pending.current = { ...pending.current, [key]: saved };
    setWaiting(true);
    if (timer.current) clearTimeout(timer.current);
    if (opts.now) void flush();
    else timer.current = setTimeout(() => void flush(), 700);
  }, [flush]);

  return { setup: setup.data, draft, set, saving, waiting, failed, loading: setup.isLoading && !draft, error: setup.error };
}
