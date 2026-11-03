/**
 * Karigars and the gold they hold (web KarigarsPage). Gold given goes out of
 * metal stock onto the karigar; what comes back (finished piece, wastage,
 * leftover gold) is taken off. Labour is earned as pieces come back (or
 * written by hand) and paid out as an expense. Swipe a row for the actions;
 * tap it for the full ledger. Needs the server.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Banknote, Hammer, NotebookPen, Pencil, Plus, Scale, UserRound, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { karigarOutstanding, r2, r3 } from '@nafaa/core/industries/jewelry';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, StatTile, SwipeRow, Text, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote } from '@/industries/_shared/deskKit';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { karigarsApi, type Karigar } from '../api';
import { KarigarFormSheet, KarigarLabourSheet, KarigarLedgerSheet, KarigarMetalSheet, labourDue } from '../components/KarigarSheets';
import { KEYS, grams } from '../meta';

type Status = 'active' | 'inactive' | 'all';
type Where = '' | 'in' | 'out';

export function KarigarsScreen() {
  const th = useTheme();
  const can = usePermission();
  const canEdit = can(P.SUPPLIERS_EDIT);
  const canMetal = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const canPay = can(P.EXPENSES_CREATE);
  const [status, setStatus] = useState<Status>('active');
  const [where, setWhere] = useState<Where>('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [form, setForm] = useState<Karigar | 'new' | null>(null);
  const [metal, setMetal] = useState<{ k: Karigar; mode: 'issue' | 'receive' } | null>(null);
  const [ledger, setLedger] = useState<Karigar | null>(null);
  const [labour, setLabour] = useState<{ k: Karigar; mode: 'pay' | 'earn' } | null>(null);

  const params = { search: query || undefined, ...(status !== 'all' && { isActive: String(status === 'active') }), ...(where && { isInHouse: String(where === 'in') }) };
  const list = useQuery({ queryKey: [KEYS.karigars, 'list', params], queryFn: () => karigarsApi.list(params), placeholderData: (p) => p });
  const sum = useQuery({ queryKey: [KEYS.karigars, 'summary'], queryFn: karigarsApi.summary });
  const rows = list.data ?? [];
  const holding = r3(Number(sum.data?.totalOutstanding?.outstandingGrams ?? 0));
  const owed = r2(rows.reduce((s, k) => s + labourDue(k), 0));
  const filtered = !!query || status !== 'active' || !!where;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Scale} tone={holding > 0 ? 'warning' : 'neutral'} label={t('Karigaron ke paas')} value={grams(holding)} hint={t('Abhi wapas aana hai')} loading={sum.isLoading} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Banknote} tone={owed > 0 ? 'info' : 'neutral'} label={t('Mazdoori baqi')} value={<Amount value={owed} size="lg" weight="bold" compact />} hint={t('Kaam ho gaya, paise dene hain')} />
      </View>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Users} tone="accent" label={t('Dukaan ke andar')} value={String(sum.data?.inHouse ?? '—')} onPress={() => setWhere(where === 'in' ? '' : 'in')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={UserRound} tone="info" label={t('Bahar wale')} value={String(sum.data?.external ?? '—')} onPress={() => setWhere(where === 'out' ? '' : 'out')} />
      </View>
      <ChipGroup value={status} onChange={(v) => setStatus(v as Status)} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: 'active', label: t('Chalu') }, { value: 'inactive', label: t('Band') }, { value: 'all', label: t('Sab') }]} />
      {!!where && <Badge tone="brand">{where === 'in' ? t('Dukaan ke andar') : t('Bahar wale')}</Badge>}
      <CachedNote query={list} />
      <OfflineNote feature="jewelryDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<Karigar>
        title={t('Karigar')}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, phone, CNIC, karigar #…') }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => { void list.refetch(); void sum.refetch(); }}
        keyExtractor={(k) => k.id}
        renderItem={({ item: k }) => {
          const held = karigarOutstanding(k);
          return (
            <SwipeRow end={[
              ...(canMetal && k.isActive ? [{ icon: ArrowUpRight, label: t('Sona dein'), tone: 'brand' as const, onPress: () => setMetal({ k, mode: 'issue' }) }] : []),
              ...(canMetal && held > 0 ? [{ icon: ArrowDownLeft, label: t('Wapas lein'), tone: 'success' as const, onPress: () => setMetal({ k, mode: 'receive' }) }] : []),
              ...(canPay && labourDue(k) > 0 ? [{ icon: Banknote, label: t('Mazdoori dein'), tone: 'info' as const, onPress: () => setLabour({ k, mode: 'pay' }) }] : []),
              ...(canEdit ? [{ icon: NotebookPen, label: t('Mazdoori likhein'), tone: 'neutral' as const, onPress: () => setLabour({ k, mode: 'earn' }) }, { icon: Pencil, label: t('Badlein'), tone: 'neutral' as const, onPress: () => setForm(k) }] : []),
            ]}>
              <ListRow icon={Hammer} iconTone={held > 0 ? 'warning' : 'neutral'} title={k.fullName}
                subtitle={[k.karigarNumber, k.phone, k.isInHouse ? '' : t('bahar'), k.isActive ? '' : t('band'), k.metalIssuedGrams > 0 ? `${t('wastage')} ${Math.round((k.wastageGrams / k.metalIssuedGrams) * 1000) / 10}%` : ''].filter(Boolean).join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end' }}>
                  <Text weight="bold" tone={held > 0 ? 'warning' : 'muted'} ltr>{grams(held)}</Text>
                  {labourDue(k) > 0 && <Amount value={labourDue(k)} size="xs" tone="info" />}
                </View>}
                chevron onPress={() => setLedger(k)} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Hammer} title={filtered ? t('Is filter me koi karigar nahi') : t('Abhi koi karigar nahi')} message={t('Karigar ka naam aur phone likhein — phir sona dein aur zewar wapas lein, hisaab khud banta hai.')} />}
        fab={canEdit ? { icon: Plus, label: t('Karigar'), onPress: () => setForm('new') } : undefined}
      />
      <KarigarFormSheet open={!!form} karigar={form === 'new' ? null : form} onClose={() => setForm(null)} />
      <KarigarMetalSheet k={metal?.k ?? null} mode={metal?.mode ?? 'issue'} onClose={() => setMetal(null)} />
      <KarigarLabourSheet k={labour?.k ?? null} mode={labour?.mode ?? 'pay'} onClose={() => setLabour(null)} />
      <KarigarLedgerSheet k={ledger} onClose={() => setLedger(null)} />
    </>
  );
}
