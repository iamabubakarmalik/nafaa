/**
 * A change the assistant proposes (sale, expense, price, stock, customer,
 * khata payment, purchase draft). Nothing is written until the user presses
 * Confirm; a proposal is single use and expires after a few minutes. Fields
 * and line quantities can be edited first; changed values go back as `fields`
 * (`qty:<productId>` for line quantities). The server checks everything again.
 */

import axios from 'axios';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, WifiOff, XCircle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Amount, Button, Card, Icon, Input, PressableScale, Select, Text, useTheme } from '@/design';
import { aiApi, type AiActionProposal, type AiLink } from '../api/ai';
import { openAiLink } from '../lib/links';
import { useAiStore, type ActionOutcome } from '../store';

const qtyText = (n: number) => Number(n.toFixed(3)).toLocaleString('en-US');

function useSecondsLeft(expiresAt: string, active: boolean) {
  const end = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return Math.max(0, Math.floor((end - now) / 1000));
}

function LinkChip({ l }: { l: AiLink }) {
  const th = useTheme();
  const c = th.colors;
  return (
    <PressableScale onPress={() => openAiLink(l)} haptic="tap" accessibilityRole="link" style={{
      flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: th.space(3), height: 34, borderRadius: th.radius('full'),
      backgroundColor: l.primary ? c.brand.solid : c.brand.soft,
    }}>
      <Text size="sm" weight="semibold" color={l.primary ? c.brand.onSolid : c.brand.text}>{l.label}</Text>
      <Icon icon={ArrowUpRight} size={14} flip color={l.primary ? c.brand.onSolid : c.brand.text} />
    </PressableScale>
  );
}

function Outcome({ outcome }: { outcome: ActionOutcome }) {
  const th = useTheme();
  const icon = outcome.status === 'done' ? CheckCircle2 : outcome.status === 'cancelled' ? XCircle : AlertTriangle;
  const tone = outcome.status === 'done' ? 'success' : outcome.status === 'cancelled' ? 'subtle' : 'warning';
  return (
    <View style={{ gap: th.space(2) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'flex-start' }}>
        <Icon icon={icon} size={18} tone={tone} />
        <Text size="sm" style={{ flex: 1 }}>{outcome.message}</Text>
      </View>
      {outcome.links.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {outcome.links.map((l) => <LinkChip key={`${l.to}:${l.label}`} l={l} />)}
        </View>
      )}
    </View>
  );
}

export function AiActionCard({ action }: { action: AiActionProposal }) {
  const th = useTheme();
  const outcome = useAiStore((s) => s.actionOutcomes[action.id]);
  const setOutcome = useAiStore((s) => s.setActionOutcome);
  const online = useOnlineStatus();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(action.fields.map((f) => [f.key, f.value == null ? '' : String(f.value)])));
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries((action.lines ?? []).map((l) => [l.productId, String(l.qty)])));
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const secondsLeft = useSecondsLeft(action.expiresAt, !outcome);
  const expired = !outcome && secondsLeft <= 0;
  const final: ActionOutcome | null = outcome ?? (expired ? { status: 'expired', message: t('Waqt khatam — ye action ab nahi ho sakta. Dobara poochein.'), links: [] } : null);

  const lines = useMemo(() => (action.lines ?? []).map((l) => {
    const q = Number(qty[l.productId]);
    const n = Number.isFinite(q) && q >= 0 ? q : l.qty;
    return { ...l, qty: n, total: Math.round(n * l.price * 100) / 100 };
  }), [action.lines, qty]);

  const totals = useMemo(() => {
    if (!action.totals) return null;
    if (!lines.length) return action.totals;
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const extra = action.totals.total - action.totals.subtotal;
    const total = Math.round((subtotal + extra) * 100) / 100;
    const paid = action.totals.paid;
    return { subtotal, total, paid, credit: paid != null ? Math.max(0, Math.round((total - paid) * 100) / 100) : action.totals.credit };
  }, [action.totals, lines]);

  const changed = (): Record<string, string | number> => {
    const out: Record<string, string | number> = {};
    for (const f of action.fields) {
      const v = values[f.key] ?? '';
      if (v === (f.value == null ? '' : String(f.value))) continue;
      out[f.key] = f.type === 'number' || f.type === 'money' ? Number(v) : v;
    }
    for (const l of action.lines ?? []) {
      const v = qty[l.productId];
      if (v != null && Number(v) !== l.qty) out[`qty:${l.productId}`] = Number(v);
    }
    return out;
  };

  const confirm = async () => {
    if (busy || final || !online) return;
    const missing = action.fields.find((f) => f.required && !(values[f.key] ?? '').trim());
    if (missing) { setError(t('"{{label}}" zaroori hai', { label: missing.label })); return; }
    setBusy('confirm');
    setError(null);
    try {
      const res = await aiApi.confirmAction(action.id, changed());
      setOutcome(action.id, { status: res.ok ? 'done' : 'failed', message: res.message, links: res.links ?? [] });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const body = axios.isAxiosError(err) ? (err.response?.data as { message?: string | string[] } | undefined) : undefined;
      const msg = Array.isArray(body?.message) ? body?.message.join(', ') : body?.message;
      if (status === 400) setError(msg || t('Kuch ghalat hai — fields check karein'));
      else if (status === 410) setOutcome(action.id, { status: 'expired', message: msg || t('Ye action pehle hi ho chuka ya waqt khatam ho gaya.'), links: [] });
      else if (status === 403) setOutcome(action.id, { status: 'failed', message: msg || t('Is kaam ki permission aap ke paas nahi.'), links: [] });
      else setError(msg || t('Action nahi ho saka — internet check kar ke dobara koshish karein'));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (busy || final) return;
    setBusy('cancel');
    try { await aiApi.cancelAction(action.id); } catch { /* the proposal expires on its own */ }
    setOutcome(action.id, { status: 'cancelled', message: t('Cancel kar diya — kuch save nahi hua.'), links: [] });
    setBusy(null);
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const readOnly = !!final || busy === 'confirm';

  return (
    <Card
      title={action.title}
      description={action.summary || undefined}
      tone={final?.status === 'done' ? 'success' : 'default'}
      action={!final ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon icon={Clock} size={14} tone={secondsLeft < 60 ? 'warning' : 'subtle'} />
          <Text size="xs" tone={secondsLeft < 60 ? 'warning' : 'muted'} ltr tabular>{`${mm}:${ss}`}</Text>
        </View>
      ) : undefined}
    >
      {final ? <Outcome outcome={final} /> : (
        <View style={{ gap: th.space(3) }}>
          {action.warnings.length > 0 && (
            <View style={{ gap: th.space(1), padding: th.space(2.5), borderRadius: th.radius('md'), backgroundColor: th.colors.warning.soft }}>
              {action.warnings.map((w, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: th.space(1.5), alignItems: 'flex-start' }}>
                  <Icon icon={AlertTriangle} size={14} tone="warning" />
                  <Text size="xs" tone="warning" style={{ flex: 1 }}>{w}</Text>
                </View>
              ))}
            </View>
          )}

          {action.fields.map((f) => f.type === 'select' ? (
            <Select key={f.key} label={f.label} value={values[f.key] ?? ''} disabled={readOnly}
              onChange={(v) => setValues((x) => ({ ...x, [f.key]: v }))}
              options={[...(f.required ? [] : [{ value: '', label: '—' }]), ...(f.options ?? [])]} />
          ) : (
            <Input key={f.key} label={f.required ? `${f.label} *` : f.label} size="md" disabled={readOnly}
              value={values[f.key] ?? ''} onChangeText={(v) => setValues((x) => ({ ...x, [f.key]: v }))}
              keyboardType={f.type === 'text' ? 'default' : 'decimal-pad'} ltr={f.type !== 'text'} />
          ))}

          {lines.length > 0 && (
            <View style={{ gap: th.space(2) }}>
              {lines.map((l) => (
                <View key={l.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                  <View style={{ flex: 1 }}>
                    <Text size="sm" weight="medium" numberOfLines={2}>{l.name}</Text>
                    <Text size="xs" tone={l.stock != null && l.qty > l.stock ? 'warning' : 'muted'}>
                      {l.stock != null ? `${t('Stock {{stock}} {{unit}}', { stock: qtyText(l.stock), unit: l.unit })} · ` : ''}<Amount value={l.price} size="xs" tone="muted" />
                    </Text>
                  </View>
                  <View style={{ width: 72 }}>
                    <Input size="md" ltr keyboardType="decimal-pad" disabled={readOnly} accessibilityLabel={t('{{name}} qty', { name: l.name })}
                      value={qty[l.productId] ?? ''} onChangeText={(v) => setQty((q) => ({ ...q, [l.productId]: v }))} />
                  </View>
                  <View style={{ width: 84, alignItems: 'flex-end' }}><Amount value={l.total} weight="semibold" size="sm" /></View>
                </View>
              ))}
            </View>
          )}

          {totals && (
            <View style={{ gap: 2, padding: th.space(2.5), borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted }}>
              {totals.subtotal !== totals.total && <TotalRow label={t('Subtotal')} value={totals.subtotal} />}
              <TotalRow label={t('Total')} value={totals.total} strong />
              {totals.paid != null && <TotalRow label={t('Paid')} value={totals.paid} />}
              {totals.credit != null && totals.credit > 0 && <TotalRow label={t('Udhaar')} value={totals.credit} warn />}
            </View>
          )}

          {error && <Text size="sm" tone="danger">{error}</Text>}
          {!online && (
            <View style={{ flexDirection: 'row', gap: th.space(1.5), alignItems: 'center' }}>
              <Icon icon={WifiOff} size={14} tone="warning" />
              <Text size="xs" tone="warning">{t('Internet nahi — action abhi nahi ho sakta')}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: th.space(2), alignItems: 'center', flexWrap: 'wrap' }}>
            <Button size="md" loading={busy === 'confirm'} disabled={!online || !!busy} onPress={confirm}>{action.confirmLabel || t('Confirm')}</Button>
            <Button size="md" variant="secondary" disabled={!!busy} onPress={cancel}>{t('Cancel')}</Button>
            {action.alt && (
              <Button size="md" variant="link" iconEnd={ArrowUpRight} onPress={() => openAiLink(action.alt!)}>{action.alt.label}</Button>
            )}
          </View>
        </View>
      )}
    </Card>
  );
}

function TotalRow({ label, value, strong, warn }: { label: string; value: number; strong?: boolean; warn?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text size="sm" weight={strong ? 'semibold' : 'regular'} tone={warn ? 'warning' : strong ? 'default' : 'muted'}>{label}</Text>
      <Amount value={value} size="sm" weight={strong ? 'bold' : 'regular'} tone={warn ? 'warning' : undefined} />
    </View>
  );
}
