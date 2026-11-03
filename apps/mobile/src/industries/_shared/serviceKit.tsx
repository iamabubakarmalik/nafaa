/**
 * Building blocks of the service industry packs (salon, clinic, gym, hotel,
 * gaming, services): API helpers, a field-config form sheet and a searchable
 * list screen, so each pack describes its screens instead of redrawing them.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react-native';
import { Plus, UserPlus, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { apiClient } from '@/core/api/client';
import { t } from '@/core/i18n';
import { Button, DatePicker, EmptyState, Field, Input, ListRow, ListTemplate, MoneyInput, PressableScale, Row, SearchBar, Segmented, Select, Sheet, Switch, Text, toast, useDebouncedValue, useTheme, type StatusTone } from '@/design';
import { enqueueCustomerCreate, useCustomerSearch } from '@/core/offline';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, dateToKey, errorText, keyToDate, numIn, useDeskOnline } from './deskKit';

export const http = {
  get: <T,>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data),
  post: <T,>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data),
  patch: <T,>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data),
  put: <T,>(path: string, body?: object) => apiClient.put<T>(path, body ?? {}).then((r) => r.data),
  del: <T,>(path: string) => apiClient.delete<T>(path).then((r) => r.data),
};

/** Drops empty text and null so optional fields stay out of the request. */
export const clean = <T extends Record<string, unknown>>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== null && v !== undefined)) as Partial<T>;

/** Keeps a time or date range in reading order inside Urdu text (isolates it from the right-to-left run). */
export const ltr = (s: string) => `\u2066${s}\u2069`;

export const toNum = (v: unknown) => Number(v || 0);

export type FieldKind = 'text' | 'phone' | 'number' | 'money' | 'select' | 'date' | 'time' | 'switch' | 'multiline';
export interface FormField {
  key: string;
  label: string;
  kind?: FieldKind;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Hide the field based on the other values. */
  when?: (v: Record<string, any>) => boolean;
}

const timeToDate = (hhmm?: string) => { const [h, m] = (hhmm || '09:00').split(':').map(Number); const d = new Date(); d.setHours(h || 0, m || 0, 0, 0); return d; };
const dateToTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** One sheet that draws a form from a field list and sends the values. Values keep raw types (numbers stay numbers). */
export function FormSheet({ open, title, description, fields, initial, submitLabel, onSubmit, onClose, extra }: {
  open: boolean; title: string; description?: string; fields: FormField[]; initial?: Record<string, any>; submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<unknown>; onClose: () => void; extra?: ReactNode;
}) {
  const th = useTheme();
  const [v, setV] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setV(initial ?? {}); setTried(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, x: unknown) => setV((p) => ({ ...p, [k]: x }));
  const shown = fields.filter((f) => !f.when || f.when(v));
  const missing = (f: FormField) => !!f.required && (v[f.key] === undefined || v[f.key] === null || v[f.key] === '');
  const submit = async () => {
    setTried(true);
    if (shown.some(missing)) { toast.warning(t('Zaroori jagah bharein')); return; }
    setBusy(true);
    try { await onSubmit(v); onClose(); } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void submit()}>{submitLabel ?? t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {shown.map((f) => {
          const err = tried && missing(f) ? t('Zaroori hai') : undefined;
          const kind = f.kind ?? 'text';
          if (kind === 'switch') return <Switch key={f.key} label={f.label} value={!!v[f.key]} onChange={(x) => set(f.key, x)} />;
          if (kind === 'money') return <MoneyInput key={f.key} label={f.label} hint={f.hint} value={v[f.key] ?? null} onChangeValue={(x) => set(f.key, x)} error={err} />;
          if (kind === 'select') return <Select key={f.key} label={f.label} hint={f.hint} value={v[f.key] ?? null} options={f.options ?? []} onChange={(x) => set(f.key, x)} error={err} />;
          if (kind === 'date') return <DatePicker key={f.key} label={f.label} hint={f.hint} value={keyToDate(v[f.key])} onChange={(d) => set(f.key, dateToKey(d))} error={err} />;
          if (kind === 'time') return <DatePicker key={f.key} mode="time" label={f.label} value={timeToDate(v[f.key])} onChange={(d) => set(f.key, dateToTime(d))} error={err} />;
          if (kind === 'number') return <Input key={f.key} label={f.label} hint={f.hint} keyboardType="decimal-pad" ltr value={v[f.key] == null ? '' : String(v[f.key])} onChangeText={(s) => set(f.key, numIn(s))} error={err} />;
          return (
            <Input key={f.key} label={f.label} hint={f.hint} placeholder={f.placeholder} error={err} value={String(v[f.key] ?? '')} onChangeText={(s) => set(f.key, s)}
              keyboardType={kind === 'phone' ? 'phone-pad' : 'default'} ltr={kind === 'phone'} multiline={kind === 'multiline'} />
          );
        })}
        {extra}
      </View>
    </Sheet>
  );
}

export interface DeskRow { id: string; title: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; tone?: StatusTone; trailing?: ReactNode; search?: string; filter?: string; onPress?: () => void }

/** A searchable, filterable list screen over one query. `rows` turns the loaded data into rows. */
export function DeskList<T>({ title, queryKey, fetch, rows, filters, summary, fab, empty, emptyIcon, feature = 'servicesDesk', refetchMs, searchPlaceholder, children }: {
  title: string; queryKey: unknown[]; fetch: () => Promise<T>; rows: (data: T) => DeskRow[];
  filters?: Array<{ value: string; label: string }>; summary?: (data: T | undefined) => ReactNode;
  fab?: { label: string; onPress: () => void; icon?: LucideIcon }; empty: string; emptyIcon: LucideIcon; feature?: Parameters<typeof useDeskOnline>[0];
  refetchMs?: number; searchPlaceholder?: string; children?: ReactNode;
}) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const [f, setF] = useState(filters?.[0]?.value ?? 'all');
  const query = useQuery({ queryKey, queryFn: fetch, refetchInterval: refetchMs });
  const all = useMemo(() => (query.data ? rows(query.data) : []), [query.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((r) => (f === 'all' || !filters || r.filter === f) && (!s || (r.search ?? '').toLowerCase().includes(s)));
  }, [all, q, f, filters]);
  return (
    <>
      <ListTemplate<DeskRow>
        title={title}
        grouped
        search={{ value: q, onChange: setQ, placeholder: searchPlaceholder ?? t('Search') }}
        filters={filters ? { value: f, onChange: setF, options: filters } : undefined}
        summary={<View style={{ gap: th.space(2) }}>{summary?.(query.data)}<OfflineNote feature={feature} /><CachedNote query={query} /></View>}
        data={shown}
        loading={query.isLoading}
        error={query.data ? null : query.error}
        onRetry={() => void query.refetch()}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <ListRow title={r.title} subtitle={r.subtitle} icon={r.icon} iconTone={r.tone} trailing={r.trailing} chevron={!!r.onPress} onPress={r.onPress} divider />
        )}
        empty={<EmptyState icon={emptyIcon} title={empty} />}
        fab={fab ? { icon: fab.icon ?? Plus, label: fab.label, onPress: fab.onPress } : undefined}
      />
      {children}
    </>
  );
}

/** Refetch helper for pack lists after a write. */
export function useRefresh() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
}

export const Pills = Segmented;
export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4 }}>
      <Text size="sm" tone="muted">{k}</Text>
      <Text size="sm" weight="semibold" style={{ flexShrink: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );
}

export interface PickedCustomer { id: string; name: string; phone: string }

/** Customer field: search the phone's own list (works offline) or add a new one in two fields. */
export function CustomerField({ value, onChange, label, optional }: { value: PickedCustomer | null; onChange: (c: PickedCustomer | null) => void; label?: string; optional?: boolean }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q, 120);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const { data: list = [] } = useCustomerSearch({ query: query || undefined, limit: 40 }, { enabled: open });
  useEffect(() => { if (open) { setQ(''); setAdding(false); setName(''); setPhone(''); } }, [open]);
  const pick = (c: PickedCustomer | null) => { onChange(c); setOpen(false); };
  const create = async () => {
    if (!name.trim()) return;
    try {
      const { customerId } = await enqueueCustomerCreate({ name: name.trim(), phone: phone.trim() || undefined });
      pick({ id: customerId, name: name.trim(), phone: phone.trim() });
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); }
  };
  return (
    <>
      <Field label={label ?? t('Customer')}>
        <PressableScale onPress={() => setOpen(true)} style={{ minHeight: th.control('md'), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface, paddingHorizontal: th.space(3), justifyContent: 'center' }}>
          <Row gap={2}>
            <UserRound size={18} color={th.colors.textMuted} />
            <Text style={{ flex: 1 }} tone={value ? 'default' : 'muted'} numberOfLines={1}>{value ? `${value.name}${value.phone ? ` · ${value.phone}` : ''}` : optional ? t('Walk-in customer') : t('Customer chunein')}</Text>
          </Row>
        </PressableScale>
      </Field>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Customer')} height={0.8}
        footer={adding ? <Button fullWidth size="lg" disabled={!name.trim()} onPress={() => void create()}>{t('Save')}</Button> : <Button fullWidth variant="secondary" icon={UserPlus} onPress={() => setAdding(true)}>{t('New customer')}</Button>}>
        <View style={{ gap: th.space(2) }}>
          {adding ? (
            <>
              <Input label={t('Naam')} value={name} onChangeText={setName} />
              <Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr />
            </>
          ) : (
            <>
              <SearchBar value={q} onChangeText={setQ} placeholder={t('Naam ya phone')} />
              {optional && <ListRow icon={UserRound} title={t('Walk-in customer')} onPress={() => pick(null)} divider />}
              {list.map((c) => <ListRow key={c.id} icon={UserRound} title={c.name} subtitle={c.phone ?? undefined} onPress={() => pick({ id: c.id, name: c.name, phone: c.phone ?? '' })} divider />)}
            </>
          )}
        </View>
      </Sheet>
    </>
  );
}
