/**
 * Asks for the owner's or a manager's PIN before a protected counter action
 * (discount above the limit, khata over a customer's credit limit,
 * cancelling a bill, a refund). Same flow as the web: the PIN is checked
 * with the server, then handed back to the caller, which sends it with the
 * request so the server checks it again. A PIN cannot be checked offline.
 *
 *   const pin = await askManagerPin(t('Bill cancel'), 'void');      // null when cancelled
 *   await withManagerPin(t('Return'), (pin) => api.post('/returns', { ...body, managerPin: pin }), 'refund');
 */

import { Delete, LockKeyhole, WifiOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';
import { apiClient } from '@/core/api/client';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Button, Icon, PressableScale, Row, Sheet, Text, useTheme } from '@/design';

/** Counter actions a staff approval PIN can approve (with the matching permission). */
export type PinKind = 'discount' | 'credit' | 'void' | 'refund';

const MAX = 8;

interface Ask { reason: string; kind?: PinKind; resolve: (pin: string | null) => void }
const useAsk = create<{ ask: Ask | null }>(() => ({ ask: null }));

/** Opens the PIN sheet; resolves with the checked PIN, or null. */
export function askManagerPin(reason: string, kind?: PinKind): Promise<string | null> {
  return new Promise((resolve) => {
    useAsk.getState().ask?.resolve(null);
    useAsk.setState({ ask: { reason, kind, resolve } });
  });
}

/** True when the server refused because the owner's or a manager's PIN is needed. */
export function isPinRequired(err: unknown): boolean {
  const res = (err as { response?: { status?: number; data?: { message?: unknown; messageKey?: unknown } } })?.response;
  if (res?.status !== 403) return false;
  const text = `${typeof res.data?.messageKey === 'string' ? res.data.messageKey : ''} ${typeof res.data?.message === 'string' ? res.data.message : ''}`;
  return /PIN chahiye/.test(text);
}

/** Runs a request; when the server asks for the PIN, asks once and sends it again with it. */
export async function withManagerPin<T>(reason: string, run: (pin?: string) => Promise<T>, kind?: PinKind): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (!isPinRequired(e)) throw e;
    const pin = await askManagerPin(reason, kind);
    if (!pin) throw new PinCancelled();
    return run(pin);
  }
}

export class PinCancelled extends Error {
  constructor() {
    super(t('Cancelled'));
    this.name = 'PinCancelled';
  }
}

async function verifyPin(pin: string, kind?: PinKind): Promise<{ valid: boolean; message?: string }> {
  const r = await apiClient.post('/settings/security/verify-pin', { pin, ...(kind ? { for: kind } : {}) });
  return r.data as { valid: boolean; message?: string };
}

/** Mounted once at the app root. */
export function ManagerPinHost() {
  const ask = useAsk((s) => s.ask);
  const done = (pin: string | null) => {
    ask?.resolve(pin);
    useAsk.setState({ ask: null });
  };
  return <ManagerPinSheet open={!!ask} reason={ask?.reason ?? ''} kind={ask?.kind} onDone={done} />;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function ManagerPinSheet({ open, reason, kind, onDone }: { open: boolean; reason: string; kind?: PinKind; onDone: (pin: string | null) => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setPin(''); setError(''); } }, [open]);

  const submit = async (value = pin) => {
    if (value.length < 4) { setError(t('PIN kam se kam 4 hindson ka hai')); return; }
    setBusy(true);
    setError('');
    try {
      const r = await verifyPin(value, kind);
      if (r.valid) { haptic('success'); onDone(value); }
      else { haptic('error'); setError(r.message || t('Ghalat PIN')); setPin(''); }
    } catch {
      setError(t('PIN check nahi hua — internet dekhein'));
    } finally {
      setBusy(false);
    }
  };

  const press = (k: string) => {
    if (busy) return;
    haptic('tap');
    setError('');
    if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
    setPin((p) => (p.length < MAX ? p + k : p));
  };

  return (
    <Sheet
      open={open}
      onClose={() => onDone(null)}
      title={kind ? t('Malik ya manager ka PIN') : t('Malik ka PIN')}
      description={`${t('Is kaam ke liye PIN chahiye:')} ${reason}`}
      footer={
        <Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => onDone(null)}>{t('Wapas')}</Button>
          <Button style={{ flex: 1 }} loading={busy} disabled={!online || pin.length < 4} onPress={() => void submit()}>{t('Theek hai')}</Button>
        </Row>
      }
    >
      {!online ? (
        <Row gap={3} align="start" style={{ padding: th.space(4), borderRadius: th.radius('xl'), backgroundColor: th.colors.warning.soft }}>
          <Icon icon={WifiOff} color={th.colors.warning.text} />
          <Text size="sm" color={th.colors.warning.text} style={{ flex: 1 }}>{t('PIN internet ke bagair check nahi hota. Net aane par dobara koshish karein.')}</Text>
        </Row>
      ) : (
        <View style={{ gap: th.space(3) }}>
          <Row gap={3} justify="center" style={{
            height: 64, borderRadius: th.radius('xl'), borderWidth: 2,
            borderColor: error ? th.colors.danger.border : th.colors.border, backgroundColor: th.colors.surfaceMuted,
          }}>
            <Icon icon={LockKeyhole} tone="muted" />
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < pin.length ? th.colors.text : th.colors.borderStrong }} />
            ))}
          </Row>
          <Text size="sm" weight="medium" align="center" color={th.colors.danger.text} style={{ minHeight: 20 }} accessibilityLiveRegion="polite">{error}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), direction: 'ltr' }}>
            {KEYS.map((k, i) => k === '' ? <View key={`gap-${i}`} style={{ width: '31.5%' }} /> : (
              <PressableScale key={k} onPress={() => press(k)} accessibilityLabel={k === 'del' ? t('Mitayein') : k}
                style={{ width: '31.5%', height: 56, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.surfaceMuted }}>
                {k === 'del' ? <Icon icon={Delete} tone="default" /> : <Text size="xl" weight="semibold" ltr>{k}</Text>}
              </PressableScale>
            ))}
          </View>
        </View>
      )}
    </Sheet>
  );
}
