/**
 * Branches: every shop, warehouse and godown with today's sales, the drawer
 * and who is on duty. Tap a branch for its figures and actions; swipe to
 * edit or switch it off. Creating and editing open the branch form.
 */

import { router } from 'expo-router';
import { BarChart3, Building2, Pencil, Plus, Power, Star, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, EmptyState, IconButton, ListRow, ListTemplate, StatTile, SwipeRow, Text, confirm, toast, useTheme,
} from '@/design';
import { shopsApi, type Shop, type ShopAnalyticsRow, type ShopDeleteError } from '../api/organization';
import { BranchSheet } from '../components/BranchSheet';
import { SHOP_KEYS, SHOP_TYPES } from '../lib/meta';

type Filter = 'active' | 'off' | 'SHOP' | 'WAREHOUSE' | 'GODOWN' | 'all';

export function ShopsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.SHOPS_MANAGE);
  const canMoney = can(P.REPORTS_VIEW);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [open, setOpen] = useState<Shop | null>(null);

  const list = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const fig = useQuery({ queryKey: ['shops-analytics'], queryFn: shopsApi.analytics, enabled: canMoney, retry: false });
  const figOf = useMemo(() => new Map<string, ShopAnalyticsRow>((fig.data?.shops ?? []).map((s) => [s.id, s])), [fig.data]);
  const refresh = () => SHOP_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const toggle = useMutation({
    mutationFn: (s: Shop) => shopsApi.toggleActive(s.id),
    onSuccess: (s) => {
      toast.success(s.isActive ? t('{{name}} chalu ho gayi', { name: s.name }) : t('{{name}} band ho gayi', { name: s.name }));
      setOpen(null);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (s: Shop) => shopsApi.remove(s.id),
    meta: { silentError: true },
    onSuccess: (_r, s) => { toast.success(t('{{name}} mita di gayi', { name: s.name })); setOpen(null); refresh(); },
    onError: (e, s) => {
      const body = (e as { response?: { data?: { message?: ShopDeleteError | string } } })?.response?.data?.message;
      if (!body || typeof body === 'string') return toast.error(body || t('Mita nahi saka'));
      if (body.code === 'HAS_FINANCIAL_HISTORY' || body.code === 'HAS_SALES_HISTORY') {
        return toast.error(t('Is branch ka hisaab maujood hai'), {
          message: t('Record bachane ke liye branch mitti nahi — band kar dein. Purana hisaab reports me rahega.'),
          action: s.isActive ? { label: t('Switch off'), onPress: () => toggle.mutate(s) } : undefined,
        });
      }
      toast.error(body.message);
    },
  });

  const askToggle = async (s: Shop) => {
    if (s.isActive && !(await confirm({ title: t('{{name}} band karein?', { name: s.name }), message: t('Band branch me sale nahi hoti; purana hisaab waise hi rehta hai.'), confirmLabel: t('Switch off') }))) return;
    toggle.mutate(s);
  };
  const askDelete = async (s: Shop) => {
    if (await confirm({ title: t('{{name}} mitayein?', { name: s.name }), message: t('Sirf wohi branch mit sakti hai jis ka koi hisaab na ho.'), tone: 'danger', confirmLabel: t('Delete') })) remove.mutate(s);
  };
  const edit = (s: Shop) => { setOpen(null); router.push(`/shops/${s.id}` as never); };

  const needle = q.trim().toLowerCase();
  const data = useMemo(() => {
    const rows = (list.data ?? []).filter((s) => {
      if (needle && !`${s.name} ${s.address ?? ''} ${s.phone ?? ''}`.toLowerCase().includes(needle)) return false;
      if (filter === 'active') return s.isActive;
      if (filter === 'off') return !s.isActive;
      if (filter === 'all') return true;
      return s.type === filter && s.isActive;
    });
    return rows.sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.name.localeCompare(b.name));
  }, [list.data, filter, needle]);

  const totals = fig.data?.totals;
  const costHidden = !!fig.data?.costHidden;

  return (
    <>
      <ListTemplate
        title={t('Branches')}
        actions={canMoney ? <IconButton icon={BarChart3} label={t('Compare branches')} onPress={() => router.push('/shops/compare' as never)} /> : undefined}
        search={{ value: q, onChange: setQ, placeholder: t('Search branches') }}
        filters={{
          value: filter, onChange: (v) => setFilter(v as Filter),
          options: [
            { value: 'active', label: t('Chalu branches') },
            { value: 'off', label: t('Band branches') },
            { value: 'SHOP', label: t('Shop') },
            { value: 'WAREHOUSE', label: t('Warehouse') },
            { value: 'GODOWN', label: t('Godown') },
            { value: 'all', label: t('Sab') },
          ],
        }}
        summary={totals ? (
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Today sale')} value={<Amount value={totals.todaySales} weight="bold" compact />} hint={t('{{count}} bills', { count: totals.todayOrders })} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Drawer')} value={<Amount value={totals.drawerCash} weight="bold" compact />} hint={t('{{count}} khule', { count: totals.registersOpen })} />
          </View>
        ) : undefined}
        data={data}
        loading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.isRefetching}
        onRefresh={() => { list.refetch(); fig.refetch(); }}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => {
          const f = figOf.get(item.id);
          const type = SHOP_TYPES[item.type];
          const end = canManage ? [
            { icon: Pencil, label: t('Edit'), tone: 'brand' as const, onPress: () => edit(item) },
            { icon: Power, label: item.isActive ? t('Off') : t('On'), tone: item.isActive ? 'warning' as const : 'success' as const, onPress: () => askToggle(item) },
            ...(!item.isMain ? [{ icon: Trash2, label: t('Delete'), tone: 'danger' as const, onPress: () => askDelete(item) }] : []),
          ] : [];
          return (
            <SwipeRow end={end} enabled={canManage}>
              <ListRow
                icon={type.icon}
                iconTone="info"
                title={item.name}
                subtitle={[t(type.label), item.isMain ? t('Main') : null, !item.isActive ? t('Off') : null, f?.registerOpen ? t('Drawer open') : null].filter(Boolean).join(' · ')}
                trailing={f ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Amount value={f.todaySales} weight="semibold" compact />
                    <Text size="xs" tone="muted">{t('{{count}} bills', { count: f.todayOrders })}</Text>
                  </View>
                ) : item.isMain ? <Badge tone="warning" icon={Star}>{t('Main')}</Badge> : undefined}
                chevron
                onPress={() => setOpen(item)}
              />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Building2} title={t('Koi branch nahi mili')} action={undefined} />}
        fab={canManage ? { icon: Plus, label: t('New'), onPress: () => router.push('/shops/new' as never) } : undefined}
      />
      <BranchSheet
        shop={open}
        figures={open ? figOf.get(open.id) : undefined}
        costHidden={costHidden}
        canManage={canManage}
        onClose={() => setOpen(null)}
        onEdit={() => open && edit(open)}
        onToggle={() => open && askToggle(open)}
        onDelete={() => open && askDelete(open)}
        onCompare={() => { setOpen(null); router.push('/shops/compare' as never); }}
      />
    </>
  );
}
