/**
 * Single units an industry tracks (phones by IMEI, used phones, serial units,
 * carpet rolls). A pack registers a source with registerDeviceSource(); the
 * transfer form sends these units to another branch and the adjustment form
 * writes them off, both through the same picker. Units are always one each.
 */

import type { LucideIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, EmptyState, ListRow, SearchBar, Sheet, Skeleton, Text, TextArea, toast, useTheme } from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { useCostMask } from '../lib/shared';

export interface DeviceRow { id: string; kind: string; productId: string; name: string; /** IMEI, serial, roll or used phone code. */ ref: string; sub?: string; cost: number }

export interface DeviceSource {
  kind: string;
  /** Sheet and chip title (a source key to translate). */
  label: string;
  icon: LucideIcon;
  /** Units in stock in one branch. */
  load: (shopId: string) => Promise<DeviceRow[]>;
  /** Field name of this unit on a transfer line (imeiId, serialId, usedPhoneId, carpetRollId). */
  transferField: 'imeiId' | 'serialId' | 'usedPhoneId' | 'carpetRollId';
  /** Writes one unit off as damaged or lost; leave out when the unit cannot be written off here. */
  writeOff?: (row: DeviceRow, how: 'DAMAGE' | 'LOSS', reason: string) => Promise<unknown>;
}

const SOURCES = new Map<string, DeviceSource[]>();

/** Adds a unit source for an industry (call at module load of the pack). */
export function registerDeviceSource(industry: string, source: DeviceSource) {
  SOURCES.set(industry, [...(SOURCES.get(industry) ?? []).filter((s) => s.kind !== source.kind), source]);
}

export function useDeviceSources(): DeviceSource[] {
  const { id } = useIndustry();
  return (id && SOURCES.get(id)) || [];
}

/** Pick units of one source in one branch; `taken` ids are shown as used. */
export function DevicePickerSheet({ source, shopId, taken, onPick, onClose }: { source: DeviceSource | null; shopId: string | null; taken?: ReadonlySet<string>; onPick: (row: DeviceRow) => void; onClose: () => void }) {
  const th = useTheme();
  const { cost } = useCostMask();
  const [q, setQ] = useState('');
  const list = useQuery({ queryKey: ['inv-devices', source?.kind, shopId], queryFn: () => source!.load(shopId!), enabled: !!source && !!shopId });
  useEffect(() => { if (!source) setQ(''); }, [source]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (list.data ?? []).filter((r) => !term || [r.ref, r.name, r.sub].some((v) => (v ?? '').toLowerCase().includes(term)));
  }, [list.data, q]);
  return (
    <Sheet open={!!source} onClose={onClose} height={0.85} title={source ? t(source.label) : undefined} description={t('{{count}} unit stock mein', { count: list.data?.length ?? 0 })} scrollable={false}>
      <View style={{ flex: 1, gap: th.space(2) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('IMEI, serial ya naam')} />
        {list.isLoading ? <Skeleton height={70} /> : (
          <FlatList data={rows.slice(0, 200)} keyExtractor={(r) => r.id} contentContainerStyle={{ gap: th.space(2), paddingBottom: th.space(6) }} ListEmptyComponent={<EmptyState compact title={t('Koi unit nahi mila')} />}
            renderItem={({ item: r }) => (
              <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: taken?.has(r.id) ? 0.5 : 1 }}>
                <ListRow dense icon={source?.icon} title={r.name} subtitle={<Text size="xs" tone="muted" ltr>{r.ref}{r.sub ? ` · ${r.sub}` : ''}</Text>} trailing={<Text size="xs" tone="muted" ltr>{cost(r.cost)}</Text>}
                  onPress={taken?.has(r.id) ? undefined : () => onPick(r)} />
              </View>
            )} />
        )}
      </View>
    </Sheet>
  );
}

/** Writes single units off as damaged or lost (adjustment form). Online only; nothing shows when the industry tracks no units. */
export function DeviceWriteOff({ shopId }: { shopId: string | null }) {
  const th = useTheme();
  const sources = useDeviceSources().filter((s) => s.writeOff);
  const [source, setSource] = useState<DeviceSource | null>(null);
  const [row, setRow] = useState<DeviceRow | null>(null);
  const [how, setHow] = useState<'DAMAGE' | 'LOSS'>('DAMAGE');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!sources.length) return null;
  const run = async () => {
    if (!row || !source?.writeOff) return;
    setBusy(true);
    try {
      await source.writeOff(row, how, reason.trim());
      toast.success(t('{{ref}} write-off ho gaya', { ref: row.ref }));
      setRow(null); setReason('');
    } catch (e) { toast.error(apiErrorMessage(e, t('Write-off nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Card title={t('Ek ek unit write-off')} description={t('Kharab ya gum phone / unit — cost par write-off hota hai')}>
        <View style={{ gap: th.space(2) }}>
          {sources.map((s) => <Button key={s.kind} variant="soft" icon={s.icon} onPress={() => setSource(s)}>{t(s.label)}</Button>)}
        </View>
      </Card>
      <DevicePickerSheet source={row ? null : source} shopId={shopId} onPick={setRow} onClose={() => setSource(null)} />
      <Sheet open={!!row} onClose={() => setRow(null)} title={row?.name} description={row?.ref}
        footer={<Button fullWidth size="lg" variant="danger" icon={Trash2} loading={busy} onPress={() => void run()}>{t('Write-off karein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <ChipGroup value={how} onChange={setHow} options={[{ value: 'DAMAGE', label: t('Kharab') }, { value: 'LOSS', label: t('Gum / chori') }]} />
          <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} />
        </View>
      </Sheet>
    </>
  );
}
